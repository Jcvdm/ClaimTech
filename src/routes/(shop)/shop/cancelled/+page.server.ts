import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Get cancelled jobs
	// NOTE: shop tables not in database.types.ts
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: jobs, error } = await (supabase as any)
		.from('shop_jobs')
		.select('*, shop_estimates(id, estimate_number, status, total)')
		.eq('status', 'cancelled')
		.order('created_at', { ascending: false });

	if (error) console.error('Error loading cancelled jobs:', error);

	return { jobs: jobs ?? [] };
};
