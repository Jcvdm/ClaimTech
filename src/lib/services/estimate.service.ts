import { supabase } from '$lib/supabase';
import type {
	Estimate,
	EstimateLineItem,
	CreateEstimateInput,
	UpdateEstimateInput
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
	calculatePaintCost,
	calculateBetterment
} from '$lib/utils/estimateCalculations';


// Compute aggregate totals applying markup only at aggregate level (parts & outwork)
// Now includes betterment deduction
function computeAggregateTotals(
    lineItems: EstimateLineItem[],
    vatPercentage: number,
    oemMarkup: number,
    altMarkup: number,
    secondHandMarkup: number,
    outworkMarkup: number,
    sundriesPercentage: number
): { subtotal: number; sundriesAmount: number; vatAmount: number; total: number } {
	let partsSellingTotal = 0;
	let labourTotal = 0;
	let paintTotal = 0;
	let outworkSellingTotal = 0;
	let bettermentTotal = 0;

	for (const item of lineItems) {
		if (item.process_type === 'N') {
			const nett = item.part_price_nett || 0;
			let markup = 0;
			if (item.part_type === 'OEM') markup = oemMarkup;
			else if (item.part_type === 'ALT') markup = altMarkup;
			else if (item.part_type === '2ND') markup = secondHandMarkup;

			// Apply betterment to nett price before markup
			const partBetterment = (item.betterment_part_percentage || 0) * nett / 100;
			const nettAfterBetterment = nett - partBetterment;
			partsSellingTotal += nettAfterBetterment * (1 + markup / 100);
		}

		// Labour and S&A with betterment
		const saAmount = item.strip_assemble || 0;
		const saBetterment = (item.betterment_sa_percentage || 0) * saAmount / 100;
		const labourAmount = item.labour_cost || 0;
		const labourBetterment = (item.betterment_labour_percentage || 0) * labourAmount / 100;
		labourTotal += (saAmount - saBetterment) + (labourAmount - labourBetterment);

		// Paint with betterment
		const paintAmount = item.paint_cost || 0;
		const paintBetterment = (item.betterment_paint_percentage || 0) * paintAmount / 100;
		paintTotal += paintAmount - paintBetterment;

		if (item.process_type === 'O') {
			const nett = item.outwork_charge_nett || 0;
			// Apply betterment to nett outwork before markup
			const outworkBetterment = (item.betterment_outwork_percentage || 0) * nett / 100;
			const nettAfterBetterment = nett - outworkBetterment;
			outworkSellingTotal += nettAfterBetterment * (1 + outworkMarkup / 100);
		}

		// Track total betterment for reference
		bettermentTotal += item.betterment_total || 0;
	}

    const subtotal = Number((partsSellingTotal + labourTotal + paintTotal + outworkSellingTotal).toFixed(2));
    const sundriesAmount = Number((subtotal * (sundriesPercentage / 100)).toFixed(2));
    const vatAmount = Number((((subtotal + sundriesAmount) * vatPercentage) / 100).toFixed(2));
    const total = Number((subtotal + sundriesAmount + vatAmount).toFixed(2));
    return { subtotal, sundriesAmount, vatAmount, total };
}

export class EstimateService {
	/**
	 * Get estimate by assessment ID (single estimate per assessment)
	 */
	async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<Estimate | null> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_estimates')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching estimate:', error);
			return null;
		}

		return data;
	}

	/**
	 * Create default estimate for a new assessment
	 * IDEMPOTENT: Checks if exists first, returns existing record if found
	 */
	async createDefault(assessmentId: string, client?: ServiceClient): Promise<Estimate> {
		// Check if already exists
		const existing = await this.getByAssessment(assessmentId, client);
		if (existing) {
			return existing;
		}

		// Create new
		let sundriesPct = 1.0;
		try {
			const { data: companySettings } = await (client ?? supabase).from('company_settings').select('*').single();
			if (companySettings && typeof companySettings.sundries_percentage === 'number') {
				sundriesPct = companySettings.sundries_percentage;
			}
		} catch {}
		return this.create({
			assessment_id: assessmentId,
			labour_rate: 500.0,
			paint_rate: 2000.0,
			line_items: [],
			notes: '',
			vat_percentage: 15.0,
			sundries_percentage: sundriesPct,
			currency: 'ZAR'
		}, client);
	}

	/**
	 * Create estimate
	 */
	async create(input: CreateEstimateInput, client?: ServiceClient): Promise<Estimate> {
		const db = client ?? supabase;
		let settingsSundriesPct = 1.0;
		try {
			const { data: companySettings } = await db.from('company_settings').select('*').single();
			if (companySettings && typeof companySettings.sundries_percentage === 'number') {
				settingsSundriesPct = companySettings.sundries_percentage;
			}
		} catch {}
		// Calculate totals (nett per-line; markup at aggregate)
		const lineItems = input.line_items || [];
		const labourRate = input.labour_rate || 500.0;
		const paintRate = input.paint_rate || 2000.0;
		const vatPercentage = input.vat_percentage || 15.0;
		const oem = input.oem_markup_percentage ?? 0;
		const alt = input.alt_markup_percentage ?? 0;
		const sh = input.second_hand_markup_percentage ?? 0;
		const outwork = input.outwork_markup_percentage ?? 0;
		const { subtotal, sundriesAmount, vatAmount, total } = computeAggregateTotals(
			lineItems,
			vatPercentage,
			oem,
			alt,
			sh,
			outwork,
			input.sundries_percentage ?? settingsSundriesPct
		);

		const { data, error } = await db
			.from('assessment_estimates')
			.insert({
				assessment_id: input.assessment_id,
				repairer_id: input.repairer_id || null,
				labour_rate: labourRate,
				paint_rate: paintRate,
                line_items: lineItems,
                subtotal,
                sundries_percentage: input.sundries_percentage ?? 1.0,
                sundries_amount: sundriesAmount,
                vat_percentage: vatPercentage,
                vat_amount: vatAmount,
                total,
				assessment_result: input.assessment_result || null,
				notes: input.notes || null,
				currency: input.currency || 'ZAR'
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating estimate:', error);
			throw new Error(`Failed to create estimate: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'estimate',
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
	 * Update estimate
	 */
	async update(id: string, input: UpdateEstimateInput): Promise<Estimate> {
		// Get current estimate to access rates
		const currentEstimate = await this.getById(id);
		if (!currentEstimate) {
			throw new Error('Estimate not found');
		}

		// If line_items or rates are being updated, recalculate totals
		let updateData: any = { ...input };

        if (input.line_items || input.labour_rate || input.paint_rate || input.sundries_percentage !== undefined) {
			const labourRate = input.labour_rate || currentEstimate.labour_rate;
			const paintRate = input.paint_rate || currentEstimate.paint_rate;
			const lineItems = input.line_items || currentEstimate.line_items;

			// Recalculate all line items if rates changed
			const recalculatedItems =
				input.labour_rate || input.paint_rate
					? recalculateAllLineItems(lineItems, labourRate, paintRate)
					: lineItems;

			const vatPercentage = input.vat_percentage || currentEstimate.vat_percentage;
            const { subtotal, sundriesAmount, vatAmount, total } = computeAggregateTotals(
                recalculatedItems,
                vatPercentage,
                input.oem_markup_percentage ?? currentEstimate.oem_markup_percentage ?? 0,
                input.alt_markup_percentage ?? currentEstimate.alt_markup_percentage ?? 0,
                input.second_hand_markup_percentage ?? currentEstimate.second_hand_markup_percentage ?? 0,
                input.outwork_markup_percentage ?? currentEstimate.outwork_markup_percentage ?? 0,
                input.sundries_percentage ?? currentEstimate.sundries_percentage ?? 1.0
            );

			updateData = {
				...updateData,
                line_items: recalculatedItems,
                subtotal,
                sundries_percentage: input.sundries_percentage ?? currentEstimate.sundries_percentage ?? 1.0,
                sundries_amount: sundriesAmount,
                vat_amount: vatAmount,
                total
            };
        }

		const { data, error } = await supabase
			.from('assessment_estimates')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating estimate:', error);
			throw new Error(`Failed to update estimate: ${error.message}`);
		}

		// Log audit trail
		try {
			// Check if rates were updated
            const ratesChanged =
                (input.labour_rate !== undefined && input.labour_rate !== currentEstimate.labour_rate) ||
                (input.paint_rate !== undefined && input.paint_rate !== currentEstimate.paint_rate) ||
                (input.vat_percentage !== undefined && input.vat_percentage !== currentEstimate.vat_percentage) ||
                (input.oem_markup_percentage !== undefined && input.oem_markup_percentage !== currentEstimate.oem_markup_percentage) ||
                (input.alt_markup_percentage !== undefined && input.alt_markup_percentage !== currentEstimate.alt_markup_percentage) ||
                (input.second_hand_markup_percentage !== undefined && input.second_hand_markup_percentage !== currentEstimate.second_hand_markup_percentage) ||
                (input.outwork_markup_percentage !== undefined && input.outwork_markup_percentage !== currentEstimate.outwork_markup_percentage) ||
                (input.sundries_percentage !== undefined && input.sundries_percentage !== currentEstimate.sundries_percentage);

			if (ratesChanged) {
				await auditService.logChange({
					entity_type: 'estimate',
					entity_id: data.assessment_id,
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
					entity_type: 'estimate',
					entity_id: data.assessment_id,
					action: 'updated'
				});
			}
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data;
	}

	/**
	 * Add line item to estimate
	 */
	async addLineItem(id: string, item: EstimateLineItem): Promise<Estimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Estimate not found');
		}

		// Calculate costs for the new item
		const labourCost = calculateLabourCost(item.labour_hours, estimate.labour_rate);
		const paintCost = calculatePaintCost(item.paint_panels, estimate.paint_rate);
		const total = calculateLineItemTotal(item, estimate.labour_rate, estimate.paint_rate);

		// Add unique ID and calculated costs to line item
		// Always assign a real server-side ID; ignore any client-provided temp IDs
		const newId = !item.id || (typeof item.id === 'string' && item.id.startsWith('temp-'))
			? crypto.randomUUID()
			: item.id;

		const newItem: EstimateLineItem = {
			...item,
			id: newId,
			labour_cost: labourCost,
			paint_cost: paintCost,
			total
		};

		const updatedLineItems = [...estimate.line_items, newItem];

		const result = await this.update(id, { line_items: updatedLineItems });

		// Log audit trail for line item addition
		try {
			await auditService.logChange({
				entity_type: 'estimate',
				entity_id: estimate.assessment_id,
				action: 'line_item_added',
				metadata: {
					estimate_id: id,
					line_item_id: newId,
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
	 * Update line item in estimate
	 */
	async updateLineItem(
		id: string,
		itemId: string,
		item: Partial<EstimateLineItem>
	): Promise<Estimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Estimate not found');
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
				entity_type: 'estimate',
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
	 * Delete line item from estimate
	 */
	async deleteLineItem(id: string, itemId: string): Promise<Estimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Estimate not found');
		}

		const deletedItem = estimate.line_items.find((item) => item.id === itemId);
		const updatedLineItems = estimate.line_items.filter((item) => item.id !== itemId);

		const result = await this.update(id, { line_items: updatedLineItems });

		// Log audit trail for line item deletion
		try {
			await auditService.logChange({
				entity_type: 'estimate',
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
	 * Delete multiple line items from estimate in a single operation
	 * This prevents race conditions when deleting multiple items
	 */
	async bulkDeleteLineItems(id: string, itemIds: string[]): Promise<Estimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Estimate not found');
		}

		// Calculate total amount removed
		const deletedItems = estimate.line_items.filter((item) => itemIds.includes(item.id!));
		const totalAmountRemoved = deletedItems.reduce((sum, item) => sum + (item.total || 0), 0);

		// Filter out all items with IDs in the itemIds array
		const updatedLineItems = estimate.line_items.filter((item) => !itemIds.includes(item.id!));

		const result = await this.update(id, { line_items: updatedLineItems });

		// Log audit trail for bulk deletion
		try {
			await auditService.logChange({
				entity_type: 'estimate',
				entity_id: estimate.assessment_id,
				action: 'line_item_deleted',
				metadata: {
					estimate_id: id,
					count: itemIds.length,
					total_amount_removed: totalAmountRemoved
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return result;
	}

	/**
	 * Get estimate by ID
	 */
	async getById(id: string): Promise<Estimate | null> {
		const { data, error } = await supabase
			.from('assessment_estimates')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching estimate:', error);
			return null;
		}

		return data;
	}

	/**
	 * Recalculate all totals for an estimate (useful when rates change)
	 */
	async recalculateTotals(id: string): Promise<Estimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Estimate not found');
		}

		// Recalculate all line items with current rates
		const updatedLineItems = recalculateAllLineItems(
			estimate.line_items,
			estimate.labour_rate,
			estimate.paint_rate
		);

		// Recalculate estimate totals (aggregate markup)
        const { subtotal, sundriesAmount, vatAmount, total } = computeAggregateTotals(
            updatedLineItems,
            estimate.vat_percentage,
            estimate.oem_markup_percentage ?? 0,
            estimate.alt_markup_percentage ?? 0,
            estimate.second_hand_markup_percentage ?? 0,
            estimate.outwork_markup_percentage ?? 0,
            estimate.sundries_percentage ?? 1.0
        );

		const { data, error } = await supabase
			.from('assessment_estimates')
            .update({
                line_items: updatedLineItems,
                subtotal,
                sundries_amount: sundriesAmount,
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

export const estimateService = new EstimateService();

