import { supabase } from '$lib/supabase';
import type {
	VehicleAccessory,
	CreateAccessoryInput,
	UpdateAccessoryInput
} from '$lib/types/assessment';
import type { ServiceClient } from '$lib/types/service';
import { auditService } from './audit.service';

export class AccessoriesService {
	/**
	 * Create accessory
	 */
	async create(input: CreateAccessoryInput, client?: ServiceClient): Promise<VehicleAccessory> {
		const db = client ?? supabase;

		const { data, error } = await db
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
			}, client);
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as VehicleAccessory;
	}

	/**
	 * Get accessory by ID
	 */
	async get(id: string, client?: ServiceClient): Promise<VehicleAccessory | null> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_accessories')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching accessory:', error);
			return null;
		}

		return data as unknown as VehicleAccessory | null;
	}

	/**
	 * List accessories by assessment ID
	 */
	async listByAssessment(assessmentId: string, client?: ServiceClient): Promise<VehicleAccessory[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_accessories')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error listing accessories:', error);
			return [];
		}

		return (data as unknown as VehicleAccessory[]) || [];
	}

	/**
	 * Update accessory
	 */
	async update(id: string, input: UpdateAccessoryInput, client?: ServiceClient): Promise<VehicleAccessory> {
		const db = client ?? supabase;

		// Convert undefined to null for Supabase (defensive programming)
		const cleanedInput = Object.fromEntries(
			Object.entries(input).map(([key, value]) => [key, value === undefined ? null : value])
		) as UpdateAccessoryInput;

		const { data, error } = await db
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
			}, client);
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as VehicleAccessory;
	}

	/**
	 * Update accessory value
	 */
	async updateValue(id: string, value: number | null, client?: ServiceClient): Promise<VehicleAccessory> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_accessories')
			.update({ value, updated_at: new Date().toISOString() })
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating accessory value:', error);
			throw new Error(`Failed to update accessory value: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'accessory',
				entity_id: id,
				action: 'updated',
				metadata: { value }
			}, client);
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as VehicleAccessory;
	}

	/**
	 * Delete accessory
	 */
	async delete(id: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;

		const { error } = await db.from('assessment_accessories').delete().eq('id', id);

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
			}, client);
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}
	}
}

export const accessoriesService = new AccessoriesService();

