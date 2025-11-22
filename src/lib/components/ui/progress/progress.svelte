<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		value?: number;
		max?: number;
		class?: string;
	}

	let {
		value = 0,
		max = 100,
		class: className,
		...restProps
	}: Props = $props();

	const percentage = $derived(Math.min(Math.max((value / max) * 100, 0), 100));
</script>

<div
	role="progressbar"
	aria-valuemin={0}
	aria-valuemax={max}
	aria-valuenow={value}
	data-state={value === max ? "complete" : "loading"}
	data-value={value}
	data-max={max}
	class={cn(
		"relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800",
		className
	)}
	{...restProps}
>
	<div
		class="h-full w-full flex-1 bg-blue-600 transition-all duration-300 ease-in-out"
		style="transform: translateX(-{100 - percentage}%)"
	></div>
</div>

