import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { Database } from '$lib/types/database'

/**
 * Browser-side Supabase client
 * This client is used in the browser and handles auth state automatically
 * For server-side operations with elevated permissions, use supabase-server.ts
 */
export const supabase = createBrowserClient<Database>(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY
)

