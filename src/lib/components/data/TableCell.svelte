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
		iconColor = 'text-muted-foreground',
		bold = false,
		class: className = '',
		children
	}: Props = $props();

	const variantClasses: Record<Variant, string> = {
		default: 'text-foreground',
		primary: 'text-primary font-medium',
		success: 'text-success font-medium',
		warning: 'text-warning font-medium',
		danger: 'text-destructive font-medium',
		muted: 'text-muted-foreground'
	};
</script>

<div class="flex items-center gap-2 {bold ? 'font-semibold' : ''} {variantClasses[variant]} {className}">
	{#if icon}
		<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
			{@render icon({ class: `h-4 w-4 ${iconColor}` })}
		</div>
	{/if}
	<span>
		{@render children()}
	</span>
</div>

