import type { PageServerLoad } from './$types';
import { requestService } from '$lib/services/request.service';
import { inspectionService } from '$lib/services/inspection.service';
import { appointmentService } from '$lib/services/appointment.service';
import { assessmentService } from '$lib/services/assessment.service';

export const load: PageServerLoad = async () => {
	try {
		// Fetch completed (archived assessments) and all cancelled entities in parallel
		const [
			archivedAssessments,
			cancelledRequests,
			cancelledInspections,
			cancelledAppointments,
			cancelledAssessments
		] = await Promise.all([
			assessmentService.listArchivedAssessments(), // Completed = assessments with 'archived' status (FRC completed)
			requestService.listCancelledRequests(),
			inspectionService.listCancelledInspections(),
			appointmentService.listCancelledAppointments(),
			assessmentService.listCancelledAssessments()
		]);

		return {
			// Completed items (only archived assessments)
			archivedAssessments,
			// Cancelled items (all entity types)
			cancelledRequests,
			cancelledInspections,
			cancelledAppointments,
			cancelledAssessments
		};
	} catch (error) {
		console.error('Error loading archive:', error);
		return {
			archivedAssessments: [],
			cancelledRequests: [],
			cancelledInspections: [],
			cancelledAppointments: [],
			cancelledAssessments: [],
			error: 'Failed to load archive'
		};
	}
};

