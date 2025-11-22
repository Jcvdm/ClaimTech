import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { supabaseServer } from '$lib/supabase-server';
import { engineerService } from '$lib/services/engineer.service';

export const actions: Actions = {
	default: async ({ request, url, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const phone = formData.get('phone') as string;
		const province = formData.get('province') as string;
		const specialization = formData.get('specialization') as string;
		const company_name = formData.get('company_name') as string;
		const company_type = formData.get('company_type') as string;

		if (!name || !email) {
			return fail(400, { error: 'Name and email are required' });
		}

		// Generate a temporary password
		const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

		// Create auth user with admin API
		const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
			email: email,
			password: tempPassword,
			email_confirm: true,
			user_metadata: {
				full_name: name,
				role: 'engineer'
			}
		});

		if (authError) {
			console.error('Error creating auth user:', authError);
			return fail(400, { error: `Failed to create user account: ${authError.message}` });
		}

		if (!authData.user) {
			return fail(400, { error: 'Failed to create user account' });
		}

		// Create engineer record
		const engineerData = {
			name,
			email,
			phone: phone || undefined,
			province: (province || undefined) as import('$lib/types/engineer').Province | undefined,
			specialization: specialization || undefined,
			company_name: company_name || undefined,
			company_type: company_type as any || undefined,
			auth_user_id: authData.user.id
		};

		let engineer;
		try {
			engineer = await engineerService.createEngineer(engineerData, locals.supabase);
		} catch (err) {
			console.error('Error creating engineer record:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create engineer record'
			});
		}

		// Trigger password reset email (non-blocking)
		const { error: resetError } = await supabaseServer.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/auth/confirm?type=recovery&next=/account/set-password`
		});

		if (resetError) {
			console.error('Error sending password reset email:', resetError);
			// Don't fail - engineer is created, they can request password reset manually
		}

		// Redirect to engineer detail page (NOT in try-catch - this throws a Redirect object)
		redirect(303, `/engineers/${engineer.id}`);
	}
};
