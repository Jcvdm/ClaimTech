<script lang="ts">
	import { TabsTrigger } from '$lib/components/ui/tabs';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		value,
		disabled = false,
		class: className = '',
		children,
	}: {
		value: string;
		disabled?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<TabsTrigger
	{value}
	{disabled}
	class={cn(
		'relative flex h-9 min-w-[4.5rem] shrink-0 snap-start items-center justify-center gap-1 rounded-md',
		'border border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground transition-all',
		'hover:bg-muted hover:text-foreground',
		'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'disabled:pointer-events-none disabled:opacity-50',
		'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
		'sm:h-10 sm:min-w-0 sm:shrink sm:gap-2 sm:px-3 sm:py-2 sm:text-sm',
		className
	)}
>
	{@render children()}
</TabsTrigger>
