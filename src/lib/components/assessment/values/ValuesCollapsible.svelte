<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronDown } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	/*
	 * Usage example:
	 *
	 * <ValuesCollapsible
	 *   title="Vehicle Values (raw)"
	 *   summary="Trade 125 000 · Market 150 000 · Retail 175 000"
	 *   defaultOpen={tradeValue === 0}
	 *   forceOpen={isDesktop}
	 * >
	 *   <TradeMarketRetailFields />
	 * </ValuesCollapsible>
	 */

	interface Props {
		title: string;
		/** Single-line summary shown in the collapsed state. */
		summary: string;
		/** Whether the details element is open by default. */
		defaultOpen?: boolean;
		/** When true, render as a non-collapsible open card (use at lg+). */
		forceOpen?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		title,
		summary,
		defaultOpen = false,
		forceOpen = false,
		class: className,
		children
	}: Props = $props();
</script>

{#if forceOpen}
	<!-- Always-open mode (used at lg+). No <details>; just a Card with title and content. -->
	<div class={cn('rounded-xl border bg-card', className)}>
		<div class="border-b p-4">
			<h3 class="text-base font-semibold text-foreground">{title}</h3>
		</div>
		<div class="p-4">
			{@render children()}
		</div>
	</div>
{:else}
	<!-- Collapsible mode (mobile/tablet) -->
	<details
		class={cn('group rounded-xl border bg-card overflow-hidden', className)}
		open={defaultOpen}
	>
		<summary
			class="flex cursor-pointer items-center gap-3 p-4 list-none [&::-webkit-details-marker]:hidden"
		>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-semibold text-foreground">{title}</p>
				<p class="mt-0.5 truncate text-xs text-muted-foreground">{summary}</p>
			</div>
			<ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
		</summary>
		<div class="border-t p-4">
			{@render children()}
		</div>
	</details>
{/if}
