<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Trash2,
		ChevronDown,
		ChevronUp,
		Check,
		X,
		Clock,
		RotateCcw,
		Undo2,
		ShieldCheck,
		Package,
		Recycle
	} from 'lucide-svelte';
	import type { AdditionalLineItem } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		item: AdditionalLineItem;
		isRemoved: boolean;
		isReversal: boolean;
		isReversed: boolean;
		reversalReason?: string | null;
		labourRate: number;
		paintRate: number;
		onUpdateDescription: (value: string) => void;
		onUpdatePartType: (value: string) => void;
		onEditPartPrice: () => void;
		onEditSA: () => void;
		onEditLabour: () => void;
		onEditPaint: () => void;
		onEditOutwork: () => void;
		onApprove: () => void;
		onDecline: () => void;
		onDelete: () => void;
		onReverse: () => void;
		onReinstate: () => void;
		onReinstateOriginal: () => void;
	}

	let {
		item,
		isRemoved,
		isReversal,
		isReversed,
		reversalReason = null,
		labourRate,
		paintRate,
		onUpdateDescription,
		onUpdatePartType,
		onEditPartPrice,
		onEditSA,
		onEditLabour,
		onEditPaint,
		onEditOutwork,
		onApprove,
		onDecline,
		onDelete,
		onReverse,
		onReinstate,
		onReinstateOriginal
	}: Props = $props();

	let isExpanded = $state(false);
	let localDescription = $state(item.description);

	// Sync local description when item changes
	$effect(() => {
		localDescription = item.description;
	});

	// Check which cost fields are applicable for this process type
	const showPartPrice = $derived(item.process_type === 'N');
	const showSA = $derived(['N', 'R', 'P', 'B'].includes(item.process_type));
	const showLabour = $derived(['N', 'R', 'A'].includes(item.process_type));
	const showPaint = $derived(['N', 'R', 'P', 'B'].includes(item.process_type));
	const showOutwork = $derived(item.process_type === 'O');

	// Can edit only pending items that aren't removed or reversals
	const canEdit = $derived(!isRemoved && !isReversal && item.status === 'pending');

	// Status badge styling
	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'approved':
				return 'bg-green-100 text-green-800';
			case 'declined':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-yellow-100 text-yellow-800';
		}
	}

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

	// Card border based on status
	const cardClass = $derived(() => {
		if (isRemoved) return 'border-red-200 bg-red-50/50';
		if (isReversal || isReversed) return 'border-blue-200 bg-blue-50/50';
		if (item.status === 'approved') return 'border-green-200 bg-green-50/50';
		if (item.status === 'declined') return 'border-red-200 bg-red-50/50';
		return '';
	});
</script>

<Card class="overflow-hidden {cardClass()}">
	<!-- Header Row -->
	<div class="flex items-start justify-between gap-2 border-b bg-gray-50 p-3">
		<div class="flex flex-wrap items-center gap-2">
			<!-- Process Type Badge -->
			<Badge
				class={item.process_type === 'N'
					? 'bg-blue-500 text-white'
					: item.process_type === 'R'
						? 'bg-amber-500 text-white'
						: item.process_type === 'P'
							? 'bg-purple-500 text-white'
							: item.process_type === 'O'
								? 'bg-cyan-500 text-white'
								: item.process_type === 'A'
									? 'bg-slate-500 text-white'
									: 'bg-rose-400 text-white'}
			>
				{item.process_type}
			</Badge>

			<!-- Part Type Badge (N only) -->
			{#if item.process_type === 'N' && item.part_type}
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
				{/if}
			{/if}

			<!-- Status Badge -->
			{#if isReversal}
				<Badge class="bg-blue-100 text-blue-800">
					<RotateCcw class="mr-1 h-3 w-3" />
					Reversal
				</Badge>
			{:else if isRemoved}
				<Badge class="bg-red-100 text-red-800">
					<Trash2 class="mr-1 h-3 w-3" />
					Removed
				</Badge>
			{:else if isReversed}
				<Badge class="bg-blue-100 text-blue-800">
					<RotateCcw class="mr-1 h-3 w-3" />
					Reversed
				</Badge>
			{:else}
				<Badge class={getStatusBadgeClass(item.status)}>
					{#if item.status === 'approved'}
						<Check class="mr-1 h-3 w-3" />
					{:else if item.status === 'declined'}
						<X class="mr-1 h-3 w-3" />
					{:else}
						<Clock class="mr-1 h-3 w-3" />
					{/if}
					{item.status}
				</Badge>
			{/if}
		</div>

		<!-- Total -->
		<span class="text-lg font-bold {isRemoved || isReversal ? 'text-blue-600' : 'text-gray-900'}">
			{formatCurrency(item.total)}
		</span>
	</div>

	<!-- Description -->
	<div class="border-b p-3">
		{#if canEdit}
			<Input
				type="text"
				placeholder="Item description"
				bind:value={localDescription}
				onblur={() => onUpdateDescription(localDescription)}
				class="h-10 text-base"
			/>
		{:else}
			<p class="text-base {isRemoved ? 'text-red-600 line-through' : isReversal || isReversed ? 'text-blue-600' : ''}">
				{item.description}
			</p>
		{/if}

		<!-- Reversal/Decline reasons -->
		{#if isReversal && item.reversal_reason}
			<p class="mt-2 flex items-center gap-1 text-xs text-blue-600">
				<RotateCcw class="h-3 w-3" />
				Reversal: {item.reversal_reason}
			</p>
		{/if}
		{#if isReversed && reversalReason}
			<p class="mt-2 flex items-center gap-1 text-xs text-blue-600">
				<RotateCcw class="h-3 w-3" />
				Reversed: {reversalReason}
			</p>
		{/if}
		{#if item.decline_reason}
			<p class="mt-2 text-xs text-red-600">Declined: {item.decline_reason}</p>
		{/if}
	</div>

	<!-- Part Type Selection (N and pending only) -->
	{#if item.process_type === 'N' && canEdit}
		<div class="flex items-center gap-2 border-b bg-gray-50 px-3 py-2">
			<span class="text-sm text-gray-600">Part Type:</span>
			<select
				value={item.part_type || ''}
				onchange={(e) => onUpdatePartType(e.currentTarget.value)}
				class="rounded border px-2 py-1 text-sm"
			>
				<option value="">—</option>
				<option value="OEM">OEM</option>
				<option value="ALT">ALT</option>
				<option value="2ND">2ND</option>
			</select>
		</div>
	{/if}

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
					onclick={canEdit ? onEditPartPrice : undefined}
					class="flex items-center justify-between rounded border bg-white p-2 text-left {canEdit ? 'hover:border-blue-300' : 'cursor-default'}"
					disabled={!canEdit}
				>
					<span class="text-gray-600">Part (nett)</span>
					<span class="font-medium {canEdit ? 'text-blue-600' : ''}">{formatCurrency(item.part_price_nett || 0)}</span>
				</button>
			{/if}

			<!-- S&A -->
			{#if showSA}
				<button
					type="button"
					onclick={canEdit ? onEditSA : undefined}
					class="flex items-center justify-between rounded border bg-white p-2 text-left {canEdit ? 'hover:border-blue-300' : 'cursor-default'}"
					disabled={!canEdit}
				>
					<span class="text-gray-600">S&A</span>
					<span class="font-medium {canEdit ? 'text-blue-600' : ''}">
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
					onclick={canEdit ? onEditLabour : undefined}
					class="flex items-center justify-between rounded border bg-white p-2 text-left {canEdit ? 'hover:border-blue-300' : 'cursor-default'}"
					disabled={!canEdit}
				>
					<span class="text-gray-600">Labour</span>
					<span class="font-medium {canEdit ? 'text-blue-600' : ''}">
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
					onclick={canEdit ? onEditPaint : undefined}
					class="flex items-center justify-between rounded border bg-white p-2 text-left {canEdit ? 'hover:border-blue-300' : 'cursor-default'}"
					disabled={!canEdit}
				>
					<span class="text-gray-600">Paint</span>
					<span class="font-medium {canEdit ? 'text-blue-600' : ''}">
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
					onclick={canEdit ? onEditOutwork : undefined}
					class="flex items-center justify-between rounded border bg-white p-2 text-left {canEdit ? 'hover:border-blue-300' : 'cursor-default'}"
					disabled={!canEdit}
				>
					<span class="text-gray-600">Outwork</span>
					<span class="font-medium {canEdit ? 'text-blue-600' : ''}">{formatCurrency(item.outwork_charge_nett || 0)}</span>
				</button>
			{/if}
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex items-center justify-end gap-2 border-t bg-gray-50 p-2">
		{#if isReversal}
			<!-- Reversal entries are immutable -->
			<span class="flex items-center gap-1 text-xs italic text-blue-600">
				<RotateCcw class="h-3 w-3" />
				Reversal
			</span>
		{:else if isReversed}
			<!-- Reversed items: no actions -->
			<span class="flex items-center gap-1 text-xs italic text-blue-600">
				<RotateCcw class="h-3 w-3" />
				Reversed
			</span>
		{:else if canEdit && item.id}
			<!-- Pending items: can approve, decline, delete -->
			<Button size="sm" onclick={onApprove} class="h-8 px-3" title="Approve">
				<Check class="mr-1 h-4 w-4" />
				Approve
			</Button>
			<Button size="sm" variant="outline" onclick={onDecline} class="h-8 px-3" title="Decline">
				<X class="mr-1 h-4 w-4" />
				Decline
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={onDelete}
				class="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
			>
				<Trash2 class="h-4 w-4" />
			</Button>
		{:else if !isRemoved && item.status === 'approved' && item.id}
			<!-- Approved items: can reverse -->
			<Button
				size="sm"
				variant="outline"
				onclick={onReverse}
				class="h-8 px-3 text-orange-600"
				title="Reverse"
			>
				<Undo2 class="mr-1 h-4 w-4" />
				Reverse
			</Button>
		{:else if !isRemoved && item.status === 'declined' && item.id}
			<!-- Declined items: can reinstate -->
			<Button
				size="sm"
				variant="outline"
				onclick={onReinstate}
				class="h-8 px-3 text-green-600"
				title="Reinstate"
			>
				<RotateCcw class="mr-1 h-4 w-4" />
				Reinstate
			</Button>
		{:else if isRemoved && item.original_line_id}
			<!-- Removed original lines: can reinstate -->
			<Button
				size="sm"
				variant="outline"
				onclick={onReinstateOriginal}
				class="h-8 px-3 text-green-600"
				title="Reinstate Original"
			>
				<RotateCcw class="mr-1 h-4 w-4" />
				Reinstate
			</Button>
		{/if}
	</div>
</Card>
