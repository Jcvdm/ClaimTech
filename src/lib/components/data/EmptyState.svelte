<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { ComponentType } from 'svelte';

	type Props = {
		title?: string;
		description?: string;
		icon?: ComponentType;
		actionLabel?: string;
		onAction?: () => void;
		class?: string;
	};

	let {
		title = 'No items found',
		description = '',
		icon: Icon,
		actionLabel = '',
		onAction,
		class: className = ''
	}: Props = $props();
</script>

<div class={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
	{#if Icon}
		<div class="mb-4 rounded-full bg-gray-100 p-3">
			<Icon class="h-6 w-6 text-gray-400" />
		</div>
	{/if}

	<h3 class="mb-1 text-sm font-medium text-gray-900">{title}</h3>

	{#if description}
		<p class="mb-4 text-sm text-gray-500">{description}</p>
	{/if}

	{#if actionLabel && onAction}
		<Button onclick={onAction} size="sm">
			{actionLabel}
		</Button>
	{/if}
</div>

