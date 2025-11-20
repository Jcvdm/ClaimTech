import type {
  Assessment,
  CompanySettings,
  AssessmentAdditionals,
  AdditionalLineItem
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
}

export function generateAdditionalsLetterHTML(data: AdditionalsLetterData): string {
  const { assessment, additionals, companySettings, request, client, repairer } = data;

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
        <td style="padding:6px;font-size:9pt;">${item.process_type}</td>
        <td style="padding:6px;font-size:9pt;">${partTypeBadge}${item.description || ''}${notes}</td>
        <td style="padding:6px;font-size:9pt;text-align:right;">${show(item.part_price_nett)}</td>
        <td style="padding:6px;font-size:9pt;text-align:right;">${show(item.strip_assemble)}</td>
        <td style="padding:6px;font-size:9pt;text-align:right;">${show(item.labour_cost)}</td>
        <td style="padding:6px;font-size:9pt;text-align:right;">${show(item.paint_cost)}</td>
        <td style="padding:6px;font-size:9pt;text-align:right;">${show(item.outwork_charge_nett)}</td>
        <td style="padding:6px;font-size:9pt;text-align:right;">${formatCurrency(item.total)}</td>
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

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Additionals Letter - ${assessment.assessment_number}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 9pt; color:#000; }
    .header { background:#1e40af;color:#fff;padding:15px;text-align:center;margin-bottom:15px; }
    .header h1 { font-size: 18pt; margin-bottom:6px; }
    .company-info { font-size:8pt;margin-top:6px; }
    .title { background:#3b82f6;color:#fff;padding:8px;text-align:center;font-size:13pt;font-weight:bold;margin-bottom:15px; }
    .section { margin-bottom:18px; }
    .section-title { background:#dbeafe;padding:8px;font-weight:bold;font-size:11pt;border-left:4px solid #3b82f6;margin-bottom:10px; }
    .info-box { border:1px solid #d1d5db;padding:10px;background:#f9fafb;margin-bottom:10px; }
    .row { display:flex; gap:10px; }
    .col { flex:1; }
    .info-row { display:flex; padding:3px 0; }
    .label { font-weight:bold; min-width:120px; color:#374151; font-size:8pt; }
    .value { font-size:8pt; }
    table { width:100%; border-collapse:collapse; font-size:8pt; margin-bottom:12px; }
    th, td { border:1px solid #9ca3af; padding:6px 4px; }
    th { background:#1e40af;color:#fff;font-weight:bold; }
    .totals-table td { padding:8px; border:1px solid #d1d5db; }
    .totals-label { font-weight:bold; background:#f3f4f6; width:60%; }
    .totals-value { text-align:right; font-weight:bold; }
    .grand-total { background:#1e40af;color:#fff; font-size:11pt; }
    .footer { margin-top:24px; padding-top:12px; border-top:2px solid #3b82f6; text-align:center; font-size:7pt; color:#6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${companySettings?.company_name || 'Claimtech'}</h1>
    <div class="company-info">
      ${companySettings?.po_box || ''} ${companySettings?.city ? `| ${companySettings.city}` : ''} ${companySettings?.province || ''} ${companySettings?.postal_code || ''}<br>
      Tel: ${companySettings?.phone || ''}${companySettings?.fax ? ` | Fax: ${companySettings.fax}` : ''}
    </div>
  </div>

  <div class="title">ADDITIONALS LETTER</div>

  <div class="section">
    <div class="section-title">SUMMARY</div>
    <div class="row">
      <div class="col info-box">
        <div class="info-row"><span class="label">Report No.:</span><span class="value">${assessment.report_number || assessment.assessment_number}</span></div>
        <div class="info-row"><span class="label">Claim No.:</span><span class="value">${request?.claim_number || 'N/A'}</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">${formatDateNumeric(assessment.created_at)}</span></div>
      </div>
      <div class="col info-box">
        <div class="info-row"><span class="label">Assessor/Engineer:</span><span class="value">${assessment.assessor_name || 'N/A'}</span></div>
        <div class="info-row"><span class="label">Contact:</span><span class="value">${assessment.assessor_contact || 'N/A'}</span></div>
        <div class="info-row"><span class="label">Email:</span><span class="value">${assessment.assessor_email || 'N/A'}</span></div>
      </div>
    </div>
    <div class="row">
      <div class="col info-box">
        <div class="info-row"><span class="label">Insurer/Client:</span><span class="value">${client?.name || 'N/A'}</span></div>
      </div>
      ${repairer ? `<div class="col info-box"><div class="info-row"><span class="label">Repairer:</span><span class="value">${repairer.name}</span></div></div>` : ''}
    </div>
  </div>

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

  <div class="section">
    <div class="section-title">REMOVED ORIGINAL LINES</div>
    <p style="font-size:8pt;color:#6b7280;margin-bottom:8px;">Original estimate lines removed due to parts unavailability or other reasons. These items are shown here for audit trail purposes and are included in the calculation summary above as negative adjustments that reduce the payable total.</p>
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

  <div class="section">
    <div class="section-title">CALCULATION SUMMARY</div>
    <p style="font-size:8pt;color:#6b7280;margin-bottom:8px;">
      <strong>Note:</strong> Column values shown are nett amounts (before markup). The totals below include markup applied to parts and outwork at the aggregate level, then VAT is calculated on the subtotal. Approved removals and reversals are included as negative adjustments.
    </p>
    <table class="totals-table" style="width:100%;margin-bottom:12px;">
      <tr>
        <td style="width:50%;padding:8px;border:1px solid #d1d5db;background:#f3f4f6;font-weight:bold;">Approved Items Subtotal (nett + markup):</td>
        <td style="width:50%;padding:8px;border:1px solid #d1d5db;text-align:right;font-weight:bold;">${formatCurrency(subtotalApproved)}</td>
      </tr>
      <tr>
        <td style="width:50%;padding:8px;border:1px solid #d1d5db;background:#f3f4f6;font-weight:bold;">VAT (${additionals?.vat_percentage ?? 15}%):</td>
        <td style="width:50%;padding:8px;border:1px solid #d1d5db;text-align:right;font-weight:bold;">${formatCurrency(vatApproved)}</td>
      </tr>
      <tr class="grand-total">
        <td style="width:50%;padding:8px;border:1px solid #1e40af;background:#1e40af;color:#fff;font-weight:bold;font-size:11pt;">TOTAL PAYABLE (approved only):</td>
        <td style="width:50%;padding:8px;border:1px solid #1e40af;background:#1e40af;color:#fff;text-align:right;font-weight:bold;font-size:11pt;">${formatCurrency(totalApproved)}</td>
      </tr>
    </table>
    <div style="font-size:8pt;color:#6b7280;background:#f0fdf4;border:1px solid #86efac;padding:8px;border-radius:4px;">
      <strong>Notes about payable total:</strong>
      <ul style="margin:4px 0;padding-left:20px;">
        <li>Removed original lines: ${removedItems.length} item(s) – included above as negative adjustments that reduce the payable total.</li>
      </ul>
    </div>
  </div>

  ${companySettings?.additionals_terms_and_conditions ? `
  <div class="section" style="page-break-inside:avoid;">
    <div class="section-title">DISCLAIMER</div>
    <div style="font-size:9pt; line-height:1.5; color:#333; border:1px solid #ddd; padding:12px; background:#f9f9f9; white-space:pre-wrap;">
      ${escapeHtmlWithLineBreaks(companySettings.additionals_terms_and_conditions)}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>${companySettings?.company_name || 'Claimtech'} | ${companySettings?.email || ''} | ${companySettings?.website || ''}</p>
    <p>Generated on ${formatDateNumeric(new Date().toISOString())}</p>
  </div>
</body>
</html>
  `.trim();
}