import { supabase } from '$lib/supabase';
import { createEntityService } from './entity-service-factory';
import type { Repairer, CreateRepairerInput, UpdateRepairerInput } from '$lib/types/repairer';
import type { ServiceClient } from '$lib/types/service';

const base = createEntityService<'repairers', CreateRepairerInput, UpdateRepairerInput, Repairer>({
	table: 'repairers',
	label: 'repairer',
	orderField: 'name'
});

export const repairerService = {
	// Historical method names — preserved for zero callsite changes
	listRepairers: (activeOnly = true, client?: ServiceClient) => base.list(activeOnly, client),
	getRepairer: (id: string, client?: ServiceClient) => base.getById(id, client),
	createRepairer: (input: CreateRepairerInput, client?: ServiceClient) =>
		base.create(input, client),
	updateRepairer: (id: string, input: UpdateRepairerInput, client?: ServiceClient) =>
		base.update(id, input, client),
	deleteRepairer: (id: string, client?: ServiceClient) => base.softDelete(id, client),

	// Extension: search repairers by name
	async searchRepairers(
		searchTerm: string,
		activeOnly = true,
		client?: ServiceClient
	): Promise<Repairer[]> {
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

		return (data as unknown as Repairer[]) || [];
	}
};

export type { Repairer, CreateRepairerInput, UpdateRepairerInput };
