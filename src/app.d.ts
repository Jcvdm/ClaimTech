// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
/// <reference types="@types/google.maps" />
import { SupabaseClient, Session } from '@supabase/supabase-js'
import type { Database } from '$lib/types/database'

declare global {
	// Google Maps types for address autocomplete
	interface Window {
		google: typeof google;
	}

	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>
			session: Session | null
			user: User | null
		}
		interface PageData {
			session: Session | null
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
