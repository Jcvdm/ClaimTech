<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		children,
		child,
		class: className,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> & {
		child?: Snippet<[{ props: Record<string, unknown> }]>;
	} = $props();

	const mergedProps = $derived({
		class: cn(
			"text-subtle-foreground ring-sidebar-ring outline-hidden flex h-auto shrink-0 items-center rounded-md px-2.5 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
			"group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
			className
		),
		"data-slot": "sidebar-group-label",
		"data-sidebar": "group-label",
		...restProps,
	});
</script>

{#if child}
	{@render child({ props: mergedProps })}
{:else}
	<div bind:this={ref} {...mergedProps}>
		{@render children?.()}
	</div>
{/if}
