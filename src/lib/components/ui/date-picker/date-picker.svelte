<script lang="ts">
	import { getLocalTimeZone, parseDate, today, type DateValue } from "@internationalized/date";
	import { cn } from "$lib/utils.js";
	import { buttonVariants } from "../button/index.js";
	import { Calendar } from "../calendar/index.js";
	import * as Popover from "../popover/index.js";
	import { Calendar as CalendarIcon } from "lucide-svelte";

	type Props = {
		value?: DateValue | undefined;
		name?: string;
		placeholder?: string;
		class?: string;
	};

	let {
		value = $bindable<DateValue | undefined>(undefined),
		name,
		placeholder = "Pick a date",
		class: className,
	}: Props = $props();

	let calendarPlaceholder = $state<DateValue | undefined>(today(getLocalTimeZone()));
	let calendarValue = $state<DateValue | DateValue[] | undefined>(value);

	$effect(() => {
		if (Array.isArray(calendarValue)) {
			value = calendarValue[0];
		} else {
			value = calendarValue;
		}
	});
</script>

<div class={cn("grid gap-2", className)}>
	<Popover.Root>
		<Popover.Trigger
			class={cn(
				buttonVariants({ variant: "outline" }),
				"text-left font-normal w-fit min-w-[192px]",
				!value && "text-muted-foreground"
			)}
		>
			<CalendarIcon class="mr-2 size-4" />
			{#if value}
				{value.toString()}
			{:else}
				<span>{placeholder}</span>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-fit p-0">
			<Calendar
				bind:value={calendarValue as any}
				bind:placeholder={calendarPlaceholder}
				captionLayout="dropdown"
				disableDaysOutsideMonth={false}
				type="single"
			/>
		</Popover.Content>
	</Popover.Root>

	{#if name}
		<input hidden {name} value={value?.toString()} />
	{/if}
</div>
