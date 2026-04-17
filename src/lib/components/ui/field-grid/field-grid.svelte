<script lang="ts" module>
	export type FieldGridCols = 1 | 2 | 3 | 4;
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		cols = 2,
		class: className = '',
		children,
	}: { cols?: FieldGridCols; class?: string; children: Snippet } = $props();

	const colClass: Record<FieldGridCols, string> = {
		1: 'grid-cols-1',
		2: 'grid-cols-1 md:grid-cols-2',
		3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
		4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
	};
</script>

<div class={cn('grid gap-4', colClass[cols], className)}>
	{@render children()}
</div>
