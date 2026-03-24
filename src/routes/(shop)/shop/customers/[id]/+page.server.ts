import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopCustomerService } from '$lib/services/shop-customer.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;
	const customerService = createShopCustomerService(supabase);

	const { data: customer, error: customerError } = await customerService.getCustomer(params.id);

	if (customerError || !customer) {
		error(404, 'Customer not found');
	}

	// Fetch job history for this customer
	// shop_jobs is not yet in database.types.ts, so use untyped query
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: jobs } = await (supabase as any)
		.from('shop_jobs')
		.select('id, job_number, vehicle_make, vehicle_model, vehicle_year, vehicle_reg, status, date_in, date_promised')
		.eq('customer_id', params.id)
		.order('created_at', { ascending: false });

	return { customer, jobs: jobs ?? [] };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const customerService = createShopCustomerService(supabase);

		const formData = await request.formData();

		const updateData: Record<string, unknown> = {
			name: formData.get('name') as string,
			phone: formData.get('phone') || null,
			email: formData.get('email') || null,
			address: formData.get('address') || null,
			city: formData.get('city') || null,
			province: formData.get('province') || null,
			company_name: formData.get('company_name') || null,
			vat_number: formData.get('vat_number') || null,
			id_number: formData.get('id_number') || null,
			notes: formData.get('notes') || null
		};

		if (!updateData.name) {
			return fail(400, { error: 'Customer name is required' });
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error: updateError } = await customerService.updateCustomer(params.id, updateData as any);

		if (updateError) {
			return fail(400, { error: updateError.message ?? 'Failed to update customer' });
		}

		return { success: true };
	}
};
