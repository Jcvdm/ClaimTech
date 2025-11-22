import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type {
	InteriorMechanical,
	CreateInteriorMechanicalInput,
	UpdateInteriorMechanicalInput
} from '$lib/types/assessment';
import { auditService } from './audit.service';

export class InteriorMechanicalService {
	/**
	 * Create interior/mechanical record
	 */
	async create(input: CreateInteriorMechanicalInput, client?: ServiceClient): Promise<InteriorMechanical> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_interior_mechanical')
			.insert(input)
			.select()
			.single();

		if (error) {
			console.error('Error creating interior/mechanical:', error);
			throw new Error(`Failed to create interior/mechanical: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'interior_mechanical',
				entity_id: data.id,
				action: 'created',
				metadata: { assessment_id: input.assessment_id }
			}, client);
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as InteriorMechanical;
	}

	/**
	 * Get interior/mechanical by assessment ID
	 */
	async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<InteriorMechanical | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_interior_mechanical')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching interior/mechanical:', error);
			return null;
		}

		return data as unknown as InteriorMechanical | null;
	}

	/**
	 * Update interior/mechanical
	 */
	async update(
		assessmentId: string,
		input: UpdateInteriorMechanicalInput,
		client?: ServiceClient
	): Promise<InteriorMechanical> {
		const db = client ?? supabase;
		// Convert undefined to null for Supabase (defensive programming)
		const cleanedInput = Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, value === undefined ? null : value])
		) as UpdateInteriorMechanicalInput;

		const { data, error } = await db
			.from('assessment_interior_mechanical')
			.update(cleanedInput)
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error updating interior/mechanical:', error);
			throw new Error(`Failed to update interior/mechanical: ${error.message}`);
		}

		// Log audit trail
		try {
			const fieldsUpdated = Object.keys(cleanedInput).filter(key => cleanedInput[key as keyof UpdateInteriorMechanicalInput] !== undefined);
			await auditService.logChange({
				entity_type: 'interior_mechanical',
				entity_id: assessmentId,
				action: 'updated',
				metadata: {
					fields_updated: fieldsUpdated
				}
			}, client);
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as InteriorMechanical;
	}

	/**
	 * Upsert interior/mechanical (create or update)
	 */
	async upsert(
		assessmentId: string,
		input: UpdateInteriorMechanicalInput,
		client?: ServiceClient
	): Promise<InteriorMechanical> {
		const existing = await this.getByAssessment(assessmentId, client);

		if (existing) {
			return this.update(assessmentId, input, client);
		} else {
			return this.create({ assessment_id: assessmentId, ...input }, client);
		}
	}
}

export const interiorMechanicalService = new InteriorMechanicalService();

