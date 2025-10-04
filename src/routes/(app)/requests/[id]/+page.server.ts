import { requestService } from '$lib/services/request.service';
import { clientService } from '$lib/services/client.service';
import { taskService } from '$lib/services/task.service';
import { engineerService } from '$lib/services/engineer.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const [request, tasks, engineers] = await Promise.all([
			requestService.getRequest(params.id),
			taskService.listTasksForRequest(params.id),
			engineerService.listEngineers(true)
		]);

		if (!request) {
			throw error(404, 'Request not found');
		}

		// Get client details
		const client = await clientService.getClient(request.client_id);

		return {
			request,
			client,
			tasks,
			engineers
		};
	} catch (err) {
		console.error('Error loading request:', err);
		throw error(500, 'Failed to load request');
	}
};

