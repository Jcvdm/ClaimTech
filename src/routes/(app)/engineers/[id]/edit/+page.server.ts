import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { supabaseServer } from '$lib/supabase-server';
import { engineerService } from '$lib/services/engineer.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const engineer = await engineerService.getEngineer(params.id, locals.supabase);

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

export const actions: Actions = {
	// Default action - Update engineer details
	default: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const phone = formData.get('phone') as string;
		const province = formData.get('province') as string;
		const specialization = formData.get('specialization') as string;
		const company_name = formData.get('company_name') as string;
		const company_type = formData.get('company_type') as string;

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		try {
			// Prepare update data
			const engineerData = {
				name,
				phone: phone || undefined,
				province: province || undefined,
				specialization: specialization || undefined,
				company_name: company_name || undefined,
				company_type: company_type as any || undefined
			};

			// Update engineer
			await engineerService.updateEngineer(params.id, engineerData, locals.supabase);

			// Redirect to detail page
			redirect(303, `/engineers/${params.id}`);
		} catch (err) {
			console.error('Error updating engineer:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to update engineer'
			});
		}
	},

	// Named action - Resend password reset email
	resendPassword: async ({ params, locals, url }) => {
		try {
			// Get engineer to retrieve email
			const engineer = await engineerService.getEngineer(params.id, locals.supabase);

			if (!engineer) {
				return fail(404, { error: 'Engineer not found' });
			}

			// Send password reset email using admin API
			const { error: resetError } = await supabaseServer.auth.resetPasswordForEmail(
				engineer.email,
				{
					redirectTo: `${url.origin}/auth/reset-password`
				}
			);

			if (resetError) {
				console.error('Error sending password reset email:', resetError);
				return fail(400, {
					error: `Failed to send password reset email: ${resetError.message}`
				});
			}

			return {
				success: true,
				message: `Password reset email sent to ${engineer.email}`
			};
		} catch (err) {
			console.error('Error resending password reset:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to send password reset email'
			});
		}
	}
};
