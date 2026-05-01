<script lang="ts" module>
	/**
	 * Configuration for a field to display in the card
	 */
	export type CardField<T> = {
		/** Key of the field in the data object */
		key: keyof T;
		/** Display label for the field */
		label?: string;
		/** Whether this is the primary identifier (shown prominently) */
		primary?: boolean;
		/** Whether this is a badge/status field */
		badge?: boolean;
	};

	/**
	 * Configuration for the card layout
	 */
	export type CardConfig<T> = {
		/** Primary field shown in header (e.g., assessment number) */
		primaryField: keyof T;
		/** Secondary field shown in header (e.g., status badge) */
		secondaryField?: keyof T;
		/** Fields to show in the body */
		bodyFields: (keyof T)[];
		/** Field to show in footer (e.g., date) */
		footerField?: keyof T;
		/** Key of a numeric 0-100 field; when set, renders a 3px progress bar across the top */
		progressPctField?: keyof T;
		/** Key of a 'default' | 'warning' | 'destructive' field controlling bar color */
		progressToneField?: keyof T;
	};
</script>

<script lang="ts" generics="T extends Record<string, any>">
	import { Card } from '$lib/components/ui/card';
	import { ChevronRight } from 'lucide-svelte';
	import type { Snippet, Component } from 'svelte';

	interface Props {
		/** The data item to display */
		item: T;
		/** Configuration for card layout */
		config: CardConfig<T>;
		/** Click handler */
		onclick?: () => void;
		/** Whether this row is loading */
		loading?: boolean;
		/** Custom content snippet for rendering specific fields */
		fieldContent?: Snippet<[keyof T, T]>;
		/** Custom class for the card */
		class?: string;
	}

	let {
		item,
		config,
		onclick,
		loading = false,
		fieldContent,
		class: className = ''
	}: Props = $props();
</script>

<Card
	class="overflow-hidden transition-all duration-200 {onclick
		? 'cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.99]'
		: ''} {loading ? 'opacity-60 animate-pulse' : ''} {className}"
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	onclick={() => !loading && onclick?.()}
	onkeydown={(e) => e.key === 'Enter' && !loading && onclick?.()}
>
	<!-- Progress bar across the top edge (optional) -->
	{#if config.progressPctField !== undefined}
		{@const pct = Math.min(100, Math.max(0, Number(item[config.progressPctField]) || 0))}
		{@const tone = config.progressToneField ? String(item[config.progressToneField]) : 'default'}
		<div class="h-[3px] w-full bg-muted">
			<div
				class="h-full transition-all duration-300 {tone === 'warning'
					? 'bg-warning'
					: tone === 'destructive'
						? 'bg-destructive'
						: 'bg-success'}"
				style="width: {pct}%"
			></div>
		</div>
	{/if}

	<div class="p-4">
	<!-- Header: Primary field + Status/Secondary -->
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<!-- Primary field (e.g., number) -->
			<div class="font-semibold text-gray-900">
				{#if fieldContent}
					{@render fieldContent(config.primaryField, item)}
				{:else}
					{item[config.primaryField]}
				{/if}
			</div>
		</div>

		<!-- Secondary field (e.g., status badge) -->
		{#if config.secondaryField}
			<div class="flex-shrink-0">
				{#if fieldContent}
					{@render fieldContent(config.secondaryField, item)}
				{:else}
					{item[config.secondaryField]}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Body: Key information fields -->
	<div class="mt-3 space-y-1.5">
		{#each config.bodyFields as field}
			<div class="flex items-center gap-2 text-sm">
				{#if fieldContent}
					{@render fieldContent(field, item)}
				{:else}
					<span class="text-gray-600">{item[field]}</span>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Footer: Date and action indicator -->
	<div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
		{#if config.footerField}
			<span class="text-xs text-gray-500">
				{#if fieldContent}
					{@render fieldContent(config.footerField, item)}
				{:else}
					{item[config.footerField]}
				{/if}
			</span>
		{:else}
			<span></span>
		{/if}

		{#if onclick}
			<ChevronRight class="h-4 w-4 text-gray-400" />
		{/if}
	</div>
	</div>
</Card>
