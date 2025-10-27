import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { session, user, supabase } = locals;

	if (!session || !user) {
		redirect(303, '/auth/login');
	}

	// Get user profile with role
	const { data: profile, error: profileError } = await supabase
		.from('user_profiles')
		.select('id, email, full_name, role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		console.error('Error loading user profile:', profileError);
		redirect(303, '/auth/login');
	}

	// Get engineer_id if user is engineer
	let engineer_id: string | null = null;
	if (profile.role === 'engineer') {
		const { data: engineer, error: engineerError } = await supabase
			.from('engineers')
			.select('id')
			.eq('auth_user_id', user.id)
			.single();

		if (!engineerError && engineer) {
			engineer_id = engineer.id;
		}
	}

	// Admin-only routes
	const adminOnlyPaths = [
		'/engineers',
		'/clients',
		'/requests',
		'/repairers',
		'/settings'
	];

	const isAdminOnlyPath = adminOnlyPaths.some(path => url.pathname.startsWith(path));

	// Redirect non-admins trying to access admin-only routes
	if (isAdminOnlyPath && profile.role !== 'admin') {
		redirect(303, '/dashboard');
	}

	return {
		session,
		user: profile,
		role: profile.role,
		engineer_id: engineer_id
	};
};
