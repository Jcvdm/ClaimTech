import { supabase } from '$lib/supabase';
import type {
	FinalRepairCosting,
	FRCLineItem,
	Estimate,
	AssessmentAdditionals
} from '$lib/types/assessment';
import { auditService } from './audit.service';
import {
	composeFinalEstimateLines,
	calculateBreakdownTotals,
	calculateVAT,
	calculateTotal,
	validateFRCLineItem
} from '$lib/utils/frcCalculations';

class FRCService {
	/**
	 * Get FRC by assessment ID
	 */
	async getByAssessment(assessmentId: string): Promise<FinalRepairCosting | null> {
		const { data, error } = await supabase
			.from('assessment_frc')
			.select('*')
			.eq('assessment_id', assessmentId)
			.maybeSingle();

		if (error) {
			console.error('Error fetching FRC:', error);
			return null;
		}

		return data;
	}

	/**
	 * Start FRC - create snapshot from estimate + approved additionals
	 */
	async startFRC(
		assessmentId: string,
		estimate: Estimate,
		additionals: AssessmentAdditionals | null
	): Promise<FinalRepairCosting> {
		// Check if FRC already exists
		const existing = await this.getByAssessment(assessmentId);
		if (existing) {
			throw new Error('FRC already exists for this assessment');
		}

		// Compose final estimate lines
		const lineItems = composeFinalEstimateLines(estimate, additionals);

		// Calculate quoted breakdown
		const quotedBreakdown = calculateBreakdownTotals(lineItems, false);
		const quotedVatAmount = calculateVAT(quotedBreakdown.subtotal, estimate.vat_percentage);
		const quotedTotal = calculateTotal(quotedBreakdown.subtotal, quotedVatAmount);

		// Create FRC record
		const { data, error } = await supabase
			.from('assessment_frc')
			.insert({
				assessment_id: assessmentId,
				status: 'in_progress',
				line_items: lineItems,
				vat_percentage: estimate.vat_percentage,
				quoted_parts_total: quotedBreakdown.parts_total,
				quoted_labour_total: quotedBreakdown.labour_total,
				quoted_paint_total: quotedBreakdown.paint_total,
				quoted_outwork_total: quotedBreakdown.outwork_total,
				quoted_subtotal: quotedBreakdown.subtotal,
				quoted_vat_amount: quotedVatAmount,
				quoted_total: quotedTotal,
				actual_parts_total: 0,
				actual_labour_total: 0,
				actual_paint_total: 0,
				actual_outwork_total: 0,
				actual_subtotal: 0,
				actual_vat_amount: 0,
				actual_total: 0,
				started_at: new Date().toISOString()
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating FRC:', error);
			throw new Error(`Failed to create FRC: ${error.message}`);
		}

		// Log audit
		await auditService.logChange({
			entity_type: 'frc',
			entity_id: data.id,
			action: 'created',
			new_value: 'FRC started',
			metadata: {
				assessment_id: assessmentId,
				line_count: lineItems.length,
				quoted_total: quotedTotal
			}
		});

		return data;
	}

	/**
	 * Update line item decision (agree/adjust)
	 */
	async updateLineDecision(
		frcId: string,
		lineId: string,
		decision: 'agree' | 'adjust',
		actualTotal?: number,
		adjustReason?: string,
		componentActuals?: {
			actual_part_price_nett?: number | null;
			actual_strip_assemble_hours?: number | null;
			actual_strip_assemble?: number | null;
			actual_labour_hours?: number | null;
			actual_labour_cost?: number | null;
			actual_paint_panels?: number | null;
			actual_paint_cost?: number | null;
			actual_outwork_charge?: number | null;
		}
	): Promise<FinalRepairCosting> {
		const frc = await this.getById(frcId);
		if (!frc) {
			throw new Error('FRC not found');
		}

		// Find the line item
		const lineIndex = frc.line_items.findIndex((item) => item.id === lineId);
		if (lineIndex === -1) {
			throw new Error('Line item not found');
		}

		const line = frc.line_items[lineIndex];

		// Update line item
		if (decision === 'agree') {
			line.decision = 'agree';
			line.actual_total = line.quoted_total;
			line.adjust_reason = null;
			// Copy quoted components to actuals for agree
			line.actual_part_price_nett = line.quoted_part_price_nett;
			line.actual_strip_assemble_hours = line.strip_assemble_hours;
			line.actual_strip_assemble = line.quoted_strip_assemble;
			line.actual_labour_hours = line.labour_hours;
			line.actual_labour_cost = line.quoted_labour_cost;
			line.actual_paint_panels = line.paint_panels;
			line.actual_paint_cost = line.quoted_paint_cost;
			line.actual_outwork_charge = line.quoted_outwork_charge;
		} else if (decision === 'adjust') {
			if (actualTotal === undefined || actualTotal === null) {
				throw new Error('Actual total is required for adjust decision');
			}
			if (!adjustReason || adjustReason.trim() === '') {
				throw new Error('Adjust reason is required for adjust decision');
			}
			line.decision = 'adjust';
			line.actual_total = actualTotal;
			line.adjust_reason = adjustReason;

			// Store component actuals if provided
			if (componentActuals) {
				line.actual_part_price_nett = componentActuals.actual_part_price_nett ?? null;
				line.actual_strip_assemble_hours = componentActuals.actual_strip_assemble_hours ?? null;
				line.actual_strip_assemble = componentActuals.actual_strip_assemble ?? null;
				line.actual_labour_hours = componentActuals.actual_labour_hours ?? null;
				line.actual_labour_cost = componentActuals.actual_labour_cost ?? null;
				line.actual_paint_panels = componentActuals.actual_paint_panels ?? null;
				line.actual_paint_cost = componentActuals.actual_paint_cost ?? null;
				line.actual_outwork_charge = componentActuals.actual_outwork_charge ?? null;
			}
		}

		// Validate the updated line
		const validation = validateFRCLineItem(line);
		if (!validation.valid) {
			throw new Error(validation.error);
		}

		// Update the line items array
		const updatedLineItems = [...frc.line_items];
		updatedLineItems[lineIndex] = line;

		// Recalculate actual totals
		const actualBreakdown = calculateBreakdownTotals(updatedLineItems, true);
		const actualVatAmount = calculateVAT(actualBreakdown.subtotal, frc.vat_percentage);
		const actualTotal_calc = calculateTotal(actualBreakdown.subtotal, actualVatAmount);

		// Update FRC
		const { data, error } = await supabase
			.from('assessment_frc')
			.update({
				line_items: updatedLineItems,
				actual_parts_total: actualBreakdown.parts_total,
				actual_labour_total: actualBreakdown.labour_total,
				actual_paint_total: actualBreakdown.paint_total,
				actual_outwork_total: actualBreakdown.outwork_total,
				actual_subtotal: actualBreakdown.subtotal,
				actual_vat_amount: actualVatAmount,
				actual_total: actualTotal_calc,
				updated_at: new Date().toISOString()
			})
			.eq('id', frcId)
			.select()
			.single();

		if (error) {
			console.error('Error updating FRC line decision:', error);
			throw new Error(`Failed to update line decision: ${error.message}`);
		}

		// Log audit
		await auditService.logChange({
			entity_type: 'frc',
			entity_id: frcId,
			action: 'updated',
			field_name: 'line_decision',
			new_value: decision,
			metadata: {
				line_id: lineId,
				description: line.description,
				quoted_total: line.quoted_total,
				actual_total: line.actual_total,
				adjust_reason: adjustReason
			}
		});

		return data;
	}

	/**
	 * Complete FRC
	 */
	async completeFRC(frcId: string): Promise<FinalRepairCosting> {
		const frc = await this.getById(frcId);
		if (!frc) {
			throw new Error('FRC not found');
		}

		// Validate all lines have decisions
		const pendingLines = frc.line_items.filter((line) => line.decision === 'pending');
		if (pendingLines.length > 0) {
			throw new Error(
				`Cannot complete FRC: ${pendingLines.length} line(s) still pending decision`
			);
		}

		// Validate all adjust decisions have reasons
		for (const line of frc.line_items) {
			const validation = validateFRCLineItem(line);
			if (!validation.valid) {
				throw new Error(validation.error);
			}
		}

		const { data, error } = await supabase
			.from('assessment_frc')
			.update({
				status: 'completed',
				completed_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('id', frcId)
			.select()
			.single();

		if (error) {
			console.error('Error completing FRC:', error);
			throw new Error(`Failed to complete FRC: ${error.message}`);
		}

		// Log audit
		await auditService.logChange({
			entity_type: 'frc',
			entity_id: frcId,
			action: 'completed',
			new_value: 'FRC completed',
			metadata: {
				quoted_total: frc.quoted_total,
				actual_total: frc.actual_total,
				delta: frc.actual_total - frc.quoted_total
			}
		});

		return data;
	}

	/**
	 * Get FRC by ID
	 */
	async getById(id: string): Promise<FinalRepairCosting | null> {
		const { data, error } = await supabase
			.from('assessment_frc')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error) {
			console.error('Error fetching FRC:', error);
			return null;
		}

		return data;
	}
}

export const frcService = new FRCService();

