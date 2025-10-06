import { supabase } from '$lib/supabase';
import type {
	DamageRecord,
	CreateDamageRecordInput,
	UpdateDamageRecordInput
} from '$lib/types/assessment';
import { auditService } from './audit.service';

export class DamageService {
	/**
	 * Create damage record
	 */
	async create(input: CreateDamageRecordInput): Promise<DamageRecord> {
		const { data, error } = await supabase
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
	async get(id: string): Promise<DamageRecord | null> {
		const { data, error } = await supabase
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
	 * List damage records by assessment ID
	 */
	async listByAssessment(assessmentId: string): Promise<DamageRecord[]> {
		const { data, error } = await supabase
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
	 * Update damage record
	 */
	async update(id: string, input: UpdateDamageRecordInput): Promise<DamageRecord> {
		const { data, error } = await supabase
			.from('assessment_damage')
			.update(input)
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
	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('assessment_damage').delete().eq('id', id);

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

