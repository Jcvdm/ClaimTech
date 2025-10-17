import { inspectionService } from '$lib/services/inspection.service';
import { clientService } from '$lib/services/client.service';
import { requestService } from '$lib/services/request.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		// Only show inspections that don't have appointments yet
		const inspections = await inspectionService.listInspectionsWithoutAppointments();

		// Get all unique client IDs and request IDs
		const clientIds = [...new Set(inspections.map((i) => i.client_id))];
		const requestIds = [...new Set(inspections.map((i) => i.request_id))];

		// Fetch all clients and requests in parallel
		const [clients, requests] = await Promise.all([
			Promise.all(clientIds.map((id) => clientService.getClient(id))),
			Promise.all(requestIds.map((id) => requestService.getRequest(id)))
		]);

		// Create client map
		const clientMap = Object.fromEntries(
			clients.filter((c) => c !== null).map((c) => [c!.id, c])
		);

		// Filter out null requests
		const validRequests = requests.filter((r) => r !== null);

		return {
			inspections,
			clientMap,
			requests: validRequests
		};
	} catch (error) {
		console.error('Error loading inspections:', error);
		return {
			inspections: [],
			clientMap: {},
			requests: [],
			error: 'Failed to load inspections'
		};
	}
};

