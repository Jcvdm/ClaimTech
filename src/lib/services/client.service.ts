import { supabase } from '$lib/supabase';
import type { Client, CreateClientInput, UpdateClientInput } from '$lib/types/client';

export class ClientService {
	/**
	 * List all clients
	 */
	async listClients(activeOnly = true): Promise<Client[]> {
		let query = supabase.from('clients').select('*').order('name', { ascending: true });

		if (activeOnly) {
			query = query.eq('is_active', true);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching clients:', error);
			throw new Error(`Failed to fetch clients: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get a single client by ID
	 */
	async getClient(id: string): Promise<Client | null> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Create a new client
	 */
	async createClient(input: CreateClientInput): Promise<Client> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Update an existing client
	 */
	async updateClient(id: string, input: UpdateClientInput): Promise<Client | null> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Soft delete a client (set is_active to false)
	 */
	async deleteClient(id: string): Promise<boolean> {
		const { error } = await supabase
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
	async searchClients(searchTerm: string, activeOnly = true): Promise<Client[]> {
		let query = supabase
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

		return data || [];
	}

	/**
	 * Get clients by type
	 */
	async getClientsByType(type: 'insurance' | 'private', activeOnly = true): Promise<Client[]> {
		let query = supabase
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

		return data || [];
	}
}

export const clientService = new ClientService();

