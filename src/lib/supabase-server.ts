import { createClient } from '@supabase/supabase-js'
import { Agent } from 'undici'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import type { Database } from '$lib/types/database'

/**
 * Server-side Supabase client with service role key and optimized configuration
 * Use this in API endpoints for operations that require elevated permissions
 * like storage uploads, bypassing RLS, etc.
 *
 * WARNING: Never expose this client to the browser!
 *
 * For authenticated server-side operations, use event.locals.supabase instead
 * which respects the user's auth session.
 *
 * Configuration Optimizations:
 * - 30s timeout for slow networks (up from default 10s)
 * - Connection keep-alive for connection pooling
 * - Custom headers for debugging
 * - Related to Bug #7: Finalize Force Click Supabase Auth Connection Timeout
 */
export const supabaseServer = createClient<Database>(
	PUBLIC_SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false
		},
        global: {
            headers: {
                'x-client-info': 'claimtech-server'
            },
            fetch: (url, options = {}) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
                const dispatcher = new Agent({ connect: { timeout: 30000 }, keepAliveTimeout: 60000, headersTimeout: 30000 });
                return fetch(url, { ...options, signal: controller.signal, dispatcher }).finally(() => clearTimeout(timeoutId));
            }
        },
        db: {
            schema: 'public'
        }
	}
)

