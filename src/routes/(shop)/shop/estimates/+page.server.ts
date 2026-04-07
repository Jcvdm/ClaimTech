import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopEstimateService } from '$lib/services/shop-estimate.service';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const { data: jobs, error } = await (supabase as any)
		.from('shop_jobs')
		.select('*, shop_estimates(id, estimate_number, status, total)')
		.in('status', ['quote_requested', 'quoted'])
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error loading pre-approval jobs:', error);
		return { jobs: [] };
	}

	return { jobs: jobs ?? [] };
};

export const actions: Actions = {
	send: async ({ request, locals }) => {
		const { supabase } = locals;
		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;
		if (!estimateId) return fail(400, { error: 'Missing estimate ID' });

		const estimateService = createShopEstimateService(supabase);
		const { error } = await estimateService.sendEstimate(estimateId);
		if (error) return fail(400, { error: error.message });
		return { success: true };
	},

	accept: async ({ request, locals }) => {
		const { supabase } = locals;
		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;
		if (!estimateId) return fail(400, { error: 'Missing estimate ID' });

		const estimateService = createShopEstimateService(supabase);
		try {
			await estimateService.approveEstimate(estimateId);
			return { success: true };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Failed to accept' });
		}
	},

	decline: async ({ request, locals }) => {
		const { supabase } = locals;
		const formData = await request.formData();
		const estimateId = formData.get('estimate_id') as string;
		if (!estimateId) return fail(400, { error: 'Missing estimate ID' });

		const estimateService = createShopEstimateService(supabase);
		try {
			await estimateService.declineEstimate(estimateId);
			return { success: true };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Failed to decline' });
		}
	}
};
