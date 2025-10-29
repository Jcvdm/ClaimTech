import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	try {
		// Get role and engineer_id from parent layout
		const { role, engineer_id } = await parent();
		const isEngineer = role === 'engineer';

		// Query assessments at inspection_scheduled stage
		// In assessment-centric model, this represents assessments ready for inspection scheduling

		// ASSESSMENT-CENTRIC FILTERING: Different query for engineers vs admins
		let query;

		if (isEngineer && engineer_id) {
			// ENGINEER VIEW: Use INNER JOIN with inspections to filter by assigned_engineer_id
			// This ensures we only see assessments where inspection is assigned to this engineer
			query = locals.supabase
				.from('assessments')
				.select(`
					*,
					request:requests!inner(
						*,
						client:clients(*)
					),
					inspection:inspections!inner(*)
				`)
				.eq('stage', 'inspection_scheduled')
				.eq('inspection.assigned_engineer_id', engineer_id)
				.order('updated_at', { ascending: false });
		} else {
			// ADMIN VIEW: Use LEFT JOIN to see all assessments (even those without inspection)
			query = locals.supabase
				.from('assessments')
				.select(`
					*,
					request:requests!inner(
						*,
						client:clients(*)
					),
					inspection:inspections(*)
				`)
				.eq('stage', 'inspection_scheduled')
				.order('updated_at', { ascending: false });
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

