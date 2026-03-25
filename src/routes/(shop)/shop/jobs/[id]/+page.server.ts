import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopJobService } from '$lib/services/shop-job.service';
import type { ShopJobStatus } from '$lib/services/shop-job.service';
import { createShopInvoiceService } from '$lib/services/shop-invoice.service';
import { createShopJobPhotosService } from '$lib/services/shop-job-photos.service';

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

	updateVehicleDetails: async ({ params, request, locals }) => {
		const formData = await request.formData();
		const jobService = createShopJobService(locals.supabase);

		const mileageRaw = formData.get('vehicle_mileage') as string;
		const vehicle_mileage = mileageRaw ? parseInt(mileageRaw, 10) : null;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error: updateError } = await jobService.updateJob(params.id, {
			vehicle_mileage: vehicle_mileage !== null && isNaN(vehicle_mileage) ? null : vehicle_mileage,
			vehicle_vin: (formData.get('vehicle_vin') as string) || null,
			engine_number: (formData.get('engine_number') as string) || null,
			vehicle_reg: (formData.get('vehicle_reg') as string) || null,
		} as any);

		if (updateError) return fail(400, { error: updateError.message });
		return { success: true };
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
	}
};
