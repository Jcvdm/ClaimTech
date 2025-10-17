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
	calculateFRCAggregateTotals,
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
	 * Uses frozen rates from assessment finalization for consistency
	 */
	async startFRC(
		assessmentId: string,
		estimate: Estimate,
		additionals: AssessmentAdditionals | null
	): Promise<FinalRepairCosting> {
		// Check if FRC already exists
		const existing = await this.getByAssessment(assessmentId);

		if (existing) {
			// If FRC exists with 'not_started' status, delete it to start fresh
			if (existing.status === 'not_started') {
				const { error: deleteError } = await supabase
					.from('assessment_frc')
					.delete()
					.eq('id', existing.id);

				if (deleteError) {
					console.error('Error deleting not_started FRC:', deleteError);
					throw new Error(`Failed to clear previous FRC: ${deleteError.message}`);
				}

				// Log deletion
				await auditService.logChange({
					entity_type: 'frc',
					entity_id: existing.id,
					action: 'updated',
					field_name: 'status',
					old_value: 'not_started',
					new_value: 'deleted_for_restart',
					metadata: { assessment_id: assessmentId }
				});
			} else {
				// FRC is in progress or completed - don't allow restart
				throw new Error('FRC already exists for this assessment');
			}
		}

		// Fetch assessment to get frozen rates and markups from finalization
		const { data: assessment, error: assessmentError } = await supabase
			.from('assessments')
			.select('finalized_labour_rate, finalized_paint_rate, finalized_oem_markup, finalized_alt_markup, finalized_second_hand_markup, finalized_outwork_markup')
			.eq('id', assessmentId)
			.maybeSingle();

		if (assessmentError) {
			console.error('Error fetching assessment for FRC:', assessmentError);
			throw new Error(`Failed to fetch assessment: ${assessmentError.message}`);
		}

		// Use frozen rates if available, otherwise fall back to estimate rates
		const frozenRates = assessment?.finalized_labour_rate && assessment?.finalized_paint_rate
			? {
					labour_rate: assessment.finalized_labour_rate,
					paint_rate: assessment.finalized_paint_rate
			  }
			: undefined;

		// Use frozen markups if available, otherwise fall back to estimate markups
		// For parts, use OEM markup as default (could be weighted average in future)
		const partsMarkup = assessment?.finalized_oem_markup ?? estimate.oem_markup_percentage;
		const outworkMarkup = assessment?.finalized_outwork_markup ?? estimate.outwork_markup_percentage;

		// Compose final estimate lines with frozen rates
		const lineItems = composeFinalEstimateLines(estimate, additionals, frozenRates);

		// Calculate quoted breakdown with markup applied at aggregate level
		const quotedTotals = calculateFRCAggregateTotals(
			lineItems,
			false,
			{ parts_markup: partsMarkup, outwork_markup: outworkMarkup },
			estimate.vat_percentage
		);

		// Create FRC record
		const { data, error } = await supabase
			.from('assessment_frc')
			.insert({
				assessment_id: assessmentId,
				status: 'in_progress',
				line_items: lineItems,
				vat_percentage: estimate.vat_percentage,
				// Quoted estimate breakdown
				quoted_estimate_parts_nett: quotedTotals.estimate.parts_nett,
				quoted_estimate_labour: quotedTotals.estimate.labour,
				quoted_estimate_paint: quotedTotals.estimate.paint,
				quoted_estimate_outwork_nett: quotedTotals.estimate.outwork_nett,
				quoted_estimate_markup: quotedTotals.estimate.markup,
				quoted_estimate_subtotal: quotedTotals.estimate.subtotal,
				// Quoted additionals breakdown
				quoted_additionals_parts_nett: quotedTotals.additionals.parts_nett,
				quoted_additionals_labour: quotedTotals.additionals.labour,
				quoted_additionals_paint: quotedTotals.additionals.paint,
				quoted_additionals_outwork_nett: quotedTotals.additionals.outwork_nett,
				quoted_additionals_markup: quotedTotals.additionals.markup,
				quoted_additionals_subtotal: quotedTotals.additionals.subtotal,
				// Quoted combined totals (backward compatibility)
				quoted_parts_total: quotedTotals.parts_total,
				quoted_labour_total: quotedTotals.labour_total,
				quoted_paint_total: quotedTotals.paint_total,
				quoted_outwork_total: quotedTotals.outwork_total,
				quoted_subtotal: quotedTotals.subtotal,
				quoted_vat_amount: quotedTotals.vat_amount,
				quoted_total: quotedTotals.total,
				// Actual estimate breakdown (initially 0)
				actual_estimate_parts_nett: 0,
				actual_estimate_labour: 0,
				actual_estimate_paint: 0,
				actual_estimate_outwork_nett: 0,
				actual_estimate_markup: 0,
				actual_estimate_subtotal: 0,
				// Actual additionals breakdown (initially 0)
				actual_additionals_parts_nett: 0,
				actual_additionals_labour: 0,
				actual_additionals_paint: 0,
				actual_additionals_outwork_nett: 0,
				actual_additionals_markup: 0,
				actual_additionals_subtotal: 0,
				// Actual combined totals (initially 0)
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
				quoted_total: quotedTotals.total,
				frozen_rates: frozenRates,
				markups: { parts_markup: partsMarkup, outwork_markup: outworkMarkup }
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
			line.adjust_reason = null;
			// Copy quoted components to actuals for agree (nett values)
			line.actual_part_price_nett = line.quoted_part_price_nett;
			line.actual_strip_assemble_hours = line.strip_assemble_hours;
			line.actual_strip_assemble = line.quoted_strip_assemble;
			line.actual_labour_hours = line.labour_hours;
			line.actual_labour_cost = line.quoted_labour_cost;
			line.actual_paint_panels = line.paint_panels;
			line.actual_paint_cost = line.quoted_paint_cost;
			line.actual_outwork_charge = line.quoted_outwork_charge_nett; // Use nett for consistency
			// Calculate nett actual total (no markup)
			const actual_total_nett =
				(line.actual_part_price_nett ?? 0) +
				(line.actual_strip_assemble ?? 0) +
				(line.actual_labour_cost ?? 0) +
				(line.actual_paint_cost ?? 0) +
				(line.actual_outwork_charge ?? 0);
			line.actual_total = Number(actual_total_nett.toFixed(2));
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

		// Fetch assessment to get frozen markups
		const { data: assessment, error: assessmentError } = await supabase
			.from('assessments')
			.select('finalized_oem_markup, finalized_outwork_markup')
			.eq('id', frc.assessment_id)
			.maybeSingle();

		if (assessmentError) {
			console.error('Error fetching assessment for FRC update:', assessmentError);
			throw new Error(`Failed to fetch assessment: ${assessmentError.message}`);
		}

		// Get markups (use frozen if available, otherwise fetch from estimate)
		let partsMarkup = assessment?.finalized_oem_markup;
		let outworkMarkup = assessment?.finalized_outwork_markup;

		if (!partsMarkup || !outworkMarkup) {
			// Fallback: fetch from estimate
			const { data: estimate } = await supabase
				.from('assessment_estimates')
				.select('oem_markup_percentage, outwork_markup_percentage')
				.eq('assessment_id', frc.assessment_id)
				.maybeSingle();

			partsMarkup = partsMarkup ?? estimate?.oem_markup_percentage ?? 25;
			outworkMarkup = outworkMarkup ?? estimate?.outwork_markup_percentage ?? 25;
		}

		// Recalculate actual totals with markup applied at aggregate level
		const actualTotals = calculateFRCAggregateTotals(
			updatedLineItems,
			true,
			{ parts_markup: partsMarkup, outwork_markup: outworkMarkup },
			frc.vat_percentage
		);

		// Update FRC
		const { data, error } = await supabase
			.from('assessment_frc')
			.update({
				line_items: updatedLineItems,
				// Actual estimate breakdown
				actual_estimate_parts_nett: actualTotals.estimate.parts_nett,
				actual_estimate_labour: actualTotals.estimate.labour,
				actual_estimate_paint: actualTotals.estimate.paint,
				actual_estimate_outwork_nett: actualTotals.estimate.outwork_nett,
				actual_estimate_markup: actualTotals.estimate.markup,
				actual_estimate_subtotal: actualTotals.estimate.subtotal,
				// Actual additionals breakdown
				actual_additionals_parts_nett: actualTotals.additionals.parts_nett,
				actual_additionals_labour: actualTotals.additionals.labour,
				actual_additionals_paint: actualTotals.additionals.paint,
				actual_additionals_outwork_nett: actualTotals.additionals.outwork_nett,
				actual_additionals_markup: actualTotals.additionals.markup,
				actual_additionals_subtotal: actualTotals.additionals.subtotal,
				// Actual combined totals (backward compatibility)
				actual_parts_total: actualTotals.parts_total,
				actual_labour_total: actualTotals.labour_total,
				actual_paint_total: actualTotals.paint_total,
				actual_outwork_total: actualTotals.outwork_total,
				actual_subtotal: actualTotals.subtotal,
				actual_vat_amount: actualTotals.vat_amount,
				actual_total: actualTotals.total,
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
	 * Complete FRC with sign-off details
	 */
	async completeFRC(
		frcId: string,
		signOffData: {
			name: string;
			email: string;
			role: string;
			notes?: string;
		}
	): Promise<FinalRepairCosting> {
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

		const now = new Date().toISOString();

		const { data, error } = await supabase
			.from('assessment_frc')
			.update({
				status: 'completed',
				completed_at: now,
				signed_off_by_name: signOffData.name,
				signed_off_by_email: signOffData.email,
				signed_off_by_role: signOffData.role,
				signed_off_at: now,
				sign_off_notes: signOffData.notes || null,
				updated_at: now
			})
			.eq('id', frcId)
			.select()
			.single();

		if (error) {
			console.error('Error completing FRC:', error);
			throw new Error(`Failed to complete FRC: ${error.message}`);
		}

		// Log audit with sign-off details
		await auditService.logChange({
			entity_type: 'frc',
			entity_id: frcId,
			action: 'completed',
			new_value: 'FRC completed and signed off',
			metadata: {
				quoted_total: frc.quoted_total,
				actual_total: frc.actual_total,
				delta: frc.actual_total - frc.quoted_total,
				signed_off_by: signOffData.name,
				signed_off_email: signOffData.email,
				signed_off_role: signOffData.role
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

