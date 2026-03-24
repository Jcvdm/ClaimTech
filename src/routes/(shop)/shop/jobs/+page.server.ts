import type { PageServerLoad } from './$types';
import { createShopJobService } from '$lib/services/shop-job.service';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;
	const jobService = createShopJobService(supabase);

	const { data: jobs, error } = await jobService.listJobs();

	if (error) {
		console.error('Error loading jobs:', error);
		return { jobs: [] };
	}

	return { jobs: jobs ?? [] };
};
