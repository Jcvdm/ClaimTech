import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { appointmentService } from '$lib/services/appointment.service';
import { clientService } from '$lib/services/client.service';
import { engineerService } from '$lib/services/engineer.service';
import { inspectionService } from '$lib/services/inspection.service';
import { requestService } from '$lib/services/request.service';
import { auditService } from '$lib/services/audit.service';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const appointment = await appointmentService.getAppointment(params.id);

		if (!appointment) {
			throw error(404, 'Appointment not found');
		}

		const [client, engineer, inspection, request, auditLogs] = await Promise.all([
			clientService.getClient(appointment.client_id),
			engineerService.getEngineer(appointment.engineer_id),
			inspectionService.getInspection(appointment.inspection_id),
			requestService.getRequest(appointment.request_id),
			auditService.getEntityHistory('appointment', params.id)
		]);

		return {
			appointment,
			client,
			engineer,
			inspection,
			request,
			auditLogs
		};
	} catch (err) {
		console.error('Error loading appointment:', err);
		throw error(500, 'Failed to load appointment');
	}
};

