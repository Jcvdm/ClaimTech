<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';

	interface Props {
		/** True when this cell is currently in edit mode (input rendered) */
		editing: boolean;
		/** Pre-formatted display value shown in the button (e.g., "1 250,00") — caller pre-formats with formatCurrencyValue */
		display: string;
		/** Raw value to seed the input when entering edit mode (e.g., "1250.00") */
		inputValue: string;
		/** Whether this cell applies to the current process_type (renders <span>-</span> if false) */
		visible: boolean;
		/** Optional unit hint shown as small text next to the value (e.g., "hrs") */
		unit?: string;
		/** Triggered when user clicks button OR Tabs to it (focus-swap entry) — caller seeds tempValue + sets editing flag */
		onEnterEdit: () => void;
		/** Triggered on input blur or Enter — commits the new value (raw string from input) */
		onCommit: (rawValue: string) => void;
		/** Triggered on Escape — exits edit mode without saving */
		onCancel: () => void;
		/** Optional Tailwind class for cell-specific tweaks */
		class?: string;
	}

	let {
		editing,
		display,
		inputValue,
		visible,
		unit,
		onEnterEdit,
		onCommit,
		onCancel,
		class: className
	}: Props = $props();

	// Internal input element ref for programmatic focus
	let inputEl: HTMLInputElement | null = $state(null);

	// Local state for the value being typed — uncontrolled during edit
	let currentValue = $state(inputValue);

	// Reseed local value whenever we enter edit mode
	$effect(() => {
		if (editing) {
			currentValue = inputValue;
		}
	});

	// Focus and select the input when entering edit mode
	$effect(() => {
		if (editing && inputEl) {
			inputEl.focus();
			inputEl.select();
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onCommit(currentValue);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
		}
	}

	function handleBlur() {
		onCommit(currentValue);
	}
</script>

{#if !visible}
	<span class="text-xs text-muted-foreground">-</span>
{:else if editing}
	<Input
		bind:ref={inputEl}
		bind:value={currentValue}
		type="text"
		inputmode="decimal"
		onkeydown={handleKeydown}
		onblur={handleBlur}
		class={cn(
			'font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0',
			className
		)}
	/>
{:else}
	<button
		type="button"
		onfocus={onEnterEdit}
		onclick={onEnterEdit}
		class={cn(
			'font-mono-tabular block w-full truncate text-right text-xs font-medium hover:text-foreground/70',
			className
		)}
	>
		{display}{#if unit}<span class="text-[10px] text-muted-foreground ml-1">{unit}</span>{/if}
	</button>
{/if}
