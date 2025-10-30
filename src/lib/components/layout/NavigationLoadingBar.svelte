<script lang="ts">
	import { navigating } from '$app/stores';

	let { class: className = '' } = $props();

	// Derive whether we're currently navigating
	const isNavigating = $derived($navigating !== null);
</script>

{#if isNavigating}
	<div
		class="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden bg-transparent animate-in fade-in duration-200"
	>
		<!-- Animated progress bar with shimmer effect -->
		<div
			class="h-full w-full bg-gradient-to-r from-transparent via-blue-600 to-transparent animate-loading-bar {className}"
		></div>
	</div>
{/if}

<style>
	@keyframes loading-bar {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(0%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	:global(.animate-loading-bar) {
		animation: loading-bar 1.5s ease-in-out infinite;
	}
</style>

