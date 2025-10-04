<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';

	type Props = {
		label: string;
		name: string;
		type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea';
		value?: string | number | undefined;
		placeholder?: string;
		required?: boolean;
		error?: string;
		disabled?: boolean;
		options?: { value: string; label: string }[];
		class?: string;
		inputClass?: string;
		rows?: number;
		onchange?: (value: string) => void;
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
		onchange
	}: Props = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
		value = target.value;
		onchange?.(target.value);
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
			onchange={handleChange}
			class={cn(
				'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				error && 'border-red-500 focus:ring-red-500',
				inputClass
			)}
		>
			<option value="" disabled selected={!value}>{placeholder || 'Select...'}</option>
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
			bind:value
			onchange={handleChange}
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
			bind:value
			onchange={handleChange}
			class={cn(error && 'border-red-500 focus-visible:ring-red-500', inputClass)}
		/>
	{/if}

	{#if error}
		<p class="text-sm text-red-500">{error}</p>
	{/if}
</div>

