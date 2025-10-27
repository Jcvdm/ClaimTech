import { engineerService } from '$lib/services/engineer.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const engineers = await engineerService.listEngineers(false, locals.supabase); // Get all engineers including inactive

		return {
			engineers
		};
	} catch (error) {
		console.error('Error loading engineers:', error);
		return {
			engineers: [],
			error: 'Failed to load engineers'
		};
	}
};

