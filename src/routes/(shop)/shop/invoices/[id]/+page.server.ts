import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createShopInvoiceService } from '$lib/services/shop-invoice.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;
	const invoiceService = createShopInvoiceService(supabase);

	const { data: invoice, error: invoiceError } = await invoiceService.getInvoice(params.id);

	if (invoiceError || !invoice) {
		error(404, 'Invoice not found');
	}

	return { invoice };
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
		const { supabase } = locals;
		const invoiceService = createShopInvoiceService(supabase);

		const formData = await request.formData();
		const amountStr = formData.get('amount') as string;
		const method = formData.get('method') as string;
		const reference = formData.get('reference') as string | null;
		const date = formData.get('date') as string | null;

		const amount = parseFloat(amountStr);

		if (!amount || isNaN(amount) || amount <= 0) {
			return fail(400, { error: 'A valid payment amount is required' });
		}

		if (!method) {
			return fail(400, { error: 'Payment method is required' });
		}

		try {
			await invoiceService.recordPayment(params.id, {
				amount,
				method,
				reference: reference ?? undefined,
				date: date ?? undefined
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to record payment';
			return fail(400, { error: message });
		}

		return { success: true };
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
