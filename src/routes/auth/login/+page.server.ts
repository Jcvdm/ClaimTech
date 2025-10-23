import { redirect, fail } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData()
		const email = formData.get('email') as string
		const password = formData.get('password') as string

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' })
		}

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		})

		if (error) {
			console.error('Login error:', error)
			return fail(400, { error: 'Invalid email or password' })
		}

		redirect(303, '/')
	},
}

