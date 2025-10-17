import type { PageServerLoad } from './$types';
import { additionalsService } from '$lib/services/additionals.service';

export const load: PageServerLoad = async () => {
	try {
		const additionalsRecords = await additionalsService.listAdditionals();

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

