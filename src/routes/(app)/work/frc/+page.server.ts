import type { PageServerLoad } from './$types';
import { frcService } from '$lib/services/frc.service';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { role, engineer_id } = await parent();
	const isEngineer = role === 'engineer';

	try {
		// Engineers only see their own FRC records
		const frcRecords = await frcService.listFRC(
			isEngineer && engineer_id ? { engineer_id } : undefined,
			locals.supabase
		);

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

