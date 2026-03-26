import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopJobService } from '$lib/services/shop-job.service';
import type { ShopJobStatus } from '$lib/services/shop-job.service';
import { createShopInvoiceService } from '$lib/services/shop-invoice.service';
import { createShopJobPhotosService } from '$lib/services/shop-job-photos.service';
import { createShopEstimateService } from '$lib/services/shop-estimate.service';
import { createShopSettingsService } from '$lib/services/shop-settings.service';
import type { EstimateLineItem } from '$lib/types/assessment';
import {
	calculateSubtotal,
	calculateVAT,
	calculateTotal
} from '$lib/utils/estimateCalculations';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;
	const jobService = createShopJobService(supabase);
	const invoiceService = createShopInvoiceService(supabase);
	const photosService = createShopJobPhotosService(supabase);
	const estimateService = createShopEstimateService(supabase);
	const settingsService = createShopSettingsService(supabase);

	const { data: job, error: jobError } = await jobService.getJob(params.id);

	if (jobError || !job) {
		error(404, 'Job not found');
	}

	// Check for an existing non-void invoice for this job
	const { data: existingInvoice } = await invoiceService.getInvoiceForJob(params.id);

	// Fetch all photos for this job
	const { data: photos } = await photosService.getPhotos(params.id);

	// Load full estimate data (with line_items JSONB) if an estimate exists
	const estimateId = (job.shop_estimates as Array<{ id: string }> | undefined)?.[0]?.id;
	let estimate = null;
	let settings = null;
	let labourRate = 450;
	let paintRate = 350;
	let oemMarkup = 25;
	let altMarkup = 25;
	let secondHandMarkup = 25;
	let outworkMarkup = 25;
	let vatRate = 15;

	if (estimateId) {
		const [estimateResult, settingsResult] = await Promise.all([
			estimateService.getEstimate(estimateId),
			settingsService.getSettings()
		]);

		if (!estimateResult.error && estimateResult.data) {
			estimate = estimateResult.data;
		}

		settings = settingsResult.data ?? null;

		// Use per-estimate rates if set, fall back to settings, then hardcoded defaults
		labourRate = (estimate as Record<string, unknown> | null)?.labour_rate as number ?? settings?.default_labour_rate ?? 450;
		paintRate = (estimate as Record<string, unknown> | null)?.paint_rate as number ?? settings?.default_paint_rate ?? 350;
		oemMarkup = (estimate as Record<string, unknown> | null)?.oem_markup_pct as number ?? settings?.oem_markup_percentage ?? settings?.default_markup_parts ?? 25;
		altMarkup = (estimate as Record<string, unknown> | null)?.alt_markup_pct as number ?? settings?.alt_markup_percentage ?? settings?.default_markup_parts ?? 25;
		secondHandMarkup = (estimate as Record<string, unknown> | null)?.second_hand_markup_pct as number ?? settings?.second_hand_markup_percentage ?? settings?.default_markup_parts ?? 25;
		outworkMarkup = (estimate as Record<string, unknown> | null)?.outwork_markup_pct as number ?? settings?.outwork_markup_percentage ?? settings?.default_markup_parts ?? 25;
		vatRate = (estimate as Record<string, unknown> | null)?.vat_rate as number ?? settings?.default_vat_rate ?? 15;
	}

	return {
		job,
		existingInvoice: existingInvoice ?? null,
		photos: photos ?? [],
		estimate,
		settings,
		labourRate,
		paintRate,
		oemMarkup,
		altMarkup,
		secondHandMarkup,
		outworkMarkup,
		vatRate
	};
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
	},

	sendEstimate: async ({ request, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;

		if (!estimateId) {
			return fail(400, { error: 'Estimate ID is required' });
		}

		const { error: err } = await estimateService.sendEstimate(estimateId);
		if (err) {
			return fail(400, { error: err.message });
		}
		return { success: true };
	},

	approveEstimate: async ({ request, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;

		if (!estimateId) {
			return fail(400, { error: 'Estimate ID is required' });
		}

		try {
			await estimateService.approveEstimate(estimateId);
			return { success: true };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Failed to approve estimate' });
		}
	},

	declineEstimate: async ({ request, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;

		if (!estimateId) {
			return fail(400, { error: 'Estimate ID is required' });
		}

		const { error: err } = await estimateService.declineEstimate(estimateId);
		if (err) {
			return fail(400, { error: err.message });
		}
		return { success: true };
	},

	updateEstimateNotes: async ({ request, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;
		const estimateNotes = formData.get('notes') as string | null;

		if (!estimateId) {
			return fail(400, { error: 'Estimate ID is required' });
		}

		const { error: err } = await estimateService.updateEstimate(estimateId, {
			notes: estimateNotes ?? null
		});

		if (err) {
			return fail(400, { error: err.message });
		}
		return { success: true };
	},

	updateEstimateRates: async ({ request, locals }) => {
		const supabase = locals.supabase;
		const estimateService = createShopEstimateService(supabase);

		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;

		if (!estimateId) return fail(400, { error: 'Missing estimate ID' });

		const rateFields: Record<string, number> = {};
		const fields = ['labour_rate', 'paint_rate', 'oem_markup_pct', 'alt_markup_pct', 'second_hand_markup_pct', 'outwork_markup_pct'];

		for (const field of fields) {
			const val = formData.get(field);
			if (val !== null && val !== '') {
				const parsed = parseFloat(val as string);
				if (!isNaN(parsed)) {
					rateFields[field] = parsed;
				}
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error: err } = await estimateService.updateEstimate(estimateId, rateFields as any);
		if (err) return fail(500, { error: err.message });

		return { success: true };
	},

	saveEstimateLineItems: async ({ request, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;
		const lineItemsJson = formData.get('line_items') as string;
		const vatRateStr = formData.get('vat_rate') as string | null;

		if (!estimateId) {
			return fail(400, { error: 'Estimate ID is required' });
		}

		let lineItems: EstimateLineItem[];
		try {
			lineItems = JSON.parse(lineItemsJson);
		} catch {
			return fail(400, { error: 'Invalid line items data' });
		}

		const parsedVatRate = vatRateStr ? parseFloat(vatRateStr) : 15;
		const subtotal = calculateSubtotal(lineItems);
		const vatAmount = calculateVAT(subtotal, parsedVatRate);
		const total = calculateTotal(subtotal, vatAmount);

		const { error: err } = await estimateService.updateEstimate(estimateId, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			line_items: lineItems as any,
			subtotal,
			vat_rate: parsedVatRate,
			vat_amount: vatAmount,
			total,
			parts_total: 0,
			labor_total: 0,
			sublet_total: 0,
			sundries_total: 0,
			discount_amount: 0
		});

		if (err) {
			return fail(400, { error: err.message });
		}
		return { success: true };
	}
};
