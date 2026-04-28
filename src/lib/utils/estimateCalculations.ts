import type { EstimateLineItem, ProcessType } from '$lib/types/assessment';
import { PROCESS_TYPE_CONFIGS } from '$lib/constants/processTypes';

/**
 * Calculate betterment deduction for a line item
 * Returns the total amount to be deducted
 */
export function calculateBetterment(item: EstimateLineItem): number {
	let bettermentTotal = 0;

	// Part price betterment (on nett price)
	if (item.betterment_part_percentage && item.part_price_nett) {
		bettermentTotal += (item.part_price_nett * item.betterment_part_percentage) / 100;
	}

	// S&A betterment
	if (item.betterment_sa_percentage && item.strip_assemble) {
		bettermentTotal += (item.strip_assemble * item.betterment_sa_percentage) / 100;
	}

	// Labour betterment
	if (item.betterment_labour_percentage && item.labour_cost) {
		bettermentTotal += (item.labour_cost * item.betterment_labour_percentage) / 100;
	}

	// Paint betterment
	if (item.betterment_paint_percentage && item.paint_cost) {
		bettermentTotal += (item.paint_cost * item.betterment_paint_percentage) / 100;
	}

	// Outwork betterment (on nett price)
	if (item.betterment_outwork_percentage && item.outwork_charge_nett) {
		bettermentTotal += (item.outwork_charge_nett * item.betterment_outwork_percentage) / 100;
	}

	return Number(bettermentTotal.toFixed(2));
}

/**
 * Calculate the total cost for a line item based on its process type
 * Includes betterment deduction
 */
export function calculateLineItemTotal(
	item: EstimateLineItem,
	labourRate: number,
	paintRate: number
): number {
	let total = 0;

	switch (item.process_type) {
		case 'N': // New: part (nett) + S&A + labour + paint
			total =
				(item.part_price_nett || 0) +
				(item.strip_assemble ?? (((item.strip_assemble_hours || 0) * labourRate) || 0)) +
				(item.labour_cost ?? (((item.labour_hours || 0) * labourRate) || 0)) +
				(item.paint_cost ?? (((item.paint_panels || 0) * paintRate) || 0));
			break;

		case 'R': // Repair: S&A + labour + paint (no part)
			total =
				(item.strip_assemble ?? (((item.strip_assemble_hours || 0) * labourRate) || 0)) +
				(item.labour_cost ?? (((item.labour_hours || 0) * labourRate) || 0)) +
				(item.paint_cost ?? (((item.paint_panels || 0) * paintRate) || 0));
			break;

		case 'P': // Paint: S&A + paint
		case 'B': // Blend: S&A + paint
			total =
				(item.strip_assemble ?? (((item.strip_assemble_hours || 0) * labourRate) || 0)) +
				(item.paint_cost ?? (((item.paint_panels || 0) * paintRate) || 0));
			break;

		case 'A': // Align: labour only
			total = item.labour_cost ?? (((item.labour_hours || 0) * labourRate) || 0);
			break;

		case 'O': // Outwork: outwork charge (nett) only
			total = item.outwork_charge_nett || 0;
			break;

		default:
			console.warn(`Unknown process type: ${item.process_type}`);
			total = 0;
	}

	// Calculate and subtract betterment
	const betterment = calculateBetterment(item);
	total = total - betterment;

	return Number(total.toFixed(2));
}

/**
 * Calculate part selling price with markup
 * @param nettPrice - Nett price without markup
 * @param markupPercentage - Markup percentage (e.g., 25 for 25%)
 * @returns Selling price with markup applied
 */
export function calculatePartSellingPrice(nettPrice: number | null | undefined, markupPercentage: number): number {
	if (!nettPrice || nettPrice <= 0) return 0;
	const markup = 1 + (markupPercentage / 100);
	return Number((nettPrice * markup).toFixed(2));
}

/**
 * Calculate S&A cost from hours
 * @param hours - Strip & Assemble hours
 * @param labourRate - Labour rate per hour
 * @returns S&A cost
 */
export function calculateSACost(hours: number | null | undefined, labourRate: number): number {
	if (!hours || hours <= 0) return 0;
	return Number((hours * labourRate).toFixed(2));
}

/**
 * Calculate outwork selling price with markup
 * @param nettPrice - Nett outwork cost without markup
 * @param markupPercentage - Markup percentage (e.g., 25 for 25%)
 * @returns Selling price with markup applied
 */
export function calculateOutworkSellingPrice(nettPrice: number | null | undefined, markupPercentage: number): number {
	if (!nettPrice || nettPrice <= 0) return 0;
	const markup = 1 + (markupPercentage / 100);
	return Number((nettPrice * markup).toFixed(2));
}

/**
 * Calculate labour cost for a line item
 */
export function calculateLabourCost(labourHours: number | null | undefined, labourRate: number): number {
	if (!labourHours || labourHours <= 0) return 0;
	return Number(((labourHours || 0) * labourRate).toFixed(2));
}

/**
 * Calculate paint cost for a line item
 */
export function calculatePaintCost(paintPanels: number | null | undefined, paintRate: number): number {
	if (!paintPanels || paintPanels <= 0) return 0;
	return Number(((paintPanels || 0) * paintRate).toFixed(2));
}

/**
 * Calculate subtotal from all line items
 */
export function calculateSubtotal(lineItems: EstimateLineItem[]): number {
	const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
	return Number(subtotal.toFixed(2));
}

/**
 * Calculate VAT amount
 */
export function calculateVAT(subtotal: number, vatPercentage: number): number {
	const vat = (subtotal * vatPercentage) / 100;
	return Number(vat.toFixed(2));
}

/**
 * Calculate final total (subtotal + VAT)
 */
export function calculateTotal(subtotal: number, vatAmount: number): number {
	const total = subtotal + vatAmount;
	return Number(total.toFixed(2));
}

/**
 * Recalculate a line item with updated rates
 */
export function recalculateLineItem(
	item: EstimateLineItem,
	labourRate: number,
	paintRate: number
): EstimateLineItem {
	const labourCost = calculateLabourCost(item.labour_hours, labourRate);
	const paintCost = calculatePaintCost(item.paint_panels, paintRate);
	const stripAssemble = calculateSACost(item.strip_assemble_hours, labourRate);

	// Update item with recalculated values
	const updatedItem = {
		...item,
		labour_cost: labourCost,
		paint_cost: paintCost,
		strip_assemble: stripAssemble
	};

	// Calculate betterment and total
	const bettermentTotal = calculateBetterment(updatedItem);
	const total = calculateLineItemTotal(updatedItem, labourRate, paintRate);

	return {
		...updatedItem,
		betterment_total: bettermentTotal,
		total
	};
}

/**
 * Recalculate all line items with new rates
 */
export function recalculateAllLineItems(
	lineItems: EstimateLineItem[],
	labourRate: number,
	paintRate: number
): EstimateLineItem[] {
	return lineItems.map((item) => recalculateLineItem(item, labourRate, paintRate));
}

/**
 * Validate a line item has all required fields for its process type
 * NOTE: All fields are now optional to allow users to add empty lines and fill them later
 */
export function validateLineItem(item: EstimateLineItem): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];
	const config = PROCESS_TYPE_CONFIGS[item.process_type];

	if (!config) {
		errors.push(`Invalid process type: ${item.process_type}`);
		return { isValid: false, errors };
	}

	// All fields are optional - no validation errors
	// Users can add empty lines and fill values later

	return {
		isValid: true,
		errors: []
	};
}

/**
 * Get required fields for a process type
 */
export function getRequiredFieldsForProcessType(processType: ProcessType): string[] {
	const config = PROCESS_TYPE_CONFIGS[processType];
	if (!config) return [];

	const fields: string[] = ['description'];

	if (config.requiredFields.part_price) fields.push('part_price');
	if (config.requiredFields.strip_assemble) fields.push('strip_assemble');
	if (config.requiredFields.labour) fields.push('labour_hours');
	if (config.requiredFields.paint) fields.push('paint_panels');
	if (config.requiredFields.outwork) fields.push('outwork_charge');

	return fields;
}

/**
 * Create an empty line item for a process type
 */
export function createEmptyLineItem(processType: ProcessType): Partial<EstimateLineItem> {
	return {
		id: crypto.randomUUID(),
		process_type: processType,
		part_type: processType === 'N' ? 'OEM' : null,
		description: '',
		part_price_nett: null,
		part_price: null,
		strip_assemble_hours: null,
		strip_assemble: null,
		labour_hours: null,
		labour_cost: 0,
		paint_panels: null,
		paint_cost: 0,
		outwork_charge_nett: null,
		outwork_charge: null,
		betterment_part_percentage: null,
		betterment_sa_percentage: null,
		betterment_labour_percentage: null,
		betterment_paint_percentage: null,
		betterment_outwork_percentage: null,
		betterment_total: null,
		total: 0
	};
}

// ---------------------------------------------------------------------------
// computeCategoryTotals — single source of truth for per-category totals
// ---------------------------------------------------------------------------

export interface CategoryTotalsRates {
	labour_rate: number;
	paint_rate: number;
	oem_markup_percentage: number;
	alt_markup_percentage: number;
	second_hand_markup_percentage: number;
	outwork_markup_percentage: number;
	vat_percentage: number;
	sundries_percentage?: number; // defaults to 0 if undefined
}

export interface CategoryTotalsOptions {
	/**
	 * Whether to include betterment_total deduction in subtotal.
	 * EstimateTab=true, PreIncident=false. Default false.
	 */
	includeBetterment?: boolean;
	/** Excess amount to subtract from totalIncVat for netPayable. Default 0. */
	excessAmount?: number;
}

export interface CategoryTotalsResult {
	partsTotal: number; // = partsNett (NETT, no markup)
	partsMarkup: number; // aggregate parts markup (per-item: nett × per-type markup%)
	saTotal: number;
	labourTotal: number;
	paintTotal: number;
	outworkTotal: number; // = outworkNett (NETT, no markup)
	outworkMarkup: number; // aggregate outwork markup (outworkNett × outwork_markup%)
	markupTotal: number; // partsMarkup + outworkMarkup
	bettermentTotal: number; // 0 if includeBetterment=false
	subtotalExVat: number; // partsNett + saTotal + labourTotal + paintTotal + outworkNett + markupTotal - bettermentTotal
	sundriesAmount: number;
	sundriesPct: number; // the percentage actually applied
	vatPercentage: number;
	vatAmount: number;
	totalIncVat: number;
	excessAmount: number;
	netPayable: number; // totalIncVat - excessAmount
}

/**
 * Compute aggregate category totals for an estimate's line items.
 * Single source of truth for the per-category math used by EstimateTab and
 * PreIncidentEstimateTab. AdditionalsTab uses a different totals shape.
 *
 * Math semantics (matches the legacy categoryTotals derived in EstimateTab):
 * - Row totals stay NETT (no markup baked in)
 * - Markup is aggregated at the category level: partsMarkup = sum(per-item nett × per-type markup%);
 *   outworkMarkup = outworkNett × outwork_markup%
 * - subtotalExVat includes both partsNett+outworkNett AND markupTotal (so the markup
 *   gets added once at the aggregate; row totals do not double-count)
 */
export function computeCategoryTotals(
	lineItems: EstimateLineItem[],
	rates: CategoryTotalsRates,
	options: CategoryTotalsOptions = {}
): CategoryTotalsResult {
	const includeBetterment = options.includeBetterment ?? false;
	const excess = options.excessAmount ?? 0;
	const sundriesPct = rates.sundries_percentage ?? 0;

	// Parts nett (type N only)
	const partsNett = lineItems
		.filter((i) => i.process_type === 'N')
		.reduce((sum, i) => sum + (i.part_price_nett || 0), 0);

	// Labour components
	const saTotal = lineItems.reduce((sum, i) => sum + (i.strip_assemble || 0), 0);
	const labourTotal = lineItems.reduce((sum, i) => sum + (i.labour_cost || 0), 0);
	const paintTotal = lineItems.reduce((sum, i) => sum + (i.paint_cost || 0), 0);

	// Outwork nett (type O only)
	const outworkNett = lineItems
		.filter((i) => i.process_type === 'O')
		.reduce((sum, i) => sum + (i.outwork_charge_nett || 0), 0);

	// Betterment deduction (only when requested)
	const bettermentTotal = includeBetterment
		? lineItems.reduce((sum, i) => sum + (i.betterment_total || 0), 0)
		: 0;

	// Aggregate parts markup — per-item: nett × per-type markup%
	let partsMarkup = 0;
	for (const i of lineItems) {
		if (i.process_type === 'N') {
			const nett = i.part_price_nett || 0;
			let m = 0;
			if (i.part_type === 'OEM') m = rates.oem_markup_percentage;
			else if (i.part_type === 'ALT') m = rates.alt_markup_percentage;
			else if (i.part_type === '2ND') m = rates.second_hand_markup_percentage;
			partsMarkup += nett * (m / 100);
		}
	}

	// Aggregate outwork markup — applied on total outwork nett
	const outworkMarkup = outworkNett * (rates.outwork_markup_percentage / 100);
	const markupTotal = partsMarkup + outworkMarkup;

	// Subtotal ex-VAT (includes markup, deducts betterment)
	const subtotalExVat =
		partsNett + saTotal + labourTotal + paintTotal + outworkNett + markupTotal - bettermentTotal;

	// Sundries
	const sundriesAmount = subtotalExVat * (sundriesPct / 100);

	// VAT on (subtotalExVat + sundries)
	const vatPercentage = rates.vat_percentage || 0;
	const vatAmount = (subtotalExVat + sundriesAmount) * (vatPercentage / 100);

	// Final totals
	const totalIncVat = subtotalExVat + sundriesAmount + vatAmount;
	const netPayable = totalIncVat - excess;

	return {
		partsTotal: partsNett,
		partsMarkup,
		saTotal,
		labourTotal,
		paintTotal,
		outworkTotal: outworkNett,
		outworkMarkup,
		markupTotal,
		bettermentTotal,
		subtotalExVat,
		sundriesAmount,
		sundriesPct,
		vatPercentage,
		vatAmount,
		totalIncVat,
		excessAmount: excess,
		netPayable
	};
}

/**
 * Format process type label for display
 */
export function formatProcessTypeLabel(processType: ProcessType): string {
	const config = PROCESS_TYPE_CONFIGS[processType];
	return config ? `${config.code} - ${config.label}` : processType;
}

/**
 * Get breakdown of costs for a line item
 */
export function getLineItemBreakdown(
	item: EstimateLineItem,
	labourRate: number,
	paintRate: number
): {
	partPrice: number;
	stripAssemble: number;
	labourCost: number;
	paintCost: number;
	outworkCharge: number;
	total: number;
} {
	return {
		partPrice: item.part_price_nett || 0,
		stripAssemble: item.strip_assemble ?? calculateSACost(item.strip_assemble_hours, labourRate),
		labourCost: item.labour_cost ?? calculateLabourCost(item.labour_hours, labourRate),
		paintCost: item.paint_cost ?? calculatePaintCost(item.paint_panels, paintRate),
		outworkCharge: item.outwork_charge_nett || 0,
		total: calculateLineItemTotal(item, labourRate, paintRate)
	};
}

