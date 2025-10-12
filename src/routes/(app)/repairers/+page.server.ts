import { repairerService } from '$lib/services/repairer.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const repairers = await repairerService.listRepairers(true);
		return {
			repairers
		};
	} catch (error) {
		console.error('Error loading repairers:', error);
		return {
			repairers: [],
			error: 'Failed to load repairers'
		};
	}
};

