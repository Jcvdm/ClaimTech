import { companySettingsService } from '$lib/services/company-settings.service';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const settings = await companySettingsService.getSettings(locals.supabase);

	return {
		settings
	};
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const formData = await request.formData();

		const input = {
			company_name: formData.get('company_name') as string,
			po_box: formData.get('po_box') as string,
			city: formData.get('city') as string,
			province: formData.get('province') as string,
			postal_code: formData.get('postal_code') as string,
			phone: formData.get('phone') as string,
			fax: formData.get('fax') as string,
			email: formData.get('email') as string,
			website: formData.get('website') as string
		};

		try {
			await companySettingsService.updateSettings(input, locals.supabase);
			return { success: true };
		} catch (error) {
			console.error('Error updating settings:', error);
			return fail(500, { error: 'Failed to update settings' });
		}
	}
};

