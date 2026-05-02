<script lang="ts" module>
	import type { Component } from 'svelte';

	export type SegmentedControlOption = {
		value: string;
		label: string;
		icon?: Component;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	/**
	 * Usage example:
	 *
	 *   <SegmentedControl
	 *     value={currentView}
	 *     options={[
	 *       { value: 'list', label: 'List' },
	 *       { value: 'grid', label: 'Grid' },
	 *     ]}
	 *     onValueChange={(v) => (currentView = v)}
	 *   />
	 */

	interface Props {
		value: string;
		options: SegmentedControlOption[];
		onValueChange: (v: string) => void;
		size?: 'sm' | 'md';
		fullWidth?: boolean;
		disabled?: boolean;
		class?: string;
	}

	let {
		value,
		options,
		onValueChange,
		size = 'md',
		fullWidth = false,
		disabled = false,
		class: className,
	}: Props = $props();

	// Keyboard navigation: find current index
	function currentIndex() {
		return options.findIndex((o) => o.value === value);
	}

	function activate(opt: SegmentedControlOption) {
		if (disabled) return;
		onValueChange(opt.value);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;
		const idx = currentIndex();
		const last = options.length - 1;

		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowUp': {
				event.preventDefault();
				const prev = idx <= 0 ? last : idx - 1;
				onValueChange(options[prev].value);
				// Move focus to the newly active button
				focusButton(prev);
				break;
			}
			case 'ArrowRight':
			case 'ArrowDown': {
				event.preventDefault();
				const next = idx >= last ? 0 : idx + 1;
				onValueChange(options[next].value);
				focusButton(next);
				break;
			}
			case 'Home': {
				event.preventDefault();
				onValueChange(options[0].value);
				focusButton(0);
				break;
			}
			case 'End': {
				event.preventDefault();
				onValueChange(options[last].value);
				focusButton(last);
				break;
			}
		}
	}

	let groupEl: HTMLDivElement | undefined = $state();

	function focusButton(index: number) {
		const buttons = groupEl?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
		buttons?.[index]?.focus();
	}

	// Size token map
	const sizeClasses = {
		sm: 'h-8 text-xs px-2.5',
		md: 'h-10 text-sm px-3.5',
	} as const;

	const wrapperClasses = $derived(
		cn(
			'bg-muted rounded-md p-1',
			fullWidth
				? 'w-full grid'
				: 'inline-flex',
			className
		)
	);

	// Inline style for fullWidth grid (dynamic column count can't be a static Tailwind class)
	const gridStyle = $derived(
		fullWidth ? `grid-template-columns: repeat(${options.length}, minmax(0, 1fr));` : undefined
	);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<div
	bind:this={groupEl}
	role="radiogroup"
	aria-disabled={disabled}
	class={wrapperClasses}
	style={gridStyle}
	onkeydown={handleKeydown}
>
	{#each options as opt (opt.value)}
		{@const isActive = opt.value === value}
		<button
			type="button"
			role="radio"
			aria-checked={isActive}
			data-state={isActive ? 'active' : 'inactive'}
			disabled={disabled}
			tabindex={isActive ? 0 : -1}
			onclick={() => activate(opt)}
			class={cn(
				'inline-flex items-center justify-center gap-1.5 rounded-[calc(theme(borderRadius.md)-2px)] font-medium whitespace-nowrap transition-all select-none',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
				sizeClasses[size],
				isActive
					? 'bg-card shadow-sm text-foreground'
					: 'bg-transparent text-muted-foreground hover:text-foreground',
				disabled && 'pointer-events-none opacity-50'
			)}
		>
			{#if opt.icon}
				{@const Icon = opt.icon}
				<Icon class="size-3.5 shrink-0" />
			{/if}
			{opt.label}
		</button>
	{/each}
</div>
