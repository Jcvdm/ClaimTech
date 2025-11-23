import type {
  Assessment,
  CompanySettings,
  AssessmentAdditionals,
  AdditionalLineItem,
  VehicleIdentification
} from '$lib/types/assessment';
import { formatCurrency, formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';

interface AdditionalsLetterData {
  assessment: Assessment;
  additionals: AssessmentAdditionals;
  companySettings: CompanySettings | null;
  request: any;
  client: any;
  repairer: any;
  vehicleIdentification: VehicleIdentification | null;
  logoBase64?: string | null;
}

export function generateAdditionalsLetterHTML(data: AdditionalsLetterData): string {
  const { assessment, additionals, companySettings, request, client, repairer, vehicleIdentification, logoBase64 } = data;

  // Filter items by status and action
  // Approved table: only show true approved additions (exclude removals and reversals)
  const approvedItems: AdditionalLineItem[] = (additionals?.line_items || []).filter(
    (li) => li.status === 'approved' && li.action === 'added'
  );
  const declinedItems: AdditionalLineItem[] = (additionals?.line_items || []).filter(
    (li) => li.status === 'declined'
  );
  const removedItems: AdditionalLineItem[] = (additionals?.line_items || []).filter(
    (li) => li.action === 'removed'
  );

  const subtotalApproved = Number(additionals?.subtotal_approved || 0);
  const vatApproved = Number(additionals?.vat_amount_approved || 0);
  const totalApproved = Number(additionals?.total_approved || 0);

  // Helper to get part type badge
  const getPartTypeBadge = (item: AdditionalLineItem): string => {
    if (item.process_type !== 'N' || !item.part_type) return '';
    const colors: Record<string, string> = {
      'OEM': '#1e40af',
      'ALT': '#7c3aed',
      '2ND': '#059669'
    };
    const color = colors[item.part_type] || '#6b7280';
    return `<span style="display:inline-block;background:${color};color:#fff;padding:2px 6px;border-radius:3px;font-size:7pt;font-weight:bold;margin-right:4px;">${item.part_type}</span>`;
  };

  // Render line with part type and nett values
  const renderLine = (item: AdditionalLineItem, includeNotes = false, showRemoved = false) => {
    const show = (v?: number | null) => (v && v > 0 ? formatCurrency(v) : '-');
    const partTypeBadge = getPartTypeBadge(item);
    const notes = includeNotes && item.decline_reason ? `<div style="margin-top:4px;color:#dc2626;font-size:8pt;">Reason: ${item.decline_reason}</div>` : '';
    const strikethrough = showRemoved ? 'text-decoration:line-through;color:#9ca3af;' : '';

    return `
      <tr style="border-bottom:1px solid #e5e7eb;${strikethrough}">
        <td style="padding:10px 6px;font-size:9pt;">${item.process_type}</td>
        <td style="padding:10px 6px;font-size:9pt;">${partTypeBadge}${item.description || ''}${notes}</td>
        <td style="padding:10px 6px;font-size:9pt;text-align:right;">${show(item.part_price_nett)}</td>
        <td style="padding:10px 6px;font-size:9pt;text-align:right;">${show(item.strip_assemble)}</td>
        <td style="padding:10px 6px;font-size:9pt;text-align:right;">${show(item.labour_cost)}</td>
        <td style="padding:10px 6px;font-size:9pt;text-align:right;">${show(item.paint_cost)}</td>
        <td style="padding:10px 6px;font-size:9pt;text-align:right;">${show(item.outwork_charge_nett)}</td>
        <td style="padding:10px 6px;font-size:9pt;text-align:right;">${formatCurrency(item.total)}</td>
      </tr>
    `;
  };

  const approvedTable = approvedItems.length
    ? approvedItems.map((i) => renderLine(i)).join('')
    : `<tr><td colspan="8" style="text-align:center;padding:12px;">No approved items</td></tr>`;

  const declinedTable = declinedItems.length
    ? declinedItems.map((i) => renderLine(i, true)).join('')
    : `<tr><td colspan="8" style="text-align:center;padding:12px;">No declined items</td></tr>`;

  const removedTable = removedItems.length
    ? removedItems.map((i) => renderLine(i, false, true)).join('')
    : `<tr><td colspan="8" style="text-align:center;padding:12px;">No removed items</td></tr>`;

  // Fix property access for VehicleIdentification
  const vehicleMake = vehicleIdentification?.vehicle_make || 'N/A';
  const vehicleModel = vehicleIdentification?.vehicle_model || '';
  const vehicleYear = vehicleIdentification?.vehicle_year || 'N/A';
  const registrationNumber = vehicleIdentification?.registration_number || 'N/A';

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
  <title>Additionals Letter - ${assessment.assessment_number}</title>
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

    .totals-table td {
      padding: 12px;
      border: 1px solid #e5e7eb;
    }

    .grand-total td {
      background-color: #e11d48;
      color: #fff;
      font-weight: bold;
      font-size: 11pt;
      border-color: #e11d48;
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
        ${logoMarkup}
      </div>
      <div style="text-align: right;">
        <div style="font-weight: bold; color: #e11d48;">${assessment.assessment_number}</div>
        <div style="color: #6b7280; font-size: 9pt;">${formatDateNumeric(new Date().toISOString())}</div>
      </div>
    </div>

    <div>
      <div class="summary-title">ADDITIONALS LETTER</div>
      <div class="summary-subtitle">Supplementary Repair Authorization</div>
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
        <div class="summary-card-title">Approved Total</div>
        <div class="summary-card-value" style="color: #059669;">
          ${formatCurrency(totalApproved)}
        </div>
        <div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Incl. VAT</div>
      </div>

      <div class="summary-card">
        <div class="summary-card-title">Approved Items</div>
        <div class="summary-card-value">
          ${approvedItems.length}
        </div>
        <div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Line Items</div>
      </div>

      <div class="summary-card">
        <div class="summary-card-title">Client Reference</div>
        <div class="summary-card-value" style="font-size: 14pt;">
          ${request?.claim_number || '-'}
        </div>
        <div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Claim Number</div>
      </div>
    </div>

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
        <div><strong>Report No:</strong> ${assessment.assessment_number}</div>
        <div><strong>Date:</strong> ${formatDateNumeric(new Date().toISOString())}</div>
      </div>
    </div>

    <!-- Summary Information -->
    <div class="section">
      <div class="section-title">SUMMARY INFORMATION</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Report No.:</span>
          <span class="info-value">${assessment.report_number || assessment.assessment_number}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Assessor:</span>
          <span class="info-value">${assessment.assessor_name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Claim No.:</span>
          <span class="info-value">${request?.claim_number || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Insurer:</span>
          <span class="info-value">${client?.name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Repairer:</span>
          <span class="info-value">${repairer?.name || 'N/A'}</span>
        </div>
      </div>
    </div>

    <!-- Approved Additionals -->
    <div class="section">
      <div class="section-title">APPROVED ADDITIONALS</div>
      <table>
        <thead>
          <tr>
            <th style="width:8%">CODE</th>
            <th style="width:34%">DESCRIPTION</th>
            <th style="width:10%">PARTS</th>
            <th style="width:10%">S&A</th>
            <th style="width:10%">LABOUR</th>
            <th style="width:10%">PAINT</th>
            <th style="width:10%">OUTWORK</th>
            <th style="width:8%">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${approvedTable}
        </tbody>
      </table>
    </div>

    <!-- Declined Additionals -->
    <div class="section">
      <div class="section-title">DECLINED ADDITIONALS</div>
      <table>
        <thead>
          <tr>
            <th style="width:8%">CODE</th>
            <th style="width:34%">DESCRIPTION & NOTES</th>
            <th style="width:10%">PARTS</th>
            <th style="width:10%">S&A</th>
            <th style="width:10%">LABOUR</th>
            <th style="width:10%">PAINT</th>
            <th style="width:10%">OUTWORK</th>
            <th style="width:8%">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${declinedTable}
        </tbody>
      </table>
    </div>

    <!-- Removed Original Lines -->
    <div class="section">
      <div class="section-title">REMOVED ORIGINAL LINES</div>
      <p style="font-size:9pt;color:#6b7280;margin-bottom:15px;">
        Original estimate lines removed due to parts unavailability or other reasons. These items are excluded from the settlement total.
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:8%">CODE</th>
            <th style="width:34%">DESCRIPTION</th>
            <th style="width:10%">PARTS</th>
            <th style="width:10%">S&A</th>
            <th style="width:10%">LABOUR</th>
            <th style="width:10%">PAINT</th>
            <th style="width:10%">OUTWORK</th>
            <th style="width:8%">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${removedTable}
        </tbody>
      </table>
    </div>

    <!-- Calculation Summary -->
    <div class="section">
      <div class="section-title">CALCULATION SUMMARY</div>
      <p style="font-size:9pt;color:#6b7280;margin-bottom:15px;">
        <strong>Note:</strong> Column values shown are nett amounts (before markup). The totals below include markup applied to parts and outwork at the aggregate level, then VAT is calculated on the subtotal.
      </p>
      <table class="totals-table">
        <tr>
          <td style="width:50%; background:#f9fafb; font-weight:bold;">Approved Items Subtotal (nett + markup):</td>
          <td style="width:50%; text-align:right; font-weight:bold;">${formatCurrency(subtotalApproved)}</td>
        </tr>
        <tr>
          <td style="width:50%; background:#f9fafb; font-weight:bold;">VAT (${additionals?.vat_percentage ?? 15}%):</td>
          <td style="width:50%; text-align:right; font-weight:bold;">${formatCurrency(vatApproved)}</td>
        </tr>
        <tr class="grand-total">
          <td>TOTAL PAYABLE (approved only):</td>
          <td style="text-align:right;">${formatCurrency(totalApproved)}</td>
        </tr>
      </table>
    </div>

    ${companySettings?.additionals_terms_and_conditions ? `
    <div class="section" style="page-break-inside:avoid;">
      <div class="section-title">DISCLAIMER</div>
      <div style="font-size:9pt; line-height:1.5; color:#4b5563; border:1px solid #e5e7eb; padding:15px; background:#f9fafb; white-space:pre-wrap; text-align: justify;">
        ${escapeHtmlWithLineBreaks(companySettings.additionals_terms_and_conditions)}
      </div>
    </div>
    ` : ''}

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
