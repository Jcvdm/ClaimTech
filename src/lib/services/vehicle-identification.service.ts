import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type {
	VehicleIdentification,
	CreateVehicleIdentificationInput,
	UpdateVehicleIdentificationInput
} from '$lib/types/assessment';
import { auditService } from './audit.service';

export class VehicleIdentificationService {
	/**
	 * Create vehicle identification record
	 */
	async create(input: CreateVehicleIdentificationInput, client?: ServiceClient): Promise<VehicleIdentification> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_vehicle_identification')
			.insert(input)
			.select()
			.single();

		if (error) {
			console.error('Error creating vehicle identification:', error);
			throw new Error(`Failed to create vehicle identification: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'vehicle_identification',
				entity_id: data.id,
				action: 'created',
				metadata: { assessment_id: input.assessment_id }
			}, client);
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as VehicleIdentification;
	}

	/**
	 * Get vehicle identification by assessment ID
	 */
	async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<VehicleIdentification | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_vehicle_identification')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching vehicle identification:', error);
			return null;
		}

		return data as unknown as VehicleIdentification | null;
	}

	/**
	 * Update vehicle identification
	 */
	async update(
		assessmentId: string,
		input: UpdateVehicleIdentificationInput,
		client?: ServiceClient
	): Promise<VehicleIdentification> {
		const db = client ?? supabase;
		// Convert undefined to null for Supabase (defensive programming)
		const cleanedInput = Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, value === undefined ? null : value])
		) as UpdateVehicleIdentificationInput;

		const { data, error} = await db
			.from('assessment_vehicle_identification')
			.update(cleanedInput)
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error updating vehicle identification:', error);
			throw new Error(`Failed to update vehicle identification: ${error.message}`);
		}

		// Log audit trail
		try {
			const fieldsUpdated = Object.keys(cleanedInput).filter(key => cleanedInput[key as keyof UpdateVehicleIdentificationInput] !== undefined);
			await auditService.logChange({
				entity_type: 'vehicle_identification',
				entity_id: assessmentId,
				action: 'updated',
				metadata: {
					fields_updated: fieldsUpdated
				}
			}, client);
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as VehicleIdentification;
	}

	/**
	 * Upsert vehicle identification (create or update)
	 */
	async upsert(
		assessmentId: string,
		input: UpdateVehicleIdentificationInput,
		client?: ServiceClient
	): Promise<VehicleIdentification> {
		const existing = await this.getByAssessment(assessmentId, client);

		if (existing) {
			return this.update(assessmentId, input, client);
		} else {
			return this.create({ assessment_id: assessmentId, ...input }, client);
		}
	}
}

export const vehicleIdentificationService = new VehicleIdentificationService();

