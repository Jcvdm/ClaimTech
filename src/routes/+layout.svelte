<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { invalidate, onNavigate } from '$app/navigation';
	import NavigationLoadingBar from '$lib/components/layout/NavigationLoadingBar.svelte';
	import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
	import OfflineIndicator from '$lib/offline/components/OfflineIndicator.svelte';
	import { syncManager } from '$lib/offline';

	let { children, data } = $props();

	// Cross-fade page navigations via the View Transitions API (Chromium/Safari/Edge).
	// Firefox has no-op pass-through until it ships the API.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Listen for auth state changes (login, logout, token refresh)
	onMount(() => {
		const {
			data: { subscription }
		} = data.supabase.auth.onAuthStateChange((event, _session) => {
			// If session changed (expired, revoked, refreshed), reload auth-dependent data
			// This ensures the app reacts to auth changes in real-time
			if (_session?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		// Set up sync manager with Supabase client
		syncManager.setSupabaseClient(data.supabase);

		// Cleanup subscription on unmount
		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Offline indicator banner -->
<OfflineIndicator position="top" showWhenOnline={true} />

<NavigationLoadingBar />
<InstallPrompt />

{@render children?.()}
