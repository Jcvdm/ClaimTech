<script lang="ts">
	import { networkStatus } from '../network-status.svelte';
	import { WifiOff, Wifi, AlertTriangle } from 'lucide-svelte';

	// Props
	interface Props {
		position?: 'top' | 'bottom';
		showWhenOnline?: boolean;
	}

	let { position = 'top', showWhenOnline = false }: Props = $props();

	// Derived display states
	const showOfflineBanner = $derived(!networkStatus.isOnline);
	const showSlowBanner = $derived(
		networkStatus.isOnline && networkStatus.connectionQuality === 'slow'
	);
	const showOnlineBanner = $derived(
		showWhenOnline &&
			networkStatus.isOnline &&
			networkStatus.lastOffline !== null &&
			Date.now() - networkStatus.lastOffline.getTime() < 5000
	);

	// Position classes
	const positionClasses = $derived(
		position === 'top' ? 'top-0 left-0 right-0' : 'bottom-0 left-0 right-0'
	);
</script>

<!-- Offline Banner -->
{#if showOfflineBanner}
	<div
		class="fixed {positionClasses} z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md"
	>
		<div class="flex items-center justify-center gap-2">
			<WifiOff class="h-4 w-4" />
			<span>You're offline — changes will sync when connected</span>
			{#if networkStatus.getOfflineDurationText()}
				<span class="text-amber-100">({networkStatus.getOfflineDurationText()})</span>
			{/if}
		</div>
	</div>
{/if}

<!-- Slow Connection Banner -->
{#if showSlowBanner}
	<div
		class="fixed {positionClasses} z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md"
	>
		<div class="flex items-center justify-center gap-2">
			<AlertTriangle class="h-4 w-4" />
			<span>Slow connection — some features may be delayed</span>
		</div>
	</div>
{/if}

<!-- Back Online Banner (temporary) -->
{#if showOnlineBanner}
	<div
		class="fixed {positionClasses} z-50 bg-green-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md animate-pulse"
	>
		<div class="flex items-center justify-center gap-2">
			<Wifi class="h-4 w-4" />
			<span>You're back online — syncing changes...</span>
		</div>
	</div>
{/if}
