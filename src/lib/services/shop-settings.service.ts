// NOTE: Using untyped SupabaseClient because shop tables are not yet reflected
// in database.types.ts. Run `npm run generate:types` after applying migrations
// to the preview database to get full type safety.
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopSettings {
	id: string;
	shop_name: string;
	phone: string | null;
	email: string | null;
	address: string | null;
	city: string | null;
	province: string | null;
	postal_code: string | null;
	vat_number: string | null;
	registration_number: string | null;
	default_vat_rate: number;
	default_markup_parts: number;
	default_markup_labor: number;
	currency: string;
	logo_url: string | null;
	estimate_terms: string | null;
	invoice_terms: string | null;
	invoice_payment_days: number;
	created_at: string;
	updated_at: string;
}

export interface ShopLaborRate {
	id: string;
	shop_id: string;
	job_type: 'autobody' | 'mechanical';
	rate_name: string;
	description: string | null;
	hourly_rate: number;
	is_default: boolean;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface CreateShopLaborRateInput {
	shop_id: string;
	job_type: 'autobody' | 'mechanical';
	rate_name: string;
	hourly_rate: number;
	description?: string;
	is_default?: boolean;
}

// ─── Service Factory ──────────────────────────────────────────────────────────

export function createShopSettingsService(supabase: SupabaseClient) {
	return {
		/**
		 * Get the shop settings record.
		 * Returns the first (and typically only) row.
		 */
		async getSettings() {
			return supabase
				.from('shop_settings')
				.select('*')
				.limit(1)
				.single();
		},

		/**
		 * Get shop settings by ID.
		 */
		async getSettingsById(id: string) {
			return supabase
				.from('shop_settings')
				.select('*')
				.eq('id', id)
				.single();
		},

		/**
		 * Update shop settings.
		 */
		async updateSettings(
			id: string,
			data: Partial<Omit<ShopSettings, 'id' | 'created_at'>>
		) {
			return supabase
				.from('shop_settings')
				.update({ ...data, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Create a new shop settings record (typically only needed on first setup).
		 */
		async createSettings(data: { shop_name: string; currency?: string; default_vat_rate?: number }) {
			return supabase
				.from('shop_settings')
				.insert({
					shop_name: data.shop_name,
					currency: data.currency ?? 'ZAR',
					default_vat_rate: data.default_vat_rate ?? 15.00,
					default_markup_parts: 25.00,
					default_markup_labor: 0.00,
					invoice_payment_days: 30
				})
				.select()
				.single();
		},

		// ── Labor Rates ─────────────────────────────────────────────────────────

		/**
		 * List active labor rates for a shop, optionally filtered by job type.
		 */
		async getLaborRates(shopId: string, jobType?: 'autobody' | 'mechanical') {
			let query = supabase
				.from('shop_labor_rates')
				.select('*')
				.eq('shop_id', shopId)
				.eq('is_active', true)
				.order('rate_name');

			if (jobType) {
				query = query.eq('job_type', jobType);
			}

			return query;
		},

		/**
		 * Get the default labor rate for a shop and job type.
		 */
		async getDefaultLaborRate(shopId: string, jobType: 'autobody' | 'mechanical') {
			return supabase
				.from('shop_labor_rates')
				.select('*')
				.eq('shop_id', shopId)
				.eq('job_type', jobType)
				.eq('is_default', true)
				.eq('is_active', true)
				.single();
		},

		/**
		 * Create a new labor rate for a shop.
		 */
		async createLaborRate(data: CreateShopLaborRateInput) {
			return supabase
				.from('shop_labor_rates')
				.insert({
					shop_id: data.shop_id,
					job_type: data.job_type,
					rate_name: data.rate_name,
					hourly_rate: data.hourly_rate,
					description: data.description ?? null,
					is_default: data.is_default ?? false,
					is_active: true
				})
				.select()
				.single();
		},

		/**
		 * Update an existing labor rate.
		 */
		async updateLaborRate(
			id: string,
			data: Partial<Omit<ShopLaborRate, 'id' | 'shop_id' | 'created_at'>>
		) {
			return supabase
				.from('shop_labor_rates')
				.update({ ...data, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Soft-delete a labor rate (sets is_active = false).
		 */
		async deleteLaborRate(id: string) {
			return supabase
				.from('shop_labor_rates')
				.update({ is_active: false, updated_at: new Date().toISOString() })
				.eq('id', id);
		},

		/**
		 * Set a labor rate as the default for its shop + job type combination.
		 * Clears the default flag from any previously-default rate first.
		 */
		async setDefaultLaborRate(id: string, shopId: string, jobType: 'autobody' | 'mechanical') {
			// Clear current default(s)
			await supabase
				.from('shop_labor_rates')
				.update({ is_default: false, updated_at: new Date().toISOString() })
				.eq('shop_id', shopId)
				.eq('job_type', jobType)
				.eq('is_default', true);

			// Set the new default
			return supabase
				.from('shop_labor_rates')
				.update({ is_default: true, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		}
	};
}
