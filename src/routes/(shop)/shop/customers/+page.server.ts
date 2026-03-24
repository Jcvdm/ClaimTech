import type { PageServerLoad } from './$types';
import { createShopCustomerService } from '$lib/services/shop-customer.service';
import { createShopSettingsService } from '$lib/services/shop-settings.service';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { supabase } = locals;
	const customerService = createShopCustomerService(supabase);
	const settingsService = createShopSettingsService(supabase);

	const search = url.searchParams.get('search') ?? undefined;

	// Get shop ID from settings
	const { data: settings } = await settingsService.getSettings();
	const shopId = settings?.id ?? '';

	const { data: customers, error } = await customerService.listCustomers(shopId, search);

	if (error) {
		console.error('Error loading customers:', error);
		return { customers: [], search: search ?? '' };
	}

	return { customers: customers ?? [], search: search ?? '' };
};
