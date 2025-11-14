import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { Database } from '$lib/types/database'

/**
 * Browser-side Supabase client with custom timeout configuration
 * This client is used in the browser and handles auth state automatically
 * For server-side operations with elevated permissions, use supabase-server.ts
 *
 * Timeout Configuration:
 * - Increased from default 10s to 30s to handle slow networks
 * - Prevents premature connection failures during high load
 * - Related to Bug #7: Finalize Force Click Supabase Auth Connection Timeout
 */
export const supabase = createBrowserClient<Database>(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY,
	{
		global: {
			headers: {
				'x-client-info': 'claimtech-browser'
			},
			// Custom fetch with 30s timeout
			fetch: (url, options = {}) => {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

				return fetch(url, {
					...options,
					signal: controller.signal
				}).finally(() => clearTimeout(timeoutId));
			}
		},
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		}
	}
)

