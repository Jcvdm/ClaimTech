import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { role, engineer_id } = await parent();
	const isEngineer = role === 'engineer';

	try {
		// Query assessments at appointment_scheduled stage only
		// Once assessment starts (stage = 'assessment_in_progress'), it moves to Open Assessments page
		// This prevents appointments from staying visible after "Start Assessment" is clicked
		let query = locals.supabase
			.from('assessments')
			.select(`
				*,
				request:requests!inner(
					*,
					client:clients(*)
				),
				appointment:appointments!inner(
					*,
					engineer:engineers(*)
				)
			`)
			.eq('stage', 'appointment_scheduled')
			.order('updated_at', { ascending: false });

		// Engineer filtering
		if (isEngineer && engineer_id) {
			query = query.eq('appointment.engineer_id', engineer_id);
		}

		const { data: assessments, error } = await query;

		if (error) {
			console.error('Error loading assessments with appointments:', error);
			return {
				assessments: [],
				error: 'Failed to load appointments'
			};
		}

		return {
			assessments: assessments || []
		};
	} catch (error) {
		console.error('Error loading appointments page:', error);
		return {
			assessments: [],
			error: 'Failed to load page'
		};
	}
};

