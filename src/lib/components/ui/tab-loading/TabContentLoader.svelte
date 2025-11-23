<script lang="ts">
	import { Loader2 } from 'lucide-svelte';

	interface Props {
		/**
		 * Whether to show the loading overlay
		 */
		loading?: boolean;
		/**
		 * Optional message to display below the spinner
		 */
		message?: string;
		/**
		 * Additional CSS classes to apply to the container
		 */
		class?: string;
	}

	let { loading = false, message = 'Loading...', class: className = '' }: Props = $props();
</script>

{#if loading}
	<div
		role="status"
		aria-busy={loading}
		aria-label={message}
		class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm {className}"
	>
		<Loader2 class="mb-2 h-6 w-6 animate-spin text-rose-500" />
		<p class="text-sm text-gray-600">{message}</p>
	</div>
{/if}

