import { supabase } from '$lib/supabase';
import { createEntityService } from './entity-service-factory';
import type { Client, CreateClientInput, UpdateClientInput } from '$lib/types/client';
import type { ServiceClient } from '$lib/types/service';

// Maximum length for Terms & Conditions fields
const MAX_TCS_LENGTH = 10000;

const base = createEntityService<'clients', CreateClientInput, UpdateClientInput, Client>({
	table: 'clients',
	label: 'client',
	orderField: 'name'
});

// T&C validation — must run BEFORE factory insert/update
function validateTermsAndConditions(input: CreateClientInput | UpdateClientInput): void {
	const fields = [
		{ name: 'assessment_terms_and_conditions', value: input.assessment_terms_and_conditions },
		{ name: 'estimate_terms_and_conditions', value: input.estimate_terms_and_conditions },
		{ name: 'frc_terms_and_conditions', value: input.frc_terms_and_conditions }
	] as const;

	for (const field of fields) {
		if (field.value && field.value.length > MAX_TCS_LENGTH) {
			throw new Error(
				`${field.name} exceeds maximum length of ${MAX_TCS_LENGTH.toLocaleString()} characters (current: ${field.value.length.toLocaleString()})`
			);
		}
	}
}

export const clientService = {
	// Historical method names — preserved for zero callsite changes
	listClients: (activeOnly = true, client?: ServiceClient) => base.list(activeOnly, client),
	getClient: (id: string, client?: ServiceClient) => base.getById(id, client),

	// T&C validation wraps create/update
	async createClient(input: CreateClientInput, client?: ServiceClient): Promise<Client> {
		validateTermsAndConditions(input);
		return base.create(input, client);
	},

	async updateClient(
		id: string,
		input: UpdateClientInput,
		client?: ServiceClient
	): Promise<Client | null> {
		validateTermsAndConditions(input);
		return base.update(id, input, client);
	},

	deleteClient: (id: string, client?: ServiceClient) => base.softDelete(id, client),

	// Extension: search clients by name
	async searchClients(
		searchTerm: string,
		activeOnly = true,
		client?: ServiceClient
	): Promise<Client[]> {
		const db = client ?? supabase;

		let query = db
			.from('clients')
			.select('*')
			.ilike('name', `%${searchTerm}%`)
			.order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error searching clients:', error);
			throw new Error(`Failed to search clients: ${error.message}`);
		}

		return (data || []) as Client[];
	},

	// Extension: get clients filtered by type
	async getClientsByType(
		type: 'insurance' | 'private',
		activeOnly = true,
		client?: ServiceClient
	): Promise<Client[]> {
		const db = client ?? supabase;

		let query = db
			.from('clients')
			.select('*')
			.eq('type', type)
			.order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching clients by type:', error);
			throw new Error(`Failed to fetch clients by type: ${error.message}`);
		}

		return (data || []) as Client[];
	},

	// Extension: fetch only T&C fields for a client
	async getClientTermsAndConditions(
		clientId: string,
		client?: ServiceClient
	): Promise<{
		assessment_terms_and_conditions: string | null;
		estimate_terms_and_conditions: string | null;
		frc_terms_and_conditions: string | null;
	} | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('clients')
			.select('assessment_terms_and_conditions, estimate_terms_and_conditions, frc_terms_and_conditions')
			.eq('id', clientId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching client T&Cs:', error);
			throw new Error(`Failed to fetch client T&Cs: ${error.message}`);
		}

		return data;
	}
};

export type { Client, CreateClientInput, UpdateClientInput };
