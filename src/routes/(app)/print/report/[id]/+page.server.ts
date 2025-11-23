import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getClientByRequestId, getRepairerForEstimate } from '$lib/utils/supabase-query-helpers';
import { normalizeEstimate } from '$lib/utils/type-normalizers';
import { getBrandLogoBase64 } from '$lib/utils/branding';

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

	// Fetch all related data needed for report (excluding client and repairer which have nested dependencies)
	const [
		{ data: vehicleIdentification },
		{ data: exterior360 },
		{ data: interiorMechanical },
		{ data: tyres },
		{ data: damage },
		{ data: vehicleValues },
		{ data: estimate },
		{ data: companySettings },
		{ data: requestData }
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
		locals.supabase.from('requests').select('*').eq('id', assessment.request_id).single()
	]);

	// Fetch client and repairer sequentially (they have nested dependencies)
	const { data: client } = await getClientByRequestId(
		assessment.request_id,
		locals.supabase
	);

	const normalizedEstimate = normalizeEstimate(estimate);

	const { data: repairer } = await getRepairerForEstimate(
		normalizedEstimate,
		locals.supabase
	);

	return {
		assessment,
		vehicleIdentification,
		exterior360,
		interiorMechanical,
		tyres: tyres || [],
		damage: damage || [],
		vehicleValues,
		estimate: normalizedEstimate,
		companySettings,
		request: requestData,
		client,
		logoBase64: getBrandLogoBase64(),
		repairer
	};
};

