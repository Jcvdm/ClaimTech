import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopJobService } from '$lib/services/shop-job.service';
import type { ShopJobStatus } from '$lib/services/shop-job.service';
import { createShopInvoiceService } from '$lib/services/shop-invoice.service';
import { createShopJobPhotosService } from '$lib/services/shop-job-photos.service';

const PHOTOS_BUCKET = 'SVA Photos';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;
	const jobService = createShopJobService(supabase);
	const invoiceService = createShopInvoiceService(supabase);
	const photosService = createShopJobPhotosService(supabase);

	const { data: job, error: jobError } = await jobService.getJob(params.id);

	if (jobError || !job) {
		error(404, 'Job not found');
	}

	// Check for an existing non-void invoice for this job
	const { data: existingInvoice } = await invoiceService.getInvoiceForJob(params.id);

	// Fetch all photos for this job
	const { data: photos } = await photosService.getPhotos(params.id);

	return { job, existingInvoice: existingInvoice ?? null, photos: photos ?? [] };
};

export const actions: Actions = {
	updateStatus: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const jobService = createShopJobService(supabase);

		const formData = await request.formData();
		const newStatus = formData.get('status') as ShopJobStatus;

		if (!newStatus) {
			return fail(400, { error: 'Status is required' });
		}

		const { error: updateError } = await jobService.updateJobStatus(params.id, newStatus);

		if (updateError) {
			return fail(400, { error: updateError.message ?? 'Failed to update status' });
		}

		return { success: true };
	},

	createInvoice: async ({ params, locals }) => {
		const { supabase } = locals;
		const invoiceService = createShopInvoiceService(supabase);

		// Check if an invoice already exists for this job
		const { data: existingInvoice } = await invoiceService.getInvoiceForJob(params.id);
		if (existingInvoice) {
			redirect(303, `/shop/invoices/${existingInvoice.id}`);
		}

		// Get the job's most recent approved/sent estimate
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const db = supabase as any;
		const { data: estimates } = await db
			.from('shop_estimates')
			.select('id, status, total')
			.eq('job_id', params.id)
			.in('status', ['approved', 'sent', 'draft'])
			.order('created_at', { ascending: false })
			.limit(1);

		const estimate = estimates?.[0] as { id: string; status: string; total: number } | undefined;

		if (!estimate) {
			return fail(400, { error: 'No estimate found for this job. Please create an estimate first.' });
		}

		try {
			const invoice = await invoiceService.createFromEstimate(estimate.id, params.id);
			redirect(303, `/shop/invoices/${invoice.id}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create invoice';
			return fail(400, { error: message });
		}
	},

	update: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const jobService = createShopJobService(supabase);

		const formData = await request.formData();

		const updateData: Record<string, unknown> = {};

		const notes = formData.get('notes');
		if (notes !== null) updateData.notes = notes || null;

		const datepromised = formData.get('date_promised');
		if (datepromised !== null) updateData.date_promised = datepromised || null;

		const damage = formData.get('damage_description');
		if (damage !== null) updateData.damage_description = damage || null;

		const complaint = formData.get('complaint');
		if (complaint !== null) updateData.complaint = complaint || null;

		const diagnosis = formData.get('diagnosis');
		if (diagnosis !== null) updateData.diagnosis = diagnosis || null;

		const faultCodes = formData.get('fault_codes');
		if (faultCodes !== null) updateData.fault_codes = faultCodes || null;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error: updateError } = await jobService.updateJob(params.id, updateData as any);

		if (updateError) {
			return fail(400, { error: updateError.message ?? 'Failed to update job' });
		}

		return { success: true };
	},

	uploadPhoto: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const photosService = createShopJobPhotosService(supabase);

		const formData = await request.formData();
		const file = formData.get('file') as File;
		const category = (formData.get('category') as string) || 'general';
		const label = (formData.get('label') as string) || 'Photo';

		if (!file || file.size === 0) {
			return fail(400, { error: 'No file provided' });
		}

		if (!file.type.startsWith('image/')) {
			return fail(400, { error: 'Only image files are allowed' });
		}

		const timestamp = Date.now();
		const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
		const storagePath = `shop-jobs/${params.id}/${timestamp}_${safeName}`;

		// Upload to Supabase storage
		const { error: uploadError } = await supabase.storage
			.from(PHOTOS_BUCKET)
			.upload(storagePath, file, { contentType: file.type });

		if (uploadError) {
			return fail(500, { error: uploadError.message });
		}

		// Create DB record
		const { error: dbError } = await photosService.createPhoto({
			job_id: params.id,
			storage_path: storagePath,
			label,
			category
		});

		if (dbError) {
			// Clean up storage if DB insert fails
			await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
			return fail(500, { error: 'Failed to save photo record' });
		}

		return { success: true };
	},

	deletePhoto: async ({ request, locals }) => {
		const { supabase } = locals;
		const photosService = createShopJobPhotosService(supabase);

		const formData = await request.formData();
		const photoId = formData.get('photo_id') as string;
		const storagePath = formData.get('storage_path') as string;

		if (!photoId) {
			return fail(400, { error: 'Photo ID is required' });
		}

		// Delete DB record first
		const { error: dbError } = await photosService.deletePhoto(photoId);
		if (dbError) {
			return fail(500, { error: 'Failed to delete photo record' });
		}

		// Delete from storage (best effort)
		if (storagePath) {
			await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
		}

		return { success: true };
	},

	updatePhotoLabel: async ({ request, locals }) => {
		const { supabase } = locals;
		const photosService = createShopJobPhotosService(supabase);

		const formData = await request.formData();
		const photoId = formData.get('photo_id') as string;
		const label = formData.get('label') as string;

		if (!photoId || !label) {
			return fail(400, { error: 'Photo ID and label are required' });
		}

		const { error: updateError } = await photosService.updateLabel(photoId, label);
		if (updateError) {
			return fail(500, { error: 'Failed to update photo label' });
		}

		return { success: true };
	}
};
