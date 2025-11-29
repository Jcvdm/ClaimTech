import { supabase } from '$lib/supabase';
import type { Tyre, CreateTyreInput, UpdateTyreInput } from '$lib/types/assessment';
import type { ServiceClient } from '$lib/types/service';
import { auditService } from './audit.service';

export class TyresService {
	/**
	 * Create tyre record
	 */
	async create(input: CreateTyreInput, client?: ServiceClient): Promise<Tyre> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_tyres')
			.insert(input)
			.select()
			.single();

		if (error) {
			console.error('Error creating tyre:', error);
			throw new Error(`Failed to create tyre: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'tyre',
				entity_id: data.id,
				action: 'created',
				metadata: { assessment_id: input.assessment_id, position: input.position }
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as Tyre;
	}

	/**
	 * Get tyre by ID
	 */
	async get(id: string, client?: ServiceClient): Promise<Tyre | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_tyres')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching tyre:', error);
			return null;
		}

		return data as Tyre | null;
	}

	/**
	 * List tyres by assessment ID
	 */
	async listByAssessment(assessmentId: string, client?: ServiceClient): Promise<Tyre[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_tyres')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error listing tyres:', error);
			return [];
		}

		return (data as Tyre[]) || [];
	}

	/**
	 * Update tyre
	 */
	async update(id: string, input: UpdateTyreInput, client?: ServiceClient): Promise<Tyre> {
		const db = client ?? supabase;
		// Convert undefined to null for Supabase (defensive programming)
		// Supabase strips undefined values, which can cause empty updates
		const cleanedInput = Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, value === undefined ? null : value])
		) as any;

		const { data, error } = await db
			.from('assessment_tyres')
			.update(cleanedInput)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating tyre:', error);
			throw new Error(`Failed to update tyre: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'tyre',
				entity_id: id,
				action: 'updated'
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as Tyre;
	}

	/**
	 * Delete tyre
	 */
	async delete(id: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		const { error } = await db.from('assessment_tyres').delete().eq('id', id);

		if (error) {
			console.error('Error deleting tyre:', error);
			throw new Error(`Failed to delete tyre: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'tyre',
				entity_id: id,
				action: 'cancelled'
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}
	}

	/**
	 * Create default tyres for assessment (5 standard positions)
	 * IDEMPOTENT: Uses upsert to safely re-create tyres on page refresh/retry
	 */
	async createDefaultTyres(assessmentId: string, client?: ServiceClient): Promise<Tyre[]> {
		const db = client ?? supabase;
		const defaultPositions = [
			{ position: 'front_right', position_label: 'Right Front' },
			{ position: 'rear_right', position_label: 'Right Rear' },
			{ position: 'rear_left', position_label: 'Left Rear' },
			{ position: 'front_left', position_label: 'Left Front' },
			{ position: 'spare', position_label: 'Spare' }
		];

		const tyres: Tyre[] = [];

		for (const pos of defaultPositions) {
			const { data, error } = await db
				.from('assessment_tyres')
				.upsert(
					{
						assessment_id: assessmentId,
						position: pos.position,
						position_label: pos.position_label
					},
					{
						onConflict: 'assessment_id,position', // Use unique constraint
						ignoreDuplicates: false // Update if exists
					}
				)
				.select()
				.single();

			if (error) {
				console.error(`Error creating/updating tyre ${pos.position}:`, error);
				throw new Error(`Failed to create tyre: ${error.message}`);
			}

			tyres.push(data as Tyre);
		}

		return tyres;
	}
}

export const tyresService = new TyresService();

