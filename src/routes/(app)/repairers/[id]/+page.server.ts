import { repairerService } from '$lib/services/repairer.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const repairer = await repairerService.getRepairer(params.id, locals.supabase);

		if (!repairer) {
			throw error(404, 'Repairer not found');
		}

		return {
			repairer
		};
	} catch (err) {
		console.error('Error loading repairer:', err);
		throw error(500, 'Failed to load repairer');
	}
};

