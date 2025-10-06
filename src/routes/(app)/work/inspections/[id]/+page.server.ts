import { inspectionService } from '$lib/services/inspection.service';
import { clientService } from '$lib/services/client.service';
import { requestService } from '$lib/services/request.service';
import { engineerService } from '$lib/services/engineer.service';
import { auditService } from '$lib/services/audit.service';
import { appointmentService } from '$lib/services/appointment.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const inspection = await inspectionService.getInspection(params.id);

		if (!inspection) {
			throw error(404, 'Inspection not found');
		}

		const [client, request, auditLogs] = await Promise.all([
			clientService.getClient(inspection.client_id),
			requestService.getRequest(inspection.request_id),
			auditService.getEntityHistory('inspection', params.id)
		]);

		// Load assigned engineer if exists
		let assignedEngineer = null;
		if (inspection.assigned_engineer_id) {
			assignedEngineer = await engineerService.getEngineer(inspection.assigned_engineer_id);
		}

		// Load available engineers filtered by province
		let availableEngineers = [];
		if (inspection.vehicle_province) {
			availableEngineers = await engineerService.listEngineersByProvince(
				inspection.vehicle_province,
				true
			);
		}

		// Load appointment for this inspection (if exists)
		const appointments = await appointmentService.listAppointments({
			inspection_id: params.id
		});
		const appointment = appointments.length > 0 ? appointments[0] : null;

		return {
			inspection,
			client,
			request,
			assignedEngineer,
			availableEngineers,
			auditLogs,
			appointment
		};
	} catch (err) {
		console.error('Error loading inspection:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load inspection');
	}
};

