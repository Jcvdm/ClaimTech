import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopInvoiceService } from '$lib/services/shop-invoice.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;
	const invoiceService = createShopInvoiceService(supabase);

	let { data: invoice, error: invoiceError } = await invoiceService.getInvoice(params.id);

	if (invoiceError || !invoice) {
		error(404, 'Invoice not found');
	}

	// Auto-detect overdue invoices
	if (invoice && (invoice.status === 'sent' || invoice.status === 'partially_paid')) {
		const dueDate = (invoice as unknown as { due_date?: string }).due_date;
		if (dueDate && new Date(dueDate) < new Date()) {
			await invoiceService.updateInvoice(params.id, { status: 'overdue' });
			const { data: updated } = await invoiceService.getInvoice(params.id);
			if (updated) invoice = updated;
		}
	}

	// Load payment history
	const { data: payments } = await invoiceService.getPayments(params.id);

	return { invoice, payments: payments ?? [] };
};

export const actions: Actions = {
	send: async ({ params, locals }) => {
		const { supabase } = locals;
		const invoiceService = createShopInvoiceService(supabase);

		const { error: sendError } = await invoiceService.markAsSent(params.id);

		if (sendError) {
			return fail(400, { error: sendError.message ?? 'Failed to mark invoice as sent' });
		}

		return { success: true };
	},

	recordPayment: async ({ params, request, locals }) => {
		const { supabase, user } = locals;
		const invoiceService = createShopInvoiceService(supabase);
		const formData = await request.formData();

		const amount = parseFloat(formData.get('amount') as string);
		const payment_method = formData.get('payment_method') as string;
		const payment_reference = (formData.get('payment_reference') as string) || undefined;
		const payment_date = (formData.get('payment_date') as string) || undefined;
		const notes = (formData.get('notes') as string) || undefined;

		if (!amount || isNaN(amount) || amount <= 0) {
			return fail(400, { error: 'Valid amount required' });
		}
		if (!payment_method) {
			return fail(400, { error: 'Payment method required' });
		}

		try {
			await invoiceService.addPayment(
				params.id,
				{ amount, payment_method, payment_reference, payment_date, notes },
				user?.id
			);
			return { success: true };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Failed to record payment' });
		}
	},

	deletePayment: async ({ request, locals }) => {
		const { supabase } = locals;
		const invoiceService = createShopInvoiceService(supabase);
		const formData = await request.formData();
		const paymentId = formData.get('payment_id') as string;

		if (!paymentId) {
			return fail(400, { error: 'Payment ID required' });
		}

		try {
			await invoiceService.deletePayment(paymentId);
			return { success: true };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Failed to delete payment' });
		}
	},

	void: async ({ params, locals }) => {
		const { supabase } = locals;
		const invoiceService = createShopInvoiceService(supabase);

		const { error: voidError } = await invoiceService.voidInvoice(params.id);

		if (voidError) {
			return fail(400, { error: voidError.message ?? 'Failed to void invoice' });
		}

		return { success: true };
	}
};
