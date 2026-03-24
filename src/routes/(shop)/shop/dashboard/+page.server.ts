import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Fetch counts and recent records in parallel
	const [jobsResult, estimatesResult, customersResult, recentEstimatesResult, recentJobsResult] =
		await Promise.all([
			(supabase as any).from('shop_jobs').select('id, status'),
			(supabase as any).from('shop_estimates').select('id, status'),
			(supabase as any).from('shop_customers').select('id'),
			(supabase as any)
				.from('shop_estimates')
				.select(
					'id, estimate_number, status, total, created_at, shop_jobs(customer_name, vehicle_make, vehicle_model)'
				)
				.order('created_at', { ascending: false })
				.limit(5),
			(supabase as any)
				.from('shop_jobs')
				.select(
					'id, job_number, customer_name, vehicle_make, vehicle_model, status, job_type, created_at'
				)
				.order('created_at', { ascending: false })
				.limit(5)
		]);

	const jobs = jobsResult.data ?? [];
	const estimates = estimatesResult.data ?? [];
	const customers = customersResult.data ?? [];

	const stats = {
		totalJobs: jobs.length,
		activeJobs: jobs.filter(
			(j: { status: string }) => !['completed', 'cancelled'].includes(j.status)
		).length,
		completedJobs: jobs.filter((j: { status: string }) => j.status === 'completed').length,
		totalEstimates: estimates.length,
		draftEstimates: estimates.filter((e: { status: string }) => e.status === 'draft').length,
		pendingEstimates: estimates.filter((e: { status: string }) => e.status === 'sent').length,
		totalCustomers: customers.length
	};

	return {
		stats,
		recentEstimates: recentEstimatesResult.data ?? [],
		recentJobs: recentJobsResult.data ?? []
	};
};
