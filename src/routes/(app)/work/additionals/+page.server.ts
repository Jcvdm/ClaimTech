import type { PageServerLoad } from './$types';
import { additionalsService } from '$lib/services/additionals.service';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { role, engineer_id } = await parent();
	const isEngineer = role === 'engineer';

	try {
		// Engineers only see their own additionals records
		const additionalsRecords = await additionalsService.listAdditionals(
			locals.supabase,
			isEngineer ? engineer_id : undefined
		);

		return {
			additionalsRecords
		};
	} catch (error) {
		console.error('Error loading additionals records:', error);
		return {
			additionalsRecords: [],
			error: 'Failed to load additionals records'
		};
	}
};

