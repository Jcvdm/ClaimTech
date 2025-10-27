<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		align?: 'left' | 'center' | 'right';
		class?: string;
	}

	let { children, align = 'right', class: className = '' }: Props = $props();

	// Alignment classes
	const alignClasses = {
		left: 'justify-start',
		center: 'justify-center',
		right: 'justify-end'
	};
</script>

<div class="flex items-center gap-1 {alignClasses[align]} {className}">
	{@render children()}
</div>
