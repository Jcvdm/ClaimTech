import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabase';

export const load: PageServerLoad = async () => {
	// Fetch finalized assessments (status = 'submitted')
	// Pull vehicle data from assessment_vehicle_identification (updated during assessment)
	// instead of requests table (original data from client submission)
	const { data: assessments, error: assessmentsError } = await supabase
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
			appointment:appointments(
				id,
				appointment_number,
				appointment_date,
				appointment_time,
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
		.eq('status', 'submitted')
		.order('estimate_finalized_at', { ascending: false });

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

