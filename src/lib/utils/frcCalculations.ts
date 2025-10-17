import type {
	Estimate,
	EstimateLineItem,
	AssessmentAdditionals,
	AdditionalLineItem,
	FRCLineItem,
	ProcessType
} from '$lib/types/assessment';

/**
 * Compose the final estimate lines from original estimate + approved additionals
 * Excludes:
 * - Removed lines (action='removed' from additionals)
 * - Reversed lines (lines that have been reversed by a reversal action)
 * - Declined additional lines (status='declined')
 *
 * @param frozenRates - Optional frozen rates from assessment finalization (for consistency)
 */
export function composeFinalEstimateLines(
	estimate: Estimate,
	additionals: AssessmentAdditionals | null,
	frozenRates?: {
		labour_rate?: number;
		paint_rate?: number;
	}
): FRCLineItem[] {
	const finalLines: FRCLineItem[] = [];

	// Use frozen rates if provided, otherwise fall back to estimate rates
	const labourRate = frozenRates?.labour_rate ?? estimate.labour_rate;
	const paintRate = frozenRates?.paint_rate ?? estimate.paint_rate;

	// Get set of reversed line IDs from additionals
	const reversedTargets = new Set<string>();
	if (additionals) {
		additionals.line_items
			.filter((item) => item.action === 'reversal' && item.reverses_line_id)
			.forEach((item) => {
				if (item.reverses_line_id) {
					reversedTargets.add(item.reverses_line_id);
				}
			});
	}

	// Get set of removed original estimate line IDs
	const removedOriginalIds = new Set<string>();
	if (additionals) {
		additionals.line_items
			.filter((item) => item.action === 'removed' && item.original_estimate_line_id)
			.forEach((item) => {
				if (item.original_estimate_line_id) {
					removedOriginalIds.add(item.original_estimate_line_id);
				}
			});
	}

	// Add original estimate lines (excluding removed ones)
	estimate.line_items.forEach((line) => {
		if (line.id && !removedOriginalIds.has(line.id)) {
			const quoted_total_nett =
				(line.part_price_nett ?? 0) +
				(line.strip_assemble ?? 0) +
				(line.labour_cost ?? 0) +
				(line.paint_cost ?? 0) +
				(line.outwork_charge_nett ?? 0);
			finalLines.push({
				id: crypto.randomUUID(),
				source: 'estimate',
				source_line_id: line.id,
				process_type: line.process_type,
				description: line.description,
				quoted_total: Number(quoted_total_nett.toFixed(2)),
				actual_total: null,
				decision: 'pending',
				adjust_reason: null,
				// Snapshot quoted component breakdown
				quoted_part_price_nett: line.part_price_nett ?? null,
				quoted_part_price: line.part_price ?? null,
				quoted_strip_assemble: line.strip_assemble ?? null,
				quoted_labour_cost: line.labour_cost ?? null,
				quoted_paint_cost: line.paint_cost ?? null,
				quoted_outwork_charge_nett: line.outwork_charge_nett ?? null,
				quoted_outwork_charge: line.outwork_charge ?? null,
				// Snapshot quantities and rates
				part_type: line.part_type ?? null,
				strip_assemble_hours: line.strip_assemble_hours ?? null,
				labour_hours: line.labour_hours ?? null,
				paint_panels: line.paint_panels ?? null,
				labour_rate_snapshot: labourRate,
				paint_rate_snapshot: paintRate,
				// Actuals initially null
				actual_part_price_nett: null,
				actual_strip_assemble: null,
				actual_strip_assemble_hours: null,
				actual_labour_cost: null,
				actual_labour_hours: null,
				actual_paint_cost: null,
				actual_paint_panels: null,
				actual_outwork_charge: null
			});
		}
	});

	// Add approved additional lines (excluding reversed, removed, and declined)
	if (additionals) {
		additionals.line_items
			.filter(
				(item) =>
					item.status === 'approved' &&
					item.action !== 'removed' &&
					item.action !== 'reversal' &&
					item.id &&
					!reversedTargets.has(item.id)
			)
			.forEach((line) => {
				finalLines.push({
					id: crypto.randomUUID(),
					source: 'additional',
					source_line_id: line.id!,
					process_type: line.process_type,
					description: line.description,
					quoted_total: line.total || 0,
					actual_total: null,
					decision: 'pending',
					adjust_reason: null,
					// Snapshot quoted component breakdown
					quoted_part_price_nett: line.part_price_nett ?? null,
					quoted_part_price: line.part_price ?? null,
					quoted_strip_assemble: line.strip_assemble ?? null,
					quoted_labour_cost: line.labour_cost ?? null,
					quoted_paint_cost: line.paint_cost ?? null,
					quoted_outwork_charge_nett: line.outwork_charge_nett ?? null,
					quoted_outwork_charge: line.outwork_charge ?? null,
					// Snapshot quantities and rates
					part_type: line.part_type ?? null,
					strip_assemble_hours: line.strip_assemble_hours ?? null,
					labour_hours: line.labour_hours ?? null,
					paint_panels: line.paint_panels ?? null,
					labour_rate_snapshot: frozenRates?.labour_rate ?? additionals.labour_rate,
					paint_rate_snapshot: frozenRates?.paint_rate ?? additionals.paint_rate,
					// Actuals initially null
					actual_part_price_nett: null,
					actual_strip_assemble: null,
					actual_strip_assemble_hours: null,
					actual_labour_cost: null,
					actual_labour_hours: null,
					actual_paint_cost: null,
					actual_paint_panels: null,
					actual_outwork_charge: null
				});
			});
	}

	return finalLines;
}

/**
 * Calculate breakdown totals from line items (NETT-BASED)
 * Sums nett component values (parts nett, labour, paint, outwork nett)
 * Markup should be applied at aggregate level, not here
 */
export function calculateBreakdownTotals(
	lineItems: FRCLineItem[],
	useActual: boolean = false
): {
	parts_nett_total: number;
	labour_total: number;
	paint_total: number;
	outwork_nett_total: number;
	subtotal_nett: number;
} {
	let parts_nett_total = 0;
	let labour_total = 0;
	let paint_total = 0;
	let outwork_nett_total = 0;

	lineItems.forEach((line) => {
		// Sum nett components (no markup)
		if (useActual) {
			// Actual values
			parts_nett_total += line.actual_part_price_nett ?? 0;
			labour_total += (line.actual_strip_assemble ?? 0) + (line.actual_labour_cost ?? 0);
			paint_total += line.actual_paint_cost ?? 0;
			outwork_nett_total += line.actual_outwork_charge ?? 0;
		} else {
			// Quoted values
			parts_nett_total += line.quoted_part_price_nett ?? 0;
			labour_total += (line.quoted_strip_assemble ?? 0) + (line.quoted_labour_cost ?? 0);
			paint_total += line.quoted_paint_cost ?? 0;
			outwork_nett_total += line.quoted_outwork_charge_nett ?? 0;
		}
	});

	const subtotal_nett = parts_nett_total + labour_total + paint_total + outwork_nett_total;

	return {
		parts_nett_total: Number(parts_nett_total.toFixed(2)),
		labour_total: Number(labour_total.toFixed(2)),
		paint_total: Number(paint_total.toFixed(2)),
		outwork_nett_total: Number(outwork_nett_total.toFixed(2)),
		subtotal_nett: Number(subtotal_nett.toFixed(2))
	};
}

/**
 * Apply markup to parts and outwork nett totals
 * Returns selling totals with markup applied
 */
export function applyMarkupToTotals(
	partsNettTotal: number,
	outworkNettTotal: number,
	markupPercentages: {
		parts_markup: number; // Weighted average or specific markup
		outwork_markup: number;
	}
): {
	parts_selling_total: number;
	outwork_selling_total: number;
} {
	const partsSellingTotal = partsNettTotal * (1 + markupPercentages.parts_markup / 100);
	const outworkSellingTotal = outworkNettTotal * (1 + markupPercentages.outwork_markup / 100);

	return {
		parts_selling_total: Number(partsSellingTotal.toFixed(2)),
		outwork_selling_total: Number(outworkSellingTotal.toFixed(2))
	};
}

/**
 * Calculate breakdown for estimate lines only (source='estimate')
 */
export function calculateEstimateBreakdown(
	lineItems: FRCLineItem[],
	useActual: boolean,
	markupPercentages: {
		parts_markup: number;
		outwork_markup: number;
	}
): {
	parts_nett: number;
	labour: number;
	paint: number;
	outwork_nett: number;
	markup: number;
	subtotal: number;
} {
	const estimateLines = lineItems.filter((line) => line.source === 'estimate');
	const nettBreakdown = calculateBreakdownTotals(estimateLines, useActual);

	// Calculate markup amounts
	const partsMarkup = nettBreakdown.parts_nett_total * (markupPercentages.parts_markup / 100);
	const outworkMarkup = nettBreakdown.outwork_nett_total * (markupPercentages.outwork_markup / 100);
	const totalMarkup = partsMarkup + outworkMarkup;

	// Calculate subtotal (nett + markup)
	const subtotal = nettBreakdown.subtotal_nett + totalMarkup;

	return {
		parts_nett: Number(nettBreakdown.parts_nett_total.toFixed(2)),
		labour: Number(nettBreakdown.labour_total.toFixed(2)),
		paint: Number(nettBreakdown.paint_total.toFixed(2)),
		outwork_nett: Number(nettBreakdown.outwork_nett_total.toFixed(2)),
		markup: Number(totalMarkup.toFixed(2)),
		subtotal: Number(subtotal.toFixed(2))
	};
}

/**
 * Calculate breakdown for additionals lines only (source='additional')
 */
export function calculateAdditionalsBreakdown(
	lineItems: FRCLineItem[],
	useActual: boolean,
	markupPercentages: {
		parts_markup: number;
		outwork_markup: number;
	}
): {
	parts_nett: number;
	labour: number;
	paint: number;
	outwork_nett: number;
	markup: number;
	subtotal: number;
} {
	const additionalLines = lineItems.filter((line) => line.source === 'additional');
	const nettBreakdown = calculateBreakdownTotals(additionalLines, useActual);

	// Calculate markup amounts
	const partsMarkup = nettBreakdown.parts_nett_total * (markupPercentages.parts_markup / 100);
	const outworkMarkup = nettBreakdown.outwork_nett_total * (markupPercentages.outwork_markup / 100);
	const totalMarkup = partsMarkup + outworkMarkup;

	// Calculate subtotal (nett + markup)
	const subtotal = nettBreakdown.subtotal_nett + totalMarkup;

	return {
		parts_nett: Number(nettBreakdown.parts_nett_total.toFixed(2)),
		labour: Number(nettBreakdown.labour_total.toFixed(2)),
		paint: Number(nettBreakdown.paint_total.toFixed(2)),
		outwork_nett: Number(nettBreakdown.outwork_nett_total.toFixed(2)),
		markup: Number(totalMarkup.toFixed(2)),
		subtotal: Number(subtotal.toFixed(2))
	};
}

/**
 * Calculate FRC aggregate totals with markup applied
 * Returns separate breakdowns for estimate and additionals, plus combined totals
 */
export function calculateFRCAggregateTotals(
	lineItems: FRCLineItem[],
	useActual: boolean,
	markupPercentages: {
		parts_markup: number; // Average or weighted markup for parts
		outwork_markup: number;
	},
	vatPercentage: number
): {
	// Estimate breakdown
	estimate: {
		parts_nett: number;
		labour: number;
		paint: number;
		outwork_nett: number;
		markup: number;
		subtotal: number;
	};
	// Additionals breakdown
	additionals: {
		parts_nett: number;
		labour: number;
		paint: number;
		outwork_nett: number;
		markup: number;
		subtotal: number;
	};
	// Combined totals (for backward compatibility)
	parts_total: number; // Selling price with markup
	labour_total: number;
	paint_total: number;
	outwork_total: number; // Selling price with markup
	subtotal: number;
	vat_amount: number;
	total: number;
} {
	// Calculate separate breakdowns
	const estimateBreakdown = calculateEstimateBreakdown(lineItems, useActual, markupPercentages);
	const additionalsBreakdown = calculateAdditionalsBreakdown(lineItems, useActual, markupPercentages);

	// Calculate combined totals
	const combinedSubtotal = estimateBreakdown.subtotal + additionalsBreakdown.subtotal;
	const vatAmount = (combinedSubtotal * vatPercentage) / 100;
	const total = combinedSubtotal + vatAmount;

	// Calculate combined parts/outwork selling totals (for backward compatibility)
	const combinedPartsNett = estimateBreakdown.parts_nett + additionalsBreakdown.parts_nett;
	const combinedOutworkNett = estimateBreakdown.outwork_nett + additionalsBreakdown.outwork_nett;
	const partsSellingTotal = combinedPartsNett * (1 + markupPercentages.parts_markup / 100);
	const outworkSellingTotal = combinedOutworkNett * (1 + markupPercentages.outwork_markup / 100);

	return {
		estimate: estimateBreakdown,
		additionals: additionalsBreakdown,
		parts_total: Number(partsSellingTotal.toFixed(2)),
		labour_total: Number((estimateBreakdown.labour + additionalsBreakdown.labour).toFixed(2)),
		paint_total: Number((estimateBreakdown.paint + additionalsBreakdown.paint).toFixed(2)),
		outwork_total: Number(outworkSellingTotal.toFixed(2)),
		subtotal: Number(combinedSubtotal.toFixed(2)),
		vat_amount: Number(vatAmount.toFixed(2)),
		total: Number(total.toFixed(2))
	};
}

/**
 * Calculate VAT amount
 */
export function calculateVAT(subtotal: number, vatPercentage: number): number {
	const vat = (subtotal * vatPercentage) / 100;
	return Number(vat.toFixed(2));
}

/**
 * Calculate total including VAT
 */
export function calculateTotal(subtotal: number, vatAmount: number): number {
	const total = subtotal + vatAmount;
	return Number(total.toFixed(2));
}

/**
 * Validate that adjust decision has a reason
 */
export function validateFRCLineItem(line: FRCLineItem): { valid: boolean; error?: string } {
	if (line.decision === 'adjust') {
		if (!line.adjust_reason || line.adjust_reason.trim() === '') {
			return {
				valid: false,
				error: 'Adjust reason is required when decision is "adjust"'
			};
		}
		if (line.actual_total === null || line.actual_total === undefined) {
			return {
				valid: false,
				error: 'Actual total is required when decision is "adjust"'
			};
		}
	}
	return { valid: true };
}

/**
 * Calculate deltas between quoted and actual
 */
export function calculateDeltas(quoted: number, actual: number): {
	delta: number;
	deltaPercentage: number;
	isOver: boolean;
	isUnder: boolean;
} {
	const delta = actual - quoted;
	const deltaPercentage = quoted !== 0 ? (delta / quoted) * 100 : 0;

	return {
		delta: Number(delta.toFixed(2)),
		deltaPercentage: Number(deltaPercentage.toFixed(2)),
		isOver: delta > 0,
		isUnder: delta < 0
	};
}

