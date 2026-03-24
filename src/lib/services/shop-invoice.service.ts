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
		 * Copies line items and totals from the estimate.
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

			// 2. Generate invoice number
			const invoiceNumber = await generateInvoiceNumber();

			// 3. Set dates
			const today = new Date();
			const issueDate = today.toISOString().split('T')[0];
			const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split('T')[0];

			// Map estimate line items to invoice line items (strip markup fields)
			const lineItems: ShopInvoiceLineItem[] = Array.isArray(estimate.line_items)
				? (estimate.line_items as Array<Record<string, unknown>>).map((item) => ({
						id: (item.id as string) ?? crypto.randomUUID(),
						type: (item.type as ShopInvoiceLineItem['type']) ?? 'other',
						description: (item.description as string) ?? '',
						quantity: (item.quantity as number) ?? 1,
						unit_price: (item.unit_price as number) ?? 0,
						total: (item.total as number) ?? 0
					}))
				: [];

			// 4. Create shop_invoices record
			const { data: invoice, error: insertError } = await supabase
				.from('shop_invoices')
				.insert({
					job_id: jobId,
					estimate_id: estimateId,
					invoice_number: invoiceNumber,
					status: 'draft',
					line_items: lineItems,
					subtotal: estimate.subtotal ?? 0,
					discount_amount: estimate.discount_amount ?? 0,
					vat_rate: estimate.vat_rate ?? 15,
					vat_amount: estimate.vat_amount ?? 0,
					total: estimate.total ?? 0,
					amount_paid: 0,
					amount_due: estimate.total ?? 0,
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
		}
	};
}
