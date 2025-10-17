import { supabase } from '$lib/supabase';
import type {
	VehicleAccessory,
	CreateAccessoryInput,
	UpdateAccessoryInput
} from '$lib/types/assessment';
import { auditService } from './audit.service';

export class AccessoriesService {
	/**
	 * Create accessory
	 */
	async create(input: CreateAccessoryInput): Promise<VehicleAccessory> {
		const { data, error } = await supabase
			.from('assessment_accessories')
			.insert(input)
			.select()
			.single();

		if (error) {
			console.error('Error creating accessory:', error);
			throw new Error(`Failed to create accessory: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'accessory',
				entity_id: data.id,
				action: 'created',
				metadata: { assessment_id: input.assessment_id, accessory_type: input.accessory_type }
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Get accessory by ID
	 */
	async get(id: string): Promise<VehicleAccessory | null> {
		const { data, error } = await supabase
			.from('assessment_accessories')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching accessory:', error);
			return null;
		}

		return data;
	}

	/**
	 * List accessories by assessment ID
	 */
	async listByAssessment(assessmentId: string): Promise<VehicleAccessory[]> {
		const { data, error } = await supabase
			.from('assessment_accessories')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error listing accessories:', error);
			return [];
		}

		return data || [];
	}

	/**
	 * Update accessory
	 */
	async update(id: string, input: UpdateAccessoryInput): Promise<VehicleAccessory> {
		// Convert undefined to null for Supabase (defensive programming)
		const cleanedInput = Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, value === undefined ? null : value])
		) as UpdateAccessoryInput;

		const { data, error } = await supabase
			.from('assessment_accessories')
			.update(cleanedInput)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating accessory:', error);
			throw new Error(`Failed to update accessory: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'accessory',
				entity_id: id,
				action: 'updated'
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Delete accessory
	 */
	async delete(id: string): Promise<void> {
		const { error } = await supabase.from('assessment_accessories').delete().eq('id', id);

		if (error) {
			console.error('Error deleting accessory:', error);
			throw new Error(`Failed to delete accessory: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'accessory',
				entity_id: id,
				action: 'cancelled'
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}
	}
}

export const accessoriesService = new AccessoriesService();

