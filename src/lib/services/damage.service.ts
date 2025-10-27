import { supabase } from '$lib/supabase';
import type {
	DamageRecord,
	CreateDamageRecordInput,
	UpdateDamageRecordInput
} from '$lib/types/assessment';
import type { ServiceClient } from '$lib/types/service';
import { auditService } from './audit.service';

export class DamageService {
	/**
	 * Create damage record
	 */
	async create(input: CreateDamageRecordInput, client?: ServiceClient): Promise<DamageRecord> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_damage')
			.insert(input)
			.select()
			.single();

		if (error) {
			console.error('Error creating damage record:', error);
			throw new Error(`Failed to create damage record: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'damage_record',
				entity_id: data.id,
				action: 'created',
				metadata: {
					assessment_id: input.assessment_id,
					damage_type: input.damage_type,
					damage_area: input.damage_area
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Get damage record by ID
	 */
	async get(id: string, client?: ServiceClient): Promise<DamageRecord | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_damage')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching damage record:', error);
			return null;
		}

		return data;
	}

	/**
	 * Get damage record by assessment ID (single record per assessment)
	 */
	async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<DamageRecord | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_damage')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching damage record:', error);
			return null;
		}

		return data;
	}

	/**
	 * List damage records by assessment ID
	 * @deprecated Use getByAssessment() instead - each assessment should have only one damage record
	 */
	async listByAssessment(assessmentId: string, client?: ServiceClient): Promise<DamageRecord[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_damage')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error listing damage records:', error);
			return [];
		}

		return data || [];
	}

	/**
	 * Create default damage record for a new assessment
	 * IDEMPOTENT: Checks if exists first, returns existing record if found
	 */
	async createDefault(assessmentId: string, client?: ServiceClient): Promise<DamageRecord> {
		// Check if already exists
		const existing = await this.getByAssessment(assessmentId, client);
		if (existing) {
			return existing;
		}

		// Create new
		return this.create({
			assessment_id: assessmentId,
			damage_area: 'non_structural',
			damage_type: 'collision',
			affected_panels: [],
			photos: []
		}, client);
	}

	/**
	 * Update damage record
	 */
	async update(id: string, input: UpdateDamageRecordInput, client?: ServiceClient): Promise<DamageRecord> {
		const db = client ?? supabase;
		// Convert undefined to null for Supabase (defensive programming)
		const cleanedInput = Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, value === undefined ? null : value])
		) as UpdateDamageRecordInput;

		const { data, error } = await db
			.from('assessment_damage')
			.update(cleanedInput)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating damage record:', error);
			throw new Error(`Failed to update damage record: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'damage_record',
				entity_id: id,
				action: 'updated'
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Delete damage record
	 */
	async delete(id: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		const { error } = await db.from('assessment_damage').delete().eq('id', id);

		if (error) {
			console.error('Error deleting damage record:', error);
			throw new Error(`Failed to delete damage record: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'damage_record',
				entity_id: id,
				action: 'cancelled'
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}
	}
}

export const damageService = new DamageService();

