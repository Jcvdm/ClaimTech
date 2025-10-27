import { requestService } from '$lib/services/request.service';
import { clientService } from '$lib/services/client.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const [requests, clients] = await Promise.all([
			requestService.listRequests(undefined, locals.supabase),
			clientService.listClients(true, locals.supabase)
		]);

		// Create a map of client IDs to client names for display
		const clientMap = new Map(clients.map((c) => [c.id, c.name]));

		return {
			requests,
			clientMap: Object.fromEntries(clientMap)
		};
	} catch (error) {
		console.error('Error loading requests:', error);
		return {
			requests: [],
			clientMap: {},
			error: 'Failed to load requests'
		};
	}
};

