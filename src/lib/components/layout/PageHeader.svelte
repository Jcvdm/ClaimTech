<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description?: string;
		actions?: Snippet;
		class?: string;
	};

	let { title, description, actions, class: className = '' }: Props = $props();
</script>

<div class={cn('flex items-start justify-between gap-4', className)}>
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
		{#if description}
			<p class="text-sm text-gray-600">{description}</p>
		{/if}
	</div>

	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>

