import type { PageServerLoad } from './$types';
import { createShopEstimateService } from '$lib/services/shop-estimate.service';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const estimateService = createShopEstimateService(supabase);
	const { data: estimates, error } = await estimateService.listEstimates();

	if (error) {
		console.error('Error loading estimates:', error);
		return { estimates: [] };
	}

	return { estimates: estimates ?? [] };
};
