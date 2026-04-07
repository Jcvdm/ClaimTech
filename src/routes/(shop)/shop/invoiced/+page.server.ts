import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Get completed jobs - those awaiting payment or needing invoicing
	// NOTE: shop tables not in database.types.ts
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: jobs, error } = await (supabase as any)
		.from('shop_jobs')
		.select('*, shop_estimates(id, estimate_number, status, total), shop_invoices(id, invoice_number, status, total)')
		.eq('status', 'completed')
		.order('created_at', { ascending: false });

	if (error) console.error('Error loading invoiced jobs:', error);

	// Filter to only show jobs where invoice is NOT paid
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const unpaidJobs = (jobs ?? []).filter((job: any) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const invoices = job.shop_invoices || [];
		// Show if no invoice OR if any invoice is not paid
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return invoices.length === 0 || invoices.some((inv: any) => inv.status !== 'paid');
	});

	return { jobs: unpaidJobs };
};
