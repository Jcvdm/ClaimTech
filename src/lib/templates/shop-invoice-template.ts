import { formatCurrency, formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';

export interface ShopInvoiceData {
	invoice: {
		invoice_number: string;
		status: string;
		line_items: Array<{
			id: string;
			type: string;
			description: string;
			quantity: number;
			unit_price: number;
			total: number;
		}>;
		subtotal: number;
		discount_amount: number;
		vat_rate: number;
		vat_amount: number;
		total: number;
		amount_paid: number;
		amount_due: number;
		issue_date: string;
		due_date: string;
		notes: string | null;
		pdf_url: string | null;
	};
	job: {
		job_number: string;
		job_type: string;
		customer_name: string;
		customer_phone: string | null;
		customer_email: string | null;
		vehicle_make: string;
		vehicle_model: string;
		vehicle_year: number | null;
		vehicle_reg: string | null;
		vehicle_color: string | null;
	};
	companyName: string;
	companyPhone: string | null;
	companyEmail: string | null;
	companyAddress: string | null;
	logoBase64: string | null;
	bankName: string | null;
	bankAccountNumber: string | null;
	bankBranchCode: string | null;
	bankAccountHolder: string | null;
}

// Simple HTML escape for single-line text values
function escapeHtml(str: string | null | undefined): string {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function generateShopInvoiceHTML(data: ShopInvoiceData): string {
	const {
		invoice,
		job,
		companyName,
		companyPhone,
		companyEmail,
		companyAddress,
		logoBase64,
		bankName,
		bankAccountNumber,
		bankBranchCode,
		bankAccountHolder
	} = data;

	// Parse line_items — may be double-serialized JSONB string or already an array
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const rawItems: any[] = Array.isArray(invoice.line_items)
		? invoice.line_items
		: typeof invoice.line_items === 'string'
			? JSON.parse(invoice.line_items as string)
			: [];

	const lineItems = rawItems.map((item) => ({
		id: item.id ?? '',
		type: item.type ?? '',
		description: item.description ?? '',
		quantity: Number(item.quantity) || 1,
		unit_price: Number(item.unit_price) || 0,
		total: Number(item.total) || 0
	}));

	// Totals from database
	const subtotal = Number(invoice.subtotal) || 0;
	const discountAmount = Number(invoice.discount_amount) || 0;
	const vatRate = Number(invoice.vat_rate) || 15;
	const vatAmount = Number(invoice.vat_amount) || 0;
	const grandTotal = Number(invoice.total) || 0;
	const amountPaid = Number(invoice.amount_paid) || 0;
	const amountDue = Number(invoice.amount_due) || 0;

	const isPaid = invoice.status === 'paid';

	// Render a single line item row
	const renderRow = (item: (typeof lineItems)[number], index: number) => {
		return `
			<tr style="border-bottom: 1px solid #e5e7eb;">
				<td style="padding: 8px 6px; font-size: 9pt; text-align: center;">${index + 1}</td>
				<td style="padding: 8px 6px; font-size: 9pt;">${escapeHtml(item.description)}</td>
				<td style="padding: 8px 6px; font-size: 9pt; text-align: center;">${item.quantity}</td>
				<td style="padding: 8px 6px; font-size: 9pt; text-align: right;">${formatCurrency(item.unit_price)}</td>
				<td style="padding: 8px 6px; font-size: 9pt; text-align: right;">${formatCurrency(item.total)}</td>
			</tr>`;
	};

	const tableRows =
		lineItems.length > 0
			? lineItems.map(renderRow).join('')
			: `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">No line items</td></tr>`;

	// Job type display
	const jobTypeLabel =
		job.job_type === 'autobody'
			? 'Autobody'
			: job.job_type === 'mechanical'
				? 'Mechanical'
				: escapeHtml(job.job_type);

	// Logo markup
	const logoMarkup = logoBase64
		? `<img src="${logoBase64}" alt="${escapeHtml(companyName)} logo" style="max-height: 70px; width: auto; object-fit: contain;" />`
		: `<span style="font-size: 24pt; font-weight: bold; color: #e11d48;">${escapeHtml(companyName)}</span>`;

	// Company footer line
	const companyFooterLine = [companyName, companyPhone, companyEmail, companyAddress]
		.filter(Boolean)
		.map(escapeHtml)
		.join(' | ');

	// Notes section
	const notesSection =
		invoice.notes
			? `
		<div style="margin-top: 30px;">
			<div style="font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; font-size: 9pt; letter-spacing: 0.5px;">PAYMENT TERMS &amp; NOTES</div>
			<div style="border: 1px solid #e5e7eb; padding: 15px 20px; background-color: #f9fafb; min-height: 40px; white-space: pre-wrap; border-radius: 6px; color: #374151; font-size: 9pt;">
				${escapeHtmlWithLineBreaks(invoice.notes)}
			</div>
		</div>`
			: '';

	// Banking details section
	const hasBankDetails = bankName || bankAccountNumber || bankBranchCode || bankAccountHolder;
	const bankingSection = hasBankDetails
		? `
		<div style="margin-top: 30px; padding: 20px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px;">
			<div style="font-weight: bold; text-transform: uppercase; color: #15803d; margin-bottom: 12px; font-size: 10pt; letter-spacing: 0.5px;">BANKING DETAILS</div>
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
				${bankAccountHolder ? `<div><span style="color:#6b7280;font-size:9pt;">Account Holder:</span><br><span style="font-weight:600;font-size:9pt;">${escapeHtml(bankAccountHolder)}</span></div>` : ''}
				${bankName ? `<div><span style="color:#6b7280;font-size:9pt;">Bank:</span><br><span style="font-weight:600;font-size:9pt;">${escapeHtml(bankName)}</span></div>` : ''}
				${bankAccountNumber ? `<div><span style="color:#6b7280;font-size:9pt;">Account Number:</span><br><span style="font-weight:600;font-size:9pt;">${escapeHtml(bankAccountNumber)}</span></div>` : ''}
				${bankBranchCode ? `<div><span style="color:#6b7280;font-size:9pt;">Branch Code:</span><br><span style="font-weight:600;font-size:9pt;">${escapeHtml(bankBranchCode)}</span></div>` : ''}
			</div>
		</div>`
		: '';

	// PAID stamp overlay (if invoice is paid)
	const paidStamp = isPaid
		? `
		<div style="position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-20deg); pointer-events: none; z-index: 999; opacity: 0.18; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
			<div style="border: 12px solid #16a34a; border-radius: 8px; padding: 10px 30px; color: #16a34a; font-size: 80pt; font-weight: 900; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; letter-spacing: 4px; white-space: nowrap;">PAID</div>
		</div>`
		: '';

	const issueDate = formatDateNumeric(invoice.issue_date);
	const dueDate = formatDateNumeric(invoice.due_date);

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Tax Invoice - ${escapeHtml(invoice.invoice_number)}</title>
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

		.standard-page {
			padding: 40px;
			position: relative;
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

		.info-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 30px;
			padding: 20px;
			background: #f9fafb;
			border: 1px solid #e5e7eb;
			border-radius: 6px;
		}

		.info-row {
			display: flex;
			padding: 4px 0;
		}

		.info-label {
			font-weight: 600;
			min-width: 140px;
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

		thead {
			display: table-header-group;
		}

		tr {
			page-break-inside: avoid;
		}

		tbody tr:nth-child(even) {
			background-color: #f9fafb;
		}

		th, td {
			border-bottom: 1px solid #e5e7eb;
			padding: 10px 6px;
			text-align: left;
			vertical-align: top;
			word-wrap: break-word;
		}

		th {
			background-color: #f3f4f6;
			font-weight: 700;
			color: #374151;
			text-transform: uppercase;
			font-size: 8pt;
			letter-spacing: 0.5px;
			border-top: 2px solid #111827;
			border-bottom: 2px solid #111827;
		}

		/* Totals Styles */
		.totals-container {
			display: flex;
			justify-content: flex-end;
			margin-top: 20px;
			page-break-inside: avoid;
		}

		.totals-section {
			width: 320px;
		}

		.totals-table td {
			padding: 8px 0;
			border-bottom: 1px solid #f3f4f6;
		}

		.totals-label {
			color: #6b7280;
			font-weight: 500;
		}

		.totals-value {
			text-align: right;
			font-weight: 600;
			color: #111827;
		}

		.grand-total td {
			border-top: 2px solid #e11d48;
			border-bottom: 2px solid #e11d48;
			padding-top: 12px;
			padding-bottom: 12px;
			font-size: 12pt;
			font-weight: 700;
			color: #e11d48;
		}

		.amount-due td {
			border-top: 2px solid #111827;
			border-bottom: none;
			padding-top: 12px;
			font-size: 13pt;
			font-weight: 800;
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

		/* Print-specific CSS */
		@media print {
			* {
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}

			thead {
				display: table-header-group;
			}

			tr {
				page-break-inside: avoid;
			}
		}
	</style>
</head>
<body>

	${paidStamp}

	<div class="standard-page">

		<!-- Header -->
		<div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 4px solid #e11d48; margin-bottom: 30px;">
			<div>
				${logoMarkup}
			</div>
			<div style="text-align: right;">
				<div style="font-size: 28pt; font-weight: 800; color: #111827; line-height: 1.1;">TAX INVOICE</div>
				<div style="font-weight: bold; color: #e11d48; font-size: 11pt; margin-top: 6px;">${escapeHtml(invoice.invoice_number)}</div>
				<div style="color: #6b7280; font-size: 9pt; margin-top: 4px;">
					Issued: ${issueDate}${invoice.due_date ? ' &nbsp;|&nbsp; Due: ' + dueDate : ''}
				</div>
				${isPaid ? `<div style="display:inline-block;background:#16a34a;color:#fff;padding:4px 12px;border-radius:4px;font-size:9pt;font-weight:700;margin-top:8px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">PAID</div>` : ''}
			</div>
		</div>

		<!-- Info Grid -->
		<div class="info-grid">
			<!-- Column 1: Customer & Vehicle -->
			<div>
				<div style="font-weight: bold; color: #111827; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">CUSTOMER &amp; VEHICLE</div>
				<div class="info-row">
					<span class="info-label">Customer:</span>
					<span class="info-value">${escapeHtml(job.customer_name)}</span>
				</div>
				${job.customer_phone ? `<div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${escapeHtml(job.customer_phone)}</span></div>` : ''}
				${job.customer_email ? `<div class="info-row"><span class="info-label">Email:</span><span class="info-value">${escapeHtml(job.customer_email)}</span></div>` : ''}
				<div class="info-row">
					<span class="info-label">Vehicle:</span>
					<span class="info-value">${escapeHtml(job.vehicle_year ? String(job.vehicle_year) : '')} ${escapeHtml(job.vehicle_make)} ${escapeHtml(job.vehicle_model)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Registration:</span>
					<span class="info-value">${escapeHtml(job.vehicle_reg) || '-'}</span>
				</div>
				${job.vehicle_color ? `<div class="info-row"><span class="info-label">Colour:</span><span class="info-value">${escapeHtml(job.vehicle_color)}</span></div>` : ''}
			</div>

			<!-- Column 2: Job & Invoice Details -->
			<div>
				<div style="font-weight: bold; color: #111827; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">JOB &amp; INVOICE DETAILS</div>
				<div class="info-row">
					<span class="info-label">Job Number:</span>
					<span class="info-value">${escapeHtml(job.job_number)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Type:</span>
					<span class="info-value">${escapeHtml(jobTypeLabel)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Invoice Number:</span>
					<span class="info-value">${escapeHtml(invoice.invoice_number)}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Issue Date:</span>
					<span class="info-value">${issueDate}</span>
				</div>
				${invoice.due_date ? `<div class="info-row"><span class="info-label">Due Date:</span><span class="info-value">${dueDate}</span></div>` : ''}
				<div class="info-row">
					<span class="info-label">Status:</span>
					<span class="info-value" style="font-weight: 700; color: ${isPaid ? '#16a34a' : '#d97706'};">${escapeHtml(invoice.status.toUpperCase())}</span>
				</div>
			</div>
		</div>

		<!-- Line Items Table -->
		<table>
			<thead>
				<tr>
					<th style="width: 5%; text-align: center;">#</th>
					<th style="width: 55%;">DESCRIPTION</th>
					<th style="width: 10%; text-align: center;">QTY</th>
					<th style="width: 15%; text-align: right;">UNIT PRICE</th>
					<th style="width: 15%; text-align: right;">TOTAL</th>
				</tr>
			</thead>
			<tbody>
				${tableRows}
			</tbody>
		</table>

		<!-- Totals -->
		<div class="totals-container">
			<div class="totals-section">
				<table class="totals-table">
					<tr>
						<td class="totals-label">Subtotal:</td>
						<td class="totals-value">${formatCurrency(subtotal)}</td>
					</tr>
					${discountAmount > 0 ? `
					<tr>
						<td class="totals-label">Discount:</td>
						<td class="totals-value" style="color: #059669;">-${formatCurrency(discountAmount)}</td>
					</tr>` : ''}
					<tr>
						<td class="totals-label">VAT (${vatRate}%):</td>
						<td class="totals-value">${formatCurrency(vatAmount)}</td>
					</tr>
					<tr class="grand-total">
						<td class="totals-label" style="color: #e11d48;">TOTAL:</td>
						<td class="totals-value">${formatCurrency(grandTotal)}</td>
					</tr>
					${amountPaid > 0 ? `
					<tr>
						<td class="totals-label">Amount Paid:</td>
						<td class="totals-value" style="color: #16a34a;">-${formatCurrency(amountPaid)}</td>
					</tr>` : ''}
					<tr class="amount-due">
						<td class="totals-label" style="color: #111827;">AMOUNT DUE:</td>
						<td class="totals-value">${formatCurrency(amountDue)}</td>
					</tr>
				</table>
			</div>
		</div>

		${bankingSection}

		${notesSection}

		<!-- Footer -->
		<div class="footer">
			<p>This invoice was prepared by ${escapeHtml(companyName)}</p>
			${companyEmail ? `<p>${escapeHtml(companyEmail)}${companyPhone ? ' | Tel: ' + escapeHtml(companyPhone) : ''}</p>` : ''}
			<p>Generated on ${formatDateNumeric(new Date().toISOString())}</p>
		</div>
	</div>

</body>
</html>`.trim();
}
