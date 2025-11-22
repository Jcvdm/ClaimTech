import type {
	Assessment,
	FinalRepairCosting,
	VehicleIdentification,
	Estimate,
	AssessmentAdditionals,
	FRCDocument,
	CompanySettings
} from '$lib/types/assessment';
import { formatCurrency, formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';

interface FRCReportData {
	assessment: Assessment;
	frc: FinalRepairCosting;
	vehicleIdentification: VehicleIdentification | null;
	estimate: Estimate | null;
	additionals: AssessmentAdditionals | null;
	repairer: any;
	companySettings: CompanySettings | null;
	frcDocuments: FRCDocument[];
}

export function generateFRCReportHTML(data: FRCReportData): string {
	const {
		assessment,
		frc,
		vehicleIdentification,
		estimate,
		additionals,
		repairer,
		companySettings,
		frcDocuments
	} = data;

	const lineItems = frc.line_items ?? [];

	// Build grouped line items for reporting (avoid duplicate rows for removals)
	const groupedLineItems = (() => {
		const items = lineItems;
		const result: {
			line: any;
			isRemovedGroup: boolean;
			removal?: any;
		}[] = [];

		// Map of original estimate source_line_id -> removal additional line
		const removalMap = new Map<string, any>();
		for (const l of items as any[]) {
			if (l.is_removal_additional && l.removal_for_source_line_id) {
				removalMap.set(l.removal_for_source_line_id, l);
			}
		}

		for (const line of items as any[]) {
			// Skip raw removal additional rows; they are represented via their originals
			if (line.is_removal_additional) continue;

			if (line.source === 'estimate' && line.removed_via_additionals) {
				const removal = removalMap.get(line.source_line_id);
				result.push({ line, isRemovedGroup: true, removal });
			} else {
				result.push({ line, isRemovedGroup: false });
			}
		}

		return result;
	})();

	// Calculate settlement and comparison totals
	const settlementAmount = frc.actual_total ?? 0;

	// Baseline: original estimate only (no additionals)
	const baselineEstimateSubtotal = frc.quoted_estimate_subtotal ?? 0;
	const baselineEstimateVat = (baselineEstimateSubtotal * frc.vat_percentage) / 100;
	const baselineEstimateTotal = baselineEstimateSubtotal + baselineEstimateVat;

	// Combined quoted total (estimate + additionals)
	const combinedQuotedTotal = frc.quoted_total ?? 0;

	// Variance vs baseline (what insurers care about most)
	const varianceFromBaseline = settlementAmount - baselineEstimateTotal;
	const varianceFromBaselinePercentage =
		baselineEstimateTotal > 0
			? ((varianceFromBaseline / baselineEstimateTotal) * 100).toFixed(2)
			: '0.00';

	// Baseline (estimate-only) breakdown for category table
	const baseline = {
		parts_nett: frc.quoted_estimate_parts_nett ?? 0,
		labour: frc.quoted_estimate_labour ?? 0,
		paint: frc.quoted_estimate_paint ?? 0,
		outwork_nett: frc.quoted_estimate_outwork_nett ?? 0,
		markup: frc.quoted_estimate_markup ?? 0,
		subtotal: baselineEstimateSubtotal,
		vat: baselineEstimateVat,
		total: baselineEstimateTotal
	};

	// Final (New/Settlement) breakdown aligned with FRC tab newTotals()
	const finalTotals = {
		parts_nett: (frc.actual_estimate_parts_nett ?? 0) + (frc.actual_additionals_parts_nett ?? 0),
		labour: (frc.actual_estimate_labour ?? 0) + (frc.actual_additionals_labour ?? 0),
		paint: (frc.actual_estimate_paint ?? 0) + (frc.actual_additionals_paint ?? 0),
		outwork_nett:
			(frc.actual_estimate_outwork_nett ?? 0) + (frc.actual_additionals_outwork_nett ?? 0),
		markup: (frc.actual_estimate_markup ?? 0) + (frc.actual_additionals_markup ?? 0),
		subtotal: frc.actual_subtotal ?? 0,
		vat: frc.actual_vat_amount ?? 0,
		total: settlementAmount
	};

	const additionalsImpact = Math.max(combinedQuotedTotal - baselineEstimateTotal, 0);
	const varianceFromCombined = settlementAmount - combinedQuotedTotal;

	const formatStage = (stage?: string | null) => {
		if (!stage) return 'N/A';
		return stage
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	};

	const assessmentStageLabel = formatStage(assessment.stage);
	const frcStatusLabel = formatStage(frc.status);
	const claimReference =
		assessment.report_number || assessment.request_id || assessment.assessment_number;
	const signedOffDate = frc.signed_off_at ? formatDateNumeric(frc.signed_off_at) : 'Pending';
	const startedDate = frc.started_at ? formatDateNumeric(frc.started_at) : 'N/A';
	const completedDate = frc.completed_at
		? formatDateNumeric(frc.completed_at)
		: frc.signed_off_at
			? signedOffDate
			: 'In progress';
	const repairerContact = [repairer?.email, repairer?.phone].filter(Boolean).join(' | ') || 'N/A';
	
	// Fix property access for VehicleIdentification
	const vehicleMake = vehicleIdentification?.vehicle_make || 'N/A';
	const vehicleModel = vehicleIdentification?.vehicle_model || '';
	const vehicleYear = vehicleIdentification?.vehicle_year || 'N/A';
	const registrationNumber = vehicleIdentification?.registration_number || 'N/A';
	const vinNumber = vehicleIdentification?.vin_number || 'N/A';

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>FRC Report - ${assessment.assessment_number}</title>
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

		/* Table Styles */
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			font-size: 9pt;
		}

		th, td {
			border-bottom: 1px solid #e5e7eb;
			padding: 10px 6px;
			text-align: left;
			vertical-align: top;
		}

		th {
			background-color: #f9fafb;
			font-weight: 600;
			color: #374151;
			text-transform: uppercase;
			font-size: 8pt;
			letter-spacing: 0.5px;
		}

		tbody tr:nth-child(even) {
			background-color: #f9fafb;
		}

		.amount {
			text-align: right;
			font-family: 'Segoe UI Mono', monospace;
		}

		.decision-badge {
			display: inline-block;
			padding: 2px 8px;
			border-radius: 12px;
			font-size: 7pt;
			font-weight: 600;
		}
		
		.decision-badge.agree { background: #d1fae5; color: #065f46; }
		.decision-badge.adjust { background: #fef3c7; color: #92400e; }
		.decision-badge.declined { background: #fee2e2; color: #991b1b; }

		.totals-comparison {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;
			gap: 15px;
			margin: 20px 0;
		}
		
		.total-card {
			padding: 15px;
			border-radius: 6px;
			text-align: center;
			border: 1px solid #e5e7eb;
		}
		
		.total-card.quoted { background: #eff6ff; border-color: #bfdbfe; }
		.total-card.actual { background: #f0fdf4; border-color: #86efac; }
		.total-card.variance { background: #fffbeb; border-color: #fde68a; }
		.total-card.variance.negative { background: #fef2f2; border-color: #fecaca; }
		
		.total-label {
			font-size: 9pt;
			color: #6b7280;
			margin-bottom: 5px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		
		.total-amount {
			font-size: 16pt;
			font-weight: bold;
			color: #111827;
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
	</style>
</head>
<body>
	<!-- Summary Page -->
	<div class="summary-page">
		<div class="summary-header">
			<div class="logo-placeholder">
				${companySettings?.company_name || 'CLAIMTECH'}
			</div>
			<div style="text-align: right;">
				<div style="font-weight: bold; color: #e11d48;">${assessment.assessment_number}</div>
				<div style="color: #6b7280; font-size: 9pt;">${formatDateNumeric(new Date().toISOString())}</div>
			</div>
		</div>

		<div>
			<div class="summary-title">FINAL REPAIR COSTING</div>
			<div class="summary-subtitle">Settlement & Variance Report</div>
		</div>

		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-card-title">Vehicle Details</div>
				<div class="summary-card-value" style="font-size: 14pt;">
					${vehicleYear} ${vehicleMake}<br>
					${vehicleModel}
				</div>
				<div style="margin-top: 10px; color: #6b7280; font-size: 10pt;">
					Reg: ${registrationNumber}
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-card-title">Settlement Amount</div>
				<div class="summary-card-value" style="color: #059669;">
					${formatCurrency(settlementAmount)}
				</div>
				<div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Incl. VAT</div>
			</div>

			<div class="summary-card">
				<div class="summary-card-title">Variance vs Baseline</div>
				<div class="summary-card-value" style="color: ${varianceFromBaseline >= 0 ? '#d97706' : '#059669'};">
					${varianceFromBaseline >= 0 ? '+' : ''}${formatCurrency(varianceFromBaseline)}
				</div>
				<div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">
					${varianceFromBaselinePercentage}% Change
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-card-title">Client Reference</div>
				<div class="summary-card-value" style="font-size: 14pt;">
					${claimReference}
				</div>
				<div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Claim Number</div>
			</div>
		</div>

		<div class="summary-footer">
			${companySettings?.company_name || 'Claimtech'} | ${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}
		</div>
	</div>

	<div class="page-break"></div>

	<!-- Standard Page -->
	<div class="standard-page">
		
		<!-- Standard Header -->
		<div class="standard-header">
			<div class="standard-header-company">
				${companySettings?.company_name || 'Claimtech'}
			</div>
			<div class="standard-header-details">
				<div><strong>Report No:</strong> ${assessment.assessment_number}</div>
				<div><strong>Date:</strong> ${formatDateNumeric(new Date().toISOString())}</div>
			</div>
		</div>

		<!-- Overview Section -->
		<div class="section">
			<div class="section-title">ASSESSMENT OVERVIEW</div>
			<div class="info-grid">
				<div class="info-row">
					<span class="info-label">Pipeline Stage:</span>
					<span class="info-value">${assessmentStageLabel}</span>
				</div>
				<div class="info-row">
					<span class="info-label">FRC Status:</span>
					<span class="info-value">${frcStatusLabel}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Repairer:</span>
					<span class="info-value">${repairer?.name || 'Pending assignment'}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Signed Off:</span>
					<span class="info-value">${signedOffDate}</span>
				</div>
			</div>
		</div>

		<!-- Quoted vs Actual Comparison -->
		<div class="section">
			<div class="section-title">QUOTED VS ACTUAL TOTALS</div>
			
			<div class="totals-comparison">
				<div class="total-card quoted">
					<div class="total-label">Original Estimate</div>
					<div class="total-amount" style="color: #1e40af;">${formatCurrency(baselineEstimateTotal)}</div>
				</div>
				<div class="total-card actual">
					<div class="total-label">Final Settlement</div>
					<div class="total-amount" style="color: #059669;">${formatCurrency(settlementAmount)}</div>
				</div>
				<div class="total-card variance ${varianceFromBaseline < 0 ? 'negative' : ''}">
					<div class="total-label">Variance</div>
					<div class="total-amount" style="color: ${varianceFromBaseline < 0 ? '#dc2626' : '#d97706'};">
						${varianceFromBaseline >= 0 ? '+' : ''}${formatCurrency(varianceFromBaseline)}
					</div>
				</div>
			</div>

			<table class="breakdown-table">
				<thead>
					<tr>
						<th>Category</th>
						<th class="amount">Quoted (Baseline)</th>
						<th class="amount">Actual (Final)</th>
						<th class="amount">Variance</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Parts (Nett)</td>
						<td class="amount">${formatCurrency(baseline.parts_nett)}</td>
						<td class="amount">${formatCurrency(finalTotals.parts_nett)}</td>
						<td class="amount">${formatCurrency(finalTotals.parts_nett - baseline.parts_nett)}</td>
					</tr>
					<tr>
						<td>Labour</td>
						<td class="amount">${formatCurrency(baseline.labour)}</td>
						<td class="amount">${formatCurrency(finalTotals.labour)}</td>
						<td class="amount">${formatCurrency(finalTotals.labour - baseline.labour)}</td>
					</tr>
					<tr>
						<td>Paint</td>
						<td class="amount">${formatCurrency(baseline.paint)}</td>
						<td class="amount">${formatCurrency(finalTotals.paint)}</td>
						<td class="amount">${formatCurrency(finalTotals.paint - baseline.paint)}</td>
					</tr>
					<tr>
						<td>Outwork (Nett)</td>
						<td class="amount">${formatCurrency(baseline.outwork_nett)}</td>
						<td class="amount">${formatCurrency(finalTotals.outwork_nett)}</td>
						<td class="amount">${formatCurrency(finalTotals.outwork_nett - baseline.outwork_nett)}</td>
					</tr>
					<tr>
						<td>Markup</td>
						<td class="amount">${formatCurrency(baseline.markup)}</td>
						<td class="amount">${formatCurrency(finalTotals.markup)}</td>
						<td class="amount">${formatCurrency(finalTotals.markup - baseline.markup)}</td>
					</tr>
					<tr style="font-weight: bold; background-color: #e5e7eb;">
						<td>Subtotal</td>
						<td class="amount">${formatCurrency(baseline.subtotal)}</td>
						<td class="amount">${formatCurrency(finalTotals.subtotal)}</td>
						<td class="amount">${formatCurrency(finalTotals.subtotal - baseline.subtotal)}</td>
					</tr>
					<tr>
						<td>VAT (${frc.vat_percentage ?? 0}%)</td>
						<td class="amount">${formatCurrency(baseline.vat)}</td>
						<td class="amount">${formatCurrency(finalTotals.vat)}</td>
						<td class="amount">${formatCurrency(finalTotals.vat - baseline.vat)}</td>
					</tr>
					<tr style="font-weight: bold; font-size: 11pt; border-top: 2px solid #111827;">
						<td>Total</td>
						<td class="amount">${formatCurrency(baseline.total)}</td>
						<td class="amount" style="color: #e11d48;">${formatCurrency(finalTotals.total)}</td>
						<td class="amount">${formatCurrency(finalTotals.total - baseline.total)}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Line Items Detail -->
		<div class="section">
			<div class="section-title">LINE ITEM DETAILS</div>
			<table>
				<thead>
					<tr>
						<th style="width: 4%;">#</th>
						<th style="width: 28%;">Description</th>
						<th style="width: 8%;">Type</th>
						<th style="width: 10%;">Decision</th>
						<th style="width: 12%;" class="amount">Quoted</th>
						<th style="width: 12%;" class="amount">Actual</th>
						<th style="width: 12%;" class="amount">Variance</th>
						<th style="width: 14%;">Notes</th>
					</tr>
				</thead>
				<tbody>
					${groupedLineItems
				.map((row, index) => {
					const line = row.line;

					// For removed groups, compute a net actual of 0 and a variance equal to the deduction
					let displayQuoted = line.quoted_total ?? 0;
					let displayActual: number | null = line.actual_total;
					let lineVariance: number;

					if (row.isRemovedGroup && row.removal) {
						const removalTotal = row.removal.quoted_total ?? 0;
						displayActual = displayQuoted + removalTotal; // typically nets to 0
						lineVariance = (displayActual ?? 0) - displayQuoted; // negative deduction amount
					} else {
						const actual = line.actual_total ?? 0;
						lineVariance = actual - displayQuoted;
					}

					const varianceColor =
						lineVariance < 0 ? '#dc2626' : lineVariance > 0 ? '#d97706' : '#6b7280';

					const decisionLabel = row.isRemovedGroup
						? 'AGREED (REMOVED)'
						: (line.decision || 'PENDING').toString().toUpperCase();

					const notesParts: string[] = [];
					if (line.adjust_reason) notesParts.push(line.adjust_reason);
					if (line.decline_reason && !row.isRemovedGroup) notesParts.push(line.decline_reason);
					if (row.isRemovedGroup && row.removal) {
						notesParts.push(
							`Removed via Additionals (deduction ${formatCurrency(row.removal.quoted_total ?? 0)})`
						);
					}

					return `
						<tr>
							<td>${index + 1}</td>
							<td>${line.description || 'N/A'}</td>
							<td style="text-align:center;">${line.process_type === 'N' && line.part_type ? `<span style="display:inline-block;background:#1e40af;color:#fff;padding:2px 4px;border-radius:2px;font-size:7pt;font-weight:bold;">${line.part_type}</span>` : '-'}</td>
							<td>
								<span class="decision-badge ${row.isRemovedGroup ? 'agree' : line.decision}">${decisionLabel}</span>
							</td>
							<td class="amount">${formatCurrency(displayQuoted)}</td>
							<td class="amount">${displayActual !== null && displayActual !== undefined ? formatCurrency(displayActual) : '-'}</td>
							<td class="amount" style="color: ${varianceColor};">
								${lineVariance >= 0 ? '+' : ''}${formatCurrency(lineVariance)}
							</td>
							<td style="font-size: 7pt;">${notesParts.length > 0 ? notesParts.join(' | ') : '-'
						}</td>
						</tr>
						`;
				})
				.join('')}
				</tbody>
			</table>
		</div>

		<!-- Footer -->
		<div class="footer">
			<p>This report was generated by ${companySettings?.company_name || 'Claimtech'}</p>
			<p>${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}</p>
			<p>Generated on ${formatDateNumeric(new Date().toISOString())}</p>
		</div>
	</div>
</body>
</html>
	`.trim();
}
