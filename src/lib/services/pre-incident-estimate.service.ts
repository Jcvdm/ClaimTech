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
	calculateVAT,
	calculateTotal,
	recalculateAllLineItems,
	calculatePartSellingPrice,
	calculateOutworkSellingPrice,
	calculateSACost,
	calculateLabourCost,
	calculatePaintCost
} from '$lib/utils/estimateCalculations';

function calculatePreIncidentTotals(
	lineItems: EstimateLineItem[],
	labourRate: number,
	paintRate: number,
	vatPercentage: number,
	oemMarkupPercentage: number,
	altMarkupPercentage: number,
	secondHandMarkupPercentage: number,
	outworkMarkupPercentage: number
) {
	const partsTotal = lineItems
		.filter((item) => item.process_type === 'N')
		.reduce((sum, item) => sum + (item.part_price_nett || 0), 0);
	const saTotal = lineItems.reduce(
		(sum, item) => sum + (item.strip_assemble ?? calculateSACost(item.strip_assemble_hours, labourRate)),
		0
	);
	const labourTotal = lineItems.reduce(
		(sum, item) => sum + (item.labour_cost ?? calculateLabourCost(item.labour_hours, labourRate)),
		0
	);
	const paintTotal = lineItems.reduce(
		(sum, item) => sum + (item.paint_cost ?? calculatePaintCost(item.paint_panels, paintRate)),
		0
	);
	const outworkTotal = lineItems
		.filter((item) => item.process_type === 'O')
		.reduce((sum, item) => sum + (item.outwork_charge_nett || 0), 0);
	const partsMarkup = lineItems.reduce((sum, item) => {
		if (item.process_type !== 'N') return sum;
		const nett = item.part_price_nett || 0;
		const markupPercentage =
			item.part_type === 'ALT'
				? altMarkupPercentage
				: item.part_type === '2ND'
					? secondHandMarkupPercentage
					: oemMarkupPercentage;
		return sum + (calculatePartSellingPrice(nett, markupPercentage) - nett);
	}, 0);
	const outworkMarkup = lineItems.reduce((sum, item) => {
		if (item.process_type !== 'O') return sum;
		const nett = item.outwork_charge_nett || 0;
		return sum + (calculateOutworkSellingPrice(nett, outworkMarkupPercentage) - nett);
	}, 0);
	const bettermentTotal = lineItems.reduce((sum, item) => sum + (item.betterment_total || 0), 0);
	const markupTotal = partsMarkup + outworkMarkup;
	const subtotal = partsTotal + saTotal + labourTotal + paintTotal + outworkTotal + markupTotal - bettermentTotal;
	const vatAmount = calculateVAT(subtotal, vatPercentage);
	const total = calculateTotal(subtotal, vatAmount);

	return {
		subtotal,
		vatAmount,
		total
	};
}

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

		return data as unknown as PreIncidentEstimate | null;
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
		const vatPercentage = input.vat_percentage || 15.0;
		const totals = calculatePreIncidentTotals(
			lineItems,
			labourRate,
			paintRate,
			vatPercentage,
			input.oem_markup_percentage || 25.0,
			input.alt_markup_percentage || 25.0,
			input.second_hand_markup_percentage || 25.0,
			input.outwork_markup_percentage || 25.0
		);

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
				line_items: lineItems as any,
				subtotal: totals.subtotal,
				vat_percentage: vatPercentage,
				vat_amount: totals.vatAmount,
				total: totals.total,
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
				entity_id: input.assessment_id,
				action: 'created',
				metadata: {
					estimate_id: data.id,
					total: totals.total
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as PreIncidentEstimate;
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

		// Recalculate totals when any totals-affecting fields change
		let updateData: any = { ...input };

		const shouldRecalculateTotals =
			input.line_items !== undefined ||
			input.labour_rate !== undefined ||
			input.paint_rate !== undefined ||
			input.vat_percentage !== undefined ||
			input.oem_markup_percentage !== undefined ||
			input.alt_markup_percentage !== undefined ||
			input.second_hand_markup_percentage !== undefined ||
			input.outwork_markup_percentage !== undefined;

		if (shouldRecalculateTotals) {
			const labourRate = input.labour_rate ?? currentEstimate.labour_rate;
			const paintRate = input.paint_rate ?? currentEstimate.paint_rate;
			const lineItems = input.line_items ?? currentEstimate.line_items;
			const oemMarkupPercentage = input.oem_markup_percentage ?? currentEstimate.oem_markup_percentage;
			const altMarkupPercentage = input.alt_markup_percentage ?? currentEstimate.alt_markup_percentage;
			const secondHandMarkupPercentage =
				input.second_hand_markup_percentage ?? currentEstimate.second_hand_markup_percentage;
			const outworkMarkupPercentage =
				input.outwork_markup_percentage ?? currentEstimate.outwork_markup_percentage;

			// Recalculate all line items if rates changed
			const recalculatedItems =
				input.labour_rate !== undefined || input.paint_rate !== undefined
					? recalculateAllLineItems(lineItems, labourRate, paintRate)
					: lineItems;

			const vatPercentage = input.vat_percentage ?? currentEstimate.vat_percentage;
			const totals = calculatePreIncidentTotals(
				recalculatedItems,
				labourRate,
				paintRate,
				vatPercentage,
				oemMarkupPercentage,
				altMarkupPercentage,
				secondHandMarkupPercentage,
				outworkMarkupPercentage
			);

			updateData = {
				...updateData,
				line_items: recalculatedItems,
				subtotal: totals.subtotal,
				vat_amount: totals.vatAmount,
				total: totals.total
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
			// Check if rates were updated
			const ratesChanged =
				(input.labour_rate !== undefined && input.labour_rate !== currentEstimate.labour_rate) ||
				(input.paint_rate !== undefined && input.paint_rate !== currentEstimate.paint_rate) ||
				(input.vat_percentage !== undefined && input.vat_percentage !== currentEstimate.vat_percentage);

			if (ratesChanged) {
				await auditService.logChange({
					entity_type: 'pre_incident_estimate',
					entity_id: currentEstimate.assessment_id,
					action: 'rates_updated',
					metadata: {
						estimate_id: id,
						old_labour_rate: currentEstimate.labour_rate,
						new_labour_rate: data.labour_rate,
						old_paint_rate: currentEstimate.paint_rate,
						new_paint_rate: data.paint_rate,
						old_vat_percentage: currentEstimate.vat_percentage,
						new_vat_percentage: data.vat_percentage
					}
				});
			} else {
				// Generic update for other changes
				await auditService.logChange({
					entity_type: 'pre_incident_estimate',
					entity_id: currentEstimate.assessment_id,
					action: 'updated'
				});
			}
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as unknown as PreIncidentEstimate;
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

		const result = await this.update(id, { line_items: updatedLineItems });

		// Log audit trail for line item addition
		try {
			await auditService.logChange({
				entity_type: 'pre_incident_estimate',
				entity_id: estimate.assessment_id,
				action: 'line_item_added',
				metadata: {
					estimate_id: id,
					line_item_id: newItem.id,
					description: item.description,
					process_type: item.process_type,
					total: total
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return result;
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

		const oldItem = estimate.line_items.find((item) => item.id === itemId);
		const oldTotal = oldItem?.total || 0;

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

		const result = await this.update(id, { line_items: updatedLineItems });

		// Log audit trail for line item update
		try {
			const updatedItem = updatedLineItems.find((item) => item.id === itemId);
			await auditService.logChange({
				entity_type: 'pre_incident_estimate',
				entity_id: estimate.assessment_id,
				action: 'line_item_updated',
				metadata: {
					estimate_id: id,
					line_item_id: itemId,
					description: updatedItem?.description || oldItem?.description,
					old_total: oldTotal,
					new_total: updatedItem?.total || 0
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return result;
	}

	/**
	 * Delete line item from pre-incident estimate
	 */
	async deleteLineItem(id: string, itemId: string): Promise<PreIncidentEstimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Pre-incident estimate not found');
		}

		const deletedItem = estimate.line_items.find((item) => item.id === itemId);
		const updatedLineItems = estimate.line_items.filter((item) => item.id !== itemId);

		const result = await this.update(id, { line_items: updatedLineItems });

		// Log audit trail for line item deletion
		try {
			await auditService.logChange({
				entity_type: 'pre_incident_estimate',
				entity_id: estimate.assessment_id,
				action: 'line_item_deleted',
				metadata: {
					estimate_id: id,
					line_item_id: itemId,
					description: deletedItem?.description,
					total: deletedItem?.total || 0
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return result;
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

		return data as unknown as PreIncidentEstimate | null;
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
		const totals = calculatePreIncidentTotals(
			updatedLineItems,
			estimate.labour_rate,
			estimate.paint_rate,
			estimate.vat_percentage,
			estimate.oem_markup_percentage,
			estimate.alt_markup_percentage,
			estimate.second_hand_markup_percentage,
			estimate.outwork_markup_percentage
		);

		const { data, error } = await supabase
			.from('pre_incident_estimates')
			.update({
				line_items: updatedLineItems as any,
				subtotal: totals.subtotal,
				vat_amount: totals.vatAmount,
				total: totals.total
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error recalculating totals:', error);
			throw new Error(`Failed to recalculate totals: ${error.message}`);
		}

		return data as unknown as PreIncidentEstimate;
	}
}

export const preIncidentEstimateService = new PreIncidentEstimateService();
