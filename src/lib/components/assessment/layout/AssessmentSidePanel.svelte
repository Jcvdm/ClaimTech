<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		width?: number;
		hideBelow?: 'md' | 'lg' | 'xl';
		class?: string;
	}

	let { children, width = 320, hideBelow = 'xl', class: extraClass = '' }: Props = $props();

	const hideClass = $derived(
		hideBelow === 'md' ? 'md:flex' : hideBelow === 'lg' ? 'lg:flex' : 'xl:flex'
	);
</script>

<aside
	class="hidden flex-col overflow-hidden border-l border-slate-200 bg-white shrink-0 w-[var(--side-w)] {hideClass} {extraClass}"
	style="--side-w: {width}px"
>
	{@render children()}
</aside>
