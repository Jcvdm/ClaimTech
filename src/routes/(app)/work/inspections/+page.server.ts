import { inspectionService } from '$lib/services/inspection.service';
import { clientService } from '$lib/services/client.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		// Only show inspections that don't have appointments yet
		const inspections = await inspectionService.listInspectionsWithoutAppointments();

		// Get all unique client IDs
		const clientIds = [...new Set(inspections.map((i) => i.client_id))];

		// Fetch all clients
		const clients = await Promise.all(clientIds.map((id) => clientService.getClient(id)));

		// Create client map
		const clientMap = Object.fromEntries(
			clients.filter((c) => c !== null).map((c) => [c!.id, c])
		);

		return {
			inspections,
			clientMap
		};
	} catch (error) {
		console.error('Error loading inspections:', error);
		return {
			inspections: [],
			clientMap: {},
			error: 'Failed to load inspections'
		};
	}
};

