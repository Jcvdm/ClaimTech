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
 */
export function composeFinalEstimateLines(
	estimate: Estimate,
	additionals: AssessmentAdditionals | null
): FRCLineItem[] {
	const finalLines: FRCLineItem[] = [];

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
			finalLines.push({
				id: crypto.randomUUID(),
				source: 'estimate',
				source_line_id: line.id,
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
				quoted_outwork_charge: line.outwork_charge ?? null,
				// Snapshot quantities and rates
				part_type: line.part_type ?? null,
				strip_assemble_hours: line.strip_assemble_hours ?? null,
				labour_hours: line.labour_hours ?? null,
				paint_panels: line.paint_panels ?? null,
				labour_rate_snapshot: estimate.labour_rate,
				paint_rate_snapshot: estimate.paint_rate,
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
					quoted_outwork_charge: line.outwork_charge ?? null,
					// Snapshot quantities and rates
					part_type: line.part_type ?? null,
					strip_assemble_hours: line.strip_assemble_hours ?? null,
					labour_hours: line.labour_hours ?? null,
					paint_panels: line.paint_panels ?? null,
					labour_rate_snapshot: additionals.labour_rate,
					paint_rate_snapshot: additionals.paint_rate,
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
 * Calculate breakdown totals from line items
 * Groups by process type to determine parts/labour/paint/outwork totals
 */
export function calculateBreakdownTotals(
	lineItems: FRCLineItem[],
	useActual: boolean = false
): {
	parts_total: number;
	labour_total: number;
	paint_total: number;
	outwork_total: number;
	subtotal: number;
} {
	let parts_total = 0;
	let labour_total = 0;
	let paint_total = 0;
	let outwork_total = 0;

	lineItems.forEach((line) => {
		const total = useActual ? line.actual_total || 0 : line.quoted_total;

		switch (line.process_type) {
			case 'N': // New part - contributes to parts
				parts_total += total;
				break;
			case 'R': // Repair - contributes to labour
				labour_total += total;
				break;
			case 'P': // Paint
			case 'B': // Blend
				paint_total += total;
				break;
			case 'A': // Align - contributes to labour
				labour_total += total;
				break;
			case 'O': // Outwork
				outwork_total += total;
				break;
		}
	});

	const subtotal = parts_total + labour_total + paint_total + outwork_total;

	return {
		parts_total: Number(parts_total.toFixed(2)),
		labour_total: Number(labour_total.toFixed(2)),
		paint_total: Number(paint_total.toFixed(2)),
		outwork_total: Number(outwork_total.toFixed(2)),
		subtotal: Number(subtotal.toFixed(2))
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

