import { supabase } from '$lib/supabase';
import type { Engineer, CreateEngineerInput, UpdateEngineerInput } from '$lib/types/engineer';
import type { ServiceClient } from '$lib/types/service';

export class EngineerService {
	/**
	 * List all engineers
	 */
	async listEngineers(activeOnly = true, client?: ServiceClient): Promise<Engineer[]> {
		const db = client ?? supabase;

		let query = db.from('engineers').select('*').order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching engineers:', error);
			throw new Error(`Failed to fetch engineers: ${error.message}`);
		}

		return (data as Engineer[]) || [];
	}

	/**
	 * Get a single engineer by ID
	 */
	async getEngineer(id: string, client?: ServiceClient): Promise<Engineer | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('engineers')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching engineer:', error);
			throw new Error(`Failed to fetch engineer: ${error.message}`);
		}

		return data as Engineer;
	}

	/**
	 * Create a new engineer
	 */
	async createEngineer(input: CreateEngineerInput, client?: ServiceClient): Promise<Engineer> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('engineers')
			.insert({
				...input,
				is_active: true
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating engineer:', error);
			throw new Error(`Failed to create engineer: ${error.message}`);
		}

		return data as Engineer;
	}

	/**
	 * Update an existing engineer
	 */
	async updateEngineer(id: string, input: UpdateEngineerInput, client?: ServiceClient): Promise<Engineer | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('engineers')
			.update(input)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error updating engineer:', error);
			throw new Error(`Failed to update engineer: ${error.message}`);
		}

		return data as Engineer;
	}

	/**
	 * Soft delete an engineer (set is_active to false)
	 */
	async deleteEngineer(id: string, client?: ServiceClient): Promise<boolean> {
		const db = client ?? supabase;

		const { error } = await db
			.from('engineers')
			.update({ is_active: false })
			.eq('id', id);

		if (error) {
			console.error('Error deleting engineer:', error);
			throw new Error(`Failed to delete engineer: ${error.message}`);
		}

		return true;
	}

	/**
	 * Get engineer by email
	 */
	async getEngineerByEmail(email: string, client?: ServiceClient): Promise<Engineer | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('engineers')
			.select('*')
			.eq('email', email)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching engineer by email:', error);
			throw new Error(`Failed to fetch engineer by email: ${error.message}`);
		}

		return data as unknown as Engineer;
	}

	/**
	 * List engineers by province
	 */
	async listEngineersByProvince(province: string, activeOnly = true, client?: ServiceClient): Promise<Engineer[]> {
		const db = client ?? supabase;

		let query = db
			.from('engineers')
			.select('*')
			.eq('province', province)
			.order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching engineers by province:', error);
			throw new Error(`Failed to fetch engineers: ${error.message}`);
		}

		return (data as Engineer[]) || [];
	}
}

export const engineerService = new EngineerService();

