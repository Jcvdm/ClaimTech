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

	/**
	 * Create browser client with custom timeout configuration
	 * - 30s timeout for slow networks (up from default 10s)
	 * - Related to Bug #7: Finalize Force Click Supabase Auth Connection Timeout
	 */
	const supabase = createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			fetch: (url, options = {}) => {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

				return fetch(url, {
					...options,
					signal: controller.signal
				}).finally(() => clearTimeout(timeoutId));
			},
			headers: {
				'x-client-info': 'claimtech-layout'
			}
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

