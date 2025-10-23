import type { PageServerLoad } from './$types';
import { frcService } from '$lib/services/frc.service';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const frcRecords = await frcService.listFRC(undefined, locals.supabase);

		return {
			frcRecords
		};
	} catch (error) {
		console.error('Error loading FRC records:', error);
		return {
			frcRecords: [],
			error: 'Failed to load FRC records'
		};
	}
};

