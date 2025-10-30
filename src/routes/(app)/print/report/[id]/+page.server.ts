import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const assessmentId = params.id;

	// Fetch assessment data
	const { data: assessment, error: assessmentError } = await locals.supabase
		.from('assessments')
		.select('*')
		.eq('id', assessmentId)
		.single();

	if (assessmentError || !assessment) {
		throw error(404, 'Assessment not found');
	}

	// Fetch all related data needed for report
	const [
		{ data: vehicleIdentification },
		{ data: exterior360 },
		{ data: interiorMechanical },
		{ data: tyres },
		{ data: damage },
		{ data: vehicleValues },
		{ data: estimate },
		{ data: companySettings },
		{ data: requestData },
		{ data: client }
	] = await Promise.all([
		locals.supabase
			.from('assessment_vehicle_identification')
			.select('*')
			.eq('assessment_id', assessmentId)
			.single(),
		locals.supabase
			.from('assessment_360_exterior')
			.select('*')
			.eq('assessment_id', assessmentId)
			.single(),
		locals.supabase
			.from('assessment_interior_mechanical')
			.select('*')
			.eq('assessment_id', assessmentId)
			.single(),
		locals.supabase
			.from('assessment_tyres')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('position', { ascending: true }),
		locals.supabase
			.from('assessment_damage')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('created_at', { ascending: true }),
		locals.supabase
			.from('assessment_vehicle_values')
			.select('*')
			.eq('assessment_id', assessmentId)
			.single(),
		locals.supabase
			.from('assessment_estimates')
			.select('*')
			.eq('assessment_id', assessmentId)
			.single(),
		locals.supabase.from('company_settings').select('*').single(),
		locals.supabase.from('requests').select('*').eq('id', assessment.request_id).single(),
		assessment.request_id
			? locals.supabase
					.from('requests')
					.select('client_id')
					.eq('id', assessment.request_id)
					.single()
					.then(({ data }) =>
						data
							? locals.supabase.from('clients').select('*').eq('id', data.client_id).single()
							: { data: null }
					)
			: Promise.resolve({ data: null })
	]);

	// Fetch repairer
	const { data: repairer } = estimate?.repairer_id
		? await locals.supabase.from('repairers').select('*').eq('id', estimate.repairer_id).single()
		: { data: null };

	return {
		assessment,
		vehicleIdentification,
		exterior360,
		interiorMechanical,
		tyres: tyres || [],
		damage: damage || [],
		vehicleValues,
		estimate,
		companySettings,
		request: requestData,
		client,
		repairer
	};
};

