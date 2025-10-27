import type { PageServerLoad } from './$types';
import { requestService } from '$lib/services/request.service';
import { inspectionService } from '$lib/services/inspection.service';
import { appointmentService } from '$lib/services/appointment.service';
import { assessmentService } from '$lib/services/assessment.service';

export const load: PageServerLoad = async ({ locals, parent }) => {
	try {
		// Get role and engineer_id from parent layout
		const { role, engineer_id } = await parent();
		const isEngineer = role === 'engineer';

		// Fetch completed (archived assessments) and all cancelled entities in parallel
		// Engineers only see their own data; requests and inspections are admin-only
		const [
			archivedAssessments,
			cancelledRequests,
			cancelledInspections,
			cancelledAppointments,
			cancelledAssessments
		] = await Promise.all([
			assessmentService.listArchivedAssessments(locals.supabase, isEngineer ? engineer_id : undefined), // Completed = assessments with 'archived' status (FRC completed)
			isEngineer ? [] : requestService.listCancelledRequests(locals.supabase), // Admin-only
			isEngineer ? [] : inspectionService.listCancelledInspections(locals.supabase), // Admin-only
			appointmentService.listCancelledAppointments(locals.supabase, isEngineer ? engineer_id : undefined),
			assessmentService.listCancelledAssessments(locals.supabase, isEngineer ? engineer_id : undefined)
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

