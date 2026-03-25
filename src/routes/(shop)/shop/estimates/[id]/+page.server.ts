import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
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
	const { id } = params;

	const estimateService = createShopEstimateService(supabase);
	const settingsService = createShopSettingsService(supabase);

	const [estimateResult, settingsResult] = await Promise.all([
		estimateService.getEstimate(id),
		settingsService.getSettings()
	]);

	if (estimateResult.error || !estimateResult.data) {
		error(404, 'Estimate not found');
	}

	const settings = settingsResult.data ?? null;

	// Shop settings use default_markup_parts for all part types.
	// Labour/paint rates are not stored in shop_settings; use sensible defaults.
	const markupParts = settings?.default_markup_parts ?? 25;

	return {
		estimate: estimateResult.data,
		settings,
		labourRate: 450,
		paintRate: 350,
		oemMarkup: markupParts,
		altMarkup: markupParts,
		secondHandMarkup: markupParts,
		outworkMarkup: markupParts,
		vatRate: settings?.default_vat_rate ?? 15
	};
};

export const actions: Actions = {
	send: async ({ params, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const { error: err } = await estimateService.sendEstimate(params.id);
		if (err) {
			return fail(400, { error: err.message });
		}
		return { success: true };
	},

	approve: async ({ params, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		try {
			await estimateService.approveEstimate(params.id);
			return { success: true };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Failed to approve estimate' });
		}
	},

	decline: async ({ params, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const { error: err } = await estimateService.declineEstimate(params.id);
		if (err) {
			return fail(400, { error: err.message });
		}
		return { success: true };
	},

	updateNotes: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const formData = await request.formData();
		const notes = formData.get('notes') as string | null;

		const { error: err } = await estimateService.updateEstimate(params.id, {
			notes: notes ?? null
		});

		if (err) {
			return fail(400, { error: err.message });
		}
		return { success: true };
	},

	saveLineItems: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const estimateService = createShopEstimateService(supabase);

		const formData = await request.formData();
		const lineItemsJson = formData.get('line_items') as string;
		const vatRateStr = formData.get('vat_rate') as string | null;

		let lineItems: EstimateLineItem[];
		try {
			lineItems = JSON.parse(lineItemsJson);
		} catch {
			return fail(400, { error: 'Invalid line items data' });
		}

		const vatRate = vatRateStr ? parseFloat(vatRateStr) : 15;
		const subtotal = calculateSubtotal(lineItems);
		const vatAmount = calculateVAT(subtotal, vatRate);
		const total = calculateTotal(subtotal, vatAmount);

		// Store EstimateLineItem[] directly in JSONB column
		// Use updateEstimate to persist with recalculated totals
		const { error: err } = await estimateService.updateEstimate(params.id, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			line_items: lineItems as any,
			subtotal,
			vat_rate: vatRate,
			vat_amount: vatAmount,
			total,
			// Reset legacy breakdown fields
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
