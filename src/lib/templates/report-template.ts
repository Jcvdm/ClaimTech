import type {
	Assessment,
	VehicleIdentification,
	Exterior360,
	InteriorMechanical,
	DamageRecord,
	CompanySettings
} from '$lib/types/assessment';

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
		client
	} = data;

	const formatDate = (date: string | null | undefined) => {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
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
				<span class="info-value">${formatDate(assessment.created_at)}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Assessor:</span>
				<span class="info-value">${assessment.assessor_name || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Contact:</span>
				<span class="info-value">${assessment.assessor_contact || 'N/A'}</span>
			</div>
		</div>
	</div>

	<!-- Claim Information -->
	<div class="section">
		<div class="section-title">CLAIM INFORMATION</div>
		<div class="info-grid">
			<div class="info-row">
				<span class="info-label">Claim Number:</span>
				<span class="info-value">${request?.claim_number || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Request Number:</span>
				<span class="info-value">${request?.request_number || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Date of Loss:</span>
				<span class="info-value">${formatDate(request?.date_of_loss)}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Instructed By:</span>
				<span class="info-value">${client?.name || 'N/A'}</span>
			</div>
		</div>
	</div>

	<!-- Vehicle Information -->
	<div class="section">
		<div class="section-title">VEHICLE INFORMATION</div>
		<div class="info-grid">
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
				<span class="info-label">Registration:</span>
				<span class="info-value">${vehicleIdentification?.registration_number || request?.vehicle_registration || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">VIN:</span>
				<span class="info-value">${vehicleIdentification?.vin_number || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Engine Number:</span>
				<span class="info-value">${vehicleIdentification?.engine_number || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Color:</span>
				<span class="info-value">${vehicleIdentification?.color || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Odometer:</span>
				<span class="info-value">${vehicleIdentification?.odometer_reading ? `${vehicleIdentification.odometer_reading.toLocaleString()} km` : 'N/A'}</span>
			</div>
		</div>
	</div>

	<!-- Page Break -->
	<div class="page-break"></div>

	<!-- Vehicle Condition -->
	<div class="section">
		<div class="section-title">VEHICLE CONDITION</div>
		<div class="info-grid">
			<div class="info-row">
				<span class="info-label">Overall Condition:</span>
				<span class="info-value">${exterior360?.overall_condition || 'N/A'}</span>
			</div>
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
			<div class="info-row">
				<span class="info-label">Transmission:</span>
				<span class="info-value">${interiorMechanical?.transmission_type || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Vehicle Power:</span>
				<span class="info-value">${interiorMechanical?.vehicle_power_status || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Engine Condition:</span>
				<span class="info-value">${interiorMechanical?.engine_condition || 'N/A'}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Electronics:</span>
				<span class="info-value">${interiorMechanical?.electronics_condition || 'N/A'}</span>
			</div>
		</div>
	</div>

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

	<!-- Assessment Notes -->
	${assessment.notes ? `
	<div class="section">
		<div class="section-title">ASSESSMENT NOTES</div>
		<div class="notes-box">${assessment.notes}</div>
	</div>
	` : ''}

	<!-- Footer -->
	<div class="footer">
		<p>This report was generated by ${companySettings?.company_name || 'Claimtech'}</p>
		<p>${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}</p>
		<p>Report generated on ${formatDate(new Date().toISOString())}</p>
	</div>
</body>
</html>
	`.trim();
}

