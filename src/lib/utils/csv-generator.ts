import type { EstimateLineItem } from '$lib/types/assessment';

export interface VehicleDetails {
	vin_number?: string | null;
	vehicle_year?: number | null;
	vehicle_make?: string | null;
	vehicle_model?: string | null;
}

/**
 * Generate a CSV string for parts list export
 * Filters line items to only include parts (process_type='N')
 * Exports: Vehicle Details + Part Type, Description, Quantity
 *
 * @param lineItems - Array of estimate line items
 * @param vehicleDetails - Optional vehicle details to include at top of CSV
 * @returns CSV string ready for download
 */
export function generatePartsListCSV(
	lineItems: EstimateLineItem[],
	vehicleDetails?: VehicleDetails
): string {
	// Escape fields that contain commas or quotes
	const escapeCSV = (field: string): string => {
		if (field.includes(',') || field.includes('"') || field.includes('\n')) {
			return `"${field.replace(/"/g, '""')}"`;
		}
		return field;
	};

	// Build CSV content
	const lines: string[] = [];

	// Add vehicle details header section if provided
	if (vehicleDetails) {
		lines.push('Vehicle Details');
		lines.push(`VIN,${escapeCSV(vehicleDetails.vin_number || 'N/A')}`);
		lines.push(`Year,${vehicleDetails.vehicle_year || 'N/A'}`);
		lines.push(`Make,${escapeCSV(vehicleDetails.vehicle_make || 'N/A')}`);
		lines.push(`Model,${escapeCSV(vehicleDetails.vehicle_model || 'N/A')}`);
		lines.push(''); // Empty line separator
	}

	// Filter to only include parts (process_type='N')
	const partsOnly = lineItems.filter(item => item.process_type === 'N');

	// Parts list header
	lines.push('Part Type,Description,Quantity');

	// Parts list rows
	const rows = partsOnly.map(item => {
		const partType = item.part_type || 'N/A';
		const description = item.description || '(No description)';
		const quantity = '1'; // Default quantity

		return [escapeCSV(partType), escapeCSV(description), quantity].join(',');
	});

	lines.push(...rows);

	// Combine all lines
	return lines.join('\n');
}

