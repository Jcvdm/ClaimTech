<script lang="ts">
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { Snippet } from 'svelte';

	const isMobile = new IsMobile(768);

	let {
		class: className = '',
		children,
	}: {
		class?: string;
		children: Snippet;
	} = $props();
</script>

{#if isMobile.current}
	<Sheet.Header class={className}>
		{@render children()}
	</Sheet.Header>
{:else}
	<Dialog.Header class={className}>
		{@render children()}
	</Dialog.Header>
{/if}
