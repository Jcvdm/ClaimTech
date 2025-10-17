import { supabase } from '$lib/supabase';
import type {
	AssessmentAdditionals,
	AdditionalLineItem,
	Estimate,
	EstimateLineItem
} from '$lib/types/assessment';
import { auditService } from './audit.service';

class AdditionalsService {
	/**
	 * Get additionals for an assessment
	 */
	async getByAssessment(assessmentId: string): Promise<AssessmentAdditionals | null> {
		const { data, error } = await supabase
			.from('assessment_additionals')
			.select('*')
			.eq('assessment_id', assessmentId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			console.error('Error fetching additionals:', error);
			throw error;
		}

		return data;
	}

	/**
	 * Create default additionals record (snapshot rates from estimate)
	 */
	async createDefault(assessmentId: string, estimate: Estimate): Promise<AssessmentAdditionals> {
		const { data, error } = await supabase
			.from('assessment_additionals')
			.insert({
				assessment_id: assessmentId,
				repairer_id: estimate.repairer_id,
				labour_rate: estimate.labour_rate,
				paint_rate: estimate.paint_rate,
				vat_percentage: estimate.vat_percentage,
				oem_markup_percentage: estimate.oem_markup_percentage,
				alt_markup_percentage: estimate.alt_markup_percentage,
				second_hand_markup_percentage: estimate.second_hand_markup_percentage,
				outwork_markup_percentage: estimate.outwork_markup_percentage,
				line_items: []
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating additionals:', error);
			throw error;
		}

		// Log creation
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'created',
			field_name: 'additionals',
			new_value: 'additionals_record_created'
		});

		return data;
	}

	/**
	 * Update rates from estimate (manual sync)
	 * Recalculates all line items with new rates
	 */
	async updateRates(
		assessmentId: string,
		rates: {
			repairer_id?: string | null;
			labour_rate: number;
			paint_rate: number;
			vat_percentage: number;
			oem_markup_percentage: number;
			alt_markup_percentage: number;
			second_hand_markup_percentage: number;
			outwork_markup_percentage: number;
		}
	): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		// Recalculate totals with new rates
		const totals = this.calculateApprovedTotals(
			additionals.line_items,
			rates.labour_rate,
			rates.paint_rate,
			rates.vat_percentage,
			rates.oem_markup_percentage,
			rates.alt_markup_percentage,
			rates.second_hand_markup_percentage,
			rates.outwork_markup_percentage
		);

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				repairer_id: rates.repairer_id,
				labour_rate: rates.labour_rate,
				paint_rate: rates.paint_rate,
				vat_percentage: rates.vat_percentage,
				oem_markup_percentage: rates.oem_markup_percentage,
				alt_markup_percentage: rates.alt_markup_percentage,
				second_hand_markup_percentage: rates.second_hand_markup_percentage,
				outwork_markup_percentage: rates.outwork_markup_percentage,
				...totals,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error updating additionals rates:', error);
			throw error;
		}

		// Log rate update
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'additionals_rates',
			new_value: 'rates_synced_from_estimate',
			metadata: {
				labour_rate: rates.labour_rate,
				paint_rate: rates.paint_rate,
				vat_percentage: rates.vat_percentage,
				repairer_id: rates.repairer_id
			}
		});

		return data;
	}

	/**
	 * Add a removed line item (negative values from original estimate line)
	 * This creates a negative line item that is auto-approved to immediately affect totals
	 */
	async addRemovedLineItem(
		assessmentId: string,
		originalLineItem: EstimateLineItem
	): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		// Check if this original line has already been removed
		const alreadyRemoved = additionals.line_items.some(
			(item) => item.action === 'removed' && item.original_line_id === originalLineItem.id
		);

		if (alreadyRemoved) {
			// Already removed, return current state
			return additionals;
		}

		// Helper to negate values
		const negate = (value: number | null | undefined): number => {
			if (value === null || value === undefined) return 0;
			return -Math.abs(value);
		};

		// Create negative line item
		const removedItem: AdditionalLineItem = {
			...originalLineItem,
			id: crypto.randomUUID(),
			status: 'approved', // Auto-approve removals
			action: 'removed',
			original_line_id: originalLineItem.id,
			approved_at: new Date().toISOString(),
			// Negate all monetary values (nett for parts/outwork)
			part_price_nett: originalLineItem.part_price_nett ? negate(originalLineItem.part_price_nett) : null,
			part_price: originalLineItem.part_price ? negate(originalLineItem.part_price) : null,
			strip_assemble: originalLineItem.strip_assemble ? negate(originalLineItem.strip_assemble) : null,
			labour_cost: negate(originalLineItem.labour_cost || 0),
			paint_cost: negate(originalLineItem.paint_cost || 0),
			outwork_charge_nett: originalLineItem.outwork_charge_nett ? negate(originalLineItem.outwork_charge_nett) : null,
			outwork_charge: originalLineItem.outwork_charge ? negate(originalLineItem.outwork_charge) : null,
			total: negate(originalLineItem.total || 0)
		};

		const updatedLineItems = [...additionals.line_items, removedItem];

		// Recalculate totals
		const totals = this.calculateApprovedTotals(
			updatedLineItems,
			additionals.labour_rate,
			additionals.paint_rate,
			additionals.vat_percentage,
			additionals.oem_markup_percentage,
			additionals.alt_markup_percentage,
			additionals.second_hand_markup_percentage,
			additionals.outwork_markup_percentage
		);

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				line_items: updatedLineItems,
				...totals,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error adding removed line item:', error);
			throw error;
		}

		// Log removal
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'original_line_removed',
			new_value: 'original_estimate_line_removed',
			metadata: {
				original_line_id: originalLineItem.id,
				description: originalLineItem.description,
				removed_total: originalLineItem.total
			}
		});

		return data;
	}

	/**
	 * Add a new line item (default status: pending)
	 */
	async addLineItem(
		assessmentId: string,
		lineItem: EstimateLineItem
	): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		const newItem: AdditionalLineItem = {
			...lineItem,
			id: crypto.randomUUID(),
			status: 'pending',
			action: 'added' // Mark as added (not a removal)
		};

		const updatedLineItems = [...additionals.line_items, newItem];

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				line_items: updatedLineItems,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error adding line item:', error);
			throw error;
		}

		// Log addition
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'additionals',
			new_value: 'line_item_added',
			metadata: { description: lineItem.description }
		});

		return data;
	}

	/**
	 * Approve a line item
	 */
	async approveLineItem(assessmentId: string, lineItemId: string): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		const updatedLineItems = additionals.line_items.map((item) =>
			item.id === lineItemId
				? {
						...item,
						status: 'approved' as const,
						approved_at: new Date().toISOString(),
						decline_reason: null
					}
				: item
		);

		// Recalculate totals
		const totals = this.calculateApprovedTotals(
			updatedLineItems,
			additionals.labour_rate,
			additionals.paint_rate,
			additionals.vat_percentage,
			additionals.oem_markup_percentage,
			additionals.alt_markup_percentage,
			additionals.second_hand_markup_percentage,
			additionals.outwork_markup_percentage
		);

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				line_items: updatedLineItems,
				...totals,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error approving line item:', error);
			throw error;
		}

		// Log approval
		const item = updatedLineItems.find((i) => i.id === lineItemId);
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'additionals_line_status',
			old_value: 'pending',
			new_value: 'approved',
			metadata: { line_item_id: lineItemId, description: item?.description }
		});

		return data;
	}

	/**
	 * Decline a line item with reason
	 */
	async declineLineItem(
		assessmentId: string,
		lineItemId: string,
		reason: string
	): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		const updatedLineItems = additionals.line_items.map((item) =>
			item.id === lineItemId
				? {
						...item,
						status: 'declined' as const,
						decline_reason: reason,
						declined_at: new Date().toISOString()
					}
				: item
		);

		// Recalculate totals (declined items excluded)
		const totals = this.calculateApprovedTotals(
			updatedLineItems,
			additionals.labour_rate,
			additionals.paint_rate,
			additionals.vat_percentage,
			additionals.oem_markup_percentage,
			additionals.alt_markup_percentage,
			additionals.second_hand_markup_percentage,
			additionals.outwork_markup_percentage
		);

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				line_items: updatedLineItems,
				...totals,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error declining line item:', error);
			throw error;
		}

		// Log decline
		const item = updatedLineItems.find((i) => i.id === lineItemId);
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'additionals_line_status',
			old_value: 'pending',
			new_value: 'declined',
			metadata: {
				line_item_id: lineItemId,
				description: item?.description,
				reason
			}
		});

		return data;
	}

	/**
	 * Delete a line item (only if pending - for items created in error)
	 * Note: For approved/declined items, use reversal methods instead
	 */
	async deleteLineItem(assessmentId: string, lineItemId: string): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		const item = additionals.line_items.find((i) => i.id === lineItemId);
		if (item && item.status !== 'pending') {
			throw new Error('Can only delete pending items. Use reversal methods for approved/declined items.');
		}

		const updatedLineItems = additionals.line_items.filter((i) => i.id !== lineItemId);

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				line_items: updatedLineItems,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error deleting line item:', error);
			throw error;
		}

		// Log deletion
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'additionals',
			new_value: 'line_item_deleted',
			metadata: { line_item_id: lineItemId, description: item?.description }
		});

		return data;
	}

	/**
	 * Reverse an approved line item (creates a reversal entry with negative values)
	 * This is used when an approved additional needs to be excluded from the estimate
	 */
	async reverseApprovedLineItem(
		assessmentId: string,
		lineItemId: string,
		reason: string
	): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		const originalItem = additionals.line_items.find((i) => i.id === lineItemId);
		if (!originalItem) throw new Error('Line item not found');
		if (originalItem.status !== 'approved') {
			throw new Error('Can only reverse approved items');
		}

		// Check if already reversed
		const alreadyReversed = additionals.line_items.some(
			(item) => item.action === 'reversal' && item.reverses_line_id === lineItemId
		);
		if (alreadyReversed) {
			throw new Error('This item has already been reversed');
		}

		// Helper to negate values
		const negate = (value: number | null | undefined): number => {
			if (value === null || value === undefined) return 0;
			return -Math.abs(value);
		};

		// Create reversal entry with negative values
		const reversalItem: AdditionalLineItem = {
			...originalItem,
			id: crypto.randomUUID(),
			status: 'approved', // Auto-approve reversals
			action: 'reversal',
			reverses_line_id: lineItemId,
			reversal_reason: reason,
			approved_at: new Date().toISOString(),
			// Negate all monetary values (nett for parts/outwork)
			part_price_nett: originalItem.part_price_nett ? negate(originalItem.part_price_nett) : null,
			part_price: originalItem.part_price ? negate(originalItem.part_price) : null,
			strip_assemble: originalItem.strip_assemble ? negate(originalItem.strip_assemble) : null,
			labour_cost: negate(originalItem.labour_cost || 0),
			paint_cost: negate(originalItem.paint_cost || 0),
			outwork_charge_nett: originalItem.outwork_charge_nett ? negate(originalItem.outwork_charge_nett) : null,
			outwork_charge: originalItem.outwork_charge ? negate(originalItem.outwork_charge) : null,
			total: negate(originalItem.total || 0)
		};

		const updatedLineItems = [...additionals.line_items, reversalItem];

		// Recalculate totals
		const totals = this.calculateApprovedTotals(
			updatedLineItems,
			additionals.labour_rate,
			additionals.paint_rate,
			additionals.vat_percentage,
			additionals.oem_markup_percentage,
			additionals.alt_markup_percentage,
			additionals.second_hand_markup_percentage,
			additionals.outwork_markup_percentage
		);

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				line_items: updatedLineItems,
				...totals,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error reversing approved line item:', error);
			throw error;
		}

		// Log reversal
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'additionals_line_reversed',
			new_value: 'approved_line_reversed',
			metadata: {
				original_line_id: lineItemId,
				description: originalItem.description,
				reason,
				reversed_total: originalItem.total
			}
		});

		return data;
	}

	/**
	 * Reinstate a declined line item (creates a reversal entry with positive values)
	 * This is used when a declined additional is later approved (e.g., insurer changes decision)
	 */
	async reinstateDeclinedLineItem(
		assessmentId: string,
		lineItemId: string,
		reason: string
	): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		const originalItem = additionals.line_items.find((i) => i.id === lineItemId);
		if (!originalItem) throw new Error('Line item not found');
		if (originalItem.status !== 'declined') {
			throw new Error('Can only reinstate declined items');
		}

		// Check if already reinstated
		const alreadyReinstated = additionals.line_items.some(
			(item) => item.action === 'reversal' && item.reverses_line_id === lineItemId
		);
		if (alreadyReinstated) {
			throw new Error('This item has already been reinstated');
		}

		// Create reversal entry with same positive values (to add back to total)
		const reversalItem: AdditionalLineItem = {
			...originalItem,
			id: crypto.randomUUID(),
			status: 'approved', // Approve the reinstatement
			action: 'reversal',
			reverses_line_id: lineItemId,
			reversal_reason: reason,
			approved_at: new Date().toISOString(),
			decline_reason: null // Clear decline reason on reversal
		};

		const updatedLineItems = [...additionals.line_items, reversalItem];

		// Recalculate totals
		const totals = this.calculateApprovedTotals(
			updatedLineItems,
			additionals.labour_rate,
			additionals.paint_rate,
			additionals.vat_percentage,
			additionals.oem_markup_percentage,
			additionals.alt_markup_percentage,
			additionals.second_hand_markup_percentage,
			additionals.outwork_markup_percentage
		);

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				line_items: updatedLineItems,
				...totals,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error reinstating declined line item:', error);
			throw error;
		}

		// Log reinstatement
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'additionals_line_reinstated',
			new_value: 'declined_line_reinstated',
			metadata: {
				original_line_id: lineItemId,
				description: originalItem.description,
				reason,
				reinstated_total: originalItem.total
			}
		});

		return data;
	}

	/**
	 * Reinstate a removed original estimate line (creates a reversal entry to cancel the removal)
	 * This is used when an original line was removed but needs to be added back
	 */
	async reinstateRemovedOriginal(
		assessmentId: string,
		originalLineId: string,
		reason: string
	): Promise<AssessmentAdditionals> {
		const additionals = await this.getByAssessment(assessmentId);
		if (!additionals) throw new Error('Additionals record not found');

		// Find the removal entry
		const removalItem = additionals.line_items.find(
			(i) => i.action === 'removed' && i.original_line_id === originalLineId
		);
		if (!removalItem) throw new Error('Removal entry not found for this original line');

		// Check if already reinstated
		const alreadyReinstated = additionals.line_items.some(
			(item) => item.action === 'reversal' && item.reverses_line_id === removalItem.id
		);
		if (alreadyReinstated) {
			throw new Error('This removal has already been reversed');
		}

		// Helper to negate values (to cancel out the negative removal)
		const negate = (value: number | null | undefined): number => {
			if (value === null || value === undefined) return 0;
			return -Math.abs(value);
		};

		// Create reversal entry with positive values (to cancel the negative removal)
		const reversalItem: AdditionalLineItem = {
			...removalItem,
			id: crypto.randomUUID(),
			status: 'approved', // Auto-approve reversals
			action: 'reversal',
			reverses_line_id: removalItem.id,
			reversal_reason: reason,
			approved_at: new Date().toISOString(),
			// Negate the negative values to get positive (canceling the removal)
			part_price_nett: removalItem.part_price_nett ? negate(removalItem.part_price_nett) : null,
			part_price: removalItem.part_price ? negate(removalItem.part_price) : null,
			strip_assemble: removalItem.strip_assemble ? negate(removalItem.strip_assemble) : null,
			labour_cost: negate(removalItem.labour_cost || 0),
			paint_cost: negate(removalItem.paint_cost || 0),
			outwork_charge_nett: removalItem.outwork_charge_nett ? negate(removalItem.outwork_charge_nett) : null,
			outwork_charge: removalItem.outwork_charge ? negate(removalItem.outwork_charge) : null,
			total: negate(removalItem.total || 0)
		};

		const updatedLineItems = [...additionals.line_items, reversalItem];

		// Recalculate totals
		const totals = this.calculateApprovedTotals(
			updatedLineItems,
			additionals.labour_rate,
			additionals.paint_rate,
			additionals.vat_percentage,
			additionals.oem_markup_percentage,
			additionals.alt_markup_percentage,
			additionals.second_hand_markup_percentage,
			additionals.outwork_markup_percentage
		);

		const { data, error } = await supabase
			.from('assessment_additionals')
			.update({
				line_items: updatedLineItems,
				...totals,
				updated_at: new Date().toISOString()
			})
			.eq('assessment_id', assessmentId)
			.select()
			.single();

		if (error) {
			console.error('Error reinstating removed original:', error);
			throw error;
		}

		// Log reinstatement
		await auditService.logChange({
			entity_type: 'estimate',
			entity_id: assessmentId,
			action: 'updated',
			field_name: 'original_line_reinstated',
			new_value: 'removed_original_reinstated',
			metadata: {
				removal_line_id: removalItem.id,
				original_line_id: originalLineId,
				description: removalItem.description,
				reason,
				reinstated_total: Math.abs(removalItem.total || 0)
			}
		});

		return data;
	}

	/**
	 * Calculate totals for approved items only
	 */
	private calculateApprovedTotals(
		lineItems: AdditionalLineItem[],
		labourRate: number,
		paintRate: number,
		vatPercentage: number,
		oemMarkup: number,
		altMarkup: number,
		secondHandMarkup: number,
		outworkMarkup: number
	): {
		subtotal_approved: number;
		vat_amount_approved: number;
		total_approved: number;
	} {
		const approvedItems = lineItems.filter((item) => item.status === 'approved');

		// Sum components (nett where applicable)
		let partsSellingTotal = 0;
		let labourTotal = 0;
		let paintTotal = 0;
		let outworkSellingTotal = 0;

		for (const item of approvedItems) {
			// Parts
			if (item.process_type === 'N') {
				const nett = item.part_price_nett || 0;
				let markup = 0;
				if (item.part_type === 'OEM') markup = oemMarkup;
				else if (item.part_type === 'ALT') markup = altMarkup;
				else if (item.part_type === '2ND') markup = secondHandMarkup;
				partsSellingTotal += nett * (1 + markup / 100);
			}

			// S&A and Labour
			labourTotal += (item.strip_assemble || 0) + (item.labour_cost || 0);

			// Paint
			paintTotal += item.paint_cost || 0;

			// Outwork
			if (item.process_type === 'O') {
				const oNett = item.outwork_charge_nett || 0;
				outworkSellingTotal += oNett * (1 + outworkMarkup / 100);
			}
		}

		const subtotal = partsSellingTotal + labourTotal + paintTotal + outworkSellingTotal;
		const vatAmount = subtotal * (vatPercentage / 100);
		const total = subtotal + vatAmount;

		return {
			subtotal_approved: Math.round(subtotal * 100) / 100,
			vat_amount_approved: Math.round(vatAmount * 100) / 100,
			total_approved: Math.round(total * 100) / 100
		};
	}

	/**
	 * List all additionals records
	 * Joins with assessments, appointments, inspections, requests, and clients
	 * Excludes assessments where FRC has been started
	 */
	async listAdditionals(): Promise<any[]> {
		const { data, error } = await supabase
			.from('assessment_additionals')
			.select(`
				*,
				assessment:assessments!inner(
					id,
					assessment_number,
					appointment:appointments!inner(
						id,
						inspection:inspections!inner(
							id,
							request:requests!inner(
								id,
								request_number,
								vehicle_make,
								vehicle_model,
								vehicle_year,
								vehicle_registration,
								client:clients!inner(
									id,
									name,
									type
								)
							)
						)
					)
				)
			`)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error listing additionals:', error);
			return [];
		}

		// Get assessment IDs that have FRC started
		const { data: frcData } = await supabase.from('assessment_frc').select('assessment_id');

		const assessmentsWithFRC = new Set((frcData || []).map((f) => f.assessment_id));

		// Filter out additionals where FRC has been started
		const filteredData = (data || []).filter(
			(record) => !assessmentsWithFRC.has(record.assessment_id)
		);

		return filteredData;
	}

	/**
	 * Get count of additionals with pending items
	 * Excludes assessments where FRC has been started
	 */
	async getPendingCount(): Promise<number> {
		// Get all additionals with pending items
		const { data: additionalsData, error } = await supabase
			.from('assessment_additionals')
			.select('assessment_id, line_items');

		if (error) {
			console.error('Error counting pending additionals:', error);
			return 0;
		}

		// Filter to only those with pending items
		const withPending = (additionalsData || []).filter((record) => {
			const lineItems = record.line_items as AdditionalLineItem[];
			return lineItems.some((item) => item.status === 'pending');
		});

		// Get assessment IDs that have FRC started
		const { data: frcData } = await supabase
			.from('assessment_frc')
			.select('assessment_id');

		const assessmentsWithFRC = new Set((frcData || []).map((f) => f.assessment_id));

		// Count only additionals where FRC hasn't been started
		const pendingCount = withPending.filter(
			(a) => !assessmentsWithFRC.has(a.assessment_id)
		).length;

		return pendingCount;
	}

	/**
	 * Get total count of additionals records
	 */
	async getTotalCount(): Promise<number> {
		const { count, error } = await supabase
			.from('assessment_additionals')
			.select('*', { count: 'exact', head: true });

		if (error) {
			console.error('Error counting additionals:', error);
			return 0;
		}

		return count || 0;
	}
}

export const additionalsService = new AdditionalsService();

