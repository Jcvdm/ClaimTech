import { inspectionService } from '$lib/services/inspection.service';
import { assessmentService } from '$lib/services/assessment.service';
import { clientService } from '$lib/services/client.service';
import { requestService } from '$lib/services/request.service';
import { engineerService } from '$lib/services/engineer.service';
import { auditService } from '$lib/services/audit.service';
import { appointmentService } from '$lib/services/appointment.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		// ASSESSMENT-CENTRIC ARCHITECTURE: Load assessment by ID first
		const assessment = await assessmentService.getAssessment(params.id, locals.supabase);

		if (!assessment) {
			throw error(404, 'Assessment not found');
		}

		// Load inspection via assessment.inspection_id foreign key (if populated)
		let inspection = null;
		if (assessment.inspection_id) {
			inspection = await inspectionService.getInspection(assessment.inspection_id, locals.supabase);
		}

		// Load request (always exists - assessment created WITH request)
		const request = await requestService.getRequest(assessment.request_id, locals.supabase);
		if (!request) {
			throw error(404, 'Request not found for assessment');
		}

		// Load client via request
		const client = await clientService.getClient(request.client_id, locals.supabase);

		// Load audit logs for assessment (primary entity)
		const auditLogs = await auditService.getEntityHistory('assessment', params.id, locals.supabase);

		// Load assigned engineer (from inspection if exists, otherwise from request)
		let assignedEngineer = null;
		const engineerId = inspection?.assigned_engineer_id || request.assigned_engineer_id;
		if (engineerId) {
			assignedEngineer = await engineerService.getEngineer(engineerId, locals.supabase);
		}

		// Load available engineers filtered by province (use inspection or request data)
		let availableEngineers: any[] = [];
		const province = inspection?.vehicle_province || request.vehicle_province;
		if (province) {
			availableEngineers = await engineerService.listEngineersByProvince(
				province,
				true,
				locals.supabase
			);
		}

		// Load appointment via assessment.appointment_id (assessment-centric)
		let appointment = null;
		if (assessment.appointment_id) {
			const appointments = await appointmentService.listAppointments({
				inspection_id: assessment.inspection_id || undefined
			}, locals.supabase);
			appointment = appointments.find(a => a.id === assessment.appointment_id) || null;
		}

		return {
			assessment,
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

