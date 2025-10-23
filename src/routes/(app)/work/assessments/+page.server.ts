import type { PageServerLoad } from './$types';
import { assessmentService } from '$lib/services/assessment.service';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const assessments = await assessmentService.getInProgressAssessments(locals.supabase);
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

