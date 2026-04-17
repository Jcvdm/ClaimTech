<script lang="ts">
	import { Tabs } from '$lib/components/ui/tabs';
	import type { Snippet } from 'svelte';

	let {
		value = $bindable(''),
		onValueChange,
		class: className = '',
		children,
	}: {
		value?: string;
		onValueChange?: (value: string) => void;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<Tabs bind:value {onValueChange} class={className}>
	{@render children()}
</Tabs>
