<script lang="ts">
	import type { Snippet } from 'svelte';
	import { PanelLeftOpen, StickyNote } from 'lucide-svelte';

	interface Props {
		children: Snippet;
		width?: number;
		hideBelow?: 'md' | 'lg' | 'xl';
		class?: string;
		collapsed?: boolean;
		collapsedWidth?: number;
		onToggle?: () => void;
	}

	let {
		children,
		width = 320,
		hideBelow = 'xl',
		class: extraClass = '',
		collapsed = false,
		collapsedWidth = 48,
		onToggle
	}: Props = $props();

	const hideClass = $derived(
		hideBelow === 'md' ? 'md:flex' : hideBelow === 'lg' ? 'lg:flex' : 'xl:flex'
	);

	const effectiveWidth = $derived(collapsed ? collapsedWidth : width);
</script>

<aside
	class="hidden flex-col overflow-hidden border-l border-slate-200 bg-white shrink-0 w-[var(--side-w)] {hideClass} {extraClass}"
	style="--side-w: {effectiveWidth}px"
>
	{#if collapsed}
		<button
			type="button"
			onclick={onToggle}
			aria-label="Expand notes panel"
			class="w-full p-3 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-200"
		>
			<PanelLeftOpen class="w-4 h-4" />
		</button>
		<div class="p-3 flex justify-center">
			<StickyNote class="w-4 h-4 text-slate-400" />
		</div>
	{:else}
		{@render children()}
	{/if}
</aside>
