<script lang="ts" module>
	import type { ButtonVariant } from '$lib/components/ui/button';

	// Use a broad constructor type to accept both Svelte 4 (SvelteComponentTyped / lucide-svelte)
	// and Svelte 5 Component icons without a strict variance mismatch.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export type IconComponent = new (...args: any[]) => any;

	export type Action = {
		label: string;
		icon?: IconComponent;
		onclick: () => void;
		variant?: ButtonVariant;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { MoreHorizontal } from 'lucide-svelte';

	let {
		actions = [],
		inlineCount = 2,
		class: className = '',
	}: {
		actions?: Action[];
		inlineCount?: number;
		class?: string;
	} = $props();

	const inlineMobile = $derived(actions.slice(0, inlineCount));
	const overflowMobile = $derived(actions.slice(inlineCount));
</script>

<!-- Desktop: all inline -->
<div class={cn('hidden items-center gap-2 md:flex', className)}>
	{#each actions as a}
		<Button variant={a.variant ?? 'default'} onclick={a.onclick} disabled={a.disabled}>
			{#if a.icon}
				{@const Icon = a.icon}
				<Icon class="size-4" />
			{/if}
			{a.label}
		</Button>
	{/each}
</div>

<!-- Mobile: first N + dropdown -->
<div class={cn('flex items-center gap-2 md:hidden', className)}>
	{#each inlineMobile as a}
		<Button variant={a.variant ?? 'default'} onclick={a.onclick} disabled={a.disabled}>
			{#if a.icon}
				{@const Icon = a.icon}
				<Icon class="size-4" />
			{/if}
			{a.label}
		</Button>
	{/each}
	{#if overflowMobile.length > 0}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Button variant="ghost" size="icon" aria-label="More actions">
					<MoreHorizontal class="size-4" />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				{#each overflowMobile as a}
					<DropdownMenu.Item onclick={a.onclick} disabled={a.disabled}>
						{#if a.icon}
							{@const Icon = a.icon}
							<Icon class="mr-2 size-4" />
						{/if}
						{a.label}
					</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</div>
