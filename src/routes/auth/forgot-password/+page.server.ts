import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;

		if (!email) {
			return fail(400, { error: 'Email is required' });
		}

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/auth/confirm?type=recovery&next=/account/set-password`
		});

		if (error) {
			console.error('Password reset error:', error);
			// Don't reveal if email exists or not for security
			return { success: true };
		}

		return { success: true };
	}
};
