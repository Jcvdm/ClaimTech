<script lang="ts">
	import { TabsList } from '$lib/components/ui/tabs';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	const gridCols: Record<3 | 4 | 6, string> = {
		3: 'sm:grid-cols-3',
		4: 'sm:grid-cols-4',
		6: 'sm:grid-cols-6',
	};

	let {
		cols = 4,
		class: className = '',
		children,
	}: {
		cols?: 3 | 4 | 6;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<TabsList
	class={cn(
		'flex h-auto w-full snap-x snap-mandatory gap-1.5 overflow-x-auto bg-transparent p-0 pb-2 scrollbar-hide',
		'sm:grid sm:snap-none sm:gap-2 sm:overflow-visible sm:pb-0',
		gridCols[cols],
		className
	)}
>
	{@render children()}
</TabsList>
