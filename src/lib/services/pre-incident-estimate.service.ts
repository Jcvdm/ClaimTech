import { supabase } from '$lib/supabase';
import type {
	PreIncidentEstimate,
	EstimateLineItem,
	CreatePreIncidentEstimateInput,
	UpdatePreIncidentEstimateInput
} from '$lib/types/assessment';
import type { ServiceClient } from '$lib/types/service';
import { auditService } from './audit.service';
import {
	calculateLineItemTotal,
	calculateSubtotal,
	calculateVAT,
	calculateTotal,
	recalculateAllLineItems,
	calculateLabourCost,
	calculatePaintCost
} from '$lib/utils/estimateCalculations';

export class PreIncidentEstimateService {
	/**
	 * Get pre-incident estimate by assessment ID (single estimate per assessment)
	 */
	async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<PreIncidentEstimate | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('pre_incident_estimates')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching pre-incident estimate:', error);
			return null;
		}

		return data;
	}

	/**
	 * Create default pre-incident estimate for a new assessment
	 * IDEMPOTENT: Checks if exists first, returns existing record if found
	 */
	async createDefault(assessmentId: string, client?: ServiceClient): Promise<PreIncidentEstimate> {
		// Check if already exists
		const existing = await this.getByAssessment(assessmentId, client);
		if (existing) {
			return existing;
		}

		// Create new
		return this.create({
			assessment_id: assessmentId,
			labour_rate: 500.0,
			paint_rate: 2000.0,
			oem_markup_percentage: 25.0,
			alt_markup_percentage: 25.0,
			second_hand_markup_percentage: 25.0,
			outwork_markup_percentage: 25.0,
			line_items: [],
			notes: '',
			vat_percentage: 15.0,
			currency: 'ZAR'
		}, client);
	}

	/**
	 * Create pre-incident estimate
	 */
	async create(input: CreatePreIncidentEstimateInput, client?: ServiceClient): Promise<PreIncidentEstimate> {
		const db = client ?? supabase;
		// Calculate totals
		const lineItems = input.line_items || [];
		const labourRate = input.labour_rate || 500.0;
		const paintRate = input.paint_rate || 2000.0;
		const subtotal = calculateSubtotal(lineItems);
		const vatPercentage = input.vat_percentage || 15.0;
		const vatAmount = calculateVAT(subtotal, vatPercentage);
		const total = calculateTotal(subtotal, vatAmount);

		const { data, error} = await db
			.from('pre_incident_estimates')
			.insert({
				assessment_id: input.assessment_id,
				labour_rate: labourRate,
				paint_rate: paintRate,
				oem_markup_percentage: input.oem_markup_percentage || 25.0,
				alt_markup_percentage: input.alt_markup_percentage || 25.0,
				second_hand_markup_percentage: input.second_hand_markup_percentage || 25.0,
				outwork_markup_percentage: input.outwork_markup_percentage || 25.0,
				line_items: lineItems,
				subtotal,
				vat_percentage: vatPercentage,
				vat_amount: vatAmount,
				total,
				notes: input.notes || null,
				currency: input.currency || 'ZAR'
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating pre-incident estimate:', error);
			throw new Error(`Failed to create pre-incident estimate: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'pre_incident_estimate',
				entity_id: data.id,
				action: 'created',
				metadata: {
					assessment_id: input.assessment_id,
					total: total
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Update pre-incident estimate
	 */
	async update(id: string, input: UpdatePreIncidentEstimateInput): Promise<PreIncidentEstimate> {
		// Get current estimate to access rates
		const currentEstimate = await this.getById(id);
		if (!currentEstimate) {
			throw new Error('Pre-incident estimate not found');
		}

		// If line_items or rates are being updated, recalculate totals
		let updateData: any = { ...input };

		if (input.line_items || input.labour_rate || input.paint_rate) {
			const labourRate = input.labour_rate || currentEstimate.labour_rate;
			const paintRate = input.paint_rate || currentEstimate.paint_rate;
			const lineItems = input.line_items || currentEstimate.line_items;

			// Recalculate all line items if rates changed
			const recalculatedItems =
				input.labour_rate || input.paint_rate
					? recalculateAllLineItems(lineItems, labourRate, paintRate)
					: lineItems;

			const subtotal = calculateSubtotal(recalculatedItems);
			const vatPercentage = input.vat_percentage || currentEstimate.vat_percentage;
			const vatAmount = calculateVAT(subtotal, vatPercentage);
			const total = calculateTotal(subtotal, vatAmount);

			updateData = {
				...updateData,
				line_items: recalculatedItems,
				subtotal,
				vat_amount: vatAmount,
				total
			};
		}

		const { data, error } = await supabase
			.from('pre_incident_estimates')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating pre-incident estimate:', error);
			throw new Error(`Failed to update pre-incident estimate: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'pre_incident_estimate',
				entity_id: id,
				action: 'updated'
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Add line item to pre-incident estimate
	 */
	async addLineItem(id: string, item: EstimateLineItem): Promise<PreIncidentEstimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Pre-incident estimate not found');
		}

		// Calculate costs for the new item
		const labourCost = calculateLabourCost(item.labour_hours, estimate.labour_rate);
		const paintCost = calculatePaintCost(item.paint_panels, estimate.paint_rate);
		const total = calculateLineItemTotal(item, estimate.labour_rate, estimate.paint_rate);

		// Add unique ID and calculated costs to line item
		const newItem: EstimateLineItem = {
			...item,
			id: item.id || crypto.randomUUID(),
			labour_cost: labourCost,
			paint_cost: paintCost,
			total
		};

		const updatedLineItems = [...estimate.line_items, newItem];

		return this.update(id, { line_items: updatedLineItems });
	}

	/**
	 * Update line item in pre-incident estimate
	 */
	async updateLineItem(
		id: string,
		itemId: string,
		item: Partial<EstimateLineItem>
	): Promise<PreIncidentEstimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Pre-incident estimate not found');
		}

		const updatedLineItems = estimate.line_items.map((lineItem) => {
			if (lineItem.id === itemId) {
				const updated = { ...lineItem, ...item };
				// Recalculate costs
				updated.labour_cost = calculateLabourCost(updated.labour_hours, estimate.labour_rate);
				updated.paint_cost = calculatePaintCost(updated.paint_panels, estimate.paint_rate);
				updated.total = calculateLineItemTotal(updated, estimate.labour_rate, estimate.paint_rate);
				return updated;
			}
			return lineItem;
		});

		return this.update(id, { line_items: updatedLineItems });
	}

	/**
	 * Delete line item from pre-incident estimate
	 */
	async deleteLineItem(id: string, itemId: string): Promise<PreIncidentEstimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Pre-incident estimate not found');
		}

		const updatedLineItems = estimate.line_items.filter((item) => item.id !== itemId);

		return this.update(id, { line_items: updatedLineItems });
	}

	/**
	 * Delete multiple line items from pre-incident estimate in a single operation
	 * This prevents race conditions when deleting multiple items
	 */
	async bulkDeleteLineItems(id: string, itemIds: string[]): Promise<PreIncidentEstimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Pre-incident estimate not found');
		}

		// Filter out all items with IDs in the itemIds array
		const updatedLineItems = estimate.line_items.filter((item) => !itemIds.includes(item.id!));

		return this.update(id, { line_items: updatedLineItems });
	}

	/**
	 * Get pre-incident estimate by ID
	 */
	async getById(id: string): Promise<PreIncidentEstimate | null> {
		const { data, error } = await supabase
			.from('pre_incident_estimates')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching pre-incident estimate:', error);
			return null;
		}

		return data;
	}

	/**
	 * Recalculate all totals for a pre-incident estimate (useful when rates change)
	 */
	async recalculateTotals(id: string): Promise<PreIncidentEstimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Pre-incident estimate not found');
		}

		// Recalculate all line items with current rates
		const updatedLineItems = recalculateAllLineItems(
			estimate.line_items,
			estimate.labour_rate,
			estimate.paint_rate
		);

		// Recalculate estimate totals
		const subtotal = calculateSubtotal(updatedLineItems);
		const vatAmount = calculateVAT(subtotal, estimate.vat_percentage);
		const total = calculateTotal(subtotal, vatAmount);

		const { data, error } = await supabase
			.from('pre_incident_estimates')
			.update({
				line_items: updatedLineItems,
				subtotal,
				vat_amount: vatAmount,
				total
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error recalculating totals:', error);
			throw new Error(`Failed to recalculate totals: ${error.message}`);
		}

		return data;
	}
}

export const preIncidentEstimateService = new PreIncidentEstimateService();

