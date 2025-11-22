import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Client } from '$lib/types/client';
import type { Repairer } from '$lib/types/repairer';
import type { Estimate } from '$lib/types/assessment';

/**
 * Fetch client by request ID with proper error handling
 * Returns a consistent shape: { data: Client | null; error: PostgrestError | null }
 *
 * @param requestId - The request ID to look up
 * @param db - Supabase client instance
 * @returns Promise with client data or null, and any error
 */
export async function getClientByRequestId(
	requestId: string | null | undefined,
	db: SupabaseClient<Database>
): Promise<{ data: Client | null; error: PostgrestError | null }> {
	if (!requestId) {
		return { data: null, error: null };
	}

	try {
		// First, fetch the request to get client_id
		const { data: requestRow, error: requestError } = await db
			.from('requests')
			.select('client_id')
			.eq('id', requestId)
			.single();

		if (requestError || !requestRow) {
			return { data: null, error: requestError };
		}

		// Then fetch the client
		const { data: client, error: clientError } = await db
			.from('clients')
			.select('*')
			.eq('id', requestRow.client_id)
			.single();

		return { data: (client as Client) || null, error: clientError || null };
	} catch (err) {
		console.error('Error fetching client by request ID:', err);
		return { data: null, error: err as PostgrestError };
	}
}

/**
 * Fetch repairer by estimate with proper error handling
 * Returns a consistent shape: { data: Repairer | null; error: PostgrestError | null }
 *
 * @param estimate - The estimate object (may be null)
 * @param db - Supabase client instance
 * @returns Promise with repairer data or null, and any error
 */
export async function getRepairerForEstimate(
	estimate: Estimate | null | undefined,
	db: SupabaseClient<Database>
): Promise<{ data: Repairer | null; error: PostgrestError | null }> {
	if (!estimate?.repairer_id) {
		return { data: null, error: null };
	}

	try {
		const { data: repairer, error: repairerError } = await db
			.from('repairers')
			.select('*')
			.eq('id', estimate.repairer_id)
			.single();

		return { data: repairer || null, error: repairerError || null };
	} catch (err) {
		console.error('Error fetching repairer for estimate:', err);
		return { data: null, error: err as PostgrestError };
	}
}

/**
 * Fetch repairer by repairer ID with proper error handling
 * Returns a consistent shape: { data: Repairer | null; error: PostgrestError | null }
 *
 * @param repairerId - The repairer ID to look up
 * @param db - Supabase client instance
 * @returns Promise with repairer data or null, and any error
 */
export async function getRepairerById(
	repairerId: string | null | undefined,
	db: SupabaseClient<Database>
): Promise<{ data: Repairer | null; error: PostgrestError | null }> {
	if (!repairerId) {
		return { data: null, error: null };
	}

	try {
		const { data: repairer, error: repairerError } = await db
			.from('repairers')
			.select('*')
			.eq('id', repairerId)
			.single();

		return { data: repairer || null, error: repairerError || null };
	} catch (err) {
		console.error('Error fetching repairer by ID:', err);
		return { data: null, error: err as PostgrestError };
	}
}

