import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code')
	const next = url.searchParams.get('next') ?? '/dashboard'
	const type = url.searchParams.get('type')

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code)
		if (!error) {
			// If this is a password reset, redirect to reset password page
			if (type === 'recovery') {
				redirect(303, '/auth/reset-password')
			}
			redirect(303, next)
		}
	}

	// Return the user to an error page with some instructions
	redirect(303, '/auth/auth-code-error')
}

