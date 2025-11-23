<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Loader2 } from 'lucide-svelte';
	import type { ButtonProps } from '$lib/components/ui/button';

	let {
		loading = false,
		variant = 'default',
		size = 'default',
		disabled,
		children,
		class: className,
		...restProps
	}: ButtonProps & { loading?: boolean } = $props();
</script>

<Button {variant} {size} disabled={loading || disabled} class={className} {...restProps}>
	{#if loading}
		<Loader2 class="mr-2 h-4 w-4 animate-spin" />
	{/if}
	{@render children?.()}
</Button>
