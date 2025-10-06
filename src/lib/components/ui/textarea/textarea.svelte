<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		value?: string;
		placeholder?: string;
		rows?: number;
		disabled?: boolean;
		required?: boolean;
		class?: string;
		[key: string]: any;
	};

	let {
		value = $bindable(''),
		placeholder = '',
		rows = 3,
		disabled = false,
		required = false,
		class: className = '',
		...restProps
	}: Props = $props();
</script>

<textarea
	bind:value
	{placeholder}
	{rows}
	{disabled}
	{required}
	class={cn(
		'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
></textarea>

