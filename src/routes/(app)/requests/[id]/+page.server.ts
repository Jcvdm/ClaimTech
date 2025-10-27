import { requestService } from '$lib/services/request.service';
import { clientService } from '$lib/services/client.service';
import { taskService } from '$lib/services/task.service';
import { engineerService } from '$lib/services/engineer.service';
import { auditService } from '$lib/services/audit.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const [request, tasks, engineers, auditLogs] = await Promise.all([
			requestService.getRequest(params.id, locals.supabase),
			taskService.listTasksForRequest(params.id, locals.supabase),
			engineerService.listEngineers(true, locals.supabase),
			auditService.getEntityHistory('request', params.id, locals.supabase)
		]);

		if (!request) {
			throw error(404, 'Request not found');
		}

		// Get client details
		const client = await clientService.getClient(request.client_id, locals.supabase);

		return {
			request,
			client,
			tasks,
			engineers,
			auditLogs
		};
	} catch (err) {
		console.error('Error loading request:', err);
		throw error(500, 'Failed to load request');
	}
};

