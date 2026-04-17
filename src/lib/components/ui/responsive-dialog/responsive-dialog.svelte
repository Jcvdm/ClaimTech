<script lang="ts">
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { Snippet } from 'svelte';

	const isMobile = new IsMobile(768);

	let {
		open = $bindable(false),
		onOpenChange,
		children,
	}: {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	} = $props();
</script>

{#if isMobile.current}
	<Sheet.Root bind:open {onOpenChange}>
		{@render children()}
	</Sheet.Root>
{:else}
	<Dialog.Root bind:open {onOpenChange}>
		{@render children()}
	</Dialog.Root>
{/if}
