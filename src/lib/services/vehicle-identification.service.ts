import { supabase } from '$lib/supabase';
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
	async create(input: CreateVehicleIdentificationInput): Promise<VehicleIdentification> {
		const { data, error } = await supabase
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
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Get vehicle identification by assessment ID
	 */
	async getByAssessment(assessmentId: string): Promise<VehicleIdentification | null> {
		const { data, error } = await supabase
			.from('assessment_vehicle_identification')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching vehicle identification:', error);
			return null;
		}

		return data;
	}

	/**
	 * Update vehicle identification
	 */
	async update(
		assessmentId: string,
		input: UpdateVehicleIdentificationInput
	): Promise<VehicleIdentification> {
		const { data, error} = await supabase
			.from('assessment_vehicle_identification')
			.update(input)
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error updating vehicle identification:', error);
			throw new Error(`Failed to update vehicle identification: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'vehicle_identification',
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
	 * Upsert vehicle identification (create or update)
	 */
	async upsert(
		assessmentId: string,
		input: UpdateVehicleIdentificationInput
	): Promise<VehicleIdentification> {
		const existing = await this.getByAssessment(assessmentId);

		if (existing) {
			return this.update(assessmentId, input);
		} else {
			return this.create({ assessment_id: assessmentId, ...input });
		}
	}
}

export const vehicleIdentificationService = new VehicleIdentificationService();

