import { createServerClient } from '@supabase/ssr'
import { Agent } from 'undici'
import { type Handle, redirect } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import type { Database } from '$lib/types/database'

const supabase: Handle = async ({ event, resolve }) => {
	/**
	 * Creates a Supabase client specific to this server request with optimized configuration.
	 *
	 * The Supabase client gets the Auth token from the request cookies.
	 *
	 * Configuration Optimizations:
	 * - 30s timeout for slow networks (up from default 10s)
	 * - Connection keep-alive for connection pooling
	 * - Related to Bug #7: Finalize Force Click Supabase Auth Connection Timeout
	 */
	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				/**
				 * SvelteKit's cookies API requires `path` to be explicitly set in
				 * the cookie options. Setting `path` to `/` replicates previous/
				 * standard behavior.
				 *
				 * SECURITY: Override Supabase cookie options to make cookies session-only.
				 * This ensures cookies are cleared when the browser closes, requiring
				 * re-authentication for better security on sensitive data (insurance claims).
				 *
				 * By removing maxAge and expires, cookies become session-only (not persistent).
				 * Users must log in again after closing the browser.
				 */
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, {
							...options,
							path: '/',
							maxAge: undefined,   // Remove long expiration (no persistent cookies)
							expires: undefined,  // Make session-only (cleared on browser close)
						})
					})
				},
			},
            global: {
                headers: {
                    'x-client-info': 'claimtech-ssr'
                },
                fetch: (url, options = {}) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
                    const dispatcher = new Agent({ connect: { timeout: 30000 }, keepAliveTimeout: 60000, headersTimeout: 30000 });
                    return fetch(url, { ...options, signal: controller.signal, dispatcher }).finally(() => clearTimeout(timeoutId));
                }
            }
        }
    )

	/**
	 * Unlike `supabase.auth.getSession()`, which returns the session _without_
	 * validating the JWT, this function also calls `getUser()` to validate the
	 * JWT before returning the session.
	 *
	 * NOTE: The getSession() call below triggers a Supabase warning about insecure usage.
	 * This is a FALSE POSITIVE - the code is secure because:
	 * 1. getSession() retrieves the session from cookies
	 * 2. Immediately followed by getUser() which validates the JWT (line 49)
	 * 3. This is the recommended pattern from Supabase SSR documentation
	 *
	 * The warning is generic and doesn't detect the validation that follows.
	 * See: https://supabase.com/docs/guides/auth/server-side/sveltekit
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session },
		} = await event.locals.supabase.auth.getSession()
		if (!session) {
			return { session: null, user: null }
		}

		const {
			data: { user },
			error,
		} = await event.locals.supabase.auth.getUser()
		if (error) {
			// JWT validation has failed
			return { session: null, user: null }
		}

		return { session, user }
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			/**
			 * Supabase libraries use the `content-range` and `x-supabase-api-version`
			 * headers, so we need to tell SvelteKit to pass it through.
			 */
			return name === 'content-range' || name === 'x-supabase-api-version'
		},
	})
}

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession()
	event.locals.session = session
	event.locals.user = user

	// Explicit root route handling
	if (event.url.pathname === '/') {
		redirect(303, session ? '/dashboard' : '/auth/login')
	}

	// Public routes that don't require authentication
	const publicRoutes = ['/auth/login', '/auth/callback', '/auth/confirm', '/auth/forgot-password']
	const isPublicRoute = publicRoutes.some(route => event.url.pathname.startsWith(route))

	// If not authenticated and trying to access protected route, redirect to login
	if (!session && !isPublicRoute) {
		redirect(303, '/auth/login')
	}

	// If authenticated and trying to access auth pages, redirect to dashboard
	if (session && isPublicRoute && event.url.pathname !== '/auth/callback' && event.url.pathname !== '/auth/confirm') {
		redirect(303, '/dashboard')
	}

	return resolve(event)
}

export const handle: Handle = sequence(supabase, authGuard)

