import type {
	Assessment,
	VehicleIdentification,
	PreIncidentEstimate,
	EstimateLineItem,
	CompanySettings,
	ProcessType
} from '$lib/types/assessment';
import { PROCESS_TYPE_CONFIGS } from '$lib/constants/processTypes';
import { formatCurrency, formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';

interface PreIncidentEstimateData {
	assessment: Assessment;
	vehicleIdentification: VehicleIdentification | null;
	estimate: PreIncidentEstimate | null;
	lineItems: EstimateLineItem[];
	companySettings: CompanySettings | null;
	request: any;
	client: any;
	repairer: any;
}

export function generatePreIncidentEstimateHTML(data: PreIncidentEstimateData): string {
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

	// Convert database values to numbers
	const dbSubtotal = estimate?.subtotal ? Number(estimate.subtotal) : 0;
	const dbVatAmount = estimate?.vat_amount ? Number(estimate.vat_amount) : 0;
	const dbTotal = estimate?.total ? Number(estimate.total) : 0;

	const subtotal = dbSubtotal;
	const vat = dbVatAmount;
	const grandTotal = dbTotal;

	// Helper functions
	const getProcessTypeLabel = (type: ProcessType): string => {
		const config = PROCESS_TYPE_CONFIGS[type];
		return config?.label || type;
	};

	const renderLineItems = (items: EstimateLineItem[]) => {
		return items
			.map((item) => {
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
			})
			.join('');
	};

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Pre-Incident Estimate - ${assessment.assessment_number}</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5; }
		.page { page-break-after: always; padding: 40px; }
		.header { margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 15px; }
		.title { font-size: 18pt; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
		.subtitle { font-size: 10pt; color: #6b7280; }
		.section { margin-bottom: 20px; }
		.section-title { font-size: 11pt; font-weight: bold; color: #1e40af; margin-bottom: 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 5px; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
		th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 9pt; font-weight: bold; border: 1px solid #d1d5db; }
		td { padding: 8px; border: 1px solid #e5e7eb; font-size: 9pt; }
		.amount { text-align: right; }
		.totals-table { width: 50%; margin-left: auto; }
		.totals-table td { border: none; padding: 6px 0; }
		.totals-label { font-weight: bold; }
		.grand-total { border-top: 2px solid #1e40af; border-bottom: 2px solid #1e40af; background: #f0f9ff; }
		.grand-total td { font-weight: bold; font-size: 10pt; }
	</style>
</head>
<body>
	<div class="page">
		<div class="header">
			<div class="title">PRE-INCIDENT DAMAGE ESTIMATE</div>
			<div class="subtitle">Assessment: ${assessment.assessment_number} | Date: ${formatDateNumeric(new Date())}</div>
		</div>

		<!-- Vehicle Information -->
		<div class="section">
			<div class="section-title">VEHICLE INFORMATION</div>
			<table>
				<tr>
					<td style="width: 50%;"><strong>Make/Model:</strong> ${vehicleIdentification?.make || 'N/A'} ${vehicleIdentification?.model || ''}</td>
					<td style="width: 50%;"><strong>Year:</strong> ${vehicleIdentification?.year || 'N/A'}</td>
				</tr>
				<tr>
					<td><strong>VIN:</strong> ${vehicleIdentification?.vin || 'N/A'}</td>
					<td><strong>Registration:</strong> ${vehicleIdentification?.registration || 'N/A'}</td>
				</tr>
			</table>
		</div>

		<!-- Line Items -->
		<div class="section">
			<div class="section-title">PRE-INCIDENT DAMAGE LINE ITEMS</div>
			<table>
				<thead>
					<tr>
						<th style="width: 7%;">CODE</th>
						<th style="width: 28%;">DESCRIPTION</th>
						<th style="width: 7%;">TYPE</th>
						<th style="width: 9%;">PARTS</th>
						<th style="width: 9%;">S&A</th>
						<th style="width: 9%;">LABOUR</th>
						<th style="width: 9%;">PAINT</th>
						<th style="width: 9%;">OUTWORK</th>
						<th style="width: 12%;">TOTAL</th>
					</tr>
				</thead>
				<tbody>
					${lineItems.length > 0 ? renderLineItems(lineItems) : `<tr><td colspan="9" style="text-align: center; padding: 20px;">No line items</td></tr>`}
				</tbody>
			</table>
		</div>

		<!-- Totals -->
		<div class="section">
			<table class="totals-table">
				<tr><td class="totals-label">Subtotal:</td><td class="amount">${formatCurrency(subtotal)}</td></tr>
				<tr><td class="totals-label">VAT (${estimate?.vat_percentage || 15}%):</td><td class="amount">${formatCurrency(vat)}</td></tr>
				<tr class="grand-total"><td class="totals-label">TOTAL:</td><td class="amount">${formatCurrency(grandTotal)}</td></tr>
			</table>
		</div>

		<!-- Notes -->
		${estimate?.notes ? `
		<div class="section">
			<div class="section-title">NOTES</div>
			<p style="font-size: 9pt; padding: 10px; background: #f9fafb; border-radius: 4px;">
				${escapeHtmlWithLineBreaks(estimate.notes)}
			</p>
		</div>
		` : ''}
	</div>
</body>
</html>
	`;
}

