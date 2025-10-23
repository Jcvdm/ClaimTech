import { requestService } from '$lib/services/request.service';
import { clientService } from '$lib/services/client.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const [request, clients] = await Promise.all([
			requestService.getRequest(params.id, locals.supabase),
			clientService.listClients(true, locals.supabase)
		]);

		if (!request) {
			throw error(404, 'Request not found');
		}

		return {
			request,
			clients
		};
	} catch (err) {
		console.error('Error loading request for edit:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load request');
	}
};

