/**
 * Utility functions for estimate total threshold calculations and color coding
 */

export type ThresholdColor = 'green' | 'yellow' | 'orange' | 'red' | 'normal';

export interface ThresholdResult {
	color: ThresholdColor;
	percentage: number;
	message: string;
	showWarning: boolean;
}

/**
 * Calculate the percentage of estimate total relative to retail borderline write-off
 * and return appropriate color coding and warning message
 *
 * Color Logic:
 * - RED: >= 90% of borderline (within 10% of write-off threshold)
 * - ORANGE: 60-90% of borderline
 * - YELLOW: 25-60% of borderline
 * - GREEN: < 25% of borderline
 * - NORMAL: No borderline value available
 *
 * @param estimateTotal - Total estimate amount
 * @param retailBorderline - Retail borderline write-off value
 * @returns ThresholdResult with color, percentage, and message
 */
export function calculateEstimateThreshold(
	estimateTotal: number,
	retailBorderline: number | null | undefined
): ThresholdResult {
	// If no borderline value, return normal
	if (!retailBorderline || retailBorderline === 0) {
		return {
			color: 'normal',
			percentage: 0,
			message: '',
			showWarning: false
		};
	}

	// Calculate percentage
	const percentage = (estimateTotal / retailBorderline) * 100;

	// Determine color and message based on thresholds
	if (percentage >= 90) {
		return {
			color: 'red',
			percentage,
			message: `⚠️ Critical: Estimate is within 10% of borderline write-off (${percentage.toFixed(1)}%)`,
			showWarning: true
		};
	} else if (percentage >= 60) {
		return {
			color: 'orange',
			percentage,
			message: `⚠️ Warning: Estimate is ${percentage.toFixed(1)}% of borderline write-off`,
			showWarning: true
		};
	} else if (percentage >= 25) {
		return {
			color: 'yellow',
			percentage,
			message: `Estimate is ${percentage.toFixed(1)}% of borderline write-off`,
			showWarning: false
		};
	} else {
		return {
			color: 'green',
			percentage,
			message: `Estimate is ${percentage.toFixed(1)}% of borderline write-off`,
			showWarning: false
		};
	}
}

/**
 * Get Tailwind CSS classes for the threshold color
 */
export function getThresholdColorClasses(color: ThresholdColor): {
	text: string;
	bg: string;
	border: string;
} {
	switch (color) {
		case 'red':
			return {
				text: 'text-red-700',
				bg: 'bg-red-50',
				border: 'border-red-300'
			};
		case 'orange':
			return {
				text: 'text-orange-700',
				bg: 'bg-orange-50',
				border: 'border-orange-300'
			};
		case 'yellow':
			return {
				text: 'text-yellow-700',
				bg: 'bg-yellow-50',
				border: 'border-yellow-300'
			};
		case 'green':
			return {
				text: 'text-green-700',
				bg: 'bg-green-50',
				border: 'border-green-300'
			};
		default:
			return {
				text: 'text-gray-700',
				bg: 'bg-gray-50',
				border: 'border-gray-300'
			};
	}
}

/**
 * Format warranty status for display
 */
export function formatWarrantyStatus(status: string | null | undefined): {
	label: string;
	color: 'green' | 'red' | 'gray' | 'yellow' | 'blue';
	icon: 'check' | 'x' | 'alert' | 'info';
} {
	switch (status) {
		case 'active':
			return { label: 'Active', color: 'green', icon: 'check' };
		case 'expired':
			return { label: 'Expired', color: 'red', icon: 'x' };
		case 'void':
			return { label: 'Void', color: 'red', icon: 'x' };
		case 'transferred':
			return { label: 'Transferred', color: 'blue', icon: 'info' };
		case 'unknown':
			return { label: 'Unknown', color: 'gray', icon: 'alert' };
		default:
			return { label: 'Not Set', color: 'gray', icon: 'alert' };
	}
}

/**
 * Get color classes for warranty status badge
 */
export function getWarrantyStatusClasses(
	color: 'green' | 'red' | 'gray' | 'yellow' | 'blue'
): {
	text: string;
	bg: string;
	border: string;
} {
	switch (color) {
		case 'green':
			return {
				text: 'text-green-700',
				bg: 'bg-green-100',
				border: 'border-green-300'
			};
		case 'red':
			return {
				text: 'text-red-700',
				bg: 'bg-red-100',
				border: 'border-red-300'
			};
		case 'blue':
			return {
				text: 'text-blue-700',
				bg: 'bg-blue-100',
				border: 'border-blue-300'
			};
		case 'yellow':
			return {
				text: 'text-yellow-700',
				bg: 'bg-yellow-100',
				border: 'border-yellow-300'
			};
		default:
			return {
				text: 'text-gray-700',
				bg: 'bg-gray-100',
				border: 'border-gray-300'
			};
	}
}

