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
    const vehicleMake = vehicleIdentification?.make || vehicleIdentification?.vehicle_make || 'N/A';
    const vehicleModel =
        vehicleIdentification?.model || vehicleIdentification?.vehicle_model || '';
    const vehicleYear = vehicleIdentification?.year || vehicleIdentification?.vehicle_year || 'N/A';
    const registrationNumber = vehicleIdentification?.registration_number || 'N/A';
    const vinNumber = vehicleIdentification?.vin_number || 'N/A';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
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
        
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 24px 30px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .header-brand {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .header-logo img {
            width: 80px;
            height: 80px;
            object-fit: contain;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.1);
            padding: 6px;
        }
        
        .header h1 {
            font-size: 24pt;
            margin-bottom: 5px;
        }
        
        .header p {
            font-size: 11pt;
            opacity: 0.9;
        }

        .header-meta {
            text-align: right;
        }

        .meta-label {
            font-size: 8pt;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #bfdbfe;
        }

        .meta-value {
            font-size: 12pt;
            font-weight: 600;
            color: #ffffff;
        }

        .overview-section {
            margin-bottom: 30px;
        }

        .settlement-row {
            display: flex;
            align-items: stretch;
            background: #f0fdf4;
            border: 1px solid #22c55e;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }

        .settlement-main {
            flex: 1;
            padding: 20px;
            background: rgba(34, 197, 94, 0.1);
            border-right: 1px solid #22c55e;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .settlement-label {
            font-size: 11pt;
            color: #15803d;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .settlement-value {
            font-size: 24pt;
            font-weight: bold;
            color: #15803d;
            margin-bottom: 5px;
        }

        .settlement-subtext {
            font-size: 9pt;
        }

        .settlement-metrics {
            flex: 1.5;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            padding: 20px;
            gap: 15px;
            align-items: center;
        }

        .metric-item {
            text-align: center;
        }

        .metric-label {
            font-size: 8pt;
            text-transform: uppercase;
            color: #065f46;
            letter-spacing: 0.05em;
            margin-bottom: 5px;
        }

        .metric-value {
            font-size: 12pt;
            font-weight: 600;
            color: #065f46;
        }

        .details-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }

        .detail-item {
            margin-bottom: 5px;
        }

        .detail-label {
            font-size: 8pt;
            text-transform: uppercase;
            color: #6b7280;
            letter-spacing: 0.05em;
            margin-bottom: 3px;
        }

        .detail-value {
            font-size: 10pt;
            font-weight: 600;
            color: #111827;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .page-break-before {
            page-break-before: always;
        }
        
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
        }
        
        .total-card.quoted {
            background: #eff6ff;
            border: 1px solid #3b82f6;
        }
        
        .total-card.actual {
            background: #f0fdf4;
            border: 1px solid #22c55e;
        }
        
        .total-card.variance {
            background: #fef3c7;
            border: 1px solid #f59e0b;
        }
        
        .total-card.variance.negative {
            background: #fee2e2;
            border: 1px solid #ef4444;
        }
        
        .total-label {
            font-size: 9pt;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .total-amount {
            font-size: 18pt;
            font-weight: bold;
        }
        
        .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .breakdown-table th {
            background: #f3f4f6;
            padding: 10px;
            text-align: left;
            font-size: 9pt;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #d1d5db;
        }
        
        .breakdown-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9pt;
        }
        
        .breakdown-table tr:hover {
            background: #f9fafb;
        }
        
        .breakdown-table .amount {
            text-align: right;
            font-weight: 600;
        }
        
        .line-items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 8pt;
        }
        
        .line-items-table th {
            background: #1e40af;
            color: white;
            padding: 8px 6px;
            text-align: left;
            font-size: 8pt;
            font-weight: 600;
        }
        
        .line-items-table td {
            padding: 6px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .line-items-table .amount {
            text-align: right;
        }
        
        .line-items-table .decision-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 7pt;
            font-weight: 600;
        }
        
        .decision-badge.agree {
            background: #d1fae5;
            color: #065f46;
        }
        
        .decision-badge.adjust {
            background: #fef3c7;
            color: #92400e;
        }

        .decision-badge.declined {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .subtotal-row {
            font-weight: bold;
            background: #f9fafb;
        }
        
        .total-row {
            font-weight: bold;
            font-size: 10pt;
            background: #e5e7eb;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #d1d5db;
            text-align: center;
            font-size: 8pt;
            color: #6b7280;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        .documents-section {
            margin-top: 30px;
            page-break-before: always;
        }
        
        .document-item {
            padding: 12px;
            background: #f9fafb;
            margin-bottom: 8px;
            border-radius: 4px;
            border-left: 3px solid #3b82f6;
        }
        
        .document-label {
            font-size: 10pt;
            font-weight: 600;
            color: #111827;
            margin-bottom: 3px;
        }
        
        .document-meta {
            font-size: 8pt;
            color: #6b7280;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-brand">
            ${companySettings?.logo_url
            ? `<div class="header-logo"><img src="${companySettings.logo_url}" alt="Company logo" /></div>`
            : ''
        }
            <div>
                <h1>Final Repair Costing Report</h1>
                <p>${companySettings?.company_name || 'Claimtech'}</p>
                <p>Generated: ${formatDateNumeric(new Date().toISOString())}</p>
            </div>
        </div>
        <div class="header-meta">
            <div class="meta-label">Assessment</div>
            <div class="meta-value">${assessment.assessment_number}</div>
            <div class="meta-label" style="margin-top: 8px;">Claim Reference</div>
            <div class="meta-value">${claimReference}</div>
        </div>
    </div>

    <!-- Settlement & Snapshot -->
    <div class="overview-section">
        <!-- Settlement Row -->
        <div class="settlement-row">
            <div class="settlement-main">
                <div class="settlement-label">Settlement Amount</div>
                <div class="settlement-value">${formatCurrency(settlementAmount)}</div>
                <div class="settlement-subtext" style="color: ${varianceFromBaseline >= 0 ? '#065f46' : '#b91c1c'}">
                    ${varianceFromBaseline >= 0 ? 'Increase' : 'Reduction'} vs baseline:
                    ${varianceFromBaseline >= 0 ? '+' : ''}${formatCurrency(varianceFromBaseline)}
                    (${varianceFromBaselinePercentage}%)
                </div>
            </div>
            
            <div class="settlement-metrics">
                <div class="metric-item">
                    <div class="metric-label">Baseline Estimate</div>
                    <div class="metric-value">${formatCurrency(baselineEstimateTotal)}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Approved Additionals</div>
                    <div class="metric-value">${formatCurrency(additionalsImpact)}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Quoted Total</div>
                    <div class="metric-value">${formatCurrency(combinedQuotedTotal)}</div>
                </div>
            </div>
        </div>

        <!-- Combined Snapshot & Repairer Grid -->
        <div class="details-grid">
            <!-- Row 1: Status & Dates -->
            <div class="detail-item">
                <div class="detail-label">Pipeline Stage</div>
                <div class="detail-value">${assessmentStageLabel}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">FRC Status</div>
                <div class="detail-value">${frcStatusLabel}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">FRC Started</div>
                <div class="detail-value">${startedDate}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">FRC Completed</div>
                <div class="detail-value">${completedDate}</div>
            </div>
            
            <!-- Row 2: Sign Off & Repairer -->
            <div class="detail-item">
                <div class="detail-label">Signed Off</div>
                <div class="detail-value">${signedOffDate}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Signed By</div>
                <div class="detail-value">${frc.signed_off_by_name || 'Pending'}${frc.signed_off_by_role ? ` (${frc.signed_off_by_role})` : ''}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Repairer</div>
                <div class="detail-value">${repairer?.name || 'Pending assignment'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Repairer Contact</div>
                <div class="detail-value">${repairerContact}</div>
            </div>

            <!-- Row 3: Vehicle -->
            <div class="detail-item">
                <div class="detail-label">Registration</div>
                <div class="detail-value">${registrationNumber}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">VIN</div>
                <div class="detail-value">${vinNumber}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Make & Model</div>
                <div class="detail-value">${vehicleMake} ${vehicleModel}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Year</div>
                <div class="detail-value">${vehicleYear}</div>
            </div>
        </div>
    </div>

    <!-- Quoted vs Actual Comparison -->
    <div class="page-break-before"></div>
    <div class="section">
        <div class="section-title">Quoted vs Actual Totals</div>

        <div class="totals-comparison">
            <div class="total-card quoted">
                <div class="total-label">Original Estimate (Baseline)</div>
                <div class="total-amount" style="color: #1e40af;">${formatCurrency(baselineEstimateTotal)}</div>
            </div>
            <div class="total-card actual">
                <div class="total-label">Final Settlement</div>
                <div class="total-amount" style="color: #15803d;">${formatCurrency(settlementAmount)}</div>
            </div>
            <div class="total-card variance ${varianceFromBaseline < 0 ? 'negative' : ''}">
                <div class="total-label">Change vs Baseline</div>
                <div class="total-amount" style="color: ${varianceFromBaseline < 0 ? '#dc2626' : '#f59e0b'};">
                    ${varianceFromBaseline >= 0 ? '+' : ''}${formatCurrency(varianceFromBaseline)}
                </div>
                <div style="font-size: 8pt; color: #6b7280; margin-top: 3px;">
                    ${varianceFromBaseline >= 0 ? '+' : ''}${varianceFromBaselinePercentage}%
                </div>
            </div>
        </div>

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;">
            <div style="flex: 1; min-width: 200px; background: #eef2ff; border-radius: 6px; padding: 10px;">
                <p style="font-size: 9pt; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em;">
                    Quoted Total (Incl. Additionals)
                </p>
                <p style="font-size: 14pt; font-weight: 600; color: #312e81;">
                    ${formatCurrency(combinedQuotedTotal)}
                </p>
            </div>
            <div style="flex: 1; min-width: 200px; background: #ecfdf5; border-radius: 6px; padding: 10px;">
                <p style="font-size: 9pt; color: #047857; text-transform: uppercase; letter-spacing: 0.05em;">
                    Variance vs Quoted
                </p>
                <p style="font-size: 14pt; font-weight: 600; color: ${varianceFromCombined < 0 ? '#b91c1c' : '#047857'};">
                    ${varianceFromCombined >= 0 ? '+' : ''}${formatCurrency(varianceFromCombined)}
                </p>
            </div>
        </div>

        <!-- Breakdown by Category (Baseline vs Final) -->
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
                <tr class="subtotal-row">
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
                <tr class="total-row">
                    <td>Total</td>
                    <td class="amount">${formatCurrency(baseline.total)}</td>
                    <td class="amount">${formatCurrency(finalTotals.total)}</td>
                    <td class="amount">${formatCurrency(finalTotals.total - baseline.total)}</td>
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
                    lineVariance = displayActual - displayQuoted; // negative deduction amount
                } else {
                    const actual = line.actual_total ?? 0;
                    lineVariance = actual - displayQuoted;
                }

                const varianceColor =
                    lineVariance < 0 ? '#dc2626' : lineVariance > 0 ? '#f59e0b' : '#6b7280';

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

    <!-- Deductions Section -->
    ${lineItems.some((l) => l.removed_via_additionals || l.declined_via_additionals)
            ? `
    <div class="section">
        <div class="section-title">Deductions (Removed/Declined Items)</div>
        <p style="font-size: 9pt; color: #6b7280; margin-bottom: 10px;">
            The following items were removed or declined via the additionals workflow and are excluded from the settlement total.
        </p>
        <table class="line-items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 35%;">Description</th>
                    <th style="width: 15%;">Reason</th>
                    <th style="width: 15%;" class="amount">Quoted Amount</th>
                    <th style="width: 30%;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${lineItems
                .filter((l) => l.removed_via_additionals || l.declined_via_additionals)
                .map((line, index) => {
                    const status = line.removed_via_additionals ? 'Removed via Additionals' : 'Declined via Additionals';
                    const reason = line.decline_reason || 'N/A';
                    return `
                    <tr style="text-decoration:line-through;color:#9ca3af;">
                        <td>${index + 1}</td>
                        <td>${line.description || 'N/A'}</td>
                        <td style="font-size: 8pt;">${reason}</td>
                        <td class="amount">${formatCurrency(line.quoted_total)}</td>
                        <td style="font-size: 9pt;">${status}</td>
                    </tr>
                    `;
                })
                .join('')}
            </tbody>
        </table>
    </div>
    `
            : ''
        }

    ${frc.sign_off_notes
            ? `
    <!-- Sign-Off Notes -->
    <div class="section">
        <div class="section-title">Sign-Off Notes</div>
        <p style="font-size: 9pt; padding: 10px; background: #f9fafb; border-radius: 4px;">
            ${frc.sign_off_notes}
        </p>
    </div>
    `
            : ''
        }

    ${frcDocuments.length > 0
            ? `
    <!-- Attached Documents (at the end) -->
    <div class="documents-section">
        <div class="section-title">Attached Documents</div>
        <p style="font-size: 9pt; color: #6b7280; margin-bottom: 15px;">
            ${frcDocuments.length} document(s) attached to this FRC (invoices, receipts, and supporting documentation)
        </p>
        ${frcDocuments
                .map(
                    (doc) => `
            <div class="document-item">
                <div class="document-label">${doc.label || 'Document'}</div>
                <div class="document-meta">
                    Type: ${doc.document_type.toUpperCase()} |
                    ${doc.file_size_bytes ? `Size: ${(doc.file_size_bytes / 1024).toFixed(1)} KB | ` : ''}
                    Uploaded: ${formatDateNumeric(doc.created_at)}
                </div>
            </div>
        `
                )
                .join('')}
    </div>
    `
            : ''
        }

    <!-- Terms & Conditions -->
    ${companySettings?.frc_terms_and_conditions
            ? `
    <div class="page-break-before"></div>
    <div class="section" style="margin-top: 30px; page-break-inside: avoid;">
        <div class="section-title">TERMS & CONDITIONS</div>
        <div style="font-size: 9pt; line-height: 1.5; color: #333; border: 1px solid #ddd; padding: 12px; background: #f9f9f9; white-space: pre-wrap;">
            ${escapeHtmlWithLineBreaks(companySettings.frc_terms_and_conditions)}
        </div>
    </div>
    `
            : ''
        }

    <!-- Footer -->
    <div class="footer">
        <p>This FRC report was generated by ${companySettings?.company_name || 'Claimtech'}</p>
        <p>${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}</p>
        <p>Signed off by: ${frc.signed_off_by_name || 'Pending'}${frc.signed_off_by_role ? ` (${frc.signed_off_by_role})` : ''
        } on ${signedOffDate}</p>
    </div>
</body>
</html>
    `.trim();
}
