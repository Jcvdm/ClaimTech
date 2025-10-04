import { clientService } from '$lib/services/client.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const clients = await clientService.listClients(true);

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

