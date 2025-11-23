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
import type { VehicleDetails, ClientDetails, InsuredDetails } from '$lib/utils/report-data-helpers';

	interface EstimateData {
		assessment: Assessment;
		vehicleIdentification: VehicleIdentification | null;
		estimate: Estimate | null;
		lineItems: EstimateLineItem[];
		companySettings: CompanySettings | null;
		request: any;
		client: any;
		repairer: any;
		vehicleDetails: VehicleDetails;
		clientDetails: ClientDetails;
		insuredDetails: InsuredDetails;
		logoBase64?: string | null;
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
		repairer,
		vehicleDetails,
		clientDetails,
		insuredDetails,
		logoBase64
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

					// Part type badge for N items
					const partTypeBadge = item.process_type === 'N' && item.part_type
						? `<span style="display:inline-block;background:#1e40af;color:#fff;padding:2px 4px;border-radius:2px;font-size:7pt;font-weight:bold;">${item.part_type}</span>`
						: '-';

					return `
			<tr style="border-bottom: 1px solid #e5e7eb;">
				<td style="padding: 6px; font-size: 9pt;">${getProcessTypeLabel(item.process_type)}</td>
				<td style="padding: 6px; font-size: 9pt;">${item.description || ''}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: center;">${partTypeBadge}</td>
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

		const headerStyle = "font-weight: bold !important; font-size: 10pt !important; padding: 12px 8px !important; border-bottom: 2px solid #e11d48 !important; background-color: #fff !important; color: #111827 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;";

		// NEW PARTS
		if (groups.newParts.length > 0) {
			html += `
			<tr class="group-header">
				<td colspan="9" style="${headerStyle}">
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
				<td colspan="9" style="${headerStyle}">
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
				<td colspan="9" style="${headerStyle}">
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
				<td colspan="9" style="${headerStyle}">
					OTHER SERVICES
				</td>
			</tr>
			${renderLineItems(groups.other)}
		`;
		}

		return html;
	};

	const companyName = companySettings?.company_name || 'Claimtech';
	const logoTextFallback = companySettings?.company_name || 'CLAIMTECH';
	const logoMarkup = logoBase64
		? `<img src="data:image/png;base64,${logoBase64}" alt="${escapeHtmlWithLineBreaks(
				logoTextFallback
		  )} logo" class="report-logo" />`
		: logoTextFallback;

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
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			font-size: 10pt;
			line-height: 1.4;
			color: #1f2937;
		}

		/* Summary Page Styles */
		.summary-page {
			height: 100vh;
			display: flex;
			flex-direction: column;
			padding: 40px;
			position: relative;
			color: #1f2937;
		}

		.summary-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 60px;
			border-bottom: 4px solid #e11d48;
			padding-bottom: 20px;
		}

		.logo-placeholder {
			font-size: 24pt;
			font-weight: bold;
			color: #e11d48;
			letter-spacing: -1px;
			display: flex;
			align-items: center;
			gap: 0.75rem;
		}

		.report-logo {
			max-height: 70px;
			width: auto;
			object-fit: contain;
		}

		.summary-title {
			font-size: 36pt;
			font-weight: 800;
			color: #111827;
			margin-bottom: 10px;
			line-height: 1.1;
		}

		.summary-subtitle {
			font-size: 14pt;
			color: #6b7280;
			font-weight: 500;
		}

		.summary-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 40px;
			margin-top: 40px;
		}

		.summary-card {
			background: #fff;
			border: 1px solid #e5e7eb;
			border-radius: 8px;
			padding: 25px;
			box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		}

		.summary-card-title {
			font-size: 10pt;
			text-transform: uppercase;
			letter-spacing: 1px;
			color: #6b7280;
			margin-bottom: 10px;
			font-weight: 600;
		}

		.summary-card-value {
			font-size: 18pt;
			font-weight: 700;
			color: #111827;
		}

		.summary-footer {
			margin-top: auto;
			text-align: center;
			color: #9ca3af;
			font-size: 9pt;
			border-top: 1px solid #e5e7eb;
			padding-top: 20px;
		}

		/* Standard Page Styles */
		.standard-page {
			padding: 40px;
		}

		.standard-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding-bottom: 15px;
			border-bottom: 2px solid #e11d48;
			margin-bottom: 30px;
		}

		.standard-header-company {
			font-size: 16pt;
			font-weight: bold;
			color: #111827;
		}

		.standard-header-details {
			text-align: right;
			font-size: 9pt;
			color: #6b7280;
		}

		.info-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 30px;
			padding: 20px;
			background: #f9fafb;
			border: 1px solid #e5e7eb;
			border-radius: 6px;
		}

		.info-row {
			display: flex;
			padding: 4px 0;
		}

		.info-label {
			font-weight: 600;
			min-width: 140px;
			color: #6b7280;
		}

		.info-value {
			color: #111827;
			flex: 1;
			font-weight: 500;
		}

		/* Table Styles */
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			font-size: 9pt;
			table-layout: fixed; /* Enforce column widths */
		}

		thead {
			display: table-header-group; /* Repeat header on new pages */
		}

		tr {
			page-break-inside: avoid; /* Prevent row splitting */
		}

		tbody tr:nth-child(even) {
			background-color: #f9fafb; /* Zebra striping */
		}

		th, td {
			border-bottom: 1px solid #e5e7eb;
			padding: 10px 6px;
			text-align: left;
			vertical-align: top;
			word-wrap: break-word;
		}

		th {
			background-color: #f3f4f6;
			font-weight: 700;
			color: #374151;
			text-transform: uppercase;
			font-size: 8pt;
			letter-spacing: 0.5px;
			border-top: 2px solid #111827;
			border-bottom: 2px solid #111827;
		}

		/* Totals Styles */
		.totals-container {
			display: flex;
			justify-content: flex-end;
			gap: 40px;
			margin-top: 30px;
			page-break-inside: avoid; /* Keep totals block together */
			background: #fff;
		}

		.breakdown-section, .totals-section {
			width: 350px;
		}

		.breakdown-table td, .totals-table td {
			padding: 8px 0;
			border-bottom: 1px solid #f3f4f6;
		}

		.breakdown-label, .totals-label {
			color: #6b7280;
			font-weight: 500;
		}

		.breakdown-value, .totals-value {
			text-align: right;
			font-weight: 600;
			color: #111827;
		}

		.grand-total td {
			border-top: 2px solid #e11d48;
			border-bottom: none;
			padding-top: 15px;
			font-size: 12pt;
			font-weight: 700;
			color: #e11d48;
		}

		.notes-box {
			border: 1px solid #e5e7eb;
			padding: 20px;
			background-color: #f9fafb;
			min-height: 60px;
			white-space: pre-wrap;
			border-radius: 6px;
			color: #374151;
		}

		.footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			text-align: center;
			font-size: 8pt;
			color: #9ca3af;
		}

		.page-break {
			page-break-after: always;
		}

		.tcs-container {
			page-break-before: always;
			page-break-inside: avoid;
		}

		/* Print-specific CSS */
		@media print {
			* {
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
			
			thead {
				display: table-header-group;
			}
			
			tr {
				page-break-inside: avoid;
			}
		}
	</style>
</head>
<body>
	<!-- Summary Page -->
	<div class="summary-page">
		<div class="summary-header">
			<div class="logo-placeholder">
				${logoMarkup}
			</div>
			<div style="text-align: right;">
				<div style="font-weight: bold; color: #e11d48;">${assessment.assessment_number}</div>
				<div style="color: #6b7280; font-size: 9pt;">${formatDateNumeric(assessment.created_at)}</div>
			</div>
		</div>

		<div>
			<div class="summary-title">REPAIR ESTIMATE</div>
			<div class="summary-subtitle">Detailed Repair Cost Breakdown</div>
		</div>

		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-card-title">Vehicle Details</div>
				<div class="summary-card-value" style="font-size: 14pt;">
					${vehicleDetails.year || ''} ${vehicleDetails.make || ''}<br>
					${vehicleDetails.model || ''}
				</div>
				<div style="margin-top: 10px; color: #6b7280; font-size: 10pt;">
					Reg: ${vehicleDetails.registration || '-'}
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-card-title">Assessment Outcome</div>
				<div class="summary-card-value" style="color: ${
					estimate?.assessment_result === 'repair' ? '#059669' :
					estimate?.assessment_result === 'code_2' ? '#d97706' :
					estimate?.assessment_result === 'code_3' || estimate?.assessment_result === 'total_loss' ? '#dc2626' : '#374151'
				};">
					${estimate?.assessment_result ? (
						estimate.assessment_result === 'repair' ? 'Repairable' : 
						estimate.assessment_result === 'code_2' ? 'Code 2 (Write-off)' : 
						estimate.assessment_result === 'code_3' ? 'Code 3 (Write-off)' : 
						estimate.assessment_result === 'total_loss' ? 'Total Loss' : 
						estimate.assessment_result
					) : 'Pending'}
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-card-title">Estimated Repair Cost</div>
				<div class="summary-card-value" style="color: #e11d48;">
					${estimate ? formatCurrency(estimate.total) : '-'}
				</div>
				<div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Incl. VAT</div>
			</div>

			<div class="summary-card">
				<div class="summary-card-title">Client Reference</div>
				<div class="summary-card-value" style="font-size: 14pt;">
					${request?.claim_number || '-'}
				</div>
				<div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Claim Number</div>
			</div>
		</div>

		${estimate?.notes ? `
		<div style="margin-top: 40px; padding: 20px; background: #fff1f2; border-left: 4px solid #e11d48; border-radius: 4px;">
			<div style="font-weight: bold; color: #9f1239; margin-bottom: 5px;">Estimate Notes</div>
			<div style="color: #881337;">
				${estimate.notes.length > 300 ? estimate.notes.substring(0, 300) + '...' : estimate.notes}
			</div>
		</div>
		` : ''}

		<div class="summary-footer">
			${companyName} | ${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}
		</div>
	</div>

	<div class="page-break"></div>

	<!-- Standard Page -->
	<div class="standard-page">
		
		<!-- Standard Header -->
		<div class="standard-header">
			<div class="standard-header-company">
				${companyName}
			</div>
			<div class="standard-header-details">
				<div><strong>Estimate No:</strong> ${assessment.assessment_number}</div>
				<div><strong>Date:</strong> ${formatDateNumeric(assessment.created_at)}</div>
			</div>
		</div>

		<!-- Combined Info Block -->
		<div class="info-grid">
			<!-- Column 1: Claim & Vehicle -->
			<div>
				<div style="font-weight: bold; color: #111827; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">CLAIM & VEHICLE DETAILS</div>
				<div class="info-row">
					<span class="info-label">Claim No.:</span>
					<span class="info-value">${insuredDetails.claimNumber || 'N/A'}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Vehicle:</span>
					<span class="info-value">${vehicleDetails.year || ''} ${vehicleDetails.make || ''} ${vehicleDetails.model || ''}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Registration:</span>
					<span class="info-value">${vehicleDetails.registration || 'N/A'}</span>
				</div>
				<div class="info-row">
					<span class="info-label">VIN:</span>
					<span class="info-value">${vehicleDetails.vin || 'N/A'}</span>
				</div>
			</div>

			<!-- Column 2: Repairer & Rates -->
			<div>
				<div style="font-weight: bold; color: #111827; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">REPAIRER & RATES</div>
				${repairer ? `
				<div class="info-row">
					<span class="info-label">Repairer:</span>
					<span class="info-value">${repairer.name}</span>
				</div>
				` : ''}
				<div class="info-row">
					<span class="info-label">Labour Rate:</span>
					<span class="info-value">${formatCurrency(estimate?.labour_rate || 0)}/hr</span>
				</div>
				<div class="info-row">
					<span class="info-label">Paint Rate:</span>
					<span class="info-value">${formatCurrency(estimate?.paint_rate || 0)}/hr</span>
				</div>
			</div>
		</div>

		<!-- Line Items Table -->
		<table>
			<thead>
				<tr>
					<th style="width: 8%;">CODE</th>
					<th style="width: 27%;">DESCRIPTION</th>
					<th style="width: 7%; text-align: center;">TYPE</th>
					<th style="width: 9%; text-align: right;">PARTS</th>
					<th style="width: 9%; text-align: right;">S&A</th>
					<th style="width: 9%; text-align: right;">LABOUR</th>
					<th style="width: 9%; text-align: right;">PAINT</th>
					<th style="width: 9%; text-align: right;">OUTWORK</th>
					<th style="width: 13%; text-align: right;">TOTAL</th>
				</tr>
			</thead>
			<tbody>
				${lineItems.length > 0 ? renderGroupedLineItems(lineItems) : `
				<tr>
					<td colspan="9" style="text-align: center; padding: 20px;">No line items</td>
				</tr>
				`}
			</tbody>
		</table>

		<!-- Totals -->
		<div class="totals-container">
			<!-- Totals Breakdown Section -->
			<div class="breakdown-section">
				<table class="breakdown-table">
					<tr>
						<td colspan="2" style="font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px; display: block;">TOTALS BREAKDOWN</td>
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
						<td class="breakdown-value" style="color: #059669;">${formatCurrency(markupTotal)}</td>
					</tr>
					${bettermentTotal > 0 ? `
					<tr>
						<td class="breakdown-label">Betterment Deduction</td>
						<td class="breakdown-value" style="color: #dc2626;">-${formatCurrency(bettermentTotal)}</td>
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
						<td class="totals-label" style="color: #e11d48;">GRAND TOTAL:</td>
						<td class="totals-value">${formatCurrency(grandTotal)}</td>
					</tr>
				</table>
			</div>
		</div>

		<!-- Notes Section -->
		${estimate?.notes ? `
		<div class="section" style="margin-top: 40px;">
			<div class="section-title">NOTES</div>
			<div class="notes-box">${estimate.notes}</div>
		</div>
		` : ''}

		<!-- Terms & Conditions -->
		${companySettings?.estimate_terms_and_conditions ? `
		<div class="tcs-container">
			<div class="section-title">TERMS & CONDITIONS</div>
			<div style="font-size: 8pt; line-height: 1.4; color: #4b5563; border: 1px solid #e5e7eb; padding: 15px; background: #f9fafb; white-space: pre-wrap; text-align: justify;">
				${escapeHtmlWithLineBreaks(companySettings.estimate_terms_and_conditions)}
			</div>
		</div>
		` : ''}

		<!-- Footer -->
		<div class="footer">
			<p>This estimate was generated by ${companySettings?.company_name || 'Claimtech'}</p>
			<p>${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}</p>
			<p>Generated on ${formatDateNumeric(new Date().toISOString())}</p>
		</div>
	</div>
</body>
</html>
	`.trim();
}

