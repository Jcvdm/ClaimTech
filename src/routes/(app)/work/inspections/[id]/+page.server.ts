import { inspectionService } from '$lib/services/inspection.service';
import { clientService } from '$lib/services/client.service';
import { requestService } from '$lib/services/request.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const inspection = await inspectionService.getInspection(params.id);

		if (!inspection) {
			throw error(404, 'Inspection not found');
		}

		const [client, request] = await Promise.all([
			clientService.getClient(inspection.client_id),
			requestService.getRequest(inspection.request_id)
		]);

		return {
			inspection,
			client,
			request
		};
	} catch (err) {
		console.error('Error loading inspection:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load inspection');
	}
};

