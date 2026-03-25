import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopEstimateService } from '$lib/services/shop-estimate.service';
import { createShopSettingsService } from '$lib/services/shop-settings.service';
import { createShopCustomerService } from '$lib/services/shop-customer.service';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const settingsService = createShopSettingsService(supabase);
	const { data: settings, error: settingsError } = await settingsService.getSettings();

	if (settingsError) {
		console.error('Error loading shop settings:', settingsError);
	}

	// Load existing customers for the select dropdown
	// NOTE: Using untyped client because shop tables are not yet in database.types.ts
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: customers, error: customersError } = await (supabase as any)
		.from('shop_customers')
		.select('id, name, phone, email')
		.order('name');

	if (customersError) {
		console.error('Error loading customers:', customersError);
	}

	return {
		settings: settings ?? null,
		customers: customers ?? []
	};
};

export const actions: Actions = {
	createCustomer: async ({ request, locals }) => {
		const { supabase } = locals;

		const formData = await request.formData();
		const customerService = createShopCustomerService(supabase);
		const settingsService = createShopSettingsService(supabase);
		const { data: settings } = await settingsService.getSettings();

		if (!settings) return fail(400, { error: 'Shop settings not configured' });

		const name = formData.get('customer_name') as string;
		if (!name?.trim()) return fail(400, { error: 'Customer name is required' });

		const { data: customer, error } = await customerService.createCustomer({
			shop_id: settings.id,
			name: name.trim(),
			phone: (formData.get('customer_phone') as string) || undefined,
			email: (formData.get('customer_email') as string) || undefined
		});

		if (error) return fail(400, { error: error.message });
		return { newCustomer: customer };
	},

	createEstimate: async ({ request, locals }) => {
		const { supabase, user } = locals;

		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();

		const job_type = formData.get('job_type') as 'autobody' | 'mechanical';
		const customer_name = formData.get('customer_name') as string;
		const customer_phone = formData.get('customer_phone') as string | null;
		const customer_email = formData.get('customer_email') as string | null;
		const customer_id = formData.get('customer_id') as string | null;
		const vehicle_make = formData.get('vehicle_make') as string;
		const vehicle_model = formData.get('vehicle_model') as string;
		const vehicle_year_raw = formData.get('vehicle_year') as string | null;
		const vehicle_reg = formData.get('vehicle_reg') as string | null;
		const vehicle_vin = formData.get('vehicle_vin') as string | null;
		const vehicle_color = formData.get('vehicle_color') as string | null;
		const vehicle_mileage_raw = formData.get('vehicle_mileage') as string | null;
		const damage_description = formData.get('damage_description') as string | null;
		const complaint = formData.get('complaint') as string | null;
		const diagnosis = formData.get('diagnosis') as string | null;
		const shop_id_raw = formData.get('shop_id') as string | null;

		// Validation
		if (!customer_name?.trim()) {
			return fail(400, { error: 'Customer name is required' });
		}
		if (!vehicle_make?.trim()) {
			return fail(400, { error: 'Vehicle make is required' });
		}
		if (!vehicle_model?.trim()) {
			return fail(400, { error: 'Vehicle model is required' });
		}
		if (!job_type || !['autobody', 'mechanical'].includes(job_type)) {
			return fail(400, { error: 'Job type is required' });
		}
		if (!shop_id_raw) {
			return fail(400, { error: 'Shop configuration is missing. Please set up shop settings.' });
		}

		const vehicle_year = vehicle_year_raw ? parseInt(vehicle_year_raw, 10) : undefined;
		const vehicle_mileage = vehicle_mileage_raw ? parseInt(vehicle_mileage_raw, 10) : undefined;

		const estimateService = createShopEstimateService(supabase);

		let estimateId: string;
		try {
			const { estimate } = await estimateService.createEstimate(
				{
					job_type,
					customer_name: customer_name.trim(),
					customer_phone: customer_phone?.trim() || undefined,
					customer_email: customer_email?.trim() || undefined,
					customer_id: customer_id || undefined,
					vehicle_make: vehicle_make.trim(),
					vehicle_model: vehicle_model.trim(),
					vehicle_year: isNaN(vehicle_year as number) ? undefined : vehicle_year,
					vehicle_reg: vehicle_reg?.trim() || undefined,
					vehicle_vin: vehicle_vin?.trim() || undefined,
					vehicle_color: vehicle_color?.trim() || undefined,
					vehicle_mileage: isNaN(vehicle_mileage as number) ? undefined : vehicle_mileage,
					damage_description: damage_description?.trim() || undefined,
					complaint: complaint?.trim() || undefined,
					diagnosis: diagnosis?.trim() || undefined,
					shop_id: shop_id_raw
				},
				user.id
			);
			estimateId = estimate.id;
		} catch (err) {
			console.error('Error creating estimate:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create estimate'
			});
		}

		redirect(303, `/shop/estimates/${estimateId}`);
	}
};
