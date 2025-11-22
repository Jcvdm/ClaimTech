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

	/**
	 * Retry helper with exponential backoff
	 * Attempts the function up to 3 times with increasing delays
	 */
    async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
        let lastErr: any;
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (e) {
                lastErr = e;
                await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
            }
        }
        throw lastErr;
    }

	/**
	 * Timeout wrapper with graceful fallback
	 * Prevents dashboard from crashing if a count query times out
	 * Returns fallback value (0) if timeout or error occurs
	 */
	async function withTimeout<T>(
		fn: () => Promise<T>,
		timeoutMs: number = 15000,
		fallback: T
	): Promise<T> {
		return Promise.race([
			fn(),
			new Promise<T>((_, reject) =>
				setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
			)
		]).catch((err) => {
			console.warn('Count query failed, using fallback:', {
				error: err.message,
				code: err.code,
				fallback
			});
			return fallback;
		});
	}

    const countsResults = await Promise.allSettled([
        isEngineer ? Promise.resolve(0) : withTimeout(
			() => withRetry(() => requestService.getRequestCount({ status: 'submitted' }, locals.supabase)),
			15000,
			0
		),
        isEngineer ? Promise.resolve(0) : withTimeout(
			() => withRetry(() => inspectionService.getInspectionCount({ status: 'pending' }, locals.supabase)),
			15000,
			0
		),
        withTimeout(
			() => withRetry(() => appointmentService.getAppointmentCount(
				isEngineer ? { status: 'scheduled', engineer_id: engineer_id ?? undefined } : { status: 'scheduled' },
				locals.supabase
			)),
			15000,
			0
		),
        withTimeout(
			() => withRetry(() => assessmentService.getInProgressCount(locals.supabase, isEngineer ? engineer_id : undefined)),
			15000,
			0
		),
        withTimeout(
			() => withRetry(() => assessmentService.getFinalizedCount(locals.supabase, isEngineer ? engineer_id : undefined)),
			15000,
			0
		),
        withTimeout(
			() => withRetry(() => frcService.getCountByStatus('in_progress', locals.supabase, isEngineer ? engineer_id : undefined)),
			15000,
			0
		),
        withTimeout(
			() => withRetry(() => additionalsService.getPendingCount(locals.supabase, isEngineer ? engineer_id : undefined)),
			15000,
			0
		)
    ]);

    const [newRequestCount, inspectionCount, appointmentCount, assessmentCount, finalizedCount, frcCount, additionalsCount] = countsResults.map((r) => r.status === 'fulfilled' ? r.value as number : 0);

	// Load recent items for activity feed
	// Engineers only see their assigned work
	const [recentRequests, recentInspections, recentAppointments, recentAssessments] = await Promise.all([
		isEngineer ? Promise.resolve([]) : requestService.listRequests({ status: 'submitted' }, locals.supabase).then(items => items.slice(0, 5)),
		isEngineer ? Promise.resolve([]) : inspectionService.listInspections({ status: 'pending' }, locals.supabase).then(items => items.slice(0, 5)),
		appointmentService.listAppointments(
			isEngineer ? { status: 'scheduled', engineer_id: engineer_id ?? undefined } : { status: 'scheduled' },
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
		.eq('stage', 'estimate_finalized')
		.gte('submitted_at', thirtyDaysAgo.toISOString())
		.order('submitted_at', { ascending: false});

	// Filter by engineer if not admin
	if (isEngineer && engineer_id) {
		assessmentQuery = assessmentQuery.eq('appointments.engineer_id', engineer_id);
	}

	const { data: completedAssessments } = await assessmentQuery;

	// Fetch completed FRCs for time tracking (last 30 days)
	// RLS policies automatically filter by engineer for non-admin users
	const { data: completedFRCs } = await locals.supabase
		.from('assessment_frc')
		.select('started_at, completed_at, created_at, assessment_id')
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
	let workflowQuery = locals.supabase
		.from('assessments')
		.select(`
			submitted_at,
			requests!inner(created_at),
			appointments!inner(engineer_id)
		`)
		.eq('stage', 'estimate_finalized')
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

