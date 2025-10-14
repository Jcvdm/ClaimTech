import { supabase } from '$lib/supabase';
import type { Repairer, CreateRepairerInput, UpdateRepairerInput } from '$lib/types/repairer';

export class RepairerService {
	/**
	 * List all repairers
	 */
	async listRepairers(activeOnly = true): Promise<Repairer[]> {
		let query = supabase.from('repairers').select('*').order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching repairers:', error);
			throw new Error(`Failed to fetch repairers: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get a single repairer by ID
	 */
	async getRepairer(id: string): Promise<Repairer | null> {
		const { data, error } = await supabase
			.from('repairers')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching repairer:', error);
			throw new Error(`Failed to fetch repairer: ${error.message}`);
		}

		return data;
	}

	/**
	 * Create a new repairer
	 */
	async createRepairer(input: CreateRepairerInput): Promise<Repairer> {
		const { data, error } = await supabase
			.from('repairers')
			.insert({
				...input,
				is_active: true
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating repairer:', error);
			throw new Error(`Failed to create repairer: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update an existing repairer
	 */
	async updateRepairer(id: string, input: UpdateRepairerInput): Promise<Repairer | null> {
		const { data, error } = await supabase
			.from('repairers')
			.update(input)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error updating repairer:', error);
			throw new Error(`Failed to update repairer: ${error.message}`);
		}

		return data;
	}

	/**
	 * Soft delete a repairer (set is_active to false)
	 */
	async deleteRepairer(id: string): Promise<boolean> {
		const { error } = await supabase
			.from('repairers')
			.update({ is_active: false })
			.eq('id', id);

		if (error) {
			console.error('Error deleting repairer:', error);
			throw new Error(`Failed to delete repairer: ${error.message}`);
		}

		return true;
	}

	/**
	 * Search repairers by name
	 */
	async searchRepairers(searchTerm: string, activeOnly = true): Promise<Repairer[]> {
		let query = supabase
			.from('repairers')
			.select('*')
			.ilike('name', `%${searchTerm}%`)
			.order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error searching repairers:', error);
			throw new Error(`Failed to search repairers: ${error.message}`);
		}

		return data || [];
	}
}

export const repairerService = new RepairerService();

