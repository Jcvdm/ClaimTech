import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopEstimateService } from '$lib/services/shop-estimate.service';
import { createShopSettingsService } from '$lib/services/shop-settings.service';
import type { ShopEstimateLineItem, ShopEstimateTotals } from '$lib/services/shop-estimate.service';

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

	return {
		estimate: estimateResult.data,
		settings: settingsResult.data ?? null
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

		let lineItems: ShopEstimateLineItem[];
		try {
			lineItems = JSON.parse(lineItemsJson);
		} catch {
			return fail(400, { error: 'Invalid line items data' });
		}

		// Recalculate totals from line items
		const totals = calculateTotals(lineItems);

		const { error: err } = await estimateService.updateLineItems(params.id, lineItems, totals);
		if (err) {
			return fail(400, { error: err.message });
		}
		return { success: true };
	}
};

function calculateTotals(lineItems: ShopEstimateLineItem[]): ShopEstimateTotals {
	let parts_total = 0;
	let labor_total = 0;
	let sublet_total = 0;
	let sundries_total = 0;

	for (const item of lineItems) {
		const total = item.quantity * item.unit_price * (1 + item.markup_pct / 100);
		item.total = Math.round(total * 100) / 100;

		if (item.type === 'part') parts_total += item.total;
		else if (item.type === 'labor') labor_total += item.total;
		else if (item.type === 'sublet') sublet_total += item.total;
		else sundries_total += item.total;
	}

	const subtotal = parts_total + labor_total + sublet_total + sundries_total;
	const vat_rate = 15;
	const vat_amount = Math.round(subtotal * (vat_rate / 100) * 100) / 100;
	const total = Math.round((subtotal + vat_amount) * 100) / 100;

	return {
		parts_total: Math.round(parts_total * 100) / 100,
		labor_total: Math.round(labor_total * 100) / 100,
		sublet_total: Math.round(sublet_total * 100) / 100,
		sundries_total: Math.round(sundries_total * 100) / 100,
		subtotal: Math.round(subtotal * 100) / 100,
		discount_amount: 0,
		vat_rate,
		vat_amount,
		total
	};
}
