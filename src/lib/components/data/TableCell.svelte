<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

	type Props = {
		variant?: Variant;
		icon?: any;
		iconColor?: string;
		bold?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		variant = 'default',
		icon,
		iconColor = 'text-gray-500',
		bold = false,
		class: className = '',
		children
	}: Props = $props();

	const variantClasses: Record<Variant, string> = {
		default: 'text-gray-900',
		primary: 'text-blue-600 font-medium',
		success: 'text-green-600 font-medium',
		warning: 'text-yellow-600 font-medium',
		danger: 'text-red-600 font-medium',
		muted: 'text-gray-500'
	};
</script>

<div class="flex items-center gap-2 {bold ? 'font-semibold' : ''} {variantClasses[variant]} {className}">
	{#if icon}
		<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
			<svelte:component this={icon} class="h-4 w-4 {iconColor}" />
		</div>
	{/if}
	<span>
		{@render children()}
	</span>
</div>

