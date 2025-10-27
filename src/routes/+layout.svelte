<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';

	let { children, data } = $props();

	// Listen for auth state changes (login, logout, token refresh)
	onMount(() => {
		const { data: { subscription } } = data.supabase.auth.onAuthStateChange(
			(event, _session) => {
				// If session changed (expired, revoked, refreshed), reload auth-dependent data
				// This ensures the app reacts to auth changes in real-time
				if (_session?.expires_at !== data.session?.expires_at) {
					invalidate('supabase:auth');
				}
			}
		);

		// Cleanup subscription on unmount
		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
