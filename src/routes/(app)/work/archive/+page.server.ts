import type { PageServerLoad } from './$types';
import { requestService } from '$lib/services/request.service';
import { inspectionService } from '$lib/services/inspection.service';
import { appointmentService } from '$lib/services/appointment.service';
import { assessmentService } from '$lib/services/assessment.service';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// Fetch completed (archived assessments) and all cancelled entities in parallel
		const [
			archivedAssessments,
			cancelledRequests,
			cancelledInspections,
			cancelledAppointments,
			cancelledAssessments
		] = await Promise.all([
			assessmentService.listArchivedAssessments(locals.supabase), // Completed = assessments with 'archived' status (FRC completed)
			requestService.listCancelledRequests(locals.supabase),
			inspectionService.listCancelledInspections(locals.supabase),
			appointmentService.listCancelledAppointments(locals.supabase),
			assessmentService.listCancelledAssessments(locals.supabase)
		]);

		// Debug logging
		console.log('Archive data loaded:');
		console.log('- archivedAssessments:', Array.isArray(archivedAssessments) ? `${archivedAssessments.length} items` : typeof archivedAssessments);
		console.log('- cancelledRequests:', Array.isArray(cancelledRequests) ? `${cancelledRequests.length} items` : typeof cancelledRequests);
		console.log('- cancelledInspections:', Array.isArray(cancelledInspections) ? `${cancelledInspections.length} items` : typeof cancelledInspections);
		console.log('- cancelledAppointments:', Array.isArray(cancelledAppointments) ? `${cancelledAppointments.length} items` : typeof cancelledAppointments);
		console.log('- cancelledAssessments:', Array.isArray(cancelledAssessments) ? `${cancelledAssessments.length} items` : typeof cancelledAssessments);

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

