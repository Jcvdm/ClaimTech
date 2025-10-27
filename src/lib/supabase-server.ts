import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import type { Database } from '$lib/types/database'

/**
 * Server-side Supabase client with service role key
 * Use this in API endpoints for operations that require elevated permissions
 * like storage uploads, bypassing RLS, etc.
 *
 * WARNING: Never expose this client to the browser!
 *
 * For authenticated server-side operations, use event.locals.supabase instead
 * which respects the user's auth session.
 */
export const supabaseServer = createClient<Database>(
	PUBLIC_SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	}
)

