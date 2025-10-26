import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { role, engineer_id } = await parent();
	const isEngineer = role === 'engineer';

	// Fetch finalized assessments (status = 'submitted')
	// Pull vehicle data from assessment_vehicle_identification (updated during assessment)
	// instead of requests table (original data from client submission)
	let query = locals.supabase
		.from('assessments')
		.select(
			`
			*,
			vehicle_identification:assessment_vehicle_identification(
				vehicle_make,
				vehicle_model,
				vehicle_year,
				registration_number,
				vin_number
			),
			appointment:appointments!inner(
				id,
				appointment_number,
				appointment_date,
				appointment_time,
				engineer_id,
				inspection:inspections(
					id,
					inspection_number,
					request:requests(
						id,
						request_number,
						client:clients(
							id,
							name,
							type
						)
					)
				)
			)
		`
		)
		.eq('status', 'submitted');

	// Engineers only see their own finalized assessments
	if (isEngineer && engineer_id) {
		query = query.eq('appointment.engineer_id', engineer_id);
	}

	query = query.order('estimate_finalized_at', { ascending: false });

	const { data: assessments, error: assessmentsError } = await query;

	if (assessmentsError) {
		console.error('Error fetching finalized assessments:', assessmentsError);
		return {
			assessments: []
		};
	}

	return {
		assessments: assessments || []
	};
};

