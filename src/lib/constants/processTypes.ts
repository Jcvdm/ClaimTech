import type { ProcessType, ProcessTypeConfig } from '$lib/types/assessment';

/**
 * Process Type Configurations
 * Defines which fields are required for each process type
 */
export const PROCESS_TYPE_CONFIGS: Record<ProcessType, ProcessTypeConfig> = {
	N: {
		code: 'N',
		label: 'New Part',
		description: 'Part Price + Strip & Assemble + Labour + Paint',
		requiredFields: {
			part_price: true,
			strip_assemble: true,
			labour: true,
			paint: true,
			outwork: false
		}
	},
	R: {
		code: 'R',
		label: 'Repair',
		description: 'Strip & Assemble + Labour + Paint (no part)',
		requiredFields: {
			part_price: false,
			strip_assemble: true,
			labour: true,
			paint: true,
			outwork: false
		}
	},
	P: {
		code: 'P',
		label: 'Paint',
		description: 'Strip & Assemble + Paint only',
		requiredFields: {
			part_price: false,
			strip_assemble: true,
			labour: false,
			paint: true,
			outwork: false
		}
	},
	B: {
		code: 'B',
		label: 'Blend',
		description: 'Strip & Assemble + Paint only',
		requiredFields: {
			part_price: false,
			strip_assemble: true,
			labour: false,
			paint: true,
			outwork: false
		}
	},
	A: {
		code: 'A',
		label: 'Align',
		description: 'Labour only',
		requiredFields: {
			part_price: false,
			strip_assemble: false,
			labour: true,
			paint: false,
			outwork: false
		}
	},
	O: {
		code: 'O',
		label: 'Outwork',
		description: 'Outwork charge only',
		requiredFields: {
			part_price: false,
			strip_assemble: false,
			labour: false,
			paint: false,
			outwork: true
		}
	}
};

/**
 * Get process type configuration
 */
export function getProcessTypeConfig(processType: ProcessType): ProcessTypeConfig {
	return PROCESS_TYPE_CONFIGS[processType];
}

/**
 * Get all process types as array for dropdowns
 */
export function getProcessTypeOptions(): Array<{ value: ProcessType; label: string; description: string }> {
	return Object.values(PROCESS_TYPE_CONFIGS).map((config) => ({
		value: config.code,
		label: config.label,
		description: config.description
	}));
}

/**
 * Check if a field is required for a process type
 */
export function isFieldRequired(
	processType: ProcessType,
	field: keyof ProcessTypeConfig['requiredFields']
): boolean {
	return PROCESS_TYPE_CONFIGS[processType].requiredFields[field];
}

/**
 * Get process type symbol for compact display
 * Returns just the code letter for badge display
 */
export function getProcessTypeSymbol(processType: ProcessType): string {
	return processType;
}

/**
 * Get process type label with code (e.g., "N - New Part")
 */
export function getProcessTypeLabel(processType: ProcessType): string {
	const config = PROCESS_TYPE_CONFIGS[processType];
	return config ? `${config.code} - ${config.label}` : processType;
}

/**
 * Get badge color class for process type
 */
export function getProcessTypeBadgeColor(processType: ProcessType): string {
	const colors: Record<ProcessType, string> = {
		N: 'bg-blue-100 text-blue-800',
		R: 'bg-green-100 text-green-800',
		P: 'bg-purple-100 text-purple-800',
		B: 'bg-pink-100 text-pink-800',
		A: 'bg-yellow-100 text-yellow-800',
		O: 'bg-orange-100 text-orange-800'
	};
	return colors[processType] || 'bg-gray-100 text-gray-800';
}

