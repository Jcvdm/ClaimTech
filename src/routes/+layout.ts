import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { LayoutLoad } from './$types'
import type { Database } from '$lib/types/database'

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	/**
	 * Declare a dependency so the layout can be invalidated, for example, on
	 * session refresh.
	 */
	depends('supabase:auth')

	const supabase = createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			fetch,
		},
	})

	/**
	 * Use session from parent data which was already validated by the server
	 * using safeGetSession(). This avoids the security warning from calling
	 * getSession() directly.
	 */
	const { session, user } = data

	return { session, supabase, user }
}

