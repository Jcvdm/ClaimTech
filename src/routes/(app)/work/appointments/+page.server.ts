import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { role, engineer_id } = await parent();
	const isEngineer = role === 'engineer';

	try {
		// Query assessments at appointment-related stages
		// In assessment-centric model, appointments are scheduled when stage = 'appointment_scheduled'
		// and may be in progress when stage = 'assessment_in_progress'
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
			.in('stage', ['appointment_scheduled', 'assessment_in_progress'])
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

