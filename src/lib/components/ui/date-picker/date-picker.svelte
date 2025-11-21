<script lang="ts">
	import { CalendarDate, getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Calendar as CalendarIcon } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { untrack } from 'svelte';

	type Props = {
		value?: string | null;
		name?: string;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		locale?: string;
		labelId?: string;
		triggerId?: string;
	};

	let {
		value = $bindable(''),
		name = 'date',
		placeholder = 'Select a date',
		disabled = false,
		class: className = '',
		locale = 'en-ZA',
		labelId,
		triggerId
	}: Props = $props();

	function parseDateSafe(val?: string | null): DateValue | undefined {
		if (!val) return undefined;
		try {
			return parseDate(val);
		} catch {
			return undefined;
		}
	}

	let internalValue = $state<DateValue | undefined>(parseDateSafe(value));
	let calendarPlaceholder = $state<DateValue>(today(getLocalTimeZone()));

	$effect(() => {
		const parsed = parseDateSafe(value);
		
		untrack(() => {
			const prev = internalValue?.toString() ?? '';
			const next = parsed?.toString() ?? '';

			if (next !== prev) {
				internalValue = parsed;
			}
		});
	});

	$effect(() => {
		const iso = internalValue?.toString() ?? '';

		untrack(() => {
			if (value !== iso) {
				value = iso;
			}
		});
	});

	const formatter = new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});

	const formattedValue = $derived.by(() =>
		internalValue ? formatter.format(internalValue.toDate(getLocalTimeZone())) : ''
	);

	const resolvedTriggerId = triggerId ?? `${name}-trigger`;
</script>

<div class={cn('w-full', className)}>
	<Popover.Root data-slot="date-picker">
		<Popover.Trigger
			id={resolvedTriggerId}
			class={cn(
				buttonVariants({ variant: 'outline' }),
				'w-full justify-start gap-2 px-3 py-2 text-left text-sm font-normal',
				!internalValue && 'text-muted-foreground'
			)}
			aria-labelledby={labelId}
			disabled={disabled}
			type="button"
		>
			<span class="flex-1 truncate">
				{#if formattedValue}
					{formattedValue}
				{:else}
					<span>{placeholder}</span>
				{/if}
			</span>
			<CalendarIcon class="h-4 w-4 text-muted-foreground" />
		</Popover.Trigger>

		<Popover.Content class="w-auto rounded-xl border bg-popover p-0 shadow-md" side="bottom">
			<Calendar
				type="single"
				bind:value={internalValue}
				bind:placeholder={calendarPlaceholder}
				locale={locale}
				monthFormat="short"
				yearFormat="numeric"
				calendarLabel="Select a date"
				captionLayout="dropdown"
				minValue={new CalendarDate(1900, 1, 1)}
				maxValue={today(getLocalTimeZone())}
			/>
		</Popover.Content>
	</Popover.Root>

	<input type="hidden" name={name} value={value ?? ''} />
</div>
