import type { ShopEstimate } from '$lib/services/shop-estimate.service';
import type { ProcessType } from '$lib/types/assessment';
import { PROCESS_TYPE_CONFIGS } from '$lib/constants/processTypes';
import { formatCurrency, formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';

export interface ShopEstimateData {
	estimate: ShopEstimate;
	job: {
		job_number: string;
		job_type: string;
		customer_name: string;
		customer_phone: string | null;
		customer_email: string | null;
		vehicle_make: string;
		vehicle_model: string;
		vehicle_year: number | null;
		vehicle_reg: string | null;
		vehicle_vin: string | null;
		vehicle_color: string | null;
		vehicle_mileage: number | null;
		damage_description: string | null;
		complaint: string | null;
	};
	companyName: string;
	companyPhone: string | null;
	companyEmail: string | null;
	companyAddress: string | null;
	logoBase64: string | null;
}

// Simple HTML escape for single-line text values
function escapeHtml(str: string | null | undefined): string {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

// Assessment-style line item shape (what shop estimates actually store)
interface AssessmentStyleLineItem {
	process_type: ProcessType;
	part_type?: string | null;
	description?: string;
	part_price_nett?: number | null;
	strip_assemble?: number | null;
	labour_cost?: number | null;
	paint_cost?: number | null;
	outwork_charge_nett?: number | null;
	total: number;
}

export function generateShopEstimateHTML(data: ShopEstimateData): string {
	const { estimate, job, companyName, companyPhone, companyEmail, companyAddress, logoBase64 } =
		data;

	// Parse line_items — may be double-serialized JSONB string or already an array
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const rawItems: any[] = Array.isArray(estimate.line_items)
		? estimate.line_items
		: typeof estimate.line_items === 'string'
			? JSON.parse(estimate.line_items as string)
			: [];

	// Treat all items as assessment-style (process_type-based)
	const lineItems: AssessmentStyleLineItem[] = rawItems.map((item) => ({
		process_type: (item.process_type ?? 'R') as ProcessType,
		part_type: item.part_type ?? null,
		description: item.description ?? '',
		part_price_nett: item.part_price_nett != null ? Number(item.part_price_nett) : null,
		strip_assemble: item.strip_assemble != null ? Number(item.strip_assemble) : null,
		labour_cost: item.labour_cost != null ? Number(item.labour_cost) : null,
		paint_cost: item.paint_cost != null ? Number(item.paint_cost) : null,
		outwork_charge_nett:
			item.outwork_charge_nett != null ? Number(item.outwork_charge_nett) : null,
		total: Number(item.total) || 0
	}));

	// Totals from database
	const subtotal = Number(estimate.subtotal) || 0;
	const vatRate = Number(estimate.vat_rate) || 15;
	const vatAmount = Number(estimate.vat_amount) || 0;
	const grandTotal = Number(estimate.total) || 0;

	// Category nett totals breakdown
	const partsNett = lineItems.reduce((sum, item) => sum + (item.part_price_nett || 0), 0);
	const saTotal = lineItems.reduce((sum, item) => sum + (item.strip_assemble || 0), 0);
	const labourTotal = lineItems.reduce((sum, item) => sum + (item.labour_cost || 0), 0);
	const paintTotal = lineItems.reduce((sum, item) => sum + (item.paint_cost || 0), 0);
	const outworkNett = lineItems.reduce((sum, item) => sum + (item.outwork_charge_nett || 0), 0);

	// Markup calculation (same logic as assessment template)
	let partsMarkup = 0;
	for (const item of lineItems) {
		if (item.process_type === 'N' && item.part_price_nett) {
			const nett = item.part_price_nett;
			let markupPct = 0;
			if (item.part_type === 'OEM') markupPct = estimate.oem_markup_pct || 0;
			else if (item.part_type === 'ALT') markupPct = estimate.alt_markup_pct || 0;
			else if (item.part_type === '2ND') markupPct = estimate.second_hand_markup_pct || 0;
			partsMarkup += nett * (markupPct / 100);
		}
	}
	const outworkMarkup = outworkNett * ((estimate.outwork_markup_pct || 0) / 100);
	const markupTotal = partsMarkup + outworkMarkup;

	// Process type label helper
	const getProcessTypeLabel = (pt: ProcessType) => {
		const config = PROCESS_TYPE_CONFIGS[pt];
		return config ? `${config.code} - ${config.label}` : pt;
	};

	// Show value or dash
	const showValue = (value: number | null | undefined) =>
		value && value > 0 ? formatCurrency(value) : '-';

	// Render a single line item row
	const renderRow = (item: AssessmentStyleLineItem) => {
		const partTypeBadge =
			item.process_type === 'N' && item.part_type
				? `<span style="display:inline-block;background:#1e40af;color:#fff;padding:2px 4px;border-radius:2px;font-size:7pt;font-weight:bold;">${escapeHtml(item.part_type)}</span>`
				: '-';

		return `
			<tr style="border-bottom: 1px solid #e5e7eb;">
				<td style="padding: 6px; font-size: 9pt;">${escapeHtml(getProcessTypeLabel(item.process_type))}</td>
				<td style="padding: 6px; font-size: 9pt;">${escapeHtml(item.description)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: center;">${partTypeBadge}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.part_price_nett)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.strip_assemble)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.labour_cost)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.paint_cost)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${showValue(item.outwork_charge_nett)}</td>
				<td style="padding: 6px; font-size: 9pt; text-align: right;">${formatCurrency(item.total)}</td>
			</tr>`;
	};

	// Group line items and render with category headers
	const categoryHeaderStyle =
		'font-weight: bold !important; font-size: 10pt !important; padding: 12px 8px !important; border-bottom: 2px solid #e11d48 !important; background-color: #fff !important; color: #111827 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;';

	const newParts = lineItems.filter((i) => i.process_type === 'N');
	const repairs = lineItems.filter((i) => i.process_type === 'R');
	const paintBlend = lineItems.filter((i) => i.process_type === 'P' || i.process_type === 'B');
	const other = lineItems.filter((i) => i.process_type === 'A' || i.process_type === 'O');

	let groupedRows = '';
	if (newParts.length > 0) {
		groupedRows += `<tr class="group-header"><td colspan="9" style="${categoryHeaderStyle}">NEW PARTS</td></tr>`;
		groupedRows += newParts.map(renderRow).join('');
	}
	if (repairs.length > 0) {
		groupedRows += `<tr class="group-header"><td colspan="9" style="${categoryHeaderStyle}">REPAIRS</td></tr>`;
		groupedRows += repairs.map(renderRow).join('');
	}
	if (paintBlend.length > 0) {
		groupedRows += `<tr class="group-header"><td colspan="9" style="${categoryHeaderStyle}">PAINT & BLEND</td></tr>`;
		groupedRows += paintBlend.map(renderRow).join('');
	}
	if (other.length > 0) {
		groupedRows += `<tr class="group-header"><td colspan="9" style="${categoryHeaderStyle}">OTHER SERVICES</td></tr>`;
		groupedRows += other.map(renderRow).join('');
	}

	if (groupedRows === '') {
		groupedRows = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #9ca3af;">No line items</td></tr>`;
	}

	// Job type display
	const jobTypeLabel =
		job.job_type === 'autobody'
			? 'Autobody'
			: job.job_type === 'mechanical'
				? 'Mechanical'
				: escapeHtml(job.job_type);

	// Mileage display
	const mileage =
		job.vehicle_mileage != null ? `${job.vehicle_mileage.toLocaleString()} km` : '-';

	// Description or complaint field label
	const descriptionOrComplaint = job.damage_description || job.complaint || '';

	// Logo markup
	const logoMarkup = logoBase64
		? `<img src="${logoBase64}" alt="${escapeHtml(companyName)} logo" style="max-height: 70px; width: auto; object-fit: contain;" />`
		: `<span style="font-size: 24pt; font-weight: bold; color: #e11d48;">${escapeHtml(companyName)}</span>`;

	// Company footer line
	const companyFooterLine = [companyName, companyPhone, companyEmail, companyAddress]
		.filter(Boolean)
		.map(escapeHtml)
		.join(' | ');

	// Notes callout (pink background, like assessment)
	const notesCallout = estimate.notes
		? `
		<div style="margin-top: 40px; padding: 20px; background: #fff1f2; border-left: 4px solid #e11d48; border-radius: 4px;">
			<div style="font-weight: bold; color: #9f1239; margin-bottom: 5px;">Estimate Notes</div>
			<div style="color: #881337;">
				${estimate.notes.length > 300 ? estimate.notes.substring(0, 300) + '...' : escapeHtml(estimate.notes)}
			</div>
		</div>`
		: '';

	// Notes section on detail page
	const notesSection = estimate.notes
		? `
		<div style="margin-top: 40px;">
			<div style="font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; font-size: 9pt; letter-spacing: 0.5px;">NOTES</div>
			<div style="border: 1px solid #e5e7eb; padding: 20px; background-color: #f9fafb; min-height: 60px; white-space: pre-wrap; border-radius: 6px; color: #374151; font-size: 9pt;">
				${escapeHtmlWithLineBreaks(estimate.notes)}
			</div>
		</div>`
		: '';

	const estimateDate = formatDateNumeric(estimate.created_at);

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Repair Estimate - ${escapeHtml(estimate.estimate_number)}</title>
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
			table-layout: fixed;
		}

		thead {
			display: table-header-group;
		}

		tr {
			page-break-inside: avoid;
		}

		tbody tr:nth-child(even) {
			background-color: #f9fafb;
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
			page-break-inside: avoid;
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
			<div>
				${logoMarkup}
			</div>
			<div style="text-align: right;">
				<div style="font-weight: bold; color: #e11d48;">${escapeHtml(estimate.estimate_number)}</div>
				<div style="color: #6b7280; font-size: 9pt;">${estimateDate}</div>
			</div>
		</div>

		<div>
			<div class="summary-title">REPAIR ESTIMATE</div>
			<div class="summary-subtitle">Detailed Repair Cost Breakdown</div>
		</div>

		<div class="summary-grid">
			<!-- Card 1: Vehicle Details -->
			<div class="summary-card">
				<div class="summary-card-title">Vehicle Details</div>
				<div class="summary-card-value" style="font-size: 14pt;">
					${escapeHtml(job.vehicle_year ? String(job.vehicle_year) : '')} ${escapeHtml(job.vehicle_make)}<br>
					${escapeHtml(job.vehicle_model)}
				</div>
				<div style="margin-top: 10px; color: #6b7280; font-size: 10pt;">
					Reg: ${escapeHtml(job.vehicle_reg) || '-'}
				</div>
			</div>

			<!-- Card 2: Job Type + Customer -->
			<div class="summary-card">
				<div class="summary-card-title">Job Type</div>
				<div class="summary-card-value">
					${escapeHtml(jobTypeLabel)}
				</div>
				<div style="margin-top: 10px; color: #6b7280; font-size: 10pt;">
					${escapeHtml(job.customer_name)}
				</div>
			</div>

			<!-- Card 3: Estimated Repair Cost -->
			<div class="summary-card">
				<div class="summary-card-title">Estimated Repair Cost</div>
				<div class="summary-card-value" style="color: #e11d48;">
					${formatCurrency(grandTotal)}
				</div>
				<div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Incl. VAT</div>
			</div>

			<!-- Card 4: Job Reference -->
			<div class="summary-card">
				<div class="summary-card-title">Job Reference</div>
				<div class="summary-card-value" style="font-size: 14pt;">
					${escapeHtml(job.job_number)}
				</div>
				<div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Job Number</div>
			</div>
		</div>

		${notesCallout}

		<div class="summary-footer">
			${escapeHtml(companyFooterLine)}
		</div>
	</div>

	<div class="page-break"></div>

	<!-- Detail Page -->
	<div class="standard-page">

		<!-- Standard Header -->
		<div class="standard-header">
			<div class="standard-header-company">
				${escapeHtml(companyName)}
			</div>
			<div class="standard-header-details">
				<div><strong>Estimate No:</strong> ${escapeHtml(estimate.estimate_number)}</div>
				<div><strong>Date:</strong> ${estimateDate}</div>
			</div>
		</div>

		<!-- Info Grid -->
		<div class="info-grid">
			<!-- Column 1: Customer & Vehicle -->
			<div>
				<div style="font-weight: bold; color: #111827; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">CUSTOMER & VEHICLE</div>
				<div class="info-row">
					<span class="info-label">Customer:</span>
					<span class="info-value">${escapeHtml(job.customer_name)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Vehicle:</span>
					<span class="info-value">${escapeHtml(job.vehicle_year ? String(job.vehicle_year) : '')} ${escapeHtml(job.vehicle_make)} ${escapeHtml(job.vehicle_model)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Registration:</span>
					<span class="info-value">${escapeHtml(job.vehicle_reg) || '-'}</span>
				</div>
				${job.vehicle_vin ? `<div class="info-row"><span class="info-label">VIN:</span><span class="info-value">${escapeHtml(job.vehicle_vin)}</span></div>` : ''}
				${job.vehicle_mileage != null ? `<div class="info-row"><span class="info-label">Mileage:</span><span class="info-value">${mileage}</span></div>` : ''}
			</div>

			<!-- Column 2: Job & Rates -->
			<div>
				<div style="font-weight: bold; color: #111827; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">JOB & RATES</div>
				<div class="info-row">
					<span class="info-label">Job Number:</span>
					<span class="info-value">${escapeHtml(job.job_number)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Type:</span>
					<span class="info-value">${escapeHtml(jobTypeLabel)}</span>
				</div>
				${estimate.labour_rate != null ? `<div class="info-row"><span class="info-label">Labour Rate:</span><span class="info-value">${formatCurrency(estimate.labour_rate)}/hr</span></div>` : ''}
				${estimate.paint_rate != null ? `<div class="info-row"><span class="info-label">Paint Rate:</span><span class="info-value">${formatCurrency(estimate.paint_rate)}/hr</span></div>` : ''}
				${descriptionOrComplaint ? `<div class="info-row"><span class="info-label">${job.job_type === 'mechanical' ? 'Complaint:' : 'Description:'}</span><span class="info-value">${escapeHtml(descriptionOrComplaint)}</span></div>` : ''}
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
					<th style="width: 9%; text-align: right;">S&amp;A</th>
					<th style="width: 9%; text-align: right;">LABOUR</th>
					<th style="width: 9%; text-align: right;">PAINT</th>
					<th style="width: 9%; text-align: right;">OUTWORK</th>
					<th style="width: 13%; text-align: right;">TOTAL</th>
				</tr>
			</thead>
			<tbody>
				${groupedRows}
			</tbody>
		</table>

		<!-- Totals -->
		<div class="totals-container">
			<!-- Breakdown Panel -->
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
						<td class="breakdown-label">S&amp;A Total</td>
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
				</table>
			</div>

			<!-- Grand Total Panel -->
			<div class="totals-section">
				<table class="totals-table">
					<tr>
						<td class="totals-label">Subtotal:</td>
						<td class="totals-value">${formatCurrency(subtotal)}</td>
					</tr>
					<tr>
						<td class="totals-label">VAT (${vatRate}%):</td>
						<td class="totals-value">${formatCurrency(vatAmount)}</td>
					</tr>
					<tr class="grand-total">
						<td class="totals-label" style="color: #e11d48;">GRAND TOTAL:</td>
						<td class="totals-value">${formatCurrency(grandTotal)}</td>
					</tr>
				</table>
			</div>
		</div>

		${notesSection}

		<!-- Footer -->
		<div class="footer">
			<p>This estimate was prepared by ${escapeHtml(companyName)}</p>
			${companyEmail ? `<p>${escapeHtml(companyEmail)}${companyPhone ? ' | Tel: ' + escapeHtml(companyPhone) : ''}</p>` : ''}
			<p>Generated on ${formatDateNumeric(new Date().toISOString())}</p>
		</div>
	</div>

</body>
</html>`.trim();
}
