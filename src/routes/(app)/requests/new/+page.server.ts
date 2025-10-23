import { clientService } from '$lib/services/client.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const clients = await clientService.listClients(true, locals.supabase);

		return {
			clients
		};
	} catch (error) {
		console.error('Error loading clients:', error);
		return {
			clients: [],
			error: 'Failed to load clients'
		};
	}
};

