<script lang="ts">
	import Skeleton from './skeleton.svelte';

	interface Props {
		lines?: number;
		class?: string;
	}

	let { lines = 3, class: className = '' }: Props = $props();
</script>

<div class={`space-y-4 rounded-lg border border-gray-200 bg-white p-6 ${className}`}>
	<div class="space-y-2">
		<Skeleton class="h-4 w-3/4 rounded" />
		<Skeleton class="h-4 w-1/2 rounded" />
	</div>

	<div class="space-y-2">
		{#each Array(lines) as _}
			<Skeleton class="h-3 w-full rounded" />
		{/each}
	</div>

	<div class="flex gap-2 pt-4">
		<Skeleton class="h-10 w-24 rounded" />
		<Skeleton class="h-10 w-24 rounded" />
	</div>
</div>

