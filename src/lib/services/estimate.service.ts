import { supabase } from '$lib/supabase';
import type {
	Estimate,
	EstimateLineItem,
	CreateEstimateInput,
	UpdateEstimateInput
} from '$lib/types/assessment';
import { auditService } from './audit.service';

export class EstimateService {
	/**
	 * Get estimate by assessment ID (single estimate per assessment)
	 */
	async getByAssessment(assessmentId: string): Promise<Estimate | null> {
		const { data, error } = await supabase
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
	 */
	async createDefault(assessmentId: string): Promise<Estimate> {
		return this.create({
			assessment_id: assessmentId,
			line_items: [],
			notes: '',
			vat_percentage: 15.0,
			currency: 'ZAR'
		});
	}

	/**
	 * Create estimate
	 */
	async create(input: CreateEstimateInput): Promise<Estimate> {
		// Calculate totals
		const lineItems = input.line_items || [];
		const subtotal = this.calculateSubtotal(lineItems);
		const vatPercentage = input.vat_percentage || 15.0;
		const vatAmount = this.calculateVAT(subtotal, vatPercentage);
		const total = subtotal + vatAmount;

		const { data, error } = await supabase
			.from('assessment_estimates')
			.insert({
				assessment_id: input.assessment_id,
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
		// If line_items are being updated, recalculate totals
		let updateData: any = { ...input };

		if (input.line_items) {
			const subtotal = this.calculateSubtotal(input.line_items);
			const vatPercentage = input.vat_percentage || 15.0;
			const vatAmount = this.calculateVAT(subtotal, vatPercentage);
			const total = subtotal + vatAmount;

			updateData = {
				...updateData,
				subtotal,
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
			await auditService.logChange({
				entity_type: 'estimate',
				entity_id: id,
				action: 'updated'
			});
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

		// Add unique ID to line item
		const newItem = {
			...item,
			id: crypto.randomUUID()
		};

		const updatedLineItems = [...estimate.line_items, newItem];

		return this.update(id, { line_items: updatedLineItems });
	}

	/**
	 * Update line item in estimate
	 */
	async updateLineItem(id: string, itemId: string, item: Partial<EstimateLineItem>): Promise<Estimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Estimate not found');
		}

		const updatedLineItems = estimate.line_items.map((lineItem) => {
			if (lineItem.id === itemId) {
				const updated = { ...lineItem, ...item };
				// Recalculate line item total
				updated.total = updated.quantity * updated.unit_price;
				return updated;
			}
			return lineItem;
		});

		return this.update(id, { line_items: updatedLineItems });
	}

	/**
	 * Delete line item from estimate
	 */
	async deleteLineItem(id: string, itemId: string): Promise<Estimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Estimate not found');
		}

		const updatedLineItems = estimate.line_items.filter((item) => item.id !== itemId);

		return this.update(id, { line_items: updatedLineItems });
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
	 * Calculate subtotal from line items
	 */
	private calculateSubtotal(lineItems: EstimateLineItem[]): number {
		return lineItems.reduce((sum, item) => sum + item.total, 0);
	}

	/**
	 * Calculate VAT amount
	 */
	private calculateVAT(subtotal: number, vatPercentage: number): number {
		return (subtotal * vatPercentage) / 100;
	}

	/**
	 * Recalculate all totals for an estimate
	 */
	async recalculateTotals(id: string): Promise<Estimate> {
		const estimate = await this.getById(id);
		if (!estimate) {
			throw new Error('Estimate not found');
		}

		// Recalculate line item totals
		const updatedLineItems = estimate.line_items.map((item) => ({
			...item,
			total: item.quantity * item.unit_price
		}));

		// Recalculate estimate totals
		const subtotal = this.calculateSubtotal(updatedLineItems);
		const vatAmount = this.calculateVAT(subtotal, estimate.vat_percentage);
		const total = subtotal + vatAmount;

		const { data, error } = await supabase
			.from('assessment_estimates')
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

export const estimateService = new EstimateService();

