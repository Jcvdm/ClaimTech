import type { PageServerLoad } from './$types';
import { assessmentService } from '$lib/services/assessment.service';

export const load: PageServerLoad = async () => {
	try {
		const assessments = await assessmentService.getInProgressAssessments();
		return {
			assessments
		};
	} catch (error) {
		console.error('Error loading assessments:', error);
		return {
			assessments: []
		};
	}
};

