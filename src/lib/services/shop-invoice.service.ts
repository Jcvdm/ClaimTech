// NOTE: Using untyped SupabaseClient because shop tables are not yet reflected
// in database.types.ts. Run `npm run generate:types` after applying migrations
// to the preview database to get full type safety.
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShopInvoiceStatus =
	| 'draft'
	| 'sent'
	| 'partially_paid'
	| 'paid'
	| 'overdue'
	| 'void';

export interface ShopInvoice {
	id: string;
	job_id: string;
	estimate_id: string | null;
	invoice_number: string;
	status: ShopInvoiceStatus;
	line_items: ShopInvoiceLineItem[];
	subtotal: number;
	discount_amount: number;
	vat_rate: number;
	vat_amount: number;
	total: number;
	amount_paid: number;
	amount_due: number;
	issue_date: string;
	due_date: string;
	sent_at: string | null;
	paid_at: string | null;
	notes: string | null;
	payment_method: string | null;
	payment_reference: string | null;
	created_at: string;
	updated_at: string;
}

export interface ShopInvoiceLineItem {
	id: string;
	type: 'part' | 'labor' | 'sublet' | 'other';
	description: string;
	quantity: number;
	unit_price: number;
	total: number;
}

// ─── Service Factory ──────────────────────────────────────────────────────────

export function createShopInvoiceService(supabase: SupabaseClient) {
	/**
	 * Generate a unique invoice number in the format INV-YYYY-NNNN.
	 * Uses the highest existing number for the current year and increments it.
	 */
	async function generateInvoiceNumber(): Promise<string> {
		const year = new Date().getFullYear();
		const prefix = `INV-${year}-`;

		const { data, error } = await supabase
			.from('shop_invoices')
			.select('invoice_number')
			.like('invoice_number', `${prefix}%`)
			.order('invoice_number', { ascending: false })
			.limit(1);

		if (error) {
			console.error('Error fetching last invoice number:', error);
		}

		let nextNumber = 1;
		if (data && data.length > 0) {
			const last = data[0].invoice_number as string;
			const parts = last.split('-');
			const lastNum = parseInt(parts[parts.length - 1], 10);
			if (!isNaN(lastNum)) {
				nextNumber = lastNum + 1;
			}
		}

		const padded = String(nextNumber).padStart(4, '0');
		return `${prefix}${padded}`;
	}

	return {
		generateInvoiceNumber,

		/**
		 * Create a new invoice from an existing estimate.
		 * Copies line items and totals from the estimate, and includes approved additionals.
		 */
		async createFromEstimate(estimateId: string, jobId: string): Promise<ShopInvoice> {
			// 1. Fetch the estimate to copy line_items and totals
			const { data: estimate, error: estimateError } = await supabase
				.from('shop_estimates')
				.select('line_items, subtotal, vat_rate, vat_amount, total, discount_amount')
				.eq('id', estimateId)
				.single();

			if (estimateError || !estimate) {
				throw new Error(`Failed to fetch estimate: ${estimateError?.message ?? 'not found'}`);
			}

			// After fetching estimate, fetch additionals for this job
			const { data: additionals } = await (supabase as any)
				.from('shop_additionals')
				.select('*')
				.eq('job_id', jobId)
				.maybeSingle();

			// If additionals exist, extract effective approved items
			let additionalLineItems: ShopInvoiceLineItem[] = [];
			let additionalsSubtotal = 0;
			let additionalsVat = 0;
			let additionalsTotal = 0;

			if (additionals && Array.isArray(additionals.line_items)) {
				// Build set of reversed item IDs
				const reversedIds = new Set(
					additionals.line_items
						.filter((li: any) => li.action === 'reversal' && li.reverses_line_id)
						.map((li: any) => li.reverses_line_id)
				);

				// Get effective approved items (approved, not reversed, not reversals themselves)
				const effectiveItems = additionals.line_items.filter(
					(li: any) =>
						li.status === 'approved' && li.action !== 'reversal' && !reversedIds.has(li.id)
				);

				// Map to invoice line items
				additionalLineItems = effectiveItems.map((li: any) => ({
					id: li.id || crypto.randomUUID(),
					type:
						li.action === 'removed'
							? ('other' as const)
							: li.process_type === 'N'
								? ('part' as const)
								: li.process_type === 'O'
									? ('sublet' as const)
									: ('labor' as const),
					description:
						li.action === 'removed'
							? `[REMOVED] ${li.description || 'Item'}`
							: `[ADDITIONAL] ${li.description || 'Item'}`,
					quantity: 1,
					unit_price: li.total || 0,
					total: li.total || 0
				}));

				// Use pre-calculated totals from additionals record
				additionalsSubtotal = additionals.subtotal_approved || 0;
				additionalsVat = additionals.vat_amount_approved || 0;
				additionalsTotal = additionals.total_approved || 0;
			}

			// 2. Generate invoice number
			const invoiceNumber = await generateInvoiceNumber();

			// 3. Set dates
			const today = new Date();
			const issueDate = today.toISOString().split('T')[0];
			const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0];

			// Map estimate line items to invoice line items (strip markup fields)
			const estimateLineItems: ShopInvoiceLineItem[] = Array.isArray(estimate.line_items)
				? (estimate.line_items as Array<Record<string, unknown>>).map((item) => ({
						id: (item.id as string) ?? crypto.randomUUID(),
						type: (item.type as ShopInvoiceLineItem['type']) ?? 'other',
						description: (item.description as string) ?? '',
						quantity: (item.quantity as number) ?? 1,
						unit_price: (item.unit_price as number) ?? 0,
						total: (item.total as number) ?? 0
					}))
				: [];

			// Combine line items and totals
			const allLineItems = [...estimateLineItems, ...additionalLineItems];
			const combinedSubtotal = (estimate.subtotal ?? 0) + additionalsSubtotal;
			const combinedVat = (estimate.vat_amount ?? 0) + additionalsVat;
			const combinedTotal = (estimate.total ?? 0) + additionalsTotal;

			// 4. Create shop_invoices record
			const { data: invoice, error: insertError } = await supabase
				.from('shop_invoices')
				.insert({
					job_id: jobId,
					estimate_id: estimateId,
					invoice_number: invoiceNumber,
					status: 'draft',
					line_items: allLineItems,
					subtotal: combinedSubtotal,
					discount_amount: estimate.discount_amount ?? 0,
					vat_rate: estimate.vat_rate ?? 15,
					vat_amount: combinedVat,
					total: combinedTotal,
					amount_paid: 0,
					amount_due: combinedTotal,
					issue_date: issueDate,
					due_date: dueDate
				})
				.select()
				.single();

			if (insertError || !invoice) {
				throw new Error(`Failed to create invoice: ${insertError?.message ?? 'unknown error'}`);
			}

			return invoice as unknown as ShopInvoice;
		},

		/**
		 * Fetch a single invoice by ID with its parent job details.
		 */
		async getInvoice(id: string) {
			return supabase
				.from('shop_invoices')
				.select(
					'*, shop_jobs(customer_name, customer_phone, customer_email, job_number, vehicle_make, vehicle_model, vehicle_year, vehicle_reg, vehicle_color, vehicle_mileage, job_type)'
				)
				.eq('id', id)
				.single();
		},

		/**
		 * List invoices with optional status filter, newest first.
		 */
		async listInvoices(filters?: { status?: string }) {
			let query = supabase
				.from('shop_invoices')
				.select(
					'*, shop_jobs(customer_name, job_number, vehicle_make, vehicle_model)'
				)
				.order('created_at', { ascending: false });

			if (filters?.status) {
				query = query.eq('status', filters.status);
			}

			return query;
		},

		/**
		 * Update invoice metadata (notes, due_date, etc.).
		 */
		async updateInvoice(
			id: string,
			data: Partial<Omit<ShopInvoice, 'id' | 'job_id' | 'invoice_number' | 'created_at'>>
		) {
			return supabase
				.from('shop_invoices')
				.update({ ...data, updated_at: new Date().toISOString() })
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Transition invoice from 'draft' → 'sent'.
		 */
		async markAsSent(id: string) {
			return supabase
				.from('shop_invoices')
				.update({
					status: 'sent',
					sent_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.eq('status', 'draft')
				.select()
				.single();
		},

		/**
		 * Record a payment against an invoice.
		 * Updates amount_paid, amount_due, and transitions status accordingly.
		 */
		async recordPayment(
			id: string,
			payment: { amount: number; method: string; reference?: string; date?: string }
		): Promise<ShopInvoice> {
			// 1. Fetch current invoice
			const { data: current, error: fetchError } = await supabase
				.from('shop_invoices')
				.select('amount_paid, total, status')
				.eq('id', id)
				.single();

			if (fetchError || !current) {
				throw new Error(`Failed to fetch invoice: ${fetchError?.message ?? 'not found'}`);
			}

			// 2. Calculate new amounts
			const newAmountPaid = (current.amount_paid as number) + payment.amount;
			const newAmountDue = (current.total as number) - newAmountPaid;
			const newStatus: ShopInvoiceStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';

			// 3. Update invoice
			const updateData: Record<string, unknown> = {
				amount_paid: newAmountPaid,
				amount_due: Math.max(0, newAmountDue),
				status: newStatus,
				payment_method: payment.method,
				payment_reference: payment.reference ?? null,
				updated_at: new Date().toISOString()
			};

			if (newStatus === 'paid') {
				updateData.paid_at = payment.date
					? new Date(payment.date).toISOString()
					: new Date().toISOString();
			}

			const { data: invoice, error: updateError } = await supabase
				.from('shop_invoices')
				.update(updateData)
				.eq('id', id)
				.select()
				.single();

			if (updateError || !invoice) {
				throw new Error(`Failed to record payment: ${updateError?.message ?? 'unknown error'}`);
			}

			return invoice as unknown as ShopInvoice;
		},

		/**
		 * Void an invoice (set status to 'void').
		 */
		async voidInvoice(id: string) {
			return supabase
				.from('shop_invoices')
				.update({
					status: 'void',
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.select()
				.single();
		},

		/**
		 * Check if a job already has an invoice.
		 */
		async getInvoiceForJob(jobId: string) {
			return supabase
				.from('shop_invoices')
				.select('id, invoice_number, status')
				.eq('job_id', jobId)
				.neq('status', 'void')
				.maybeSingle();
		},

		/**
		 * Record a payment against an invoice.
		 * Inserts into shop_payments, updates invoice totals, and auto-completes job on full payment.
		 */
		async addPayment(
			invoiceId: string,
			payment: {
				amount: number;
				payment_method: string;
				payment_reference?: string;
				payment_date?: string;
				notes?: string;
			},
			recordedBy?: string
		) {
			// 1. Fetch current invoice
			const { data: invoice, error: fetchErr } = await (supabase as any)
				.from('shop_invoices')
				.select('*, shop_jobs(id, status, status_history)')
				.eq('id', invoiceId)
				.single();
			if (fetchErr || !invoice) throw new Error('Invoice not found');

			// 2. Insert payment record
			const { error: payErr } = await (supabase as any).from('shop_payments').insert({
				invoice_id: invoiceId,
				amount: payment.amount,
				payment_method: payment.payment_method,
				payment_reference: payment.payment_reference || null,
				payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
				notes: payment.notes || null,
				recorded_by: recordedBy || null
			});
			if (payErr) throw new Error(`Failed to record payment: ${payErr.message}`);

			// 3. Recalculate invoice totals
			const newAmountPaid = (invoice.amount_paid || 0) + payment.amount;
			const newAmountDue = (invoice.total || 0) - newAmountPaid;
			const newStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';
			const isPaid = newStatus === 'paid';

			const { error: updateErr } = await supabase
				.from('shop_invoices')
				.update({
					amount_paid: newAmountPaid,
					amount_due: Math.max(0, newAmountDue),
					status: newStatus,
					payment_method: payment.payment_method,
					payment_reference: payment.payment_reference || null,
					paid_at: isPaid ? new Date().toISOString() : invoice.paid_at,
					updated_at: new Date().toISOString()
				})
				.eq('id', invoiceId);
			if (updateErr) throw new Error(`Failed to update invoice: ${updateErr.message}`);

			// 4. Auto-complete job if fully paid and in ready_for_collection status
			if (isPaid && invoice.shop_jobs?.status === 'ready_for_collection') {
				const currentHistory = Array.isArray(invoice.shop_jobs.status_history)
					? invoice.shop_jobs.status_history
					: [];
				await (supabase as any)
					.from('shop_jobs')
					.update({
						status: 'completed',
						date_completed: new Date().toISOString().split('T')[0],
						status_history: [
							...currentHistory,
							{
								status: 'completed',
								timestamp: new Date().toISOString(),
								note: 'Auto-completed on full payment'
							}
						],
						updated_at: new Date().toISOString()
					})
					.eq('id', invoice.job_id);
			}

			return { data: null, error: null };
		},

		/**
		 * List all payments for a given invoice, newest first.
		 */
		async getPayments(invoiceId: string) {
			return (supabase as any)
				.from('shop_payments')
				.select('*')
				.eq('invoice_id', invoiceId)
				.order('payment_date', { ascending: false });
		},

		/**
		 * Delete a payment and recalculate invoice totals from remaining payments.
		 */
		async deletePayment(paymentId: string) {
			// 1. Fetch payment to get invoice_id and amount
			const { data: payment, error: fetchErr } = await (supabase as any)
				.from('shop_payments')
				.select('*, shop_invoices(id, total)')
				.eq('id', paymentId)
				.single();
			if (fetchErr || !payment) throw new Error('Payment not found');

			// 2. Delete payment
			const { error: delErr } = await (supabase as any)
				.from('shop_payments')
				.delete()
				.eq('id', paymentId);
			if (delErr) throw new Error(`Failed to delete payment: ${delErr.message}`);

			// 3. Recalculate from remaining payments
			const { data: remaining } = await (supabase as any)
				.from('shop_payments')
				.select('amount')
				.eq('invoice_id', payment.invoice_id);

			const totalPaid = (remaining || []).reduce(
				(sum: number, p: any) => sum + (p.amount || 0),
				0
			);
			const invoiceTotal = payment.shop_invoices?.total || 0;
			const amountDue = invoiceTotal - totalPaid;
			const newStatus =
				totalPaid <= 0 ? 'sent' : amountDue <= 0 ? 'paid' : 'partially_paid';

			await supabase
				.from('shop_invoices')
				.update({
					amount_paid: totalPaid,
					amount_due: Math.max(0, amountDue),
					status: newStatus,
					paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
					updated_at: new Date().toISOString()
				})
				.eq('id', payment.invoice_id);

			return { data: null, error: null };
		}
	};
}
