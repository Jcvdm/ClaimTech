import { engineerService } from '$lib/services/engineer.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const engineer = await engineerService.getEngineer(params.id);

		if (!engineer) {
			throw error(404, 'Engineer not found');
		}

		return {
			engineer
		};
	} catch (err) {
		console.error('Error loading engineer:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load engineer');
	}
};

