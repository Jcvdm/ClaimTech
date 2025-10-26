import { supabase } from '$lib/supabase';
import type {
	VehicleValues,
	CreateVehicleValuesInput,
	UpdateVehicleValuesInput,
	VehicleValueExtra
} from '$lib/types/assessment';
import type { ServiceClient } from '$lib/types/service';
import { auditService } from './audit.service';
import { calculateVehicleValues, type WriteOffPercentages } from '$lib/utils/vehicleValuesCalculations';

export class VehicleValuesService {
	/**
	 * Get vehicle values by assessment ID (single record per assessment)
	 */
	async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<VehicleValues | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_vehicle_values')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching vehicle values:', error);
			return null;
		}

		return data;
	}

	/**
	 * Create default vehicle values for a new assessment
	 */
	async createDefault(assessmentId: string, client?: ServiceClient): Promise<VehicleValues> {
		return this.create({
			assessment_id: assessmentId,
			extras: []
		}, client);
	}

	/**
	 * Create vehicle values record with calculations
	 */
	async create(input: CreateVehicleValuesInput, client?: ServiceClient): Promise<VehicleValues> {
		const db = client ?? supabase;
		const extras = input.extras || [];

		// Initialize with zeros if no values provided
		const trade_value = input.trade_value || 0;
		const market_value = input.market_value || 0;
		const retail_value = input.retail_value || 0;

		const { data, error } = await db
			.from('assessment_vehicle_values')
			.insert({
				assessment_id: input.assessment_id,
				sourced_from: input.sourced_from || null,
				sourced_code: input.sourced_code || null,
				sourced_date: input.sourced_date || null,
				trade_value,
				market_value,
				retail_value,
				new_list_price: input.new_list_price || null,
				depreciation_percentage: input.depreciation_percentage || null,
				valuation_adjustment: input.valuation_adjustment || null,
				valuation_adjustment_percentage: input.valuation_adjustment_percentage || null,
				condition_adjustment_value: input.condition_adjustment_value || null,
				extras: JSON.stringify(extras),
				trade_adjusted_value: 0,
				market_adjusted_value: 0,
				retail_adjusted_value: 0,
				trade_extras_total: 0,
				market_extras_total: 0,
				retail_extras_total: 0,
				trade_total_adjusted_value: 0,
				market_total_adjusted_value: 0,
				retail_total_adjusted_value: 0,
				borderline_writeoff_trade: 0,
				borderline_writeoff_market: 0,
				borderline_writeoff_retail: 0,
				total_writeoff_trade: 0,
				total_writeoff_market: 0,
				total_writeoff_retail: 0,
				salvage_trade: 0,
				salvage_market: 0,
				salvage_retail: 0,
				valuation_pdf_url: input.valuation_pdf_url || null,
				valuation_pdf_path: input.valuation_pdf_path || null,
				remarks: input.remarks || null
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating vehicle values:', error);
			throw new Error(`Failed to create vehicle values: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'vehicle_values',
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
	 * Update vehicle values with automatic recalculation
	 */
	async update(
		id: string,
		input: UpdateVehicleValuesInput,
		writeOffPercentages: WriteOffPercentages,
		client?: ServiceClient
	): Promise<VehicleValues> {
		const db = client ?? supabase;
		// Get current data
		const { data: current, error: fetchError } = await db
			.from('assessment_vehicle_values')
			.select('*')
			.eq('id', id)
			.single();

		if (fetchError || !current) {
			throw new Error('Vehicle values record not found');
		}

		// Merge with updates
		const trade_value = input.trade_value !== undefined ? input.trade_value : current.trade_value || 0;
		const market_value = input.market_value !== undefined ? input.market_value : current.market_value || 0;
		const retail_value = input.retail_value !== undefined ? input.retail_value : current.retail_value || 0;
		const valuation_adjustment = input.valuation_adjustment !== undefined ? input.valuation_adjustment : current.valuation_adjustment || 0;
		const valuation_adjustment_percentage = input.valuation_adjustment_percentage !== undefined ? input.valuation_adjustment_percentage : current.valuation_adjustment_percentage || 0;
		const condition_adjustment_value = input.condition_adjustment_value !== undefined ? input.condition_adjustment_value : current.condition_adjustment_value || 0;
		const extras = input.extras !== undefined ? input.extras : (current.extras as VehicleValueExtra[]) || [];

		// Calculate all values
		const calculated = calculateVehicleValues({
			trade_value,
			market_value,
			retail_value,
			valuation_adjustment,
			valuation_adjustment_percentage,
			condition_adjustment_value,
			extras,
			writeOffPercentages
		});

		// Update database
		const { data, error } = await db
			.from('assessment_vehicle_values')
			.update({
				...input,
				extras: input.extras !== undefined ? JSON.stringify(input.extras) : undefined,
				...calculated
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating vehicle values:', error);
			throw new Error(`Failed to update vehicle values: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'vehicle_values',
				entity_id: id,
				action: 'updated',
				metadata: { assessment_id: data.assessment_id }
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Add an extra item
	 */
	async addExtra(
		id: string,
		extra: VehicleValueExtra,
		writeOffPercentages: WriteOffPercentages,
		client?: ServiceClient
	): Promise<VehicleValues> {
		const current = await this.getById(id, client);
		if (!current) {
			throw new Error('Vehicle values record not found');
		}

		const extras = [...(current.extras || []), extra];
		return this.update(id, { extras }, writeOffPercentages, client);
	}

	/**
	 * Update an extra item
	 */
	async updateExtra(
		id: string,
		extraId: string,
		updatedExtra: Partial<VehicleValueExtra>,
		writeOffPercentages: WriteOffPercentages,
		client?: ServiceClient
	): Promise<VehicleValues> {
		const current = await this.getById(id, client);
		if (!current) {
			throw new Error('Vehicle values record not found');
		}

		const extras = (current.extras || []).map((e) =>
			e.id === extraId ? { ...e, ...updatedExtra } : e
		);

		return this.update(id, { extras }, writeOffPercentages, client);
	}

	/**
	 * Delete an extra item
	 */
	async deleteExtra(
		id: string,
		extraId: string,
		writeOffPercentages: WriteOffPercentages,
		client?: ServiceClient
	): Promise<VehicleValues> {
		const current = await this.getById(id, client);
		if (!current) {
			throw new Error('Vehicle values record not found');
		}

		const extras = (current.extras || []).filter((e) => e.id !== extraId);
		return this.update(id, { extras }, writeOffPercentages, client);
	}

	/**
	 * Get vehicle values by ID
	 */
	private async getById(id: string, client?: ServiceClient): Promise<VehicleValues | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_vehicle_values')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching vehicle values:', error);
			return null;
		}

		return data;
	}

	/**
	 * Recalculate all values (useful when client write-off percentages change)
	 */
	async recalculate(id: string, writeOffPercentages: WriteOffPercentages, client?: ServiceClient): Promise<VehicleValues> {
		return this.update(id, {}, writeOffPercentages, client);
	}
}

export const vehicleValuesService = new VehicleValuesService();

