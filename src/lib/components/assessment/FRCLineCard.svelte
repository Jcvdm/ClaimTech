<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Check, AlertCircle, Clock, Link } from 'lucide-svelte';
	import type { FRCLineItem, FRCDocument, FinalRepairCosting } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/formatters';
	import { getProcessTypeBadgeColor } from '$lib/constants/processTypes';

	interface Props {
		line: FRCLineItem;
		frc: FinalRepairCosting;
		lines: FRCLineItem[];
		documents: FRCDocument[];
		onOpenActions: (line: FRCLineItem) => void;
	}

	let { line, frc, lines, documents, onOpenActions }: Props = $props();

	// Get status badge configuration — mirrors FRCLinesTable.getDecisionBadge
	function getDecisionBadge(decision: string) {
		switch (decision) {
			case 'agree':
				return { variant: 'success' as const, icon: Check, label: 'Agreed', class: '' };
			case 'adjust':
				return { variant: 'warning' as const, icon: AlertCircle, label: 'Adjusted', class: '' };
			case 'declined':
				return { variant: 'destructive-soft' as const, icon: AlertCircle, label: 'Declined', class: '' };
			default:
				return { variant: 'secondary' as const, icon: Clock, label: 'Pending', class: '' };
		}
	}

	// Calculate delta — mirrors FRCLinesTable.getDeltaDisplay
	function getDeltaDisplay(quoted: number, actual: number | null) {
		if (actual === null || actual === undefined) {
			return { text: '-', class: 'text-gray-400' };
		}
		const delta = actual - quoted;
		if (delta === 0) {
			return { text: formatCurrency(0), class: 'text-gray-600' };
		}
		return {
			text: `${delta > 0 ? '+' : ''}${formatCurrency(delta)}`,
			class: delta > 0 ? 'text-red-600' : 'text-green-600'
		};
	}

	// Process-type visibility helpers — mirrors FRCLinesTable helpers
	function showParts(processType: string) { return processType === 'N'; }
	function showSA(processType: string)    { return ['N', 'R', 'P', 'B'].includes(processType); }
	function showLabour(processType: string){ return ['N', 'R', 'A'].includes(processType); }
	function showPaint(processType: string) { return ['N', 'R', 'P', 'B'].includes(processType); }

	const badge = $derived(getDecisionBadge(line.decision));
	const isRemovedOrDeclined = $derived(line.removed_via_additionals || line.declined_via_additionals);
	const canAct = $derived(frc.status === 'in_progress' && !isRemovedOrDeclined);

	// Find a removal additional that targets this line (for deduction badge)
	const removalLine = $derived(
		lines.find(l => l.is_removal_additional && l.removal_for_source_line_id === line.source_line_id)
	);

	// Linked document label
	const linkedDoc = $derived(
		line.linked_document_id ? documents.find(d => d.id === line.linked_document_id) : null
	);
</script>

<Card class="overflow-hidden {isRemovedOrDeclined ? 'opacity-60 bg-gray-50/50' : ''}">
	<!-- Header: process type badge + description + decision badge -->
	<div class="flex items-start gap-2 border-b bg-gray-50 p-3">
		<!-- Process type -->
		<span class="shrink-0 px-2 py-1 text-xs font-semibold rounded {getProcessTypeBadgeColor(line.process_type)}">
			{line.process_type}
		</span>

		<!-- Description block -->
		<div class="min-w-0 flex-1">
			<p class="text-sm font-medium text-gray-900 {line.removed_via_additionals || line.declined_via_additionals ? 'line-through' : ''}">
				{line.description}
			</p>
			<p class="mt-0.5 text-xs text-gray-500">
				Source: {line.source === 'estimate' ? 'Original Estimate' : 'Additional'}
			</p>

			<!-- Status badges row -->
			<div class="mt-1 flex flex-wrap items-center gap-1">
				{#if line.removed_via_additionals}
					<Badge variant="success" class="text-[10px] py-0 px-1.5">
						<Check class="h-3 w-3 mr-1" />
						Agreed (Removed)
					</Badge>
					<Badge variant="destructive" class="text-[10px] py-0 px-1.5">REMOVED</Badge>
				{:else if line.declined_via_additionals}
					<Badge variant="destructive" class="text-[10px] py-0 px-1.5" title={line.decline_reason}>DECLINED</Badge>
					<Badge variant={badge.variant} class="{badge.class} text-[10px] py-0 px-1.5">
						{@const Icon = badge.icon}
						<Icon class="h-3 w-3 mr-1" />
						{badge.label}
					</Badge>
				{:else}
					<Badge variant={badge.variant} class="{badge.class} text-[10px] py-0 px-1.5">
						{@const Icon = badge.icon}
						<Icon class="h-3 w-3 mr-1" />
						{badge.label}
					</Badge>
				{/if}

				{#if line.source === 'additional' && (line.quoted_total ?? 0) < 0}
					<Badge variant="outline" class="text-[10px] py-0 px-1.5 border-red-400 text-red-600">
						REMOVAL (-)
					</Badge>
				{/if}

				{#if line.removed_via_additionals && removalLine}
					<Badge variant="outline" class="text-[10px] py-0 px-1.5 border-red-400 text-red-600">
						Deduction <span class="font-mono-tabular">{formatCurrency(removalLine.quoted_total)}</span>
					</Badge>
				{/if}
			</div>

			{#if line.adjust_reason}
				<p class="mt-1 text-xs text-orange-600 flex items-center gap-1">
					<AlertCircle class="inline h-3 w-3" /> {line.adjust_reason}
				</p>
			{/if}

			{#if ((line.quoted_outwork_charge_nett || 0) > 0 || (line.actual_outwork_charge ?? 0) > 0)}
				<p class="mt-0.5 text-xs text-gray-500">
					Outwork (nett): <span class="font-mono-tabular">{formatCurrency(line.actual_outwork_charge ?? line.quoted_outwork_charge_nett ?? 0)}</span>
				</p>
			{/if}
		</div>

		<!-- Totals (quoted → actual) aligned right -->
		<div class="shrink-0 text-right">
			<div class="text-xs text-gray-500 font-mono-tabular">{formatCurrency(line.quoted_total)}</div>
			<div class="text-sm font-bold text-gray-900 font-mono-tabular">
				{line.actual_total !== null && line.actual_total !== undefined
					? formatCurrency(line.actual_total)
					: '-'}
			</div>
			{#if line.actual_total !== null && line.actual_total !== undefined}
				{@const delta = getDeltaDisplay(line.quoted_total, line.actual_total)}
				<div class="text-xs font-medium font-mono-tabular {delta.class}">{delta.text}</div>
			{/if}
		</div>
	</div>

	<!-- Cost breakdown rows (process-type gated) -->
	<div class="divide-y px-3 py-2 text-sm">
		{#if showParts(line.process_type)}
			<div class="flex items-center justify-between py-1.5">
				<span class="text-xs text-gray-500 w-16 shrink-0">Parts (nett)</span>
				<div class="text-right">
					<div class="text-xs text-gray-400 font-mono-tabular">{formatCurrency(line.quoted_part_price_nett || 0)}</div>
					<div class="text-sm font-medium text-gray-900 font-mono-tabular">
						{line.actual_part_price_nett !== null && line.actual_part_price_nett !== undefined
							? formatCurrency(line.actual_part_price_nett)
							: '-'}
					</div>
					{#if line.actual_part_price_nett !== null && line.actual_part_price_nett !== undefined}
						{@const d = getDeltaDisplay(line.quoted_part_price_nett || 0, line.actual_part_price_nett)}
						<div class="text-xs font-mono-tabular {d.class}">{d.text}</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if showSA(line.process_type)}
			<div class="flex items-center justify-between py-1.5">
				<span class="text-xs text-gray-500 w-16 shrink-0">S&A</span>
				<div class="text-right">
					<div class="text-xs text-gray-400 font-mono-tabular">
						{formatCurrency(line.quoted_strip_assemble || 0)}
						{#if line.strip_assemble_hours}<span class="text-gray-400">({line.strip_assemble_hours}h)</span>{/if}
					</div>
					<div class="text-sm font-medium text-gray-900 font-mono-tabular">
						{line.actual_strip_assemble !== null && line.actual_strip_assemble !== undefined
							? formatCurrency(line.actual_strip_assemble)
							: '-'}
						{#if line.actual_strip_assemble_hours !== null && line.actual_strip_assemble_hours !== undefined}
							<span class="text-gray-400 text-xs">({line.actual_strip_assemble_hours}h)</span>
						{/if}
					</div>
					{#if line.actual_strip_assemble !== null && line.actual_strip_assemble !== undefined}
						{@const d = getDeltaDisplay(line.quoted_strip_assemble || 0, line.actual_strip_assemble)}
						<div class="text-xs font-mono-tabular {d.class}">{d.text}</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if showLabour(line.process_type)}
			<div class="flex items-center justify-between py-1.5">
				<span class="text-xs text-gray-500 w-16 shrink-0">Labour</span>
				<div class="text-right">
					<div class="text-xs text-gray-400 font-mono-tabular">
						{formatCurrency(line.quoted_labour_cost || 0)}
						{#if line.labour_hours}<span class="text-gray-400">({line.labour_hours}h)</span>{/if}
					</div>
					<div class="text-sm font-medium text-gray-900 font-mono-tabular">
						{line.actual_labour_cost !== null && line.actual_labour_cost !== undefined
							? formatCurrency(line.actual_labour_cost)
							: '-'}
						{#if line.actual_labour_hours !== null && line.actual_labour_hours !== undefined}
							<span class="text-gray-400 text-xs">({line.actual_labour_hours}h)</span>
						{/if}
					</div>
					{#if line.actual_labour_cost !== null && line.actual_labour_cost !== undefined}
						{@const d = getDeltaDisplay(line.quoted_labour_cost || 0, line.actual_labour_cost)}
						<div class="text-xs font-mono-tabular {d.class}">{d.text}</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if showPaint(line.process_type)}
			<div class="flex items-center justify-between py-1.5">
				<span class="text-xs text-gray-500 w-16 shrink-0">Paint</span>
				<div class="text-right">
					<div class="text-xs text-gray-400 font-mono-tabular">
						{formatCurrency(line.quoted_paint_cost || 0)}
						{#if line.paint_panels}<span class="text-gray-400">({line.paint_panels}p)</span>{/if}
					</div>
					<div class="text-sm font-medium text-gray-900 font-mono-tabular">
						{line.actual_paint_cost !== null && line.actual_paint_cost !== undefined
							? formatCurrency(line.actual_paint_cost)
							: '-'}
						{#if line.actual_paint_panels !== null && line.actual_paint_panels !== undefined}
							<span class="text-gray-400 text-xs">({line.actual_paint_panels}p)</span>
						{/if}
					</div>
					{#if line.actual_paint_cost !== null && line.actual_paint_cost !== undefined}
						{@const d = getDeltaDisplay(line.quoted_paint_cost || 0, line.actual_paint_cost)}
						<div class="text-xs font-mono-tabular {d.class}">{d.text}</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Linked document indicator (if any) -->
	{#if linkedDoc}
		<div class="flex items-center gap-1 border-t px-3 py-1.5 text-xs text-blue-600">
			<Link class="h-3 w-3" />
			{linkedDoc.label || linkedDoc.document_type}
		</div>
	{/if}

	<!-- Actions footer -->
	{#if canAct}
		<div class="flex justify-end border-t bg-gray-50 p-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => onOpenActions(line)}
				class="h-8 text-xs"
			>
				Actions
			</Button>
		</div>
	{/if}
</Card>
