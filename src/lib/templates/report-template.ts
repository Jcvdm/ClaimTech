import type {
	Assessment,
	VehicleIdentification,
	Exterior360,
	InteriorMechanical,
	DamageRecord,
	CompanySettings,
	VehicleValues
} from '$lib/types/assessment';
import { formatCurrency, formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';

interface ReportData {
	assessment: Assessment;
	vehicleIdentification: VehicleIdentification | null;
	exterior360: Exterior360 | null;
	interiorMechanical: InteriorMechanical | null;
	damageRecord: DamageRecord | null;
	companySettings: CompanySettings | null;
	request: any;
	inspection: any;
	client: any;
	estimate: any;
	repairer: any;
	tyres: any[] | null;
	vehicleValues: VehicleValues | null; // NEW
	assessmentNotes: string; // NEW - concatenated notes
	engineer: any; // NEW - engineer with user info
}

export function generateReportHTML(data: ReportData): string {
	const {
		assessment,
		vehicleIdentification,
		exterior360,
		interiorMechanical,
		damageRecord,
		companySettings,
		request,
		inspection,
		client,
		estimate,
		repairer,
		tyres,
		vehicleValues,
		assessmentNotes,
		engineer
	} = data;

	const row = (label: string, value: string | number | null | undefined) => {
		const v = value === null || value === undefined ? '' : String(value).trim();
		return v ? `\n\t\t<div class="info-row">\n\t\t\t<span class="info-label">${label}</span>\n\t\t\t<span class="info-value">${v}</span>\n\t\t</div>` : '';
	};

	const cell = (value: string | number | null | undefined) => {
		const v = value === null || value === undefined ? '' : String(value).trim();
		return v || '-';
	};

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Damage Inspection Report - ${assessment.report_number || assessment.assessment_number}</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: Arial, sans-serif;
			font-size: 10pt;
			line-height: 1.4;
			color: #000;
		}

		.header {
			background-color: #1e40af;
			color: white;
			padding: 20px;
			text-align: center;
			margin-bottom: 20px;
		}

		.header h1 {
			font-size: 24pt;
			margin-bottom: 10px;
		}

		.company-info {
			font-size: 9pt;
			margin-top: 10px;
		}

		.report-title {
			background-color: #3b82f6;
			color: white;
			padding: 10px;
			text-align: center;
			font-size: 16pt;
			font-weight: bold;
			margin-bottom: 20px;
		}

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

		.info-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 10px;
			margin-bottom: 15px;
		}

		.info-row {
			display: flex;
			padding: 5px 0;
			border-bottom: 1px solid #e5e7eb;
		}

		.info-label {
			font-weight: bold;
			min-width: 150px;
			color: #374151;
		}

		.info-value {
			color: #000;
		}

		.full-width {
			grid-column: 1 / -1;
		}

		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 15px;
		}

		th, td {
			border: 1px solid #d1d5db;
			padding: 8px;
			text-align: left;
		}

		th {
			background-color: #f3f4f6;
			font-weight: bold;
		}

		.notes-box {
			border: 1px solid #d1d5db;
			padding: 10px;
			background-color: #f9fafb;
			min-height: 60px;
			white-space: pre-wrap;
		}

		.footer {
			margin-top: 30px;
			padding-top: 20px;
			border-top: 2px solid #3b82f6;
			text-align: center;
			font-size: 9pt;
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
			${companySettings?.po_box || 'P.O. Box 12345'}<br>
			${companySettings?.city || 'Johannesburg'}, ${companySettings?.province || 'Gauteng'}<br>
			${companySettings?.postal_code || '2000'}<br>
			Tel: ${companySettings?.phone || '+27 (0) 11 123 4567'}
			${companySettings?.fax ? ` | Fax: ${companySettings.fax}` : ''}
		</div>
	</div>

	<!-- Report Title -->
	<div class="report-title">
		DAMAGE INSPECTION REPORT
	</div>

	<!-- Executive Summary -->
	<div class="section">
		<div class="section-title">EXECUTIVE SUMMARY</div>
		<div class="info-grid">
			${(() => {
				const vehicleDisplay = `${vehicleIdentification?.make || request?.vehicle_make || ''} ${vehicleIdentification?.model || request?.vehicle_model || ''}`.trim();
				return row('Vehicle:', vehicleDisplay);
			})()}
			${row('Claim Number:', request?.claim_number || '')}
			<div class="info-row">
				<span class="info-label">Outcome:</span>
				<span class="info-value" style="font-weight: bold; color: ${
					estimate?.assessment_result === 'repairable' ? '#059669' :
					estimate?.assessment_result === 'borderline_writeoff' ? '#d97706' :
					estimate?.assessment_result === 'total_writeoff' ? '#dc2626' : '#374151'
				};">${estimate?.assessment_result ? (estimate.assessment_result === 'repairable' ? 'Repairable' : estimate.assessment_result === 'borderline_writeoff' ? 'Borderline Write-off' : estimate.assessment_result === 'total_writeoff' ? 'Total Write-off' : estimate.assessment_result) : 'Pending'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Estimated Repair Cost:</span>
				<span class="info-value" style="font-weight: 600; color: #1e40af;">${estimate ? formatCurrency(estimate.total) : '-'}</span>
			</div>
			${vehicleValues ? `
			<div class="info-row">
				<span class="info-label">Pre-Incident Market Value:</span>
				<span class="info-value">${formatCurrency(vehicleValues.market_total_adjusted_value)}</span>
			</div>
			` : ''}
		</div>
	</div>

	<!-- Report Information -->
	<div class="section">
		<div class="section-title">REPORT INFORMATION</div>
		<div class="info-grid">
			<div class="info-row">
				<span class="info-label">Report No.:</span>
				<span class="info-value">${assessment.report_number || assessment.assessment_number}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Inspection Date:</span>
				<span class="info-value">${formatDateNumeric(assessment.created_at)}</span>
			</div>
			${row('Assessor:', engineer?.users?.full_name || '')}
			${row('Contact:', engineer?.users?.phone || engineer?.users?.email || '')}
		</div>
	</div>

	<!-- Claim Information -->
	<div class="section">
		<div class="section-title">CLAIM INFORMATION</div>
		<div class="info-grid">
			${row('Claim Number:', request?.claim_number || '')}
			${row('Request Number:', request?.request_number || '')}
			${row('Date of Loss:', request?.date_of_loss ? formatDateNumeric(request.date_of_loss) : '')}
			${row('Instructed By:', client?.name || '')}
		</div>
	</div>

	<!-- Vehicle Information -->
	<div class="section">
		<div class="section-title">VEHICLE INFORMATION</div>
		<div class="info-grid">
			${row('Make:', vehicleIdentification?.make || request?.vehicle_make || '')}
			${row('Model:', vehicleIdentification?.model || request?.vehicle_model || '')}
			${row('Year:', vehicleIdentification?.year || request?.vehicle_year || '')}
			${row('Registration:', vehicleIdentification?.registration_number || request?.vehicle_registration || '')}
			${row('VIN:', vehicleIdentification?.vin_number || '')}
			${row('Engine Number:', vehicleIdentification?.engine_number || '')}
			${row('Color:', vehicleIdentification?.color || '')}
			${row('Odometer:', interiorMechanical?.mileage_reading ? `${interiorMechanical.mileage_reading.toLocaleString()} km` : '')}
		</div>
	</div>

	<!-- Page Break -->
	<div class="page-break"></div>

	<!-- Vehicle Condition -->
	<div class="section">
		<div class="section-title">VEHICLE CONDITION</div>
		<div class="info-grid">
			${row('Overall Condition:', exterior360?.overall_condition || '')}
			<div class="info-row">
				<span class="info-label">Service History:</span>
				<span class="info-value">${vehicleIdentification?.service_history_available ? 'Available' : 'Not Available'}</span>
			</div>
		</div>
		${exterior360?.condition_notes ? `
		<div class="info-row full-width">
			<span class="info-label">Condition Notes:</span>
		</div>
		<div class="notes-box">${exterior360.condition_notes}</div>
		` : ''}
	</div>

	<!-- Interior & Mechanical -->
	<div class="section">
		<div class="section-title">INTERIOR & MECHANICAL</div>
		<div class="info-grid">
			${row('Transmission:', interiorMechanical?.transmission_type || '')}
			${row('Vehicle Power:', interiorMechanical?.vehicle_power_status || '')}
			${row('Engine Condition:', interiorMechanical?.engine_condition || '')}
			${row('Electronics:', interiorMechanical?.electronics_condition || '')}
		</div>
	</div>

	<!-- Tires & Rims -->
	${tyres && tyres.length > 0 ? `
	<div class="section">
		<div class="section-title">TIRES & RIMS</div>
		<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
			<thead>
				<tr style="background-color: #f3f4f6; border-bottom: 2px solid #1e40af;">
					<th style="padding: 8px; text-align: left; font-size: 9pt; font-weight: bold;">Position</th>
					<th style="padding: 8px; text-align: left; font-size: 9pt; font-weight: bold;">Make</th>
					<th style="padding: 8px; text-align: left; font-size: 9pt; font-weight: bold;">Size</th>
					<th style="padding: 8px; text-align: left; font-size: 9pt; font-weight: bold;">Condition</th>
					<th style="padding: 8px; text-align: right; font-size: 9pt; font-weight: bold;">Tread Depth</th>
					<th style="padding: 8px; text-align: left; font-size: 9pt; font-weight: bold;">Rim Condition</th>
				</tr>
			</thead>
			<tbody>
				${tyres.map((tyre: any) => `
				<tr style="border-bottom: 1px solid #e5e7eb;">
					<td style="padding: 6px; font-size: 9pt;">${cell(tyre.position_label || tyre.position)}</td>
					<td style="padding: 6px; font-size: 9pt;">${cell(tyre.tyre_make)}</td>
					<td style="padding: 6px; font-size: 9pt;">${cell(tyre.tyre_size)}</td>
					<td style="padding: 6px; font-size: 9pt;">${tyre.condition ? tyre.condition.charAt(0).toUpperCase() + tyre.condition.slice(1) : '-'}</td>
					<td style="padding: 6px; font-size: 9pt; text-align: right;">${tyre.tread_depth_mm ? `${tyre.tread_depth_mm}mm` : '-'}</td>
					<td style="padding: 6px; font-size: 9pt;">${tyre.rim_condition ? tyre.rim_condition.charAt(0).toUpperCase() + tyre.rim_condition.slice(1) : '-'}</td>
				</tr>
				`).join('')}
			</tbody>
		</table>
		${tyres.some((t: any) => t.notes) ? `
		<div style="margin-top: 10px;">
			<div style="font-weight: bold; font-size: 9pt; margin-bottom: 5px;">Notes:</div>
			${tyres.filter((t: any) => t.notes).map((tyre: any) => `
			<div style="font-size: 9pt; margin-bottom: 5px;">
				<strong>${tyre.position_label || tyre.position}:</strong> ${tyre.notes}
			</div>
			`).join('')}
		</div>
		` : ''}
	</div>
	` : ''}

	<!-- Damage Assessment -->
	<div class="section">
		<div class="section-title">DAMAGE ASSESSMENT</div>
		<div class="info-grid">
			<div class="info-row">
				<span class="info-label">Incident Matches:</span>
				<span class="info-value">${damageRecord?.incident_match ? 'Yes' : 'No'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Pre-Existing Damage:</span>
				<span class="info-value">${damageRecord?.pre_existing_damage ? 'Yes' : 'No'}</span>
			</div>
		</div>
		${damageRecord?.damage_description ? `
		<div class="info-row full-width">
			<span class="info-label">Damage Description:</span>
		</div>
		<div class="notes-box">${damageRecord.damage_description}</div>
		` : ''}
	</div>

	<!-- Warranty & Vehicle Values -->
	${vehicleValues ? `
	<div class="section">
		<div class="section-title">WARRANTY & VEHICLE VALUES</div>

		<!-- Warranty Information -->
		<div class="info-grid">
			${row('Warranty Status:', vehicleValues.warranty_status ? vehicleValues.warranty_status.charAt(0).toUpperCase() + vehicleValues.warranty_status.slice(1) : '')}
			${row('Warranty Period:', vehicleValues.warranty_period_years ? vehicleValues.warranty_period_years + ' years' : '')}
			${vehicleValues.warranty_start_date ? `
			<div class="info-row">
				<span class="info-label">Warranty Start:</span>
				<span class="info-value">${formatDateNumeric(vehicleValues.warranty_start_date)}</span>
			</div>
			` : ''}
			${vehicleValues.warranty_end_date ? `
			<div class="info-row">
				<span class="info-label">Warranty End:</span>
				<span class="info-value">${formatDateNumeric(vehicleValues.warranty_end_date)}</span>
			</div>
			` : ''}
		</div>

		<!-- Vehicle Values Table -->
		<table style="width: 100%; margin-top: 15px;">
			<thead>
				<tr style="background-color: #f3f4f6;">
					<th style="padding: 8px;">Value Type</th>
					<th style="padding: 8px; text-align: right;">Trade</th>
					<th style="padding: 8px; text-align: right;">Market</th>
					<th style="padding: 8px; text-align: right;">Retail</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td style="padding: 6px; font-weight: bold;">Pre-Incident Value</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.trade_total_adjusted_value)}</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.market_total_adjusted_value)}</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.retail_total_adjusted_value)}</td>
				</tr>
				<tr>
					<td style="padding: 6px; font-weight: bold;">Borderline Write-off</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.borderline_writeoff_trade)}</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.borderline_writeoff_market)}</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.borderline_writeoff_retail)}</td>
				</tr>
				<tr>
					<td style="padding: 6px; font-weight: bold;">Total Write-off</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.total_writeoff_trade)}</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.total_writeoff_market)}</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.total_writeoff_retail)}</td>
				</tr>
				<tr>
					<td style="padding: 6px; font-weight: bold;">Salvage Value</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.salvage_trade)}</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.salvage_market)}</td>
					<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.salvage_retail)}</td>
				</tr>
			</tbody>
		</table>

		${vehicleValues.warranty_notes ? `
		<div style="margin-top: 10px;">
			<div style="font-weight: bold; margin-bottom: 5px;">Warranty Notes:</div>
			<div class="notes-box">${vehicleValues.warranty_notes}</div>
		</div>
		` : ''}
	</div>
	` : ''}

		<!-- Repair Estimate Summary -->
		${estimate ? `
		<div class="section">
			<div class="section-title">REPAIR ESTIMATE SUMMARY</div>
			<div class="info-grid">
				<div class="info-row">
					<span class="info-label">Number of Line Items:</span>
					<span class="info-value">${estimate.line_items?.length || 0}</span>
				</div>
				${repairer ? `
				<div class="info-row">
					<span class="info-label">Repairer:</span>
					<span class="info-value">${repairer.name || ''}</span>
				</div>
				` : ''}
				<div class="info-row">
					<span class="info-label">Subtotal (excl VAT):</span>
					<span class="info-value" style="font-weight: bold;">${formatCurrency(estimate.subtotal)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">VAT (${estimate.vat_percentage || 15}%):</span>
					<span class="info-value">${formatCurrency(estimate.vat_amount)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Grand Total (incl VAT):</span>
					<span class="info-value" style="font-weight: bold; font-size: 12pt; color: #1e40af;">${formatCurrency(estimate.total)}</span>
				</div>
				${estimate.assessment_result ? `
				<div class="info-row">
					<span class="info-label">Assessment Result:</span>
					<span class="info-value" style="font-weight: bold; color: ${
						estimate.assessment_result === 'repairable' ? '#059669' :
						estimate.assessment_result === 'borderline_writeoff' ? '#d97706' :
						'#dc2626'
					};">${
						estimate.assessment_result === 'repairable' ? 'Repairable' :
						estimate.assessment_result === 'borderline_writeoff' ? 'Borderline Write-off' :
						estimate.assessment_result === 'total_writeoff' ? 'Total Write-off' :
						estimate.assessment_result
					}</span>
				</div>
				` : ''}
			</div>
		</div>
		` : ''}

	<!-- Assessment Notes -->
	${assessmentNotes ? `
	<div class="section">
		<div class="section-title">ASSESSMENT NOTES</div>
		<div class="notes-box" style="white-space: pre-wrap;">${assessmentNotes}</div>
	</div>
	` : ''}

	<!-- Terms & Conditions -->
	${companySettings?.assessment_terms_and_conditions ? `
	<div class="section" style="margin-top: 30px; page-break-inside: avoid;">
		<div class="section-title">TERMS & CONDITIONS</div>
		<div style="font-size: 9pt; line-height: 1.5; color: #333; border: 1px solid #ddd; padding: 12px; background: #f9f9f9; white-space: pre-wrap;">
			${escapeHtmlWithLineBreaks(companySettings.assessment_terms_and_conditions)}
		</div>
	</div>
	` : ''}

	<!-- Footer -->
	<div class="footer">
		<p>This report was generated by ${companySettings?.company_name || 'Claimtech'}</p>
		<p>${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}</p>
		<p>Report generated on ${formatDateNumeric(new Date().toISOString())}</p>
	</div>
</body>
</html>
	`.trim();
}

