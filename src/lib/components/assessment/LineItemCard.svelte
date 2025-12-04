<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Trash2,
		ChevronDown,
		ChevronUp,
		Percent,
		ShieldCheck,
		Package,
		Recycle
	} from 'lucide-svelte';
	import type { EstimateLineItem } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/formatters';
	import { getProcessTypeBadgeColor, getProcessTypeConfig } from '$lib/constants/processTypes';

	interface Props {
		item: EstimateLineItem;
		labourRate: number;
		paintRate: number;
		onUpdateDescription: (value: string) => void;
		onUpdateProcessType: (value: string) => void;
		onUpdatePartType: (value: string) => void;
		onEditPartPrice: () => void;
		onEditSA: () => void;
		onEditLabour: () => void;
		onEditPaint: () => void;
		onEditOutwork: () => void;
		onEditBetterment: () => void;
		onDelete: () => void;
		selected?: boolean;
		onToggleSelect?: () => void;
	}

	let {
		item,
		labourRate,
		paintRate,
		onUpdateDescription,
		onUpdateProcessType,
		onUpdatePartType,
		onEditPartPrice,
		onEditSA,
		onEditLabour,
		onEditPaint,
		onEditOutwork,
		onEditBetterment,
		onDelete,
		selected = false,
		onToggleSelect
	}: Props = $props();

	let isExpanded = $state(false);
	let localDescription = $state(item.description);

	// Sync local description when item changes
	$effect(() => {
		localDescription = item.description;
	});

	const processTypeConfig = $derived(getProcessTypeConfig(item.process_type));
	const processTypeBadgeColor = $derived(getProcessTypeBadgeColor(item.process_type));

	// Check which cost fields are applicable for this process type
	const showPartPrice = $derived(item.process_type === 'N');
	const showSA = $derived(['N', 'R', 'P', 'B'].includes(item.process_type));
	const showLabour = $derived(['N', 'R', 'A'].includes(item.process_type));
	const showPaint = $derived(['N', 'R', 'P', 'B'].includes(item.process_type));
	const showOutwork = $derived(item.process_type === 'O');

	// Count non-zero cost items for summary
	const costSummary = $derived(() => {
		const parts = [];
		if (showPartPrice && item.part_price_nett) parts.push(`Part: ${formatCurrency(item.part_price_nett)}`);
		if (showSA && item.strip_assemble) parts.push(`S&A: ${formatCurrency(item.strip_assemble)}`);
		if (showLabour && item.labour_cost) parts.push(`Lab: ${formatCurrency(item.labour_cost)}`);
		if (showPaint && item.paint_cost) parts.push(`Paint: ${formatCurrency(item.paint_cost)}`);
		if (showOutwork && item.outwork_charge_nett) parts.push(`Out: ${formatCurrency(item.outwork_charge_nett)}`);
		return parts.join(' · ') || 'No costs added';
	});
</script>

<Card class="overflow-hidden {selected ? 'ring-2 ring-rose-500' : ''}">
	<!-- Header Row -->
	<div class="flex items-start justify-between gap-2 border-b bg-gray-50 p-3">
		<div class="flex items-center gap-2">
			<!-- Checkbox -->
			{#if onToggleSelect}
				<input
					type="checkbox"
					checked={selected}
					onchange={onToggleSelect}
					class="h-4 w-4 rounded border-gray-300"
				/>
			{/if}

			<!-- Process Type Badge -->
			<div class="relative">
				<select
					value={item.process_type}
					onchange={(e) => onUpdateProcessType(e.currentTarget.value)}
					class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
				>
					<option value="N">N - New Part</option>
					<option value="R">R - Repair</option>
					<option value="P">P - PDR</option>
					<option value="O">O - Outwork</option>
					<option value="A">A - Adjust</option>
					<option value="B">B - Blend</option>
				</select>
				<Badge class={processTypeBadgeColor}>
					{item.process_type}
				</Badge>
			</div>

			<!-- Part Type Badge (N only) -->
			{#if item.process_type === 'N'}
				<div class="relative">
					<select
						value={item.part_type || 'OEM'}
						onchange={(e) => onUpdatePartType(e.currentTarget.value)}
						class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					>
						<option value="OEM">OEM</option>
						<option value="ALT">ALT</option>
						<option value="2ND">2ND</option>
					</select>
					{#if item.part_type === 'OEM'}
						<Badge variant="outline" class="gap-1 bg-blue-50 text-blue-700">
							<ShieldCheck class="h-3 w-3" />
							OEM
						</Badge>
					{:else if item.part_type === 'ALT'}
						<Badge variant="outline" class="gap-1 bg-green-50 text-green-700">
							<Package class="h-3 w-3" />
							ALT
						</Badge>
					{:else if item.part_type === '2ND'}
						<Badge variant="outline" class="gap-1 bg-amber-50 text-amber-700">
							<Recycle class="h-3 w-3" />
							2ND
						</Badge>
					{:else}
						<Badge variant="outline">OEM</Badge>
					{/if}
				</div>
			{/if}

			<!-- Betterment Indicator -->
			{#if item.betterment_total && item.betterment_total > 0}
				<button
					onclick={onEditBetterment}
					class="flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700"
				>
					<Percent class="h-3 w-3" />
					-{formatCurrency(item.betterment_total)}
				</button>
			{/if}
		</div>

		<!-- Total -->
		<span class="text-lg font-bold text-gray-900">
			{formatCurrency(item.total)}
		</span>
	</div>

	<!-- Description Input -->
	<div class="border-b p-3">
		<Input
			type="text"
			placeholder="Item description"
			bind:value={localDescription}
			onblur={() => onUpdateDescription(localDescription)}
			class="h-10 text-base"
		/>
	</div>

	<!-- Cost Breakdown (Collapsible) -->
	<button
		type="button"
		onclick={() => (isExpanded = !isExpanded)}
		class="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
	>
		<span class="truncate text-xs">{costSummary()}</span>
		{#if isExpanded}
			<ChevronUp class="h-4 w-4 shrink-0" />
		{:else}
			<ChevronDown class="h-4 w-4 shrink-0" />
		{/if}
	</button>

	{#if isExpanded}
		<div class="grid grid-cols-2 gap-2 border-t bg-gray-50 p-3 text-sm">
			<!-- Part Price -->
			{#if showPartPrice}
				<button
					type="button"
					onclick={onEditPartPrice}
					class="flex items-center justify-between rounded border bg-white p-2 text-left hover:border-blue-300"
				>
					<span class="text-gray-600">Part (nett)</span>
					<span class="font-medium text-blue-600">{formatCurrency(item.part_price_nett || 0)}</span>
				</button>
			{/if}

			<!-- S&A -->
			{#if showSA}
				<button
					type="button"
					onclick={onEditSA}
					class="flex items-center justify-between rounded border bg-white p-2 text-left hover:border-blue-300"
				>
					<span class="text-gray-600">S&A</span>
					<span class="font-medium text-blue-600">
						{formatCurrency(item.strip_assemble || 0)}
						{#if item.strip_assemble_hours}
							<span class="text-xs text-gray-500">({item.strip_assemble_hours}h)</span>
						{/if}
					</span>
				</button>
			{/if}

			<!-- Labour -->
			{#if showLabour}
				<button
					type="button"
					onclick={onEditLabour}
					class="flex items-center justify-between rounded border bg-white p-2 text-left hover:border-blue-300"
				>
					<span class="text-gray-600">Labour</span>
					<span class="font-medium text-blue-600">
						{formatCurrency(item.labour_cost || 0)}
						{#if item.labour_hours}
							<span class="text-xs text-gray-500">({item.labour_hours}h)</span>
						{/if}
					</span>
				</button>
			{/if}

			<!-- Paint -->
			{#if showPaint}
				<button
					type="button"
					onclick={onEditPaint}
					class="flex items-center justify-between rounded border bg-white p-2 text-left hover:border-blue-300"
				>
					<span class="text-gray-600">Paint</span>
					<span class="font-medium text-blue-600">
						{formatCurrency(item.paint_cost || 0)}
						{#if item.paint_panels}
							<span class="text-xs text-gray-500">({item.paint_panels}p)</span>
						{/if}
					</span>
				</button>
			{/if}

			<!-- Outwork -->
			{#if showOutwork}
				<button
					type="button"
					onclick={onEditOutwork}
					class="flex items-center justify-between rounded border bg-white p-2 text-left hover:border-blue-300"
				>
					<span class="text-gray-600">Outwork</span>
					<span class="font-medium text-blue-600">{formatCurrency(item.outwork_charge_nett || 0)}</span>
				</button>
			{/if}

			<!-- Betterment -->
			<button
				type="button"
				onclick={onEditBetterment}
				class="flex items-center justify-between rounded border bg-white p-2 text-left hover:border-blue-300 {item.betterment_total ? 'border-orange-200 bg-orange-50' : ''}"
			>
				<span class="text-gray-600">Betterment</span>
				<span class="font-medium {item.betterment_total ? 'text-orange-600' : 'text-gray-400'}">
					{item.betterment_total ? `-${formatCurrency(item.betterment_total)}` : '-'}
				</span>
			</button>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex items-center justify-end gap-2 border-t bg-gray-50 p-2">
		<Button
			variant="ghost"
			size="sm"
			onclick={onDelete}
			class="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
		>
			<Trash2 class="mr-1 h-4 w-4" />
			Delete
		</Button>
	</div>
</Card>
