import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is authenticated, redirect to dashboard
	if (locals.session) {
		redirect(303, '/dashboard');
	}

	// If not authenticated, auth guard will redirect to login
	// But just in case, explicitly redirect here too
	redirect(303, '/auth/login');
};

