import { redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
	default: async ({ locals: { supabase }, cookies }) => {
		// Sign out with global scope - terminates all sessions across all devices
		await supabase.auth.signOut({ scope: 'global' })

		// Explicitly delete all Supabase cookies
		// This ensures complete cleanup even if signOut() doesn't remove all cookies
		// Critical for security: prevents old session tokens from persisting in browser
		const allCookies = cookies.getAll()
		allCookies.forEach(cookie => {
			if (cookie.name.startsWith('sb-')) {
				cookies.delete(cookie.name, { path: '/' })
			}
		})

		redirect(303, '/auth/login')
	}
}
