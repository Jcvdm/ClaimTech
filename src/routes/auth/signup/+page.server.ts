import { fail } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
	default: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData()
		const email = formData.get('email') as string
		const password = formData.get('password') as string
		const full_name = formData.get('full_name') as string
		const role = formData.get('role') as string

		if (!email || !password || !full_name || !role) {
			return fail(400, { error: 'All fields are required' })
		}

		if (password.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters' })
		}

		if (!['admin', 'engineer'].includes(role)) {
			return fail(400, { error: 'Invalid role selected' })
		}

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name,
					role,
				},
				emailRedirectTo: `${url.origin}/auth/callback`,
			},
		})

		if (error) {
			console.error('Signup error:', error)
			return fail(400, { error: error.message })
		}

		return { success: true }
	},
}

