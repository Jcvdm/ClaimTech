<script lang="ts">
	interface Props {
		/**
		 * Whether to show the progress bar
		 */
		loading?: boolean;
		/**
		 * Additional CSS classes to apply
		 */
		class?: string;
	}

	let { loading = false, class: className = '' }: Props = $props();
</script>

{#if loading}
	<div class="h-1 overflow-hidden bg-rose-100 {className}" role="status" aria-busy={loading}>
		<div class="h-full w-1/3 animate-pulse bg-rose-500"></div>
	</div>
{/if}

