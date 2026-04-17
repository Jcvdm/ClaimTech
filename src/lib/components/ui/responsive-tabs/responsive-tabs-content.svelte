<script lang="ts">
	import { TabsContent } from '$lib/components/ui/tabs';
	import type { Snippet } from 'svelte';

	let {
		value,
		class: className = '',
		children,
	}: {
		value: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<TabsContent {value} class={className}>
	{@render children()}
</TabsContent>
