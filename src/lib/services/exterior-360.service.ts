import { supabase } from '$lib/supabase';
import type {
	Exterior360,
	CreateExterior360Input,
	UpdateExterior360Input
} from '$lib/types/assessment';
import { auditService } from './audit.service';

export class Exterior360Service {
	/**
	 * Create 360 exterior record
	 */
	async create(input: CreateExterior360Input): Promise<Exterior360> {
		const { data, error } = await supabase
			.from('assessment_360_exterior')
			.insert(input)
			.select()
			.single();

		if (error) {
			console.error('Error creating 360 exterior:', error);
			throw new Error(`Failed to create 360 exterior: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'exterior_360',
				entity_id: data.id,
				action: 'created',
				metadata: { assessment_id: input.assessment_id }
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Get 360 exterior by assessment ID
	 */
	async getByAssessment(assessmentId: string): Promise<Exterior360 | null> {
		const { data, error } = await supabase
			.from('assessment_360_exterior')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching 360 exterior:', error);
			return null;
		}

		return data;
	}

	/**
	 * Update 360 exterior
	 */
	async update(assessmentId: string, input: UpdateExterior360Input): Promise<Exterior360> {
		// Convert undefined to null for Supabase (defensive programming)
		const cleanedInput = Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, value === undefined ? null : value])
		) as UpdateExterior360Input;

		const { data, error } = await supabase
			.from('assessment_360_exterior')
			.update(cleanedInput)
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error updating 360 exterior:', error);
			throw new Error(`Failed to update 360 exterior: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'exterior_360',
				entity_id: data.id,
				action: 'updated',
				metadata: { assessment_id: assessmentId }
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Upsert 360 exterior (create or update)
	 */
	async upsert(assessmentId: string, input: UpdateExterior360Input): Promise<Exterior360> {
		const existing = await this.getByAssessment(assessmentId);

		if (existing) {
			return this.update(assessmentId, input);
		} else {
			return this.create({ assessment_id: assessmentId, ...input });
		}
	}
}

export const exterior360Service = new Exterior360Service();

