import { clientService } from '$lib/services/client.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const client = await clientService.getClient(params.id);

		if (!client) {
			throw error(404, 'Client not found');
		}

		return {
			client
		};
	} catch (err) {
		console.error('Error loading client:', err);
		throw error(500, 'Failed to load client');
	}
};

