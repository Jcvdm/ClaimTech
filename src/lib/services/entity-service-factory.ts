import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type { Database } from '$lib/types/database';

type Tables = Database['public']['Tables'];

/**
 * Constrain to tables whose Row has both `id` (string) and `is_active`
 * (boolean | null). This catches the 3 core entity tables (clients,
 * engineers, repairers) and prevents passing an arbitrary table name at
 * compile time.
 */
type EntityTableName = {
	[K in keyof Tables]: Tables[K]['Row'] extends {
		id: string;
		is_active: boolean | null;
	}
		? K
		: never;
}[keyof Tables];

/**
 * Factory that generates the 5 standard CRUD methods shared by the 3 core
 * entity services (clients, engineers, repairers). All three are ~90 %
 * byte-identical modulo table name, type, and order field — this factory
 * captures that shared logic once.
 *
 * TDomain defaults to the DB-generated Row type. Each service file passes
 * its hand-written domain type explicitly so the public API stays fully typed.
 *
 * The Supabase client is cast to `any` inside the factory to avoid
 * TypeScript's overly strict generic column-name inference on `.eq()`. The
 * EntityTableName constraint already guarantees at compile time that every
 * valid table has `id` and `is_active`, so the cast is safe. This mirrors
 * the pattern used in assessment-subtable-factory.ts (PR 1) and
 * photo-service-factory.ts (PR 3).
 */
export function createEntityService<
	TTable extends EntityTableName,
	TInsert,
	TUpdate,
	TDomain = Tables[TTable]['Row']
>(config: {
	/** Supabase table name (must satisfy EntityTableName constraint) */
	table: TTable;
	/** Human-readable label used verbatim in error messages, e.g. 'client' */
	label: string;
	/** Column to ORDER BY in list(), e.g. 'name' */
	orderField: string;
}) {
	const { table, label, orderField } = config;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function getDb(client?: ServiceClient): any {
		return client ?? supabase;
	}

	return {
		/**
		 * List all entities. If activeOnly is true, filters is_active = true.
		 */
		async list(activeOnly = false, client?: ServiceClient): Promise<TDomain[]> {
			const db = getDb(client);

			let query = db.from(table).select('*').order(orderField, { ascending: true });

			if (activeOnly) {
				query = query.eq('is_active', true);
			}

			const { data, error } = await query;

			if (error) {
				console.error(`Error fetching ${label}s:`, error);
				throw new Error(`Failed to fetch ${label}s: ${error.message}`);
			}

			return (data as unknown as TDomain[]) || [];
		},

		/**
		 * Get a single entity by ID. Returns null if not found (PGRST116).
		 */
		async getById(id: string, client?: ServiceClient): Promise<TDomain | null> {
			const db = getDb(client);

			const { data, error } = await db.from(table).select('*').eq('id', id).single();

			if (error) {
				if (error.code === 'PGRST116') {
					return null; // Not found
				}
				console.error(`Error fetching ${label}:`, error);
				throw new Error(`Failed to fetch ${label}: ${error.message}`);
			}

			return data as unknown as TDomain;
		},

		/**
		 * Create a new entity. Sets is_active = true.
		 */
		async create(input: TInsert, client?: ServiceClient): Promise<TDomain> {
			const db = getDb(client);

			const { data, error } = await db
				.from(table)
				.insert({
					...input,
					is_active: true
				})
				.select()
				.single();

			if (error) {
				console.error(`Error creating ${label}:`, error);
				throw new Error(`Failed to create ${label}: ${error.message}`);
			}

			return data as unknown as TDomain;
		},

		/**
		 * Update an existing entity by ID. Returns null if not found (PGRST116).
		 */
		async update(id: string, input: TUpdate, client?: ServiceClient): Promise<TDomain | null> {
			const db = getDb(client);

			const { data, error } = await db
				.from(table)
				.update(input)
				.eq('id', id)
				.select()
				.single();

			if (error) {
				if (error.code === 'PGRST116') {
					return null; // Not found
				}
				console.error(`Error updating ${label}:`, error);
				throw new Error(`Failed to update ${label}: ${error.message}`);
			}

			return data as unknown as TDomain;
		},

		/**
		 * Soft-delete an entity by setting is_active = false. Returns true on success.
		 */
		async softDelete(id: string, client?: ServiceClient): Promise<boolean> {
			const db = getDb(client);

			const { error } = await db
				.from(table)
				.update({ is_active: false })
				.eq('id', id);

			if (error) {
				console.error(`Error deleting ${label}:`, error);
				throw new Error(`Failed to delete ${label}: ${error.message}`);
			}

			return true;
		}
	};
}
