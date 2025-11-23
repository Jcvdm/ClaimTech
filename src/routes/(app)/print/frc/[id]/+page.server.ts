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

	// Fetch related data (excluding client and repairer which have nested dependencies)
	const [
		{ data: vehicleIdentification },
		{ data: estimate },
		{ data: frcData },
		{ data: companySettings },
		{ data: requestData }
	] = await Promise.all([
		locals.supabase
			.from('assessment_vehicle_identification')
			.select('*')
			.eq('assessment_id', assessmentId)
			.single(),
		locals.supabase.from('assessment_estimates').select('*').eq('assessment_id', assessmentId).single(),
		locals.supabase.from('assessment_frc').select('*').eq('assessment_id', assessmentId).order('created_at', { ascending: false }),
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
		estimate: normalizedEstimate,
		frcData: frcData || [],
		companySettings,
		request: requestData,
		client,
		logoBase64: getBrandLogoBase64(),
		repairer
	};
};

