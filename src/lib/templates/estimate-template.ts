import type {
	Assessment,
	VehicleIdentification,
	Estimate,
	EstimateLineItem,
	CompanySettings,
	ProcessType
} from '$lib/types/assessment';
import { PROCESS_TYPE_CONFIGS } from '$lib/constants/processTypes';
import { formatCurrency, formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';

interface EstimateData {
	assessment: Assessment;
	vehicleIdentification: VehicleIdentification | null;
	estimate: Estimate | null;
	lineItems: EstimateLineItem[];
	companySettings: CompanySettings | null;
	request: any;
	client: any;
	repairer: any;
}

export function generateEstimateHTML(data: EstimateData): string {
	const {
		assessment,
		vehicleIdentification,
		estimate,
		lineItems,
		companySettings,
		request,
		client,
		repairer
	} = data;

	// Convert database values to numbers (they come as strings from PostgreSQL DECIMAL type)
	const dbSubtotal = estimate?.subtotal ? Number(estimate.subtotal) : 0;
	const dbVatAmount = estimate?.vat_amount ? Number(estimate.vat_amount) : 0;
	const dbTotal = estimate?.total ? Number(estimate.total) : 0;

	// Use database totals (which include markup at aggregate level)
	const subtotal = dbSubtotal;
	const vat = dbVatAmount;
	const grandTotal = dbTotal;

	// Calculate category totals breakdown (NETT values only - same logic as EstimateTab.svelte)
	const partsNett = lineItems.reduce((sum, item) => sum + (item.part_price_nett || 0), 0);
	const saTotal = lineItems.reduce((sum, item) => sum + (item.strip_assemble || 0), 0);
	const labourTotal = lineItems.reduce((sum, item) => sum + (item.labour_cost || 0), 0);
	const paintTotal = lineItems.reduce((sum, item) => sum + (item.paint_cost || 0), 0);
	const outworkNett = lineItems.reduce((sum, item) => sum + (item.outwork_charge_nett || 0), 0);

	// Calculate total betterment deduction
	const bettermentTotal = lineItems.reduce((sum, item) => sum + (item.betterment_total || 0), 0);

	// Calculate aggregate markup (parts by type + outwork)
	let partsMarkup = 0;
	for (const item of lineItems) {
		if (item.process_type === 'N' && item.part_price_nett) {
			const nett = item.part_price_nett;
			let markupPct = 0;
			if (item.part_type === 'OEM') markupPct = estimate?.oem_markup_percentage || 0;
			else if (item.part_type === 'ALT') markupPct = estimate?.alt_markup_percentage || 0;
			else if (item.part_type === '2ND') markupPct = estimate?.second_hand_markup_percentage || 0;
			partsMarkup += nett * (markupPct / 100);
		}
	}
	const outworkMarkup = outworkNett * ((estimate?.outwork_markup_percentage || 0) / 100);
	const markupTotal = partsMarkup + outworkMarkup;

	// Helper to get process type label
	const getProcessTypeLabel = (processType: ProcessType) => {
		const config = PROCESS_TYPE_CONFIGS[processType];
		return config ? `${config.code} - ${config.label}` : processType;
	};

	// Group line items by category
	const groupLineItemsByCategory = (items: EstimateLineItem[]) => {
		return {
			newParts: items.filter(item => item.process_type === 'N'),
			repairs: items.filter(item => item.process_type === 'R'),
			paintBlend: items.filter(item => item.process_type === 'P' || item.process_type === 'B'),
			other: items.filter(item => item.process_type === 'A' || item.process_type === 'O')
		};
	};

	const renderLineItems = (items: EstimateLineItem[]) => {
		return items
			.map(
				(item) => {
					// Helper to show value or dash
					const showValue = (value: number | null | undefined) =>
						value && value > 0 ? formatCurrency(value) : '-';

					return `
			<tr style="border-bottom: 1px solid #e5e7eb;">
				<td style="padding: 6px; font-size: 9pt;">${getProcessTypeLabel(item.process_type)}</td>
				<td style="padding: 6px; font-size: 9pt;">${item.description || ''}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.part_price_nett)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.strip_assemble)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.labour_cost)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.paint_cost)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.outwork_charge_nett)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${formatCurrency(item.total)}</td>
			</tr>
		`;
				}
			)
			.join('');
	};

	// Render grouped line items with category headers
	const renderGroupedLineItems = (items: EstimateLineItem[]) => {
		const groups = groupLineItemsByCategory(items);
		let html = '';

		// NEW PARTS
		if (groups.newParts.length > 0) {
			html += `
			<tr class="group-header">
				<td colspan="8" style="font-weight: bold !important; font-size: 10pt !important; padding: 12px 8px !important; border-top: 2px solid #1e40af !important; border-bottom: 1px solid #d1d5db !important; background-color: #f3f4f6 !important; color: #1f2937 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
					NEW PARTS
				</td>
			</tr>
			${renderLineItems(groups.newParts)}
		`;
		}

		// REPAIRS
		if (groups.repairs.length > 0) {
			html += `
			<tr class="group-header">
				<td colspan="8" style="font-weight: bold !important; font-size: 10pt !important; padding: 12px 8px !important; border-top: 2px solid #1e40af !important; border-bottom: 1px solid #d1d5db !important; background-color: #f3f4f6 !important; color: #1f2937 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
					REPAIRS
				</td>
			</tr>
			${renderLineItems(groups.repairs)}
		`;
		}

		// PAINT & BLEND
		if (groups.paintBlend.length > 0) {
			html += `
			<tr class="group-header">
				<td colspan="8" style="font-weight: bold !important; font-size: 10pt !important; padding: 12px 8px !important; border-top: 2px solid #1e40af !important; border-bottom: 1px solid #d1d5db !important; background-color: #f3f4f6 !important; color: #1f2937 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
					PAINT & BLEND
				</td>
			</tr>
			${renderLineItems(groups.paintBlend)}
		`;
		}

		// OTHER SERVICES
		if (groups.other.length > 0) {
			html += `
			<tr class="group-header">
				<td colspan="8" style="font-weight: bold !important; font-size: 10pt !important; padding: 12px 8px !important; border-top: 2px solid #1e40af !important; border-bottom: 1px solid #d1d5db !important; background-color: #f3f4f6 !important; color: #1f2937 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
					OTHER SERVICES
				</td>
			</tr>
			${renderLineItems(groups.other)}
		`;
		}

		return html;
	};

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Repair Estimate - ${assessment.assessment_number}</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: Arial, sans-serif;
			font-size: 9pt;
			line-height: 1.3;
			color: #000;
		}

		.header {
			background-color: #1e40af;
			color: white;
			padding: 15px;
			text-align: center;
			margin-bottom: 15px;
		}

		.header h1 {
			font-size: 20pt;
			margin-bottom: 8px;
		}

		.company-info {
			font-size: 8pt;
			margin-top: 8px;
		}

		.estimate-title {
			background-color: #3b82f6;
			color: white;
			padding: 8px;
			text-align: center;
			font-size: 14pt;
			font-weight: bold;
			margin-bottom: 15px;
		}

		/* Unified section styles for consistency with assessment report */
		.section {
			margin-bottom: 20px;
			page-break-inside: avoid;
		}

		.section-title {
			background-color: #dbeafe;
			padding: 8px;
			font-weight: bold;
			font-size: 11pt;
			border-left: 4px solid #3b82f6;
			margin-bottom: 10px;
		}

		.info-section {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 15px;
			margin-bottom: 15px;
		}

		.info-box {
			border: 1px solid #d1d5db;
			padding: 10px;
			background-color: #f9fafb;
		}

		.info-box h3 {
			font-size: 10pt;
			color: #1e40af;
			margin-bottom: 8px;
			border-bottom: 2px solid #3b82f6;
			padding-bottom: 4px;
		}

		.info-row {
			display: flex;
			padding: 3px 0;
		}

		.info-label {
			font-weight: bold;
			min-width: 100px;
			color: #374151;
			font-size: 8pt;
		}

		.info-value {
			color: #000;
			font-size: 8pt;
		}

		.rates-section {
			background-color: #dbeafe;
			padding: 10px;
			margin-bottom: 15px;
			border-left: 4px solid #3b82f6;
		}

		.rates-section h3 {
			font-size: 10pt;
			margin-bottom: 5px;
		}

		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 15px;
			font-size: 8pt;
		}

		th, td {
			border: 1px solid #9ca3af;
			padding: 6px 4px;
			text-align: left;
		}

		th {
			background-color: #1e40af;
			color: white;
			font-weight: bold;
			font-size: 8pt;
		}

		.category-header {
			background-color: #3b82f6;
			color: white;
			font-weight: bold;
			padding: 6px;
			font-size: 9pt;
		}

		.group-header td {
			font-weight: bold;
			font-size: 10pt;
			padding: 12px 8px;
			border-top: 2px solid #1e40af;
			border-bottom: 1px solid #d1d5db;
			background-color: #f3f4f6;
			color: #1f2937;
			page-break-inside: avoid;
			page-break-after: avoid;
		}

		.subtotal-row {
			background-color: #f3f4f6;
			font-weight: bold;
		}

		/* Container for totals sections - uses flexbox for PDF compatibility */
		.totals-container {
			display: flex;
			justify-content: flex-end;
			gap: 20px;
			margin-top: 20px;
			margin-bottom: 20px;
			page-break-inside: avoid;
		}

		.breakdown-section {
			width: 300px;
			page-break-inside: avoid;
		}

		.totals-section {
			width: 300px;
			page-break-inside: avoid;
		}

		.totals-table {
			width: 100%;
			border-collapse: collapse;
		}

		.totals-table td {
			padding: 8px;
			border: 1px solid #d1d5db;
		}

		.totals-label {
			font-weight: bold;
			background-color: #f3f4f6;
			width: 60%;
		}

		.totals-value {
			text-align: right;
			font-weight: bold;
		}

		.grand-total {
			background-color: #1e40af;
			color: white;
			font-size: 11pt;
		}

		.breakdown-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 9pt;
		}

		.breakdown-table td {
			padding: 6px 8px;
			border-bottom: 1px solid #e5e7eb;
		}

		.breakdown-label {
			color: #6b7280;
		}

		.breakdown-value {
			text-align: right;
			font-weight: 500;
		}

		.breakdown-markup {
			color: #059669;
			font-weight: 600;
		}

		.breakdown-betterment {
			color: #dc2626;
			font-weight: 600;
		}

		.breakdown-header {
			font-weight: bold;
			color: #1f2937;
			border-bottom: 2px solid #d1d5db;
			padding-bottom: 8px;
		}

		.notes-section {
			clear: both;
			margin-top: 20px;
			padding-top: 20px;
			border-top: 2px solid #d1d5db;
		}

		.notes-box {
			border: 1px solid #d1d5db;
			padding: 10px;
			background-color: #f9fafb;
			min-height: 60px;
			white-space: pre-wrap;
			font-size: 8pt;
		}

		.footer {
			margin-top: 30px;
			padding-top: 15px;
			border-top: 2px solid #3b82f6;
			text-align: center;
			font-size: 7pt;
			color: #6b7280;
		}

		.page-break {
			page-break-after: always;
		}

		/* Print-specific CSS for PDF rendering */
		@media print {
			* {
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
				color-adjust: exact !important;
			}

			.totals-container,
			.breakdown-section,
			.totals-section,
			.breakdown-table,
			.totals-table,
			.group-header {
				page-break-inside: avoid !important;
			}

			.group-header td {
				background-color: #f3f4f6 !important;
				color: #1f2937 !important;
				border-top: 2px solid #1e40af !important;
				border-bottom: 1px solid #d1d5db !important;
			}

			.grand-total {
				background-color: #1e40af !important;
				color: white !important;
			}

			.breakdown-markup {
				color: #059669 !important;
			}

			.breakdown-betterment {
				color: #dc2626 !important;
			}
		}

		/* Force color rendering in all contexts */
		* {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
			color-adjust: exact;
		}
	</style>
</head>
<body>
	<!-- Header -->
	<div class="header">
		<h1>${companySettings?.company_name || 'Claimtech'}</h1>
		<div class="company-info">
			${companySettings?.po_box || 'P.O. Box 12345'} | 
			${companySettings?.city || 'Johannesburg'}, ${companySettings?.province || 'Gauteng'} ${companySettings?.postal_code || '2000'}<br>
			Tel: ${companySettings?.phone || '+27 (0) 11 123 4567'}
			${companySettings?.fax ? ` | Fax: ${companySettings.fax}` : ''}
		</div>
	</div>

	<!-- Estimate Title -->
	<div class="estimate-title">
		REPAIR ESTIMATE
	</div>

	<!-- Executive Summary -->
	<div class="section">
		<div class="section-title">EXECUTIVE SUMMARY</div>
		<div class="info-section">
			<div>
				<div style="font-size: 9pt; color: #6b7280;">Vehicle</div>
				<div style="font-size: 11pt; font-weight: 600;">${vehicleIdentification?.make || request?.vehicle_make || 'N/A'} ${vehicleIdentification?.model || request?.vehicle_model || ''}</div>
			</div>
			<div>
				<div style="font-size: 9pt; color: #6b7280;">Claim Number</div>
				<div style="font-size: 11pt; font-weight: 600;">${request?.claim_number || 'N/A'}</div>
			</div>
			<div>
				<div style="font-size: 9pt; color: #6b7280;">Outcome</div>
				<div style="font-size: 11pt; font-weight: 600;">${estimate?.assessment_result ? (estimate.assessment_result === 'repairable' ? 'Repairable' : estimate.assessment_result === 'borderline_writeoff' ? 'Borderline Write-off' : estimate.assessment_result === 'total_writeoff' ? 'Total Write-off' : estimate.assessment_result) : 'Pending'}</div>
			</div>
			<div>
				<div style="font-size: 9pt; color: #6b7280;">Estimated Repair Cost</div>
				<div style="font-size: 11pt; font-weight: 600; color: #1e40af;">${estimate ? formatCurrency(estimate.total) : '-'}</div>
			</div>
		</div>
	</div>

	<!-- Information Section -->
	<div class="info-section">
		<!-- Claim Information -->
		<div class="info-box">
			<h3>CLAIM INFORMATION</h3>
			<div class="info-row">
				<span class="info-label">Report No.:</span>
				<span class="info-value">${assessment.report_number || assessment.assessment_number}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Claim No.:</span>
				<span class="info-value">${request?.claim_number || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Date:</span>
				<span class="info-value">${formatDateNumeric(assessment.created_at)}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Instructed By:</span>
				<span class="info-value">${client?.name || 'N/A'}</span>
			</div>
		</div>

		<!-- Vehicle Information -->
		<div class="info-box">
			<h3>VEHICLE INFORMATION</h3>
			<div class="info-row">
				<span class="info-label">Make:</span>
				<span class="info-value">${vehicleIdentification?.make || request?.vehicle_make || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Model:</span>
				<span class="info-value">${vehicleIdentification?.model || request?.vehicle_model || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Year:</span>
				<span class="info-value">${vehicleIdentification?.year || request?.vehicle_year || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Reg No.:</span>
				<span class="info-value">${vehicleIdentification?.registration_number || request?.vehicle_registration || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">VIN:</span>
				<span class="info-value">${vehicleIdentification?.vin_number || 'N/A'}</span>
			</div>
		</div>
	</div>

	<!-- Repairer Information -->
	${repairer ? `
	<div class="info-box" style="margin-bottom: 15px;">
		<h3>REPAIRER INFORMATION</h3>
		<div class="info-row">
			<span class="info-label">Name:</span>
			<span class="info-value">${repairer.name}</span>
		</div>
		<div class="info-row">
			<span class="info-label">Address:</span>
			<span class="info-value">${repairer.address || 'N/A'}</span>
		</div>
		<div class="info-row">
			<span class="info-label">Contact:</span>
			<span class="info-value">${repairer.phone || 'N/A'}</span>
		</div>
	</div>
	` : ''}

	<!-- Labour Rates -->
	<div class="rates-section">
		<h3>LABOUR RATES</h3>
		<div class="info-row">
			<span class="info-label">Labour Rate:</span>
			<span class="info-value">${formatCurrency(estimate?.labour_rate || 0)} per hour</span>
		</div>
		<div class="info-row">
			<span class="info-label">Paint Rate:</span>
			<span class="info-value">${formatCurrency(estimate?.paint_rate || 0)} per hour</span>
		</div>
	</div>

	<!-- Line Items Table -->
	<table>
		<thead>
			<tr>
				<th style="width: 8%;">CODE</th>
				<th style="width: 30%;">DESCRIPTION</th>
				<th style="width: 10%;">PARTS</th>
				<th style="width: 10%;">S&A</th>
				<th style="width: 10%;">LABOUR</th>
				<th style="width: 10%;">PAINT</th>
				<th style="width: 10%;">OUTWORK</th>
				<th style="width: 12%;">TOTAL</th>
			</tr>
		</thead>
		<tbody>
			${lineItems.length > 0 ? renderGroupedLineItems(lineItems) : `
			<tr>
				<td colspan="8" style="text-align: center; padding: 20px;">No line items</td>
			</tr>
			`}
		</tbody>
	</table>

	<!-- Totals Container (Flexbox for PDF compatibility) -->
	<div class="totals-container">
		<!-- Totals Breakdown Section -->
		<div class="breakdown-section">
			<table class="breakdown-table">
				<tr class="breakdown-header">
					<td colspan="2">TOTALS BREAKDOWN</td>
				</tr>
				<tr>
					<td class="breakdown-label">Parts Total (nett)</td>
					<td class="breakdown-value">${formatCurrency(partsNett)}</td>
				</tr>
				<tr>
					<td class="breakdown-label">S&A Total</td>
					<td class="breakdown-value">${formatCurrency(saTotal)}</td>
				</tr>
				<tr>
					<td class="breakdown-label">Labour Total</td>
					<td class="breakdown-value">${formatCurrency(labourTotal)}</td>
				</tr>
				<tr>
					<td class="breakdown-label">Paint Total</td>
					<td class="breakdown-value">${formatCurrency(paintTotal)}</td>
				</tr>
				<tr>
					<td class="breakdown-label">Outwork Total (nett)</td>
					<td class="breakdown-value">${formatCurrency(outworkNett)}</td>
				</tr>
				<tr>
					<td class="breakdown-label">Markup Total</td>
					<td class="breakdown-value breakdown-markup">${formatCurrency(markupTotal)}</td>
				</tr>
				${bettermentTotal > 0 ? `
				<tr>
					<td class="breakdown-label">Betterment Deduction</td>
					<td class="breakdown-value" style="color: #dc2626; font-weight: 600;">-${formatCurrency(bettermentTotal)}</td>
				</tr>
				` : ''}
			</table>
		</div>

		<!-- Totals Section -->
		<div class="totals-section">
			<table class="totals-table">
				<tr>
					<td class="totals-label">Subtotal:</td>
					<td class="totals-value">${formatCurrency(subtotal)}</td>
				</tr>
				<tr>
					<td class="totals-label">Sundries (${estimate ? (estimate.sundries_percentage ?? (companySettings?.sundries_percentage ?? 1)) : (companySettings?.sundries_percentage ?? 1)}%):</td>
					<td class="totals-value">${formatCurrency(estimate ? (estimate.sundries_amount || 0) : 0)}</td>
				</tr>
				<tr>
					<td class="totals-label">VAT (${estimate ? (estimate.vat_percentage ?? 15) : 15}%):</td>
					<td class="totals-value">${formatCurrency(vat)}</td>
				</tr>
				<tr class="grand-total">
					<td class="totals-label">GRAND TOTAL:</td>
					<td class="totals-value">${formatCurrency(grandTotal)}</td>
				</tr>
			</table>
		</div>
	</div>

	<!-- Clearfix to ensure proper layout -->
	<div style="clear: both; height: 0; overflow: hidden;"></div>

	<!-- Notes Section -->
	${estimate?.notes ? `
	<div class="notes-section">
		<h3 style="margin-bottom: 10px;">NOTES</h3>
		<div class="notes-box">${estimate.notes}</div>
	</div>
	` : ''}

	<!-- Terms & Conditions -->
	${companySettings?.estimate_terms_and_conditions ? `
	<div class="section" style="margin-top: 30px; page-break-inside: avoid;">
		<div class="section-title">TERMS & CONDITIONS</div>
		<div style="font-size: 9pt; line-height: 1.5; color: #333; border: 1px solid #ddd; padding: 12px; background: #f9f9f9; white-space: pre-wrap;">
			${escapeHtmlWithLineBreaks(companySettings.estimate_terms_and_conditions)}
		</div>
	</div>
	` : ''}

	<!-- Footer -->
	<div class="footer">
		<p style="margin-top: 10px;">${companySettings?.company_name || 'Claimtech'} | ${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}</p>
		<p>Estimate generated on ${formatDateNumeric(new Date().toISOString())}</p>
	</div>
</body>
</html>
	`.trim();
}

