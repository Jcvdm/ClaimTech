<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';

	type Props = {
		label: string;
		name: string;
		type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'tel';
		value?: string | number | undefined;
		placeholder?: string;
		required?: boolean;
		error?: string;
		disabled?: boolean;
		options?: { value: string; label: string }[];
		class?: string;
		inputClass?: string;
		rows?: number;
		step?: string;
		min?: string;
		max?: string;
		maxlength?: number;
		onchange?: (value: string) => void;
		oninput?: (e: Event) => void;
	};

	let {
		label,
		name,
		type = 'text',
		value = $bindable(),
		placeholder = '',
		required = false,
		error = '',
		disabled = false,
		options = [],
		class: className = '',
		inputClass = '',
		rows = 3,
		step,
		min,
		max,
		maxlength,
		onchange,
		oninput
	}: Props = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

		// For number inputs, parse the value as a number to prevent string concatenation issues
		if (target instanceof HTMLInputElement && target.type === 'number') {
			const numValue = target.value === '' ? 0 : parseFloat(target.value);
			value = isNaN(numValue) ? 0 : numValue;
		} else {
			value = target.value;
		}

		onchange?.(target.value);
	}

	function handleInput(e: Event) {
		oninput?.(e);
	}
</script>

<div class={cn('space-y-2', className)}>
	<Label for={name} class="text-sm font-medium text-gray-700">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</Label>

	{#if type === 'select'}
		<select
			id={name}
			{name}
			{required}
			{disabled}
			bind:value
			onchange={(e) => {
				handleChange(e);
				// Select elements don't fire 'input' events, only 'change' events
				// So we manually call handleInput here to ensure oninput callbacks work
				handleInput(e);
			}}
			class={cn(
				'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				error && 'border-red-500 focus:ring-red-500',
				inputClass
			)}
		>
			<option value="" disabled>{placeholder || 'Select...'}</option>
			{#each options as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	{:else if type === 'textarea'}
		<textarea
			id={name}
			{name}
			{placeholder}
			{required}
			{disabled}
			{rows}
			{maxlength}
			bind:value
			onchange={handleChange}
			oninput={handleInput}
			class={cn(
				'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				error && 'border-red-500 focus-visible:ring-red-500',
				inputClass
			)}
		></textarea>
	{:else}
		<Input
			id={name}
			{name}
			{type}
			{placeholder}
			{required}
			{disabled}
			{step}
			{min}
			{max}
			bind:value
			onchange={handleChange}
			oninput={handleInput}
			class={cn(error && 'border-red-500 focus-visible:ring-red-500', inputClass)}
		/>
	{/if}

	{#if error}
		<p class="text-sm text-red-500">{error}</p>
	{/if}
</div>

