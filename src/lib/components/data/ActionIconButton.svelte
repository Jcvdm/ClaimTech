<script lang="ts">
	import type { Component } from 'svelte';
	import { Loader2 } from 'lucide-svelte';

	interface Props {
		icon: Component | any; // Allow lucide-svelte icons which don't strictly match Component type
		label: string;
		onclick: (e: MouseEvent) => void | Promise<void>;
		variant?: 'default' | 'primary' | 'destructive' | 'outline';
		loading?: boolean;
		disabled?: boolean;
		size?: 'sm' | 'md';
		class?: string;
	}

	let {
		icon,
		label,
		onclick,
		variant = 'default',
		loading = false,
		disabled = false,
		size = 'sm',
		class: className = ''
	}: Props = $props();

	// Size classes
	const sizeClasses = {
		sm: 'h-8 w-8',
		md: 'h-10 w-10'
	};

	// Icon size classes
	const iconSizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-5 w-5'
	};

	// Variant classes
	const variantClasses = {
		default: 'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
		primary: 'hover:bg-blue-100 text-blue-600 hover:text-blue-700',
		destructive: 'hover:bg-red-100 text-red-600 hover:text-red-700',
		outline:
			'border border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-900 hover:border-gray-400'
	};

	function handleClick(e: MouseEvent) {
		e.stopPropagation(); // Prevent row click
		if (!disabled && !loading) {
			onclick(e);
		}
	}
</script>

<button
	type="button"
	class="inline-flex {sizeClasses[size]} items-center justify-center rounded-md
         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
         {variantClasses[variant]} {className}"
	title={label}
	onclick={handleClick}
	disabled={disabled || loading}
	aria-label={label}
>
	{#if loading}
		<Loader2 class="{iconSizeClasses[size]} animate-spin" />
	{:else}
		{@render icon({ class: iconSizeClasses[size] })}
	{/if}
</button>
