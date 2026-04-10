import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopSettingsService } from '$lib/services/shop-settings.service';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;
	const settingsService = createShopSettingsService(supabase);

	const { data: settings } = await settingsService.getSettings();

	// If no settings record yet, return null so the page can show setup form
	if (!settings) {
		return { settings: null };
	}

	return { settings };
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
			default_vat_rate: vatRate,
			oem_markup_percentage: parseFloat(formData.get('oem_markup_percentage') as string) || 0,
			alt_markup_percentage: parseFloat(formData.get('alt_markup_percentage') as string) || 0,
			second_hand_markup_percentage: parseFloat(formData.get('second_hand_markup_percentage') as string) || 0,
			outwork_markup_percentage: parseFloat(formData.get('outwork_markup_percentage') as string) || 0,
			default_labour_rate: parseFloat(formData.get('default_labour_rate') as string) || 0,
			default_paint_rate: parseFloat(formData.get('default_paint_rate') as string) || 0
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
	 * Update banking details.
	 */
	updateBankDetails: async ({ request, locals }) => {
		const { supabase } = locals;
		const settingsService = createShopSettingsService(supabase);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Settings ID is required', action: 'updateBankDetails' });
		}

		const { error } = await settingsService.updateSettings(id, {
			bank_name: (formData.get('bank_name') as string) || null,
			bank_account_number: (formData.get('bank_account_number') as string) || null,
			bank_branch_code: (formData.get('bank_branch_code') as string) || null,
			bank_account_holder: (formData.get('bank_account_holder') as string) || null
		});

		if (error) {
			return fail(400, { error: error.message ?? 'Failed to update banking details', action: 'updateBankDetails' });
		}

		return { success: true, action: 'updateBankDetails' };
	}
};
