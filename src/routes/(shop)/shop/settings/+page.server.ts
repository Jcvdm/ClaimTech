import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopSettingsService } from '$lib/services/shop-settings.service';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;
	const settingsService = createShopSettingsService(supabase);

	const { data: settings } = await settingsService.getSettings();

	// If no settings record yet, return null so the page can show setup form
	if (!settings) {
		return { settings: null, laborRates: [] };
	}

	const { data: laborRates } = await settingsService.getLaborRates(settings.id);

	return {
		settings,
		laborRates: laborRates ?? []
	};
};

export const actions: Actions = {
	/**
	 * Create initial shop settings (first-time setup).
	 */
	createSettings: async ({ request, locals }) => {
		const { supabase } = locals;
		const settingsService = createShopSettingsService(supabase);

		const formData = await request.formData();
		const shopName = formData.get('shop_name') as string;

		if (!shopName?.trim()) {
			return fail(400, { error: 'Shop name is required', action: 'createSettings' });
		}

		const { error } = await settingsService.createSettings({ shop_name: shopName.trim() });

		if (error) {
			return fail(400, { error: error.message ?? 'Failed to create shop settings', action: 'createSettings' });
		}

		return { success: true, action: 'createSettings' };
	},

	/**
	 * Update shop information (name, contact, address).
	 */
	updateShopInfo: async ({ request, locals }) => {
		const { supabase } = locals;
		const settingsService = createShopSettingsService(supabase);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Settings ID is required', action: 'updateShopInfo' });
		}

		const shopName = formData.get('shop_name') as string;
		if (!shopName?.trim()) {
			return fail(400, { error: 'Shop name is required', action: 'updateShopInfo' });
		}

		const { error } = await settingsService.updateSettings(id, {
			shop_name: shopName.trim(),
			phone: (formData.get('phone') as string) || null,
			email: (formData.get('email') as string) || null,
			address: (formData.get('address') as string) || null,
			city: (formData.get('city') as string) || null,
			province: (formData.get('province') as string) || null,
			postal_code: (formData.get('postal_code') as string) || null,
			vat_number: (formData.get('vat_number') as string) || null,
			registration_number: (formData.get('registration_number') as string) || null
		});

		if (error) {
			return fail(400, { error: error.message ?? 'Failed to update shop information', action: 'updateShopInfo' });
		}

		return { success: true, action: 'updateShopInfo' };
	},

	/**
	 * Update pricing defaults (markup percentages, VAT rate).
	 */
	updatePricing: async ({ request, locals }) => {
		const { supabase } = locals;
		const settingsService = createShopSettingsService(supabase);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Settings ID is required', action: 'updatePricing' });
		}

		const partsMarkup = parseFloat(formData.get('default_markup_parts') as string);
		const laborMarkup = parseFloat(formData.get('default_markup_labor') as string);
		const vatRate = parseFloat(formData.get('default_vat_rate') as string);

		if (isNaN(partsMarkup) || isNaN(laborMarkup) || isNaN(vatRate)) {
			return fail(400, { error: 'All pricing fields must be valid numbers', action: 'updatePricing' });
		}

		const { error } = await settingsService.updateSettings(id, {
			default_markup_parts: partsMarkup,
			default_markup_labor: laborMarkup,
			default_vat_rate: vatRate
		});

		if (error) {
			return fail(400, { error: error.message ?? 'Failed to update pricing defaults', action: 'updatePricing' });
		}

		return { success: true, action: 'updatePricing' };
	},

	/**
	 * Update terms and conditions.
	 */
	updateTerms: async ({ request, locals }) => {
		const { supabase } = locals;
		const settingsService = createShopSettingsService(supabase);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Settings ID is required', action: 'updateTerms' });
		}

		const invoicePaymentDays = parseInt(formData.get('invoice_payment_days') as string, 10);

		const { error } = await settingsService.updateSettings(id, {
			estimate_terms: (formData.get('estimate_terms') as string) || null,
			invoice_terms: (formData.get('invoice_terms') as string) || null,
			invoice_payment_days: isNaN(invoicePaymentDays) ? 30 : invoicePaymentDays
		});

		if (error) {
			return fail(400, { error: error.message ?? 'Failed to update terms', action: 'updateTerms' });
		}

		return { success: true, action: 'updateTerms' };
	},

	/**
	 * Add a new labor rate.
	 */
	addLaborRate: async ({ request, locals }) => {
		const { supabase } = locals;
		const settingsService = createShopSettingsService(supabase);

		const formData = await request.formData();
		const shopId = formData.get('shop_id') as string;
		const jobType = formData.get('job_type') as 'autobody' | 'mechanical';
		const rateName = formData.get('rate_name') as string;
		const hourlyRateRaw = formData.get('hourly_rate') as string;
		const description = (formData.get('description') as string) || undefined;
		const isDefault = formData.get('is_default') === 'true';

		if (!shopId) {
			return fail(400, { error: 'Shop ID is required', action: 'addLaborRate' });
		}
		if (!jobType || !['autobody', 'mechanical'].includes(jobType)) {
			return fail(400, { error: 'Valid job type is required', action: 'addLaborRate' });
		}
		if (!rateName?.trim()) {
			return fail(400, { error: 'Rate name is required', action: 'addLaborRate' });
		}
		const hourlyRate = parseFloat(hourlyRateRaw);
		if (isNaN(hourlyRate) || hourlyRate < 0) {
			return fail(400, { error: 'Valid hourly rate is required', action: 'addLaborRate' });
		}

		const { error } = await settingsService.createLaborRate({
			shop_id: shopId,
			job_type: jobType,
			rate_name: rateName.trim(),
			hourly_rate: hourlyRate,
			description,
			is_default: isDefault
		});

		if (error) {
			return fail(400, { error: error.message ?? 'Failed to add labor rate', action: 'addLaborRate' });
		}

		return { success: true, action: 'addLaborRate' };
	},

	/**
	 * Update an existing labor rate.
	 */
	updateLaborRate: async ({ request, locals }) => {
		const { supabase } = locals;
		const settingsService = createShopSettingsService(supabase);

		const formData = await request.formData();
		const id = formData.get('rate_id') as string;
		const rateName = formData.get('rate_name') as string;
		const hourlyRateRaw = formData.get('hourly_rate') as string;
		const description = (formData.get('description') as string) || null;
		const isDefault = formData.get('is_default') === 'true';

		if (!id) {
			return fail(400, { error: 'Rate ID is required', action: 'updateLaborRate' });
		}
		if (!rateName?.trim()) {
			return fail(400, { error: 'Rate name is required', action: 'updateLaborRate' });
		}
		const hourlyRate = parseFloat(hourlyRateRaw);
		if (isNaN(hourlyRate) || hourlyRate < 0) {
			return fail(400, { error: 'Valid hourly rate is required', action: 'updateLaborRate' });
		}

		const { error } = await settingsService.updateLaborRate(id, {
			rate_name: rateName.trim(),
			hourly_rate: hourlyRate,
			description,
			is_default: isDefault
		});

		if (error) {
			return fail(400, { error: error.message ?? 'Failed to update labor rate', action: 'updateLaborRate' });
		}

		return { success: true, action: 'updateLaborRate' };
	},

	/**
	 * Soft-delete a labor rate (sets is_active = false).
	 */
	deleteLaborRate: async ({ request, locals }) => {
		const { supabase } = locals;
		const settingsService = createShopSettingsService(supabase);

		const formData = await request.formData();
		const id = formData.get('rate_id') as string;

		if (!id) {
			return fail(400, { error: 'Rate ID is required', action: 'deleteLaborRate' });
		}

		const { error } = await settingsService.deleteLaborRate(id);

		if (error) {
			return fail(400, { error: error.message ?? 'Failed to delete labor rate', action: 'deleteLaborRate' });
		}

		return { success: true, action: 'deleteLaborRate' };
	}
};
