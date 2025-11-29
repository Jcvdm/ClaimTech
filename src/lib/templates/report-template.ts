import type {
	Assessment,
	VehicleIdentification,
	Exterior360,
	InteriorMechanical,
	DamageRecord,
	CompanySettings,
	VehicleValues,
	VehicleAccessory,
	AccessoryType
} from '$lib/types/assessment';
import { formatCurrency, formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';
import type { VehicleDetails, ClientDetails, InsuredDetails } from '$lib/utils/report-data-helpers';

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
	vehicleValues: VehicleValues | null;
	logoBase64?: string | null;
	assessmentNotes: string;
	engineer: any;
	vehicleDetails: VehicleDetails;
	clientDetails: ClientDetails;
	insuredDetails: InsuredDetails;
	excessAmount?: number | null;
	accessories: VehicleAccessory[];
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
		logoBase64,
		assessmentNotes,
		engineer,
		vehicleDetails,
		clientDetails,
		insuredDetails,
		excessAmount,
		accessories
	} = data;

	// Helper function to get display name for accessory type
	const getAccessoryDisplayName = (type: AccessoryType, customName?: string | null): string => {
		if (type === 'custom' && customName) return customName;
		const labels: Record<AccessoryType, string> = {
			mags: 'Mags / Alloy Wheels',
			spotlights: 'Spotlights',
			park_sensors: 'Park Sensors',
			tow_bar: 'Tow Bar',
			bull_bar: 'Bull Bar',
			roof_rack: 'Roof Rack',
			side_steps: 'Side Steps',
			canopy: 'Canopy / Bakkie Cover',
			tonneau_cover: 'Tonneau Cover',
			nudge_bar: 'Nudge Bar',
			winch: 'Winch',
			snorkel: 'Snorkel',
			custom: 'Custom'
		};
		return labels[type] || type;
	};

	// Calculate accessories total
	const accessoriesTotal = accessories.reduce((sum, acc) => sum + (acc.value || 0), 0);

	// Calculate excess and net payable
	const excess = excessAmount ? Number(excessAmount) : 0;
	const estimateTotal = estimate?.total ? Number(estimate.total) : 0;
	const netPayable = estimateTotal - excess;

	const row = (label: string, value: string | number | null | undefined) => {
		const v = value === null || value === undefined ? '' : String(value).trim();
		return v ? `\n\t\t<div class="info-row">\n\t\t\t<span class="info-label">${label}</span>\n\t\t\t<span class="info-value">${v}</span>\n\t\t</div>` : '';
	};

	const cell = (value: string | number | null | undefined) => {
		const v = value === null || value === undefined ? '' : String(value).trim();
		return v || '-';
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
	<title>Damage Inspection Report - ${assessment.report_number || assessment.assessment_number}</title>
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

		/* Brand Colors */
		.bg-rose { background-color: #e11d48; }
		.text-rose { color: #e11d48; }
		.border-rose { border-color: #e11d48; }

		.bg-blue { background-color: #64748b; }
		.text-blue { color: #64748b; }
		.border-blue { border-color: #64748b; }

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

		.section {
			margin-bottom: 30px;
			page-break-inside: avoid;
		}

		.section-title {
			background-color: #fff;
			padding: 8px 0;
			font-weight: 700;
			font-size: 12pt;
			border-bottom: 2px solid #e11d48;
			margin-bottom: 20px;
			color: #111827;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.info-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 20px;
		}

		.info-row {
			display: flex;
			padding: 8px 0;
			border-bottom: 1px solid #f3f4f6;
		}

		.info-label {
			font-weight: 600;
			min-width: 160px;
			color: #6b7280;
		}

		.info-value {
			color: #111827;
			flex: 1;
			font-weight: 500;
		}

		.full-width {
			grid-column: 1 / -1;
		}

		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
		}

		th, td {
			border-bottom: 1px solid #e5e7eb;
			padding: 12px 8px;
			text-align: left;
		}

		th {
			background-color: #f9fafb;
			font-weight: 600;
			color: #374151;
			text-transform: uppercase;
			font-size: 9pt;
			letter-spacing: 0.5px;
		}
		
		td {
			color: #1f2937;
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
	</style>
</head>
<body>
	<!-- Summary Page (Rose Theme) -->
	<div class="summary-page">
		<div class="summary-header">
			<div class="logo-placeholder">
				${logoMarkup}
			</div>
			<div style="text-align: right;">
				<div style="font-weight: bold; color: #e11d48;">${assessment.report_number || assessment.assessment_number}</div>
				<div style="color: #6b7280; font-size: 9pt;">${formatDateNumeric(assessment.created_at)}</div>
			</div>
		</div>

		<div>
			<div class="summary-title">DAMAGE INSPECTION<br>REPORT</div>
			<div class="summary-subtitle">Comprehensive Assessment & Repair Estimate</div>
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

		<div style="margin-top: 40px; padding: 20px; background: #fff1f2; border-left: 4px solid #e11d48; border-radius: 4px;">
			<div style="font-weight: bold; color: #9f1239; margin-bottom: 5px;">Assessor's Note</div>
			<div style="color: #881337;">
				${assessmentNotes ? (assessmentNotes.length > 300 ? assessmentNotes.substring(0, 300) + '...' : assessmentNotes) : 'No specific notes.'}
			</div>
		</div>

		<div class="summary-footer">
			${companyName} | ${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}
		</div>
	</div>

	<div class="page-break"></div>

	<!-- Standard Report Content (Rose/Gray Theme) -->
	<div class="standard-page">
		
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
				${row('Assessor:', engineer?.name || '')}
				${row('Company:', engineer?.company_name || '')}
				${row('Phone:', engineer?.phone || '')}
				${row('Email:', engineer?.email || '')}
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

		<!-- Insured Report Information -->
		<div class="section">
			<div class="section-title">INSURED REPORT INFORMATION</div>
			<div class="info-grid">
				${row('Insured Name:', insuredDetails.ownerName)}
				${row('Contact Number:', insuredDetails.ownerPhone)}
				${row('Email Address:', insuredDetails.ownerEmail)}
				${row('Address:', insuredDetails.ownerAddress)}
				${row('Date of Loss:', insuredDetails.dateOfLoss ? formatDateNumeric(insuredDetails.dateOfLoss) : '')}
				${row('Incident Type:', insuredDetails.incidentType)}
			</div>
			${insuredDetails.incidentDescription ? `
			<div class="info-row full-width">
				<span class="info-label">Incident Description:</span>
			</div>
			<div class="notes-box">${insuredDetails.incidentDescription}</div>
			` : ''}
		</div>

		<!-- Vehicle Information -->
		<div class="section">
			<div class="section-title">VEHICLE INFORMATION</div>
			<div class="info-grid">
				${row('Make:', vehicleDetails.make || '')}
				${row('Model:', vehicleDetails.model || '')}
				${row('Year:', vehicleDetails.year || '')}
				${row('Registration:', vehicleDetails.registration || '')}
				${row('VIN:', vehicleDetails.vin || '')}
				${row('Engine Number:', vehicleIdentification?.engine_number || '')}
				${row('Color:', vehicleDetails.color || '')}
				${row('Odometer:', vehicleDetails.mileage ? `${vehicleDetails.mileage.toLocaleString()} km` : '')}
			</div>
		</div>

		<!-- Vehicle Condition -->
		<div class="section">
			<div class="section-title">VEHICLE CONDITION</div>
			<div class="info-grid">
				${row('Overall Condition:', exterior360?.overall_condition || '')}
				<div class="info-row">
					<span class="info-label">Service History:</span>
					<span class="info-value">${vehicleValues?.service_history_status ? vehicleValues.service_history_status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}</span>
				</div>
			</div>

		</div>

		<!-- Interior & Mechanical -->
		<div class="section">
			<div class="section-title">INTERIOR & MECHANICAL</div>
			<div class="info-grid">
				${row('Transmission:', interiorMechanical?.transmission_type || '')}
				${row('Vehicle Power:', interiorMechanical?.vehicle_has_power ? 'Yes' : 'No')}
				${row('SRS System:', interiorMechanical?.srs_system || '')}
				${row('Steering:', interiorMechanical?.steering || '')}
			</div>
		</div>

		<!-- Tires & Rims -->
		${tyres && tyres.length > 0 ? `
		<div class="section">
			<div class="section-title">TIRES & RIMS</div>
			<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
				<thead>
					<tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
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

		<!-- Vehicle Accessories -->
		${accessories && accessories.length > 0 ? `
		<div class="section">
			<div class="section-title">VEHICLE ACCESSORIES</div>
			<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
				<thead>
					<tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
						<th style="padding: 8px; text-align: left; font-size: 9pt; font-weight: bold;">Accessory</th>
						<th style="padding: 8px; text-align: left; font-size: 9pt; font-weight: bold;">Condition</th>
						<th style="padding: 8px; text-align: right; font-size: 9pt; font-weight: bold;">Value</th>
					</tr>
				</thead>
				<tbody>
					${accessories.map((acc: VehicleAccessory) => `
					<tr style="border-bottom: 1px solid #e5e7eb;">
						<td style="padding: 6px; font-size: 9pt;">${getAccessoryDisplayName(acc.accessory_type, acc.custom_name)}</td>
						<td style="padding: 6px; font-size: 9pt;">${acc.condition ? acc.condition.charAt(0).toUpperCase() + acc.condition.slice(1).replace(/_/g, ' ') : '-'}</td>
						<td style="padding: 6px; font-size: 9pt; text-align: right;">${formatCurrency(acc.value)}</td>
					</tr>
					`).join('')}
					<tr style="border-top: 2px solid #e5e7eb; font-weight: bold;">
						<td colspan="2" style="padding: 8px; font-size: 9pt;">Total Accessories</td>
						<td style="padding: 8px; font-size: 9pt; text-align: right;">${formatCurrency(accessoriesTotal)}</td>
					</tr>
				</tbody>
			</table>
			${accessories.some((acc: VehicleAccessory) => acc.notes) ? `
			<div style="margin-top: 10px;">
				<div style="font-weight: bold; font-size: 9pt; margin-bottom: 5px;">Notes:</div>
				${accessories.filter((acc: VehicleAccessory) => acc.notes).map((acc: VehicleAccessory) => `
				<div style="font-size: 9pt; margin-bottom: 5px;">
					<strong>${getAccessoryDisplayName(acc.accessory_type, acc.custom_name)}:</strong> ${acc.notes}
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
					<span class="info-value">${damageRecord?.matches_description ? 'Yes' : 'No'}</span>
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
					<tr style="background-color: #f9fafb;">
						<th style="padding: 8px;">Value Type</th>
						<th style="padding: 8px; text-align: right;">Trade</th>
						<th style="padding: 8px; text-align: right;">Market</th>
						<th style="padding: 8px; text-align: right;">Retail</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td style="padding: 6px; font-weight: bold;">Adjusted Value</td>
						<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.trade_total_adjusted_value)}</td>
						<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.market_total_adjusted_value)}</td>
						<td style="padding: 6px; text-align: right;">${formatCurrency(vehicleValues.retail_total_adjusted_value)}</td>
					</tr>
					${accessoriesTotal > 0 ? `
					<tr>
						<td style="padding: 6px; font-weight: bold;">Accessories</td>
						<td style="padding: 6px; text-align: right;">+${formatCurrency(accessoriesTotal)}</td>
						<td style="padding: 6px; text-align: right;">+${formatCurrency(accessoriesTotal)}</td>
						<td style="padding: 6px; text-align: right;">+${formatCurrency(accessoriesTotal)}</td>
					</tr>
					<tr style="background-color: #f0fdf4; font-weight: bold;">
						<td style="padding: 6px;">Pre-Incident Value</td>
						<td style="padding: 6px; text-align: right;">${formatCurrency((vehicleValues.trade_total_adjusted_value || 0) + accessoriesTotal)}</td>
						<td style="padding: 6px; text-align: right;">${formatCurrency((vehicleValues.market_total_adjusted_value || 0) + accessoriesTotal)}</td>
						<td style="padding: 6px; text-align: right;">${formatCurrency((vehicleValues.retail_total_adjusted_value || 0) + accessoriesTotal)}</td>
					</tr>
					` : ''}
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
					<span class="info-value">${repairer?.name || 'N/A'}</span>
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
					<span class="info-value" style="font-weight: bold; font-size: 12pt; color: #e11d48;">${formatCurrency(estimate.total)}</span>
				</div>
				${excess > 0 ? `
				<div class="info-row">
					<span class="info-label" style="color: #ea580c;">Less: Excess:</span>
					<span class="info-value" style="color: #ea580c;">-${formatCurrency(excess)}</span>
				</div>
				<div class="info-row">
					<span class="info-label" style="color: #059669; font-weight: bold;">Net Payable:</span>
					<span class="info-value" style="font-weight: bold; font-size: 12pt; color: #059669;">${formatCurrency(netPayable)}</span>
				</div>
				` : ''}
				${estimate.assessment_result ? `
				<div class="info-row">
					<span class="info-label">Assessment Result:</span>
					<span class="info-value" style="font-weight: bold; color: ${
						estimate.assessment_result === 'repair' ? '#059669' :
						estimate.assessment_result === 'code_2' ? '#d97706' :
						'#dc2626'
					};">${
						estimate.assessment_result === 'repair' ? 'Repairable' :
						estimate.assessment_result === 'code_2' ? 'Code 2 (Write-off)' :
						estimate.assessment_result === 'code_3' ? 'Code 3 (Write-off)' :
						estimate.assessment_result === 'total_loss' ? 'Total Loss' :
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
		<div class="tcs-container">
			<div class="section-title">TERMS & CONDITIONS</div>
			<div style="font-size: 8pt; line-height: 1.4; color: #4b5563; border: 1px solid #e5e7eb; padding: 15px; background: #f9fafb; white-space: pre-wrap; text-align: justify;">
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
	</div>
</body>
</html>
	`.trim();
}

