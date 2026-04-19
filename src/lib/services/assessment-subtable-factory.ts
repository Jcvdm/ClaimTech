import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types/service';
import type { Database } from '$lib/types/database';
import type { EntityType } from '$lib/types/audit';
import { auditService } from './audit.service';

type Tables = Database['public']['Tables'];

/**
 * Constrain to tables that have an `assessment_id: string` column.
 * This prevents misuse at compile time — you cannot pass an arbitrary table name.
 */
type AssessmentSubtableName = {
	[K in keyof Tables]: Tables[K]['Row'] extends { assessment_id: string } ? K : never;
}[keyof Tables];

/**
 * Factory that generates the four standard methods (create, getByAssessment, update, upsert)
 * for any assessment sub-table that is a single row keyed by `assessment_id`.
 *
 * All three generated services are byte-identical modulo table name and audit entity_type —
 * this factory captures that shared logic once.
 *
 * TDomain is the hand-written domain type returned to consumers (e.g. VehicleIdentification).
 * It defaults to the DB-generated Row type. The cast `as unknown as TDomain` mirrors the
 * original per-service pattern and is safe because the domain types are manually maintained
 * to match the DB schema.
 *
 * @param config.table      Supabase table name (must satisfy AssessmentSubtableName constraint)
 * @param config.entityType Audit entity_type (must be a valid EntityType literal)
 * @param config.label      Human-readable label used verbatim in console.error / Error messages,
 *                          e.g. 'vehicle identification'. Must match original service wording exactly
 *                          to preserve log-monitoring compatibility.
 */
export function createAssessmentSubtableService<
	TTable extends AssessmentSubtableName,
	TInsert extends Tables[TTable]['Insert'],
	TUpdate extends Tables[TTable]['Update'],
	TDomain = Tables[TTable]['Row']
>(config: { table: TTable; entityType: EntityType; label: string }) {
	const { table, entityType, label } = config;

	// We cast the Supabase client to `any` inside the factory to avoid TypeScript's overly
	// strict generic column-name inference on `.eq()`. The `AssessmentSubtableName` constraint
	// already guarantees at compile time that every valid table has `assessment_id`, so the
	// cast is safe. The public API of each returned method is fully typed via TDomain.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function getDb(client?: ServiceClient): any {
		return client ?? supabase;
	}

	return {
		/**
		 * Create a new sub-table record for an assessment.
		 */
		async create(input: TInsert, client?: ServiceClient): Promise<TDomain> {
			const db = getDb(client);
			const { data, error } = await db
				.from(table)
				.insert(input)
				.select()
				.single();

			if (error) {
				console.error(`Error creating ${label}:`, error);
				throw new Error(`Failed to create ${label}: ${error.message}`);
			}

			// Log audit trail
			try {
				await auditService.logChange(
					{
						entity_type: entityType,
						entity_id: (data as Record<string, unknown>).id as string,
						action: 'created',
						metadata: { assessment_id: (input as Record<string, unknown>).assessment_id }
					},
					client
				);
			} catch (auditError) {
				console.error('Error logging audit change:', auditError);
			}

			return data as unknown as TDomain;
		},

		/**
		 * Get the sub-table record for a given assessment ID.
		 * Returns null on any error (including not-found).
		 */
		async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<TDomain | null> {
			const db = getDb(client);
			const { data, error } = await db
				.from(table)
				.select('*')
				.eq('assessment_id', assessmentId)
				.maybeSingle();

			if (error) {
				console.error(`Error fetching ${label}:`, error);
				return null;
			}

			return data as unknown as TDomain | null;
		},

		/**
		 * Update the sub-table record for a given assessment ID.
		 * Converts undefined values to null (Supabase defensive programming pattern).
		 */
		async update(assessmentId: string, input: TUpdate, client?: ServiceClient): Promise<TDomain> {
			const db = getDb(client);
			// Convert undefined to null for Supabase (defensive programming)
			const cleanedInput = Object.fromEntries(
				Object.entries(input as Record<string, unknown>).map(([key, value]) => [
					key,
					value === undefined ? null : value
				])
			) as TUpdate;

			const { data, error } = await db
				.from(table)
				.update(cleanedInput)
				.eq('assessment_id', assessmentId)
				.select()
				.single();

			if (error) {
				console.error(`Error updating ${label}:`, error);
				throw new Error(`Failed to update ${label}: ${error.message}`);
			}

			// Log audit trail
			try {
				const fieldsUpdated = Object.keys(cleanedInput as Record<string, unknown>).filter(
					(key) => (cleanedInput as Record<string, unknown>)[key] !== undefined
				);
				await auditService.logChange(
					{
						entity_type: entityType,
						entity_id: assessmentId,
						action: 'updated',
						metadata: {
							fields_updated: fieldsUpdated
						}
					},
					client
				);
			} catch (auditError) {
				console.error('Error logging audit change:', auditError);
			}

			return data as unknown as TDomain;
		},

		/**
		 * Upsert: update if record exists, create otherwise.
		 */
		async upsert(assessmentId: string, input: TUpdate, client?: ServiceClient): Promise<TDomain> {
			const existing = await this.getByAssessment(assessmentId, client);

			if (existing) {
				return this.update(assessmentId, input, client);
			} else {
				return this.create(
					{ ...input, assessment_id: assessmentId } as unknown as TInsert,
					client
				);
			}
		}
	};
}
