import type { EstimateLineItem } from '$lib/types/assessment';

/**
 * Generate a CSV string for parts list export
 * Filters line items to only include parts (process_type='N')
 * Exports: Part Type, Description, Quantity
 * 
 * @param lineItems - Array of estimate line items
 * @returns CSV string ready for download
 */
export function generatePartsListCSV(lineItems: EstimateLineItem[]): string {
	// Filter to only include parts (process_type='N')
	const partsOnly = lineItems.filter(item => item.process_type === 'N');

	// CSV header
	const headers = ['Part Type', 'Description', 'Quantity'];
	
	// CSV rows
	const rows = partsOnly.map(item => {
		const partType = item.part_type || 'N/A';
		const description = item.description || '(No description)';
		const quantity = '1'; // Default quantity

		// Escape fields that contain commas or quotes
		const escapeCSV = (field: string): string => {
			if (field.includes(',') || field.includes('"') || field.includes('\n')) {
				return `"${field.replace(/"/g, '""')}"`;
			}
			return field;
		};

		return [
			escapeCSV(partType),
			escapeCSV(description),
			quantity
		].join(',');
	});

	// Combine header and rows
	return [headers.join(','), ...rows].join('\n');
}

