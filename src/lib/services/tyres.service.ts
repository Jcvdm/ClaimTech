import { supabase } from '$lib/supabase';
import type { Tyre, CreateTyreInput, UpdateTyreInput } from '$lib/types/assessment';
import { auditService } from './audit.service';

export class TyresService {
	/**
	 * Create tyre record
	 */
	async create(input: CreateTyreInput): Promise<Tyre> {
		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Get tyre by ID
	 */
	async get(id: string): Promise<Tyre | null> {
		const { data, error } = await supabase
			.from('assessment_tyres')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching tyre:', error);
			return null;
		}

		return data;
	}

	/**
	 * List tyres by assessment ID
	 */
	async listByAssessment(assessmentId: string): Promise<Tyre[]> {
		const { data, error } = await supabase
			.from('assessment_tyres')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error listing tyres:', error);
			return [];
		}

		return data || [];
	}

	/**
	 * Update tyre
	 */
	async update(id: string, input: UpdateTyreInput): Promise<Tyre> {
		// Convert undefined to null for Supabase (defensive programming)
		// Supabase strips undefined values, which can cause empty updates
		const cleanedInput = Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, value === undefined ? null : value])
		) as UpdateTyreInput;

		const { data, error } = await supabase
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

		return data;
	}

	/**
	 * Delete tyre
	 */
	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('assessment_tyres').delete().eq('id', id);

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
	 */
	async createDefaultTyres(assessmentId: string): Promise<Tyre[]> {
		const defaultPositions = [
			{ position: 'front_right', position_label: 'Front Right' },
			{ position: 'front_left', position_label: 'Front Left' },
			{ position: 'rear_right', position_label: 'Rear Right' },
			{ position: 'rear_left', position_label: 'Rear Left' },
			{ position: 'spare', position_label: 'Spare' }
		];

		const tyres: Tyre[] = [];

		for (const pos of defaultPositions) {
			const tyre = await this.create({
				assessment_id: assessmentId,
				position: pos.position,
				position_label: pos.position_label
			});
			tyres.push(tyre);
		}

		return tyres;
	}
}

export const tyresService = new TyresService();

