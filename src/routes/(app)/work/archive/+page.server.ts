import type { PageServerLoad } from './$types';
import { requestService } from '$lib/services/request.service';
import { inspectionService } from '$lib/services/inspection.service';
import { assessmentService } from '$lib/services/assessment.service';
import { frcService } from '$lib/services/frc.service';

export const load: PageServerLoad = async () => {
	try {
		// Fetch all completed/archived items in parallel
		const [completedRequests, completedInspections, archivedAssessments, completedFRC] =
			await Promise.all([
				requestService.listRequests({ status: 'completed' }),
				inspectionService.listCompletedInspections(),
				assessmentService.listArchivedAssessments(), // Assessments with 'archived' status
				frcService.listFRC({ status: 'completed' })
			]);

		return {
			completedRequests,
			completedInspections,
			completedAssessments: archivedAssessments, // Renamed for clarity
			completedFRC
		};
	} catch (error) {
		console.error('Error loading archive:', error);
		return {
			completedRequests: [],
			completedInspections: [],
			completedAssessments: [],
			completedFRC: [],
			error: 'Failed to load archive'
		};
	}
};

