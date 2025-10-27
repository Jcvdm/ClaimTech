import { supabase } from '$lib/supabase';
import type { Repairer, CreateRepairerInput, UpdateRepairerInput } from '$lib/types/repairer';
import type { ServiceClient } from '$lib/types/service';

export class RepairerService {
	/**
	 * List all repairers
	 */
	async listRepairers(activeOnly = true, client?: ServiceClient): Promise<Repairer[]> {
		const db = client ?? supabase;

		let query = db.from('repairers').select('*').order('name', { ascending: true });

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
	async getRepairer(id: string, client?: ServiceClient): Promise<Repairer | null> {
		const db = client ?? supabase;

		const { data, error } = await db
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
	async createRepairer(input: CreateRepairerInput, client?: ServiceClient): Promise<Repairer> {
		const db = client ?? supabase;

		const { data, error } = await db
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
	async updateRepairer(id: string, input: UpdateRepairerInput, client?: ServiceClient): Promise<Repairer | null> {
		const db = client ?? supabase;

		const { data, error } = await db
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
	async deleteRepairer(id: string, client?: ServiceClient): Promise<boolean> {
		const db = client ?? supabase;

		const { error } = await db
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
	async searchRepairers(searchTerm: string, activeOnly = true, client?: ServiceClient): Promise<Repairer[]> {
		const db = client ?? supabase;

		let query = db
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

