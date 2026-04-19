import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type { Database } from '$lib/types/database';

type Tables = Database['public']['Tables'];

/**
 * Constrain to tables whose Row has both `photo_url` (string | null) and
 * `display_order` (number | null). This catches exactly the 6 vanilla photo
 * tables and prevents passing an arbitrary table name at compile time.
 */
type PhotoTableName = {
	[K in keyof Tables]: Tables[K]['Row'] extends {
		photo_url: string | null;
		display_order: number | null;
	}
		? K
		: never;
}[keyof Tables];

export interface PhotoServiceConfig<TTable extends PhotoTableName> {
	/** Supabase table name (must satisfy PhotoTableName constraint) */
	table: TTable;
	/** The FK column name for the parent entity (e.g. 'estimate_id') */
	parentIdField: string;
	/** Extra fields to include in INSERT/UPDATE (e.g. ['panel'] for damage) */
	extraUpdateFields?: readonly string[];
	/** Human-readable label used verbatim in error messages (e.g. 'estimate photos') */
	label: string;
}

/**
 * Factory that generates the 7 standard methods shared by the 6 vanilla photo
 * services. All 6 services are ~95 % byte-identical modulo table name,
 * parent-ID field, and (for damage) one extra column — this factory captures
 * that shared logic once.
 *
 * TDomain defaults to the DB-generated Row type. Each service file passes its
 * hand-written domain type explicitly so the public API stays fully typed.
 *
 * The Supabase client is cast to `any` inside the factory to avoid TypeScript's
 * overly strict generic column-name inference on `.eq()`. The PhotoTableName
 * constraint already guarantees at compile time that every valid table has the
 * expected columns, so the cast is safe. This mirrors the pattern used in
 * assessment-subtable-factory.ts (PR 1).
 */
export function createPhotoService<
	TTable extends PhotoTableName,
	TInsert,
	TUpdate,
	TDomain = Tables[TTable]['Row']
>(config: PhotoServiceConfig<TTable>) {
	const { table, parentIdField, extraUpdateFields = [], label } = config;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function getDb(client?: ServiceClient): any {
		return client ?? supabase;
	}

	return {
		/**
		 * Get all photos for a parent entity, ordered by display_order then created_at.
		 */
		async getPhotos(parentId: string, client?: ServiceClient): Promise<TDomain[]> {
			const db = getDb(client);
			const { data, error } = await db
				.from(table)
				.select('*')
				.eq(parentIdField, parentId)
				.order('display_order', { ascending: true })
				.order('created_at', { ascending: true });

			if (error) {
				console.error(`Error fetching ${label}:`, error);
				throw new Error(`Failed to fetch ${label}: ${error.message}`);
			}

			return (data as unknown as TDomain[]) || [];
		},

		/**
		 * Create a new photo record. Explicitly lists the standard fields plus any
		 * extraUpdateFields to avoid leaking unexpected input columns.
		 */
		async createPhoto(input: TInsert, client?: ServiceClient): Promise<TDomain> {
			const db = getDb(client);
			const record = input as Record<string, unknown>;

			const insertData: Record<string, unknown> = {
				[parentIdField]: record[parentIdField],
				photo_url: record.photo_url,
				photo_path: record.photo_path,
				label: record.label || null,
				display_order: record.display_order || 0
			};

			for (const field of extraUpdateFields) {
				insertData[field] = record[field] || null;
			}

			const { data, error } = await db
				.from(table)
				.insert(insertData)
				.select()
				.single();

			if (error) {
				console.error(`Error creating ${label}:`, error);
				throw new Error(`Failed to create ${label}: ${error.message}`);
			}

			return data as unknown as TDomain;
		},

		/**
		 * Update a photo's label, display_order, or any extraUpdateFields.
		 */
		async updatePhoto(photoId: string, input: TUpdate, client?: ServiceClient): Promise<TDomain> {
			const db = getDb(client);
			const record = input as Record<string, unknown>;

			const updateData: Record<string, unknown> = {
				label: record.label,
				display_order: record.display_order
			};

			for (const field of extraUpdateFields) {
				if (field in record) {
					updateData[field] = record[field];
				}
			}

			const { data, error } = await db
				.from(table)
				.update(updateData)
				.eq('id', photoId)
				.select()
				.single();

			if (error) {
				console.error(`Error updating ${label}:`, error);
				throw new Error(`Failed to update ${label}: ${error.message}`);
			}

			return data as unknown as TDomain;
		},

		/**
		 * Update a photo's label only. Thin wrapper over updatePhoto.
		 */
		async updatePhotoLabel(photoId: string, photoLabel: string, client?: ServiceClient): Promise<TDomain> {
			return this.updatePhoto(photoId, { label: photoLabel } as TUpdate, client);
		},

		/**
		 * Delete a photo by ID.
		 */
		async deletePhoto(photoId: string, client?: ServiceClient): Promise<void> {
			const db = getDb(client);
			const { error } = await db.from(table).delete().eq('id', photoId);

			if (error) {
				console.error(`Error deleting ${label}:`, error);
				throw new Error(`Failed to delete ${label}: ${error.message}`);
			}
		},

		/**
		 * Reorder photos by updating each photo's display_order to its index
		 * in the provided array. Uses a sequential loop (no Promise.all) to
		 * match the behaviour of the 5 vanilla services.
		 */
		async reorderPhotos(parentId: string, photoIds: string[], client?: ServiceClient): Promise<void> {
			const db = getDb(client);
			const updates = photoIds.map((photoId, index) => ({
				id: photoId,
				display_order: index
			}));

			for (const update of updates) {
				await db
					.from(table)
					.update({ display_order: update.display_order })
					.eq('id', update.id)
					.eq(parentIdField, parentId);
			}
		},

		/**
		 * Get the next display_order value for a new photo.
		 * Returns 0 when there are no existing photos (PGRST116 = no rows).
		 */
		async getNextDisplayOrder(parentId: string, client?: ServiceClient): Promise<number> {
			const db = getDb(client);
			const { data, error } = await db
				.from(table)
				.select('display_order')
				.eq(parentIdField, parentId)
				.order('display_order', { ascending: false })
				.limit(1)
				.single();

			if (error && error.code !== 'PGRST116') {
				// PGRST116 = no rows returned
				console.error('Error getting next display order:', error);
				return 0;
			}

			return data ? (data.display_order || 0) + 1 : 0;
		}
	};
}
