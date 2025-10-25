import type { PageServerLoad } from './$types';
import { requestService } from '$lib/services/request.service';
import { inspectionService } from '$lib/services/inspection.service';
import { appointmentService } from '$lib/services/appointment.service';
import { assessmentService } from '$lib/services/assessment.service';
import { frcService } from '$lib/services/frc.service';
import { additionalsService } from '$lib/services/additionals.service';

/**
 * Calculate average time between two timestamps in days
 */
function calculateAverageDays(items: Array<{ start: string | null; end: string | null }>): number {
	const validItems = items.filter(item => item.start && item.end);
	if (validItems.length === 0) return 0;

	const totalDays = validItems.reduce((sum, item) => {
		const start = new Date(item.start!).getTime();
		const end = new Date(item.end!).getTime();
		const days = (end - start) / (1000 * 60 * 60 * 24);
		return sum + days;
	}, 0);

	return Math.round((totalDays / validItems.length) * 10) / 10; // Round to 1 decimal
}

export const load: PageServerLoad = async ({ locals }) => {
	// Load counts for each work category
	const [newRequestCount, inspectionCount, appointmentCount, assessmentCount, finalizedCount, frcCount, additionalsCount] = await Promise.all([
		requestService.getRequestCount({ status: 'submitted' }, locals.supabase),
		inspectionService.getInspectionCount({ status: 'pending' }, locals.supabase),
		appointmentService.getAppointmentCount({ status: 'scheduled' }, locals.supabase),
		assessmentService.getInProgressCount(locals.supabase),
		assessmentService.getFinalizedCount(locals.supabase),
		frcService.getCountByStatus('in_progress', locals.supabase),
		additionalsService.getPendingCount(locals.supabase)
	]);

	// Load recent items for activity feed
	const [recentRequests, recentInspections, recentAppointments, recentAssessments] = await Promise.all([
		requestService.listRequests({ status: 'submitted' }, locals.supabase).then(items => items.slice(0, 5)),
		inspectionService.listInspections({ status: 'pending' }, locals.supabase).then(items => items.slice(0, 5)),
		appointmentService.listAppointments({ status: 'scheduled' }, locals.supabase).then(items => items.slice(0, 5)),
		assessmentService.getInProgressAssessments(locals.supabase).then(items => items.slice(0, 5))
	]);

	// Fetch completed assessments for time tracking (last 30 days)
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const { data: completedAssessments } = await locals.supabase
		.from('assessments')
		.select('started_at, submitted_at, created_at')
		.eq('status', 'submitted')
		.gte('submitted_at', thirtyDaysAgo.toISOString())
		.order('submitted_at', { ascending: false });

	// Fetch completed FRCs for time tracking (last 30 days)
	const { data: completedFRCs } = await locals.supabase
		.from('assessment_frc')
		.select('started_at, completed_at, created_at')
		.eq('status', 'completed')
		.gte('completed_at', thirtyDaysAgo.toISOString())
		.order('completed_at', { ascending: false });

	// Calculate average times
	const avgAssessmentTime = calculateAverageDays(
		(completedAssessments || []).map(a => ({ start: a.started_at, end: a.submitted_at }))
	);

	const avgFRCTime = calculateAverageDays(
		(completedFRCs || []).map(f => ({ start: f.started_at, end: f.completed_at }))
	);

	// Calculate total workflow time (request created to assessment finalized)
	const { data: workflowData } = await locals.supabase
		.from('assessments')
		.select(`
			submitted_at,
			requests!inner(created_at)
		`)
		.eq('status', 'submitted')
		.gte('submitted_at', thirtyDaysAgo.toISOString());

	const avgTotalWorkflowTime = calculateAverageDays(
		(workflowData || []).map(item => ({
			start: (item.requests as any)?.created_at || null,
			end: item.submitted_at
		}))
	);

	return {
		counts: {
			requests: newRequestCount,
			inspections: inspectionCount,
			appointments: appointmentCount,
			assessments: assessmentCount,
			finalized: finalizedCount,
			frc: frcCount,
			additionals: additionalsCount
		},
		timeMetrics: {
			avgAssessmentDays: avgAssessmentTime,
			avgFRCDays: avgFRCTime,
			avgTotalWorkflowDays: avgTotalWorkflowTime,
			completedLast30Days: (completedAssessments || []).length,
			completedFRCsLast30Days: (completedFRCs || []).length
		},
		recentActivity: [
			...recentRequests.map(r => ({ type: 'request', id: r.id, title: `Request ${r.request_number}`, updated_at: r.updated_at })),
			...recentInspections.map(i => ({ type: 'inspection', id: i.id, title: `Inspection ${i.inspection_number}`, updated_at: i.updated_at })),
			...recentAppointments.map(a => ({ type: 'appointment', id: a.id, title: `Appointment ${a.appointment_number}`, updated_at: a.updated_at })),
			...recentAssessments.map(a => ({ type: 'assessment', id: a.id, title: `Assessment ${a.assessment_number}`, updated_at: a.updated_at }))
		].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 10)
	};
};

