import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user, supabase } = locals;

	if (!session || !user) {
		redirect(303, '/auth/shop-login');
	}

	// Get user profile with role
	const { data: profile, error: profileError } = await supabase
		.from('user_profiles')
		.select('id, email, full_name, role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		console.error('Error loading user profile:', profileError);
		redirect(303, '/auth/shop-login');
	}

	return {
		session,
		user: profile,
		role: profile.role
	};
};
