<script lang="ts">
	import { navigating } from '$app/stores';
	import { Spinner } from '$lib/components/ui/spinner';

	const isNavigating = $derived($navigating !== null);
</script>

{#if isNavigating}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
		role="status"
		aria-busy="true"
		aria-label="Loading page"
	>
		<div
			class="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-lg animate-in zoom-in-95 duration-200"
		>
			<Spinner class="size-8 text-rose-500" />
			<p class="text-sm font-medium text-gray-700">Loading...</p>
		</div>
	</div>
{/if}

