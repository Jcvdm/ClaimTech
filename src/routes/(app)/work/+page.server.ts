import type { PageServerLoad } from './$types';
import { inspectionService } from '$lib/services/inspection.service';
import { appointmentService } from '$lib/services/appointment.service';
import { assessmentService } from '$lib/services/assessment.service';
import { frcService } from '$lib/services/frc.service';
import { additionalsService } from '$lib/services/additionals.service';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// Fetch counts for all work phases in parallel
		const [
			inspectionCount,
			appointmentCount,
			assessmentCount,
			finalizedCount,
			frcCount,
			additionalsCount,
			archiveCount
		] = await Promise.all([
			inspectionService.getInspectionCount({ status: 'pending' }, locals.supabase),
			appointmentService.getAppointmentCount({ status: 'scheduled' }, locals.supabase),
			assessmentService.getAssessmentCount({ status: 'in_progress' }, locals.supabase),
			assessmentService.getAssessmentCount({ status: 'submitted' }, locals.supabase),
			frcService.getCountByStatus('in_progress', locals.supabase),
			additionalsService.getPendingCount(locals.supabase),
			assessmentService.getAssessmentCount({ status: 'archived' }, locals.supabase)
		]);

		return {
			inspectionCount,
			appointmentCount,
			assessmentCount,
			finalizedCount,
			frcCount,
			additionalsCount,
			archiveCount
		};
	} catch (error) {
		console.error('Error loading work overview:', error);
		return {
			inspectionCount: 0,
			appointmentCount: 0,
			assessmentCount: 0,
			finalizedCount: 0,
			frcCount: 0,
			additionalsCount: 0,
			archiveCount: 0,
			error: 'Failed to load work overview'
		};
	}
};

