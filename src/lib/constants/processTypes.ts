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
		N: 'bg-muted text-muted-foreground border border-border',
		R: 'bg-muted text-muted-foreground border border-border',
		P: 'bg-muted text-muted-foreground border border-border',
		B: 'bg-muted text-muted-foreground border border-border',
		A: 'bg-warning-soft text-warning border border-warning-border',
		O: 'bg-destructive-soft text-destructive border border-destructive-border'
	};
	return colors[processType] || 'bg-muted text-muted-foreground border border-border';
}

