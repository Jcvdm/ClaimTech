import type { PageServerLoad } from './$types';
import { assessmentService } from '$lib/services/assessment.service';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { role, engineer_id } = await parent();
	const isEngineer = role === 'engineer';

	try {
		// Engineers only see their own assessments
		const assessments = await assessmentService.getInProgressAssessments(
			locals.supabase,
			isEngineer ? engineer_id : undefined
		);
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

