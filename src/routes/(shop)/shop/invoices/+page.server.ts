import type { PageServerLoad } from './$types';
import { createShopInvoiceService } from '$lib/services/shop-invoice.service';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const invoiceService = createShopInvoiceService(supabase);
	const { data: invoices, error } = await invoiceService.listInvoices();

	if (error) {
		console.error('Error loading invoices:', error);
		return { invoices: [] };
	}

	return { invoices: invoices ?? [] };
};
