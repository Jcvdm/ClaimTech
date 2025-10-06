import type { PageServerLoad } from './$types';
import { appointmentService } from '$lib/services/appointment.service';
import { clientService } from '$lib/services/client.service';
import { engineerService } from '$lib/services/engineer.service';

export const load: PageServerLoad = async () => {
	try {
		const [allAppointments, clients, engineers] = await Promise.all([
			appointmentService.listAppointments(),
			clientService.listClients(true),
			engineerService.listEngineers(true)
		]);

		// Only show scheduled appointments (hide in_progress, completed, cancelled)
		const appointments = allAppointments.filter((apt) => apt.status === 'scheduled');

		// Create lookup maps for efficient access
		const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
		const engineerMap = Object.fromEntries(engineers.map((e) => [e.id, e]));

		return {
			appointments,
			clientMap,
			engineerMap
		};
	} catch (error) {
		console.error('Error loading appointments:', error);
		return {
			appointments: [],
			clientMap: {},
			engineerMap: {}
		};
	}
};

