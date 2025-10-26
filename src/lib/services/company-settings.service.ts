import { supabase } from '$lib/supabase';
import type { CompanySettings, UpdateCompanySettingsInput } from '$lib/types/assessment';
import type { ServiceClient } from '$lib/types/service';

class CompanySettingsService {
	/**
	 * Get company settings (always returns single row)
	 */
	async getSettings(client?: ServiceClient): Promise<CompanySettings | null> {
		const db = client ?? supabase;
		const { data, error } = await db.from('company_settings').select('*').single();

		if (error) {
			console.error('Error fetching company settings:', error);
			return null;
		}

		return data;
	}

	/**
	 * Update company settings
	 */
	async updateSettings(input: UpdateCompanySettingsInput, client?: ServiceClient): Promise<CompanySettings | null> {
		// Get the single settings row
		const existing = await this.getSettings(client);
		if (!existing) {
			throw new Error('Company settings not found');
		}

		const db = client ?? supabase;
		const { data, error } = await db
			.from('company_settings')
			.update(input)
			.eq('id', existing.id)
			.select()
			.single();

		if (error) {
			console.error('Error updating company settings:', error);
			throw error;
		}

		return data;
	}
}

export const companySettingsService = new CompanySettingsService();

