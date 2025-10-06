import { supabase } from '$lib/supabase';
import type { Engineer, CreateEngineerInput, UpdateEngineerInput } from '$lib/types/engineer';

export class EngineerService {
	/**
	 * List all engineers
	 */
	async listEngineers(activeOnly = true): Promise<Engineer[]> {
		let query = supabase.from('engineers').select('*').order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching engineers:', error);
			throw new Error(`Failed to fetch engineers: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get a single engineer by ID
	 */
	async getEngineer(id: string): Promise<Engineer | null> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Create a new engineer
	 */
	async createEngineer(input: CreateEngineerInput): Promise<Engineer> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Update an existing engineer
	 */
	async updateEngineer(id: string, input: UpdateEngineerInput): Promise<Engineer | null> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Soft delete an engineer (set is_active to false)
	 */
	async deleteEngineer(id: string): Promise<boolean> {
		const { error } = await supabase
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
	async getEngineerByEmail(email: string): Promise<Engineer | null> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * List engineers by province
	 */
	async listEngineersByProvince(province: string, activeOnly = true): Promise<Engineer[]> {
		let query = supabase
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

		return data || [];
	}
}

export const engineerService = new EngineerService();

