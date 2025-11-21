import { supabase } from '$lib/supabase';
import type { Client, CreateClientInput, UpdateClientInput } from '$lib/types/client';
import type { ServiceClient } from '$lib/types/service';

// Maximum length for Terms & Conditions fields
const MAX_TCS_LENGTH = 10000;

export class ClientService {
	/**
	 * Validate Terms & Conditions fields
	 * Ensures T&Cs don't exceed maximum length
	 */
	private validateTermsAndConditions(input: CreateClientInput | UpdateClientInput): void {
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
	/**
	 * List all clients
	 */
	async listClients(activeOnly = true, client?: ServiceClient): Promise<Client[]> {
		const db = client ?? supabase;

		let query = db.from('clients').select('*').order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching clients:', error);
			throw new Error(`Failed to fetch clients: ${error.message}`);
		}

		return (data || []) as Client[];
	}

	/**
	 * Get a single client by ID
	 */
	async getClient(id: string, client?: ServiceClient): Promise<Client | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('clients')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error fetching client:', error);
			throw new Error(`Failed to fetch client: ${error.message}`);
		}

		return data as Client;
	}

	/**
	 * Create a new client
	 */
	async createClient(input: CreateClientInput, client?: ServiceClient): Promise<Client> {
		// Validate T&Cs field lengths
		this.validateTermsAndConditions(input);

		const db = client ?? supabase;

		const { data, error } = await db
			.from('clients')
			.insert({
				...input,
				is_active: true
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating client:', error);
			throw new Error(`Failed to create client: ${error.message}`);
		}

		return data as Client;
	}

	/**
	 * Update an existing client
	 */
	async updateClient(id: string, input: UpdateClientInput, client?: ServiceClient): Promise<Client | null> {
		// Validate T&Cs field lengths
		this.validateTermsAndConditions(input);

		const db = client ?? supabase;

		const { data, error } = await db
			.from('clients')
			.update(input)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			console.error('Error updating client:', error);
			throw new Error(`Failed to update client: ${error.message}`);
		}

		return data as Client;
	}

	/**
	 * Soft delete a client (set is_active to false)
	 */
	async deleteClient(id: string, client?: ServiceClient): Promise<boolean> {
		const db = client ?? supabase;

		const { error } = await db
			.from('clients')
			.update({ is_active: false })
			.eq('id', id);

		if (error) {
			console.error('Error deleting client:', error);
			throw new Error(`Failed to delete client: ${error.message}`);
		}

		return true;
	}

	/**
	 * Search clients by name
	 */
	async searchClients(searchTerm: string, activeOnly = true, client?: ServiceClient): Promise<Client[]> {
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
	}

	/**
	 * Get clients by type
	 */
	async getClientsByType(type: 'insurance' | 'private', activeOnly = true, client?: ServiceClient): Promise<Client[]> {
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
	}

	/**
	 * Get client Terms & Conditions fields only
	 * Used by PDF generation to minimize data transfer
	 * @returns Object with T&Cs fields or null if client not found
	 */
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
}

export const clientService = new ClientService();

