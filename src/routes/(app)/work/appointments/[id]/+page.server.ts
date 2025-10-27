import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { appointmentService } from '$lib/services/appointment.service';
import { clientService } from '$lib/services/client.service';
import { engineerService } from '$lib/services/engineer.service';
import { inspectionService } from '$lib/services/inspection.service';
import { requestService } from '$lib/services/request.service';
import { auditService } from '$lib/services/audit.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const appointment = await appointmentService.getAppointment(params.id, locals.supabase);

		if (!appointment) {
			throw error(404, 'Appointment not found');
		}

		const [client, engineer, inspection, request, auditLogs] = await Promise.all([
			clientService.getClient(appointment.client_id, locals.supabase),
			engineerService.getEngineer(appointment.engineer_id, locals.supabase),
			inspectionService.getInspection(appointment.inspection_id, locals.supabase),
			requestService.getRequest(appointment.request_id, locals.supabase),
			auditService.getEntityHistory('appointment', params.id, locals.supabase)
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

