<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import { Loader2, AlertCircle } from 'lucide-svelte';

	interface Props {
		/**
		 * Whether to show the modal
		 */
		isOpen?: boolean;
		/**
		 * Modal title
		 */
		title?: string;
		/**
		 * Progress value (0-100)
		 */
		progress?: number;
		/**
		 * Status message
		 */
		message?: string;
		/**
		 * Error state
		 */
		isError?: boolean;
	}

	let {
		isOpen = false,
		title = 'Processing...',
		progress = 0,
		message = '',
		isError = false
	}: Props = $props();
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
		role="status"
		aria-busy={!isError}
		aria-label={title}
	>
		<div
			class="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-lg w-96 animate-in zoom-in-95 duration-200"
		>
			<h2 class="text-lg font-semibold text-gray-900">{title}</h2>

			{#if isError}
				<AlertCircle class="size-8 text-red-500" />
			{:else}
				<Loader2 class="size-8 text-rose-500 animate-spin" />
			{/if}

			<Progress value={progress} class="w-full bg-rose-100" />

			<div class="text-center">
				<p class="text-sm font-medium text-gray-700">{message}</p>
				<p class="text-xs text-gray-500 mt-1">{progress}%</p>
			</div>
		</div>
	</div>
{/if}

