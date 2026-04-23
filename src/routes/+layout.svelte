<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { invalidate, afterNavigate } from '$app/navigation';
	import NavigationLoadingBar from '$lib/components/layout/NavigationLoadingBar.svelte';
	import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
	import OfflineIndicator from '$lib/offline/components/OfflineIndicator.svelte';
	import { syncManager } from '$lib/offline';

	let { children, data } = $props();

	// View Transitions snippet intentionally removed — diagnosing a mouse-wheel
	// scroll regression reported on Vercel preview (scrollbar works, wheel doesn't).
	// Two suspects: (1) onNavigate + document.startViewTransition leaving the
	// page in a stuck-transition state that blocks wheel events, (2) bits-ui
	// Dialog/DropdownMenu BodyScrollLock leaking pointerEvents:none / overflow:
	// hidden on <body> after close. NavigationLoadingBar stays as the sole
	// global loading indicator.

	// Defensive belt-and-braces: reset any leaked body-style locks after every
	// navigation. bits-ui applies these when Dialog/Sheet/DropdownMenu opens;
	// if cleanup races with View Transitions or SvelteKit nav, they can persist
	// and kill mouse-wheel scroll (scrollbar drag keeps working because it's
	// browser UI, not subject to pointer-events).
	afterNavigate(() => {
		document.body.style.pointerEvents = '';
		document.body.style.overflow = '';
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
