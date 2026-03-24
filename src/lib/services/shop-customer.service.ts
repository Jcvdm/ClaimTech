// NOTE: Using untyped SupabaseClient because shop tables are not yet reflected
// in database.types.ts. Run `npm run generate:types` after applying migrations
// to the preview database to get full type safety.
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopCustomer {
	id: string;
	shop_id: string;
	name: string;
	phone: string | null;
	email: string | null;
	address: string | null;
	city: string | null;
	province: string | null;
	id_number: string | null;
	company_name: string | null;
	vat_number: string | null;
	notes: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface ShopCustomerVehicle {
	id: string;
	customer_id: string;
	make: string;
	model: string;
	year: number | null;
	reg_number: string | null;
	vin: string | null;
	color: string | null;
	engine_number: string | null;
	mileage_at_registration: number | null;
	notes: string | null;
	created_at: string;
}

export interface CreateShopCustomerInput {
	shop_id: string;
	name: string;
	phone?: string;
	email?: string;
	address?: string;
	city?: string;
	province?: string;
	id_number?: string;
	company_name?: string;
	vat_number?: string;
	notes?: string;
}

export interface CreateShopCustomerVehicleInput {
	customer_id: string;
	make: string;
	model: string;
	year?: number;
	reg_number?: string;
	vin?: string;
	color?: string;
	engine_number?: string;
	mileage_at_registration?: number;
	notes?: string;
}

// ─── Service Factory ──────────────────────────────────────────────────────────

export function createShopCustomerService(supabase: SupabaseClient) {
	return {
		/**
		 * Create a new customer record for a shop.
		 */
		async createCustomer(data: CreateShopCustomerInput) {
			return supabase
				.from('shop_customers')
				.insert({
					shop_id: data.shop_id,
					name: data.name,
					phone: data.phone ?? null,
					email: data.email ?? null,
					address: data.address ?? null,
					city: data.city ?? null,
					province: data.province ?? null,
					id_number: data.id_number ?? null,
					company_name: data.company_name ?? null,
					vat_number: data.vat_number ?? null,
					notes: data.notes ?? null,
					is_active: true
				})
				.select()
				.single();
		},

		/**
		 * Fetch a single customer by ID with their registered vehicles.
		 */
		async getCustomer(id: string) {
			return supabase
				.from('shop_customers')
				.select('*, shop_customer_vehicles(*)')
				.eq('id', id)
				.single();
		},

		/**
		 * List active customers for a shop, with optional text search
		 * across name, phone, and email.
		 */
		async listCustomers(shopId: string, search?: string) {
			let query = supabase
				.from('shop_customers')
				.select('*')
				.eq('shop_id', shopId)
				.eq('is_active', true)
				.order('name');

			if (search && search.trim().length > 0) {
				const term = search.trim();
				query = query.or(
					`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,company_name.ilike.%${term}%`
				);
			}

			return query;
		},

		/**
		 * Update customer details.
		 */
		async updateCustomer(
			id: string,
			data: Partial<Omit<ShopCustomer, 'id' | 'shop_id' | 'created_at'>>
		) {
			return supabase
				.from('shop_customers')
				.update({ ...data, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Soft-delete a customer (sets is_active = false).
		 */
		async deactivateCustomer(id: string) {
			return supabase
				.from('shop_customers')
				.update({ is_active: false, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		// ── Vehicles ────────────────────────────────────────────────────────────

		/**
		 * Add a vehicle to a customer's profile.
		 */
		async addVehicle(data: CreateShopCustomerVehicleInput) {
			return supabase
				.from('shop_customer_vehicles')
				.insert({
					customer_id: data.customer_id,
					make: data.make,
					model: data.model,
					year: data.year ?? null,
					reg_number: data.reg_number ?? null,
					vin: data.vin ?? null,
					color: data.color ?? null,
					engine_number: data.engine_number ?? null,
					mileage_at_registration: data.mileage_at_registration ?? null,
					notes: data.notes ?? null
				})
				.select()
				.single();
		},

		/**
		 * List all vehicles registered to a customer.
		 */
		async listVehicles(customerId: string) {
			return supabase
				.from('shop_customer_vehicles')
				.select('*')
				.eq('customer_id', customerId)
				.order('created_at', { ascending: false });
		},

		/**
		 * Remove a vehicle from a customer's profile.
		 */
		async removeVehicle(vehicleId: string) {
			return supabase
				.from('shop_customer_vehicles')
				.delete()
				.eq('id', vehicleId);
		}
	};
}
