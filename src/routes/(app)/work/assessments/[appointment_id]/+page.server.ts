import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { assessmentService } from '$lib/services/assessment.service';
import { vehicleIdentificationService } from '$lib/services/vehicle-identification.service';
import { exterior360Service } from '$lib/services/exterior-360.service';
import { accessoriesService } from '$lib/services/accessories.service';
import { interiorMechanicalService } from '$lib/services/interior-mechanical.service';
import { tyresService } from '$lib/services/tyres.service';
import { damageService } from '$lib/services/damage.service';
import { assessmentNotesService } from '$lib/services/assessment-notes.service';
import { appointmentService } from '$lib/services/appointment.service';
import { inspectionService } from '$lib/services/inspection.service';
import { requestService } from '$lib/services/request.service';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const appointmentId = params.appointment_id;

		// Get appointment
		const appointment = await appointmentService.getAppointment(appointmentId);
		if (!appointment) {
			throw error(404, 'Appointment not found');
		}

		// Get or create assessment
		let assessment = await assessmentService.getAssessmentByAppointment(appointmentId);
		
		if (!assessment) {
			// Create new assessment
			assessment = await assessmentService.createAssessment({
				appointment_id: appointmentId,
				inspection_id: appointment.inspection_id,
				request_id: appointment.request_id
			});

			// Create default tyres (5 standard positions)
			await tyresService.createDefaultTyres(assessment.id);
		}

		// Load all assessment data
		const [
			vehicleIdentification,
			exterior360,
			accessories,
			interiorMechanical,
			tyres,
			damageRecords,
			notes,
			inspection,
			request
		] = await Promise.all([
			vehicleIdentificationService.getByAssessment(assessment.id),
			exterior360Service.getByAssessment(assessment.id),
			accessoriesService.listByAssessment(assessment.id),
			interiorMechanicalService.getByAssessment(assessment.id),
			tyresService.listByAssessment(assessment.id),
			damageService.listByAssessment(assessment.id),
			assessmentNotesService.getNotesByAssessment(assessment.id),
			inspectionService.getInspection(appointment.inspection_id),
			requestService.getRequest(appointment.request_id)
		]);

		return {
			appointment,
			assessment,
			vehicleIdentification,
			exterior360,
			accessories,
			interiorMechanical,
			tyres,
			damageRecords,
			notes,
			inspection,
			request
		};
	} catch (err) {
		console.error('Error loading assessment:', err);
		throw error(500, 'Failed to load assessment');
	}
};

