<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	import type { Component } from 'svelte';

	interface Props {
		/**
		 * Whether the tab is currently loading
		 */
		isLoading?: boolean;
		/**
		 * The Lucide icon component to display when not loading
		 */
		icon?: Component;
		/**
		 * Additional CSS classes to apply
		 */
		class?: string;
	}

	let { isLoading = false, icon: Icon, class: className = '' }: Props = $props();
</script>

{#if isLoading}
	<Loader2 class="h-3 w-3 animate-spin sm:h-4 sm:w-4 {className}" />
{:else if Icon}
	<Icon class="h-4 w-4 {className}" />
{/if}

