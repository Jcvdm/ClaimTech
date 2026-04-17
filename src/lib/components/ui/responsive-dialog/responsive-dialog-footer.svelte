<script lang="ts">
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Sheet from '$lib/components/ui/sheet';
	import { cn } from '$lib/utils';
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
	<Sheet.Footer
		class={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
	>
		{@render children()}
	</Sheet.Footer>
{:else}
	<Dialog.Footer
		class={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
	>
		{@render children()}
	</Dialog.Footer>
{/if}
