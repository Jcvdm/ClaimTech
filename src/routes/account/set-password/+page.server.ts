import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!password || !confirmPassword) {
			return fail(400, { error: 'All fields are required' });
		}

		if (password.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match' });
		}

		const { error } = await supabase.auth.updateUser({
			password: password
		});

		if (error) {
			console.error('Password update error:', error);
			return fail(400, { error: error.message });
		}

		// Redirect to dashboard after successful password reset
		redirect(303, '/dashboard');
	}
};
