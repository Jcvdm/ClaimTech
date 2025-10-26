import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	try {
		// Get role and engineer_id from parent layout
		const { role, engineer_id } = await parent();
		const isEngineer = role === 'engineer';

		// Query assessments at inspection_scheduled stage
		// In assessment-centric model, this represents assessments ready for inspection scheduling
		let query = locals.supabase
			.from('assessments')
			.select(`
				*,
				request:requests!inner(
					*,
					client:clients(*)
				)
			`)
			.eq('stage', 'inspection_scheduled')
			.order('updated_at', { ascending: false });

		// Engineer filtering
		if (isEngineer && engineer_id) {
			query = query.eq('request.assigned_engineer_id', engineer_id);
		}

		const { data: assessments, error } = await query;

		if (error) {
			console.error('Error loading assessments for inspection:', error);
			return {
				assessments: [],
				error: 'Failed to load assessments'
			};
		}

		return {
			assessments: assessments || []
		};
	} catch (error) {
		console.error('Error loading inspections page:', error);
		return {
			assessments: [],
			error: 'Failed to load page'
		};
	}
};

