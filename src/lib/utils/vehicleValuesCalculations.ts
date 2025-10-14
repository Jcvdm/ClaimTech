import type { VehicleValueExtra } from '$lib/types/assessment';

export interface WriteOffPercentages {
	borderline: number; // e.g., 65.00
	total: number; // e.g., 70.00
	salvage: number; // e.g., 28.00
}

export interface VehicleValuesCalculationInput {
	// Base values
	trade_value: number;
	market_value: number;
	retail_value: number;

	// Adjustments
	valuation_adjustment?: number; // Fixed amount (e.g., R82,413.00)
	valuation_adjustment_percentage?: number; // Percentage (e.g., 9%)
	condition_adjustment_value?: number; // Adjustment amount (e.g., R12,000.00)

	// Extras
	extras: VehicleValueExtra[];

	// Client write-off percentages
	writeOffPercentages: WriteOffPercentages;
}

export interface VehicleValuesCalculationResult {
	// Adjusted values
	trade_adjusted_value: number;
	market_adjusted_value: number;
	retail_adjusted_value: number;

	// Extras totals
	trade_extras_total: number;
	market_extras_total: number;
	retail_extras_total: number;

	// Total adjusted values
	trade_total_adjusted_value: number;
	market_total_adjusted_value: number;
	retail_total_adjusted_value: number;

	// Write-off calculations
	borderline_writeoff_trade: number;
	borderline_writeoff_market: number;
	borderline_writeoff_retail: number;

	total_writeoff_trade: number;
	total_writeoff_market: number;
	total_writeoff_retail: number;

	salvage_trade: number;
	salvage_market: number;
	salvage_retail: number;
}

/**
 * Calculate adjusted value with all adjustments applied
 */
function calculateAdjustedValue(
	baseValue: number,
	valuationAdjustment: number = 0,
	valuationAdjustmentPercentage: number = 0,
	conditionAdjustmentValue: number = 0
): number {
	// Step 1: Apply fixed valuation adjustment
	let adjusted = baseValue + valuationAdjustment;

	// Step 2: Apply valuation adjustment percentage
	if (valuationAdjustmentPercentage > 0) {
		adjusted += baseValue * (valuationAdjustmentPercentage / 100);
	}

	// Step 3: Apply condition adjustment value (direct amount)
	adjusted += conditionAdjustmentValue;

	return Math.round(adjusted * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate condition adjustment percentage from value
 */
export function calculateConditionAdjustmentPercentage(
	baseValue: number,
	adjustmentValue: number
): number {
	if (baseValue === 0) return 0;
	return Math.round((adjustmentValue / baseValue) * 100 * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate extras totals for each value type
 */
function calculateExtrasTotals(extras: VehicleValueExtra[]): {
	trade: number;
	market: number;
	retail: number;
} {
	return extras.reduce(
		(totals, extra) => ({
			trade: totals.trade + (extra.trade_value || 0),
			market: totals.market + (extra.market_value || 0),
			retail: totals.retail + (extra.retail_value || 0)
		}),
		{ trade: 0, market: 0, retail: 0 }
	);
}

/**
 * Calculate write-off values based on percentage
 */
function calculateWriteOffValue(totalValue: number, percentage: number): number {
	return Math.round(totalValue * (percentage / 100) * 100) / 100;
}

/**
 * Main calculation function for vehicle values
 */
export function calculateVehicleValues(
	input: VehicleValuesCalculationInput
): VehicleValuesCalculationResult {
	const {
		trade_value,
		market_value,
		retail_value,
		valuation_adjustment = 0,
		valuation_adjustment_percentage = 0,
		condition_adjustment_value = 0,
		extras = [],
		writeOffPercentages
	} = input;

	// Calculate adjusted values
	const trade_adjusted_value = calculateAdjustedValue(
		trade_value,
		valuation_adjustment,
		valuation_adjustment_percentage,
		condition_adjustment_value
	);

	const market_adjusted_value = calculateAdjustedValue(
		market_value,
		valuation_adjustment,
		valuation_adjustment_percentage,
		condition_adjustment_value
	);

	const retail_adjusted_value = calculateAdjustedValue(
		retail_value,
		valuation_adjustment,
		valuation_adjustment_percentage,
		condition_adjustment_value
	);

	// Calculate extras totals
	const extrasTotals = calculateExtrasTotals(extras);

	// Calculate total adjusted values (adjusted + extras)
	const trade_total_adjusted_value = trade_adjusted_value + extrasTotals.trade;
	const market_total_adjusted_value = market_adjusted_value + extrasTotals.market;
	const retail_total_adjusted_value = retail_adjusted_value + extrasTotals.retail;

	// Calculate write-off values
	const borderline_writeoff_trade = calculateWriteOffValue(
		trade_total_adjusted_value,
		writeOffPercentages.borderline
	);
	const borderline_writeoff_market = calculateWriteOffValue(
		market_total_adjusted_value,
		writeOffPercentages.borderline
	);
	const borderline_writeoff_retail = calculateWriteOffValue(
		retail_total_adjusted_value,
		writeOffPercentages.borderline
	);

	const total_writeoff_trade = calculateWriteOffValue(
		trade_total_adjusted_value,
		writeOffPercentages.total
	);
	const total_writeoff_market = calculateWriteOffValue(
		market_total_adjusted_value,
		writeOffPercentages.total
	);
	const total_writeoff_retail = calculateWriteOffValue(
		retail_total_adjusted_value,
		writeOffPercentages.total
	);

	const salvage_trade = calculateWriteOffValue(
		trade_total_adjusted_value,
		writeOffPercentages.salvage
	);
	const salvage_market = calculateWriteOffValue(
		market_total_adjusted_value,
		writeOffPercentages.salvage
	);
	const salvage_retail = calculateWriteOffValue(
		retail_total_adjusted_value,
		writeOffPercentages.salvage
	);

	return {
		trade_adjusted_value,
		market_adjusted_value,
		retail_adjusted_value,
		trade_extras_total: extrasTotals.trade,
		market_extras_total: extrasTotals.market,
		retail_extras_total: extrasTotals.retail,
		trade_total_adjusted_value,
		market_total_adjusted_value,
		retail_total_adjusted_value,
		borderline_writeoff_trade,
		borderline_writeoff_market,
		borderline_writeoff_retail,
		total_writeoff_trade,
		total_writeoff_market,
		total_writeoff_retail,
		salvage_trade,
		salvage_market,
		salvage_retail
	};
}

/**
 * Helper to get month name from date
 */
export function getMonthFromDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleString('en-US', { month: 'long' });
}

/**
 * Create empty extra item
 */
export function createEmptyExtra(): VehicleValueExtra {
	return {
		id: crypto.randomUUID(),
		description: '',
		trade_value: 0,
		market_value: 0,
		retail_value: 0
	};
}

/**
 * Format currency value (ZAR)
 */
export function formatCurrency(value: number | null | undefined): string {
	if (value === null || value === undefined) return 'R0.00';
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value);
}

