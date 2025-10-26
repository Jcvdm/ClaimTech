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

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { role, engineer_id } = await parent();

	// Engineers only see their own data
	const isEngineer = role === 'engineer';

	// Load counts for each work category
	// For engineers: filter by their engineer_id, For admins: see all
	const [newRequestCount, inspectionCount, appointmentCount, assessmentCount, finalizedCount, frcCount, additionalsCount] = await Promise.all([
		isEngineer ? 0 : requestService.getRequestCount({ status: 'submitted' }, locals.supabase), // Engineers don't handle requests
		isEngineer ? 0 : inspectionService.getInspectionCount({ status: 'pending' }, locals.supabase), // Engineers don't handle inspections directly
		appointmentService.getAppointmentCount(
			isEngineer ? { status: 'scheduled', engineer_id } : { status: 'scheduled' },
			locals.supabase
		),
		assessmentService.getInProgressCount(locals.supabase, isEngineer ? engineer_id : undefined),
		assessmentService.getFinalizedCount(locals.supabase, isEngineer ? engineer_id : undefined),
		frcService.getCountByStatus('in_progress', locals.supabase, isEngineer ? engineer_id : undefined),
		additionalsService.getPendingCount(locals.supabase, isEngineer ? engineer_id : undefined)
	]);

	// Load recent items for activity feed
	// Engineers only see their assigned work
	const [recentRequests, recentInspections, recentAppointments, recentAssessments] = await Promise.all([
		isEngineer ? [] : requestService.listRequests({ status: 'submitted' }, locals.supabase).then(items => items.slice(0, 5)),
		isEngineer ? [] : inspectionService.listInspections({ status: 'pending' }, locals.supabase).then(items => items.slice(0, 5)),
		appointmentService.listAppointments(
			isEngineer ? { status: 'scheduled', engineer_id } : { status: 'scheduled' },
			locals.supabase
		).then(items => items.slice(0, 5)),
		assessmentService.getInProgressAssessments(locals.supabase, isEngineer ? engineer_id : undefined).then(items => items.slice(0, 5))
	]);

	// Fetch completed assessments for time tracking (last 30 days)
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Build query for completed assessments
	let assessmentQuery = locals.supabase
		.from('assessments')
		.select('started_at, submitted_at, created_at, appointment_id, appointments!inner(engineer_id)')
		.eq('status', 'submitted')
		.gte('submitted_at', thirtyDaysAgo.toISOString())
		.order('submitted_at', { ascending: false });

	// Filter by engineer if not admin
	if (isEngineer && engineer_id) {
		assessmentQuery = assessmentQuery.eq('appointments.engineer_id', engineer_id);
	}

	const { data: completedAssessments } = await assessmentQuery;

	// Fetch completed FRCs for time tracking (last 30 days)
	let frcQuery = locals.supabase
		.from('assessment_frc')
		.select('started_at, completed_at, created_at, assessment_id, assessments!inner(appointment_id, appointments!inner(engineer_id))')
		.eq('status', 'completed')
		.gte('completed_at', thirtyDaysAgo.toISOString())
		.order('completed_at', { ascending: false });

	// Filter by engineer if not admin
	if (isEngineer && engineer_id) {
		frcQuery = frcQuery.eq('assessments.appointments.engineer_id', engineer_id);
	}

	const { data: completedFRCs } = await frcQuery;

	// Calculate average times
	const avgAssessmentTime = calculateAverageDays(
		(completedAssessments || []).map(a => ({ start: a.started_at, end: a.submitted_at }))
	);

	const avgFRCTime = calculateAverageDays(
		(completedFRCs || []).map(f => ({ start: f.started_at, end: f.completed_at }))
	);

	// Calculate total workflow time (request created to assessment finalized)
	let workflowQuery = locals.supabase
		.from('assessments')
		.select(`
			submitted_at,
			requests!inner(created_at),
			appointments!inner(engineer_id)
		`)
		.eq('status', 'submitted')
		.gte('submitted_at', thirtyDaysAgo.toISOString());

	// Filter by engineer if not admin
	if (isEngineer && engineer_id) {
		workflowQuery = workflowQuery.eq('appointments.engineer_id', engineer_id);
	}

	const { data: workflowData } = await workflowQuery;

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

