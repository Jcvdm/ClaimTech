import { supabase } from '$lib/supabase';
import { createEntityService } from './entity-service-factory';
import type { Engineer, CreateEngineerInput, UpdateEngineerInput } from '$lib/types/engineer';
import type { ServiceClient } from '$lib/types/service';

const base = createEntityService<'engineers', CreateEngineerInput, UpdateEngineerInput, Engineer>({
	table: 'engineers',
	label: 'engineer',
	orderField: 'name'
});

/**
 * EngineerService class — exported for callsites that instantiate via
 * `new EngineerService()`. All methods delegate to the factory-backed
 * `engineerService` singleton so behaviour is identical.
 */
export class EngineerService {
	listEngineers(activeOnly = true, client?: ServiceClient) {
		return base.list(activeOnly, client);
	}
	getEngineer(id: string, client?: ServiceClient) {
		return base.getById(id, client);
	}
	createEngineer(input: CreateEngineerInput, client?: ServiceClient) {
		return base.create(input, client);
	}
	updateEngineer(id: string, input: UpdateEngineerInput, client?: ServiceClient) {
		return base.update(id, input, client);
	}
	deleteEngineer(id: string, client?: ServiceClient) {
		return base.softDelete(id, client);
	}

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

	async listEngineersByProvince(
		province: string,
		activeOnly = true,
		client?: ServiceClient
	): Promise<Engineer[]> {
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

export type { Engineer, CreateEngineerInput, UpdateEngineerInput };
