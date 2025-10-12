import { supabase } from '$lib/supabaseClient';
import type { CompanySettings, UpdateCompanySettingsInput } from '$lib/types/assessment';

class CompanySettingsService {
	/**
	 * Get company settings (always returns single row)
	 */
	async getSettings(): Promise<CompanySettings | null> {
		const { data, error } = await supabase.from('company_settings').select('*').single();

		if (error) {
			console.error('Error fetching company settings:', error);
			return null;
		}

		return data;
	}

	/**
	 * Update company settings
	 */
	async updateSettings(input: UpdateCompanySettingsInput): Promise<CompanySettings | null> {
		// Get the single settings row
		const existing = await this.getSettings();
		if (!existing) {
			throw new Error('Company settings not found');
		}

		const { data, error } = await supabase
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

