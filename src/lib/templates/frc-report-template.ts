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

    // Calculate settlement amount (actual total to be paid)
    const settlementAmount = frc.actual_total;
    const quotedAmount = frc.quoted_total;
    const variance = settlementAmount - quotedAmount;
    const variancePercentage =
        quotedAmount > 0 ? ((variance / quotedAmount) * 100).toFixed(2) : '0.00';

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
            padding: 30px;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 24pt;
            margin-bottom: 5px;
        }
        
        .header p {
            font-size: 11pt;
            opacity: 0.9;
        }
        
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 14pt;
            font-weight: bold;
            color: #1e40af;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        
        .settlement-box {
            background: #f0fdf4;
            border: 2px solid #22c55e;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .settlement-box h2 {
            color: #15803d;
            font-size: 16pt;
            margin-bottom: 15px;
        }
        
        .settlement-amount {
            font-size: 28pt;
            font-weight: bold;
            color: #15803d;
            margin: 10px 0;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            padding: 10px;
            background: #f9fafb;
            border-radius: 4px;
        }
        
        .info-label {
            font-size: 9pt;
            color: #6b7280;
            margin-bottom: 3px;
        }
        
        .info-value {
            font-size: 11pt;
            font-weight: 600;
            color: #111827;
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
        <h1>Final Repair Costing Report</h1>
        <p>Assessment: ${assessment.assessment_number}</p>
        <p>Generated: ${formatDateNumeric(new Date().toISOString())}</p>
    </div>

    <!-- Settlement Summary -->
    <div class="settlement-box">
        <h2>Settlement Amount</h2>
        <p style="font-size: 11pt; color: #374151; margin-bottom: 10px;">
            Total amount to be paid to repairer
        </p>
        <div class="settlement-amount">${formatCurrency(settlementAmount)}</div>
        
        ${repairer
            ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #86efac;">
            <p style="font-size: 10pt; color: #374151; margin-bottom: 5px;"><strong>Repairer Details:</strong></p>
            <p style="font-size: 10pt; color: #374151;">${repairer.name}</p>
            ${repairer.email ? `<p style="font-size: 9pt; color: #6b7280;">${repairer.email}</p>` : ''}
            ${repairer.phone ? `<p style="font-size: 9pt; color: #6b7280;">${repairer.phone}</p>` : ''}
        </div>
        `
            : ''
        }
    </div>

    <!-- Vehicle Information -->
    <div class="section">
        <div class="section-title">Vehicle Information</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Registration</div>
                <div class="info-value">${vehicleIdentification?.registration_number || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">VIN</div>
                <div class="info-value">${vehicleIdentification?.vin_number || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Make & Model</div>
                <div class="info-value">${vehicleIdentification?.make || 'N/A'} ${vehicleIdentification?.model || ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Year</div>
                <div class="info-value">${vehicleIdentification?.year || 'N/A'}</div>
            </div>
        </div>
    </div>

    <!-- Page Break -->
    <div class="page-break"></div>

    <!-- Quoted vs Actual Comparison -->
    <div class="section">
        <div class="section-title">Quoted vs Actual Totals</div>

        <div class="totals-comparison">
            <div class="total-card quoted">
                <div class="total-label">Quoted Total</div>
                <div class="total-amount" style="color: #1e40af;">${formatCurrency(quotedAmount)}</div>
            </div>
            <div class="total-card actual">
                <div class="total-label">Actual Total</div>
                <div class="total-amount" style="color: #15803d;">${formatCurrency(settlementAmount)}</div>
            </div>
            <div class="total-card variance ${variance < 0 ? 'negative' : ''}">
                <div class="total-label">Variance</div>
                <div class="total-amount" style="color: ${variance < 0 ? '#dc2626' : '#f59e0b'};">
                    ${variance >= 0 ? '+' : ''}${formatCurrency(variance)}
                </div>
                <div style="font-size: 8pt; color: #6b7280; margin-top: 3px;">
                    ${variance >= 0 ? '+' : ''}${variancePercentage}%
                </div>
            </div>
        </div>

        <!-- Breakdown by Category -->
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th class="amount">Quoted</th>
                    <th class="amount">Actual</th>
                    <th class="amount">Variance</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Parts</td>
                    <td class="amount">${formatCurrency(frc.quoted_parts_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_parts_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_parts_total - frc.quoted_parts_total)}</td>
                </tr>
                <tr>
                    <td>Labour</td>
                    <td class="amount">${formatCurrency(frc.quoted_labour_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_labour_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_labour_total - frc.quoted_labour_total)}</td>
                </tr>
                <tr>
                    <td>Paint</td>
                    <td class="amount">${formatCurrency(frc.quoted_paint_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_paint_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_paint_total - frc.quoted_paint_total)}</td>
                </tr>
                <tr>
                    <td>Outwork</td>
                    <td class="amount">${formatCurrency(frc.quoted_outwork_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_outwork_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_outwork_total - frc.quoted_outwork_total)}</td>
                </tr>
                <tr class="subtotal-row">
                    <td>Subtotal</td>
                    <td class="amount">${formatCurrency(frc.quoted_subtotal)}</td>
                    <td class="amount">${formatCurrency(frc.actual_subtotal)}</td>
                    <td class="amount">${formatCurrency(frc.actual_subtotal - frc.quoted_subtotal)}</td>
                </tr>
                <tr>
                    <td>VAT (15%)</td>
                    <td class="amount">${formatCurrency(frc.quoted_vat_amount)}</td>
                    <td class="amount">${formatCurrency(frc.actual_vat_amount)}</td>
                    <td class="amount">${formatCurrency(frc.actual_vat_amount - frc.quoted_vat_amount)}</td>
                </tr>
                <tr class="total-row">
                    <td>Total</td>
                    <td class="amount">${formatCurrency(frc.quoted_total)}</td>
                    <td class="amount">${formatCurrency(frc.actual_total)}</td>
                    <td class="amount">${formatCurrency(variance)}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Page Break -->
    <div class="page-break"></div>

    <!-- Line Items Breakdown -->
    <div class="section">
        <div class="section-title">Line Items Breakdown</div>

        <table class="line-items-table">
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
                ${frc.line_items
            .map((line, index) => {
                const lineVariance = line.actual_total - line.quoted_total;
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${line.description || 'N/A'}</td>
                        <td style="text-align:center;">${line.process_type === 'N' && line.part_type ? `<span style="display:inline-block;background:#1e40af;color:#fff;padding:2px 4px;border-radius:2px;font-size:7pt;font-weight:bold;">${line.part_type}</span>` : '-'}</td>
                        <td>
                            <span class="decision-badge ${line.decision}">${line.decision.toUpperCase()}</span>
                        </td>
                        <td class="amount">${formatCurrency(line.quoted_total)}</td>
                        <td class="amount">${line.actual_total !== null ? formatCurrency(line.actual_total) : '-'}</td>
                        <td class="amount" style="color: ${lineVariance < 0 ? '#dc2626' : lineVariance > 0 ? '#f59e0b' : '#6b7280'};">
                            ${lineVariance >= 0 ? '+' : ''}${formatCurrency(lineVariance)}
                        </td>
                        <td style="font-size: 7pt;">${line.adjust_reason || line.decline_reason || '-'}</td>
                    </tr>
                    `;
            })
            .join('')}
            </tbody>
        </table>
    </div>

    <!-- Deductions Section -->
    ${frc.line_items.some(l => l.removed_via_additionals || l.declined_via_additionals)
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
                ${frc.line_items
                .filter(l => l.removed_via_additionals || l.declined_via_additionals)
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
                    Type: ${doc.document_type.toUpperCase()} •
                    ${doc.file_size_bytes ? `Size: ${(doc.file_size_bytes / 1024).toFixed(1)} KB • ` : ''}
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
        <p>Signed off by: ${frc.signed_off_by_name} (${frc.signed_off_by_role}) on ${formatDateNumeric(frc.signed_off_at!)}</p>
    </div>
</body>
</html>
    `.trim();
}

