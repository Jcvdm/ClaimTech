/**
 * Assessment Result Utilities
 * Helper functions for working with assessment results (Repair, Code 2, Code 3, Total Loss)
 */

import type { AssessmentResultType, AssessmentResultInfo } from '$lib/types/assessment';

/**
 * Assessment result definitions with display information
 */
export const ASSESSMENT_RESULTS: Record<AssessmentResultType, AssessmentResultInfo> = {
	repair: {
		value: 'repair',
		label: 'Repair',
		description: 'Vehicle can be economically repaired',
		color: 'green',
		icon: 'check'
	},
	code_2: {
		value: 'code_2',
		label: 'Code 2',
		description: 'Repairable write-off (salvage title)',
		color: 'yellow',
		icon: 'alert'
	},
	code_3: {
		value: 'code_3',
		label: 'Code 3',
		description: 'Non-repairable write-off (scrap)',
		color: 'orange',
		icon: 'x'
	},
	total_loss: {
		value: 'total_loss',
		label: 'Total Loss',
		description: 'Complete loss of vehicle',
		color: 'red',
		icon: 'ban'
	}
};

/**
 * Get assessment result information by value
 */
export function getAssessmentResultInfo(result: AssessmentResultType): AssessmentResultInfo {
	return ASSESSMENT_RESULTS[result];
}

/**
 * Get all assessment results as an array
 */
export function getAllAssessmentResults(): AssessmentResultInfo[] {
	return Object.values(ASSESSMENT_RESULTS);
}

/**
 * Get Tailwind CSS classes for assessment result colors
 */
export function getAssessmentResultColorClasses(color: 'green' | 'yellow' | 'orange' | 'red') {
	const classes = {
		green: {
			bg: 'bg-green-50',
			border: 'border-green-200',
			text: 'text-green-700',
			hover: 'hover:bg-green-100',
			ring: 'ring-green-500'
		},
		yellow: {
			bg: 'bg-yellow-50',
			border: 'border-yellow-200',
			text: 'text-yellow-700',
			hover: 'hover:bg-yellow-100',
			ring: 'ring-yellow-500'
		},
		orange: {
			bg: 'bg-orange-50',
			border: 'border-orange-200',
			text: 'text-orange-700',
			hover: 'hover:bg-orange-100',
			ring: 'ring-orange-500'
		},
		red: {
			bg: 'bg-red-50',
			border: 'border-red-200',
			text: 'text-red-700',
			hover: 'hover:bg-red-100',
			ring: 'ring-red-500'
		}
	};
	return classes[color];
}

/**
 * Format assessment result for display
 */
export function formatAssessmentResult(result: AssessmentResultType | null | undefined): string {
	if (!result) return 'Not selected';
	const info = getAssessmentResultInfo(result);
	return info.label;
}

