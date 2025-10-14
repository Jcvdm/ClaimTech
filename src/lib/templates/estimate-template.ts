import type {
	Assessment,
	VehicleIdentification,
	Estimate,
	EstimateLineItem,
	CompanySettings
} from '$lib/types/assessment';

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

	const formatDate = (date: string | null | undefined) => {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	};

	const formatCurrency = (amount: number | null | undefined) => {
		if (amount === null || amount === undefined) {
			return 'R 0.00';
		}
		return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	// Calculate totals from all line items (don't filter by category - use process_type instead)
	const calculatedSubtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);

	// Convert database values to numbers (they come as strings from PostgreSQL DECIMAL type)
	const dbSubtotal = estimate?.subtotal ? Number(estimate.subtotal) : 0;
	const dbVatAmount = estimate?.vat_amount ? Number(estimate.vat_amount) : 0;
	const dbTotal = estimate?.total ? Number(estimate.total) : 0;

	// Use calculated totals if line items exist, otherwise use database values
	const subtotal = lineItems.length > 0 && calculatedSubtotal > 0
		? calculatedSubtotal
		: dbSubtotal;
	const vat = lineItems.length > 0 && calculatedSubtotal > 0
		? (subtotal * ((estimate?.vat_percentage || 15) / 100))
		: dbVatAmount;
	const grandTotal = lineItems.length > 0 && calculatedSubtotal > 0
		? (subtotal + vat)
		: dbTotal;

	// Calculate category totals breakdown (same logic as EstimateTab.svelte)
	const partsTotal = lineItems.reduce((sum, item) => sum + (item.part_price || 0), 0);
	const saTotal = lineItems.reduce((sum, item) => sum + (item.strip_assemble || 0), 0);
	const labourTotal = lineItems.reduce((sum, item) => sum + (item.labour_cost || 0), 0);
	const paintTotal = lineItems.reduce((sum, item) => sum + (item.paint_cost || 0), 0);
	const outworkTotal = lineItems.reduce((sum, item) => sum + (item.outwork_charge || 0), 0);

	// Calculate total markup (difference between selling price and nett price)
	const markupTotal = lineItems.reduce((sum, item) => {
		if (item.part_price && item.part_price_nett) {
			return sum + (item.part_price - item.part_price_nett);
		}
		return sum;
	}, 0);

	const renderLineItems = (items: EstimateLineItem[]) => {
		return items
			.map(
				(item, index) => {
					// Helper to show value or dash
					const showValue = (value: number | null | undefined) =>
						value && value > 0 ? formatCurrency(value) : '-';

					return `
			<tr>
				<td>${item.process_type}${(index + 1).toString().padStart(3, '0')}</td>
				<td>${item.description || ''}</td>
				<td style="text-align: right;">${showValue(item.part_price)}</td>
				<td style="text-align: right;">${showValue(item.strip_assemble)}</td>
				<td style="text-align: right;">${showValue(item.labour_cost)}</td>
				<td style="text-align: right;">${showValue(item.paint_cost)}</td>
				<td style="text-align: right;">${showValue(item.outwork_charge)}</td>
				<td style="text-align: right;">${formatCurrency(item.total)}</td>
			</tr>
		`;
				}
			)
			.join('');
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

		.subtotal-row {
			background-color: #f3f4f6;
			font-weight: bold;
		}

		.totals-section {
			margin-top: 20px;
			float: right;
			width: 300px;
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

		.breakdown-section {
			margin-top: 20px;
			margin-bottom: 10px;
			float: right;
			width: 300px;
			clear: right;
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
				<span class="info-value">${formatDate(assessment.created_at)}</span>
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
			${lineItems.length > 0 ? renderLineItems(lineItems) : `
			<tr>
				<td colspan="8" style="text-align: center; padding: 20px;">No line items</td>
			</tr>
			`}
		</tbody>
	</table>

	<!-- Totals Breakdown Section -->
	<div class="breakdown-section">
		<table class="breakdown-table">
			<tr class="breakdown-header">
				<td colspan="2">TOTALS BREAKDOWN</td>
			</tr>
			<tr>
				<td class="breakdown-label">Parts Total</td>
				<td class="breakdown-value">${formatCurrency(partsTotal)}</td>
			</tr>
			<tr>
				<td class="breakdown-label">Markup Total</td>
				<td class="breakdown-value breakdown-markup">${formatCurrency(markupTotal)}</td>
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
				<td class="breakdown-label">Outwork Total</td>
				<td class="breakdown-value">${formatCurrency(outworkTotal)}</td>
			</tr>
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
				<td class="totals-label">VAT (15%):</td>
				<td class="totals-value">${formatCurrency(vat)}</td>
			</tr>
			<tr class="grand-total">
				<td class="totals-label">GRAND TOTAL:</td>
				<td class="totals-value">${formatCurrency(grandTotal)}</td>
			</tr>
		</table>
	</div>

	<!-- Notes Section -->
	${estimate?.notes ? `
	<div class="notes-section">
		<h3 style="margin-bottom: 10px;">NOTES</h3>
		<div class="notes-box">${estimate.notes}</div>
	</div>
	` : ''}

	<!-- Footer -->
	<div class="footer">
		<p><strong>Terms & Conditions:</strong> This estimate is valid for 30 days from the date of issue. All work is subject to inspection and approval.</p>
		<p style="margin-top: 10px;">${companySettings?.company_name || 'Claimtech'} | ${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}</p>
		<p>Estimate generated on ${formatDate(new Date().toISOString())}</p>
	</div>
</body>
</html>
	`.trim();
}

