<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Check, Clock, AlertCircle } from 'lucide-svelte';
import type { FinalRepairCosting, FRCLineItem, FRCDocument } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/formatters';
	import { getProcessTypeBadgeColor } from '$lib/constants/processTypes';

    interface Props {
        frc: FinalRepairCosting;
        lines: FRCLineItem[];
        documents: FRCDocument[];
        onAgree: (line: FRCLineItem) => void;
        onAdjust: (line: FRCLineItem) => void;
        onLinkDocument: (line: FRCLineItem, documentId: string) => void;
        onToggleMatched: (line: FRCLineItem, matched: boolean) => void;
    }

    let { frc, lines, documents, onAgree, onAdjust, onLinkDocument, onToggleMatched }: Props = $props();

	// Row actions dialog state
	let rowActionsOpen = $state(false);
	let currentLine = $state<FRCLineItem | null>(null);
	function openRowActions(line: FRCLineItem) {
		currentLine = line;
		rowActionsOpen = true;
	}

	// Get status badge configuration
	function getDecisionBadge(decision: string) {
		switch (decision) {
			case 'agree':
				return { variant: 'default' as const, icon: Check, label: 'Agreed', class: 'bg-green-100 text-green-800' };
			case 'adjust':
				return { variant: 'default' as const, icon: AlertCircle, label: 'Adjusted', class: 'bg-orange-100 text-orange-800' };
			default:
				return { variant: 'secondary' as const, icon: Clock, label: 'Pending', class: '' };
		}
	}

	// Calculate delta and get color class
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

	// Check if a component should be shown for a process type
	function showParts(processType: string) {
		return processType === 'N';
	}

	function showSA(processType: string) {
		return ['N', 'R', 'P', 'B'].includes(processType);
	}

	function showLabour(processType: string) {
		return ['N', 'R', 'A'].includes(processType);
	}

	function showPaint(processType: string) {
		return ['N', 'R', 'P', 'B'].includes(processType);
	}

</script>

<div class="rounded-lg border">
	<Table.Root>
		<Table.Header>
			<Table.Row class="hover:bg-transparent">
				<Table.Head class="w-[60px] px-3">Type</Table.Head>
				<Table.Head class="min-w-[220px] px-3">Description</Table.Head>
				<Table.Head class="w-[120px] text-right px-3">Parts (nett)</Table.Head>
				<Table.Head class="hidden xl:table-cell w-[120px] text-right px-3">S&A</Table.Head>
				<Table.Head class="hidden xl:table-cell w-[120px] text-right px-3">Labour</Table.Head>
				<Table.Head class="hidden xl:table-cell w-[120px] text-right px-3">Paint</Table.Head>
				<Table.Head class="xl:hidden w-[180px] text-right px-3">Work</Table.Head>
				<Table.Head class="w-[140px] text-right px-3">Total</Table.Head>
			</Table.Row>
		</Table.Header>
        <Table.Body>
            {#if lines.length === 0}
				<Table.Row class="hover:bg-transparent">
					<!-- xl and above: 7 columns -->
					<Table.Cell colspan={7} class="hidden xl:table-cell h-24 text-center text-gray-500">
						No line items in FRC
					</Table.Cell>
					<!-- below xl: 5 columns -->
					<Table.Cell colspan={5} class="xl:hidden h-24 text-center text-gray-500">
						No line items in FRC
					</Table.Cell>
				</Table.Row>
            {:else}
                {#each lines as line (line.id)}
                    {#if !line.is_removal_additional}
                    {@const badge = getDecisionBadge(line.decision)}
                    {@const isRemovedOrDeclined = line.removed_via_additionals || line.declined_via_additionals}
                    <Table.Row class="hover:bg-gray-50 {isRemovedOrDeclined ? 'opacity-60 bg-gray-50/50' : ''}">
						<!-- Process Type -->
						<Table.Cell class="px-3 py-3">
							<span class="px-2 py-1 text-xs font-semibold rounded {getProcessTypeBadgeColor(line.process_type)}">
								{line.process_type}
							</span>
						</Table.Cell>

						<!-- Description -->
                        <Table.Cell class="px-3 py-3">
                            <div
                                class="rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 {isRemovedOrDeclined ? '' : 'cursor-pointer'}"
                                role={isRemovedOrDeclined ? undefined : 'button'}
                                tabindex={isRemovedOrDeclined ? undefined : 0}
                                onclick={() => { if (!isRemovedOrDeclined) openRowActions(line); }}
                                onkeydown={(e) => { if (!isRemovedOrDeclined && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openRowActions(line); } }}
                            >
								<p class="text-sm font-medium text-gray-900 {line.removed_via_additionals || line.declined_via_additionals ? 'line-through' : ''}">
								{line.description}
							</p>
                                <p class="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                    <span>Source: {line.source === 'estimate' ? 'Original Estimate' : 'Additional'}</span>
                                    {#if line.removed_via_additionals}
                                        <Badge variant="destructive" class="text-[10px] py-0 px-1.5">REMOVED</Badge>
                                    {/if}
                                    {#if line.declined_via_additionals}
                                        <Badge variant="destructive" class="text-[10px] py-0 px-1.5" title={line.decline_reason}>DECLINED</Badge>
                                    {/if}
                                    {#if line.source === 'additional' && (line.quoted_total ?? 0) < 0}
                                        <Badge variant="outline" class="text-[10px] py-0 px-1.5 border-red-400 text-red-600">
                                            REMOVAL (-)
                                        </Badge>
                                    {/if}
                                    {#if line.removed_via_additionals}
                                        {@const removal = lines.find(l => l.is_removal_additional && l.removal_for_source_line_id === line.source_line_id)}
                                        {#if removal}
                                            <Badge variant="outline" class="text-[10px] py-0 px-1.5 border-red-400 text-red-600">
                                                Deduction {formatCurrency(removal.quoted_total)}
                                            </Badge>
                                        {/if}
                                    {/if}
                                </p>
								<p class="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                    {#if line.removed_via_additionals}
                                        <Badge class="bg-green-100 text-green-800">
                                            <Check class="h-3 w-3 mr-1" />
                                            Agreed (Removed)
                                        </Badge>
                                    {:else}
                                        <Badge variant={badge.variant} class={badge.class}>
                                            {@const Icon = badge.icon}
                                            <Icon class="h-3 w-3 mr-1" />
                                            {badge.label}
                                        </Badge>
                                    {/if}
									{#if ((line.quoted_outwork_charge_nett || 0) > 0 || (line.actual_outwork_charge ?? 0) > 0)}
										<span>
											Outwork (nett): {formatCurrency(line.actual_outwork_charge ?? line.quoted_outwork_charge_nett ?? 0)}
										</span>
									{/if}
								</p>
								{#if line.adjust_reason}
									<p class="text-xs text-orange-600 mt-1 flex items-center gap-1">
										<AlertCircle class="inline h-3 w-3" /> {line.adjust_reason}
									</p>
								{/if}
							</div>
						</Table.Cell>

						<!-- Parts (nett) -->
						<Table.Cell class="text-right px-3 py-3">
							{#if showParts(line.process_type)}
								<div class="space-y-0.5">
									<div class="text-xs text-gray-500">{formatCurrency(line.quoted_part_price_nett || 0)}</div>
									<div class="text-sm font-medium text-gray-900">
										{line.actual_part_price_nett !== null && line.actual_part_price_nett !== undefined
											? formatCurrency(line.actual_part_price_nett)
											: '-'}
									</div>
									{#if line.actual_part_price_nett !== null && line.actual_part_price_nett !== undefined}
										{@const delta = getDeltaDisplay(line.quoted_part_price_nett || 0, line.actual_part_price_nett)}
										<div class="text-xs {delta.class}">{delta.text}</div>
									{/if}
								</div>
							{:else}
								<span class="text-gray-400 text-xs">-</span>
							{/if}
						</Table.Cell>

						<!-- Work (stacked) for <xl -->
						<Table.Cell class="xl:hidden text-right px-3 py-3">
							<div class="space-y-1">
								{#if showSA(line.process_type)}
									<div>
										<div class="text-[11px] text-gray-500">S&A: {formatCurrency(line.quoted_strip_assemble || 0)}</div>
										<div class="text-sm font-medium text-gray-900">
											{line.actual_strip_assemble ?? '-'}
											{#if line.actual_strip_assemble_hours !== null && line.actual_strip_assemble_hours !== undefined}
												<span class="text-gray-400 text-[11px]">({line.actual_strip_assemble_hours}h)</span>
											{/if}
										</div>
										{#if line.actual_strip_assemble !== null && line.actual_strip_assemble !== undefined}
											{@const d = getDeltaDisplay(line.quoted_strip_assemble || 0, line.actual_strip_assemble)}
											<div class="text-[11px] {d.class}">{d.text}</div>
										{/if}
									</div>
								{/if}

								{#if showLabour(line.process_type)}
									<div>
										<div class="text-[11px] text-gray-500">Labour: {formatCurrency(line.quoted_labour_cost || 0)}</div>
										<div class="text-sm font-medium text-gray-900">
											{line.actual_labour_cost ?? '-'}
											{#if line.actual_labour_hours !== null && line.actual_labour_hours !== undefined}
												<span class="text-gray-400 text-[11px]">({line.actual_labour_hours}h)</span>
											{/if}
										</div>
										{#if line.actual_labour_cost !== null && line.actual_labour_cost !== undefined}
											{@const d = getDeltaDisplay(line.quoted_labour_cost || 0, line.actual_labour_cost)}
											<div class="text-[11px] {d.class}">{d.text}</div>
										{/if}
									</div>
								{/if}

								{#if showPaint(line.process_type)}
									<div>
										<div class="text-[11px] text-gray-500">Paint: {formatCurrency(line.quoted_paint_cost || 0)}</div>
										<div class="text-sm font-medium text-gray-900">
											{line.actual_paint_cost ?? '-'}
											{#if line.actual_paint_panels !== null && line.actual_paint_panels !== undefined}
												<span class="text-gray-400 text-[11px]">({line.actual_paint_panels}p)</span>
											{/if}
										</div>
										{#if line.actual_paint_cost !== null && line.actual_paint_cost !== undefined}
											{@const d = getDeltaDisplay(line.quoted_paint_cost || 0, line.actual_paint_cost)}
											<div class="text-[11px] {d.class}">{d.text}</div>
										{/if}
									</div>
								{/if}
							</div>
						</Table.Cell>

						<!-- S&A -->
						<Table.Cell class="hidden xl:table-cell text-right px-3 py-3">
							{#if showSA(line.process_type)}
								<div class="space-y-0.5">
									<div class="text-xs text-gray-500">
										{formatCurrency(line.quoted_strip_assemble || 0)}
										{#if line.strip_assemble_hours}<span class="text-gray-400">({line.strip_assemble_hours}h)</span>{/if}
									</div>
									<div class="text-sm font-medium text-gray-900">
										{line.actual_strip_assemble !== null && line.actual_strip_assemble !== undefined
											? formatCurrency(line.actual_strip_assemble)
											: '-'}
										{#if line.actual_strip_assemble_hours !== null && line.actual_strip_assemble_hours !== undefined}
											<span class="text-gray-400 text-xs">({line.actual_strip_assemble_hours}h)</span>
										{/if}
									</div>
									{#if line.actual_strip_assemble !== null && line.actual_strip_assemble !== undefined}
										{@const delta = getDeltaDisplay(line.quoted_strip_assemble || 0, line.actual_strip_assemble)}
										<div class="text-xs {delta.class}">{delta.text}</div>
									{/if}
								</div>
							{:else}
								<span class="text-gray-400 text-xs">-</span>
							{/if}
						</Table.Cell>

						<!-- Labour -->
						<Table.Cell class="hidden xl:table-cell text-right px-3 py-3">
							{#if showLabour(line.process_type)}
								<div class="space-y-0.5">
									<div class="text-xs text-gray-500">
										{formatCurrency(line.quoted_labour_cost || 0)}
										{#if line.labour_hours}<span class="text-gray-400">({line.labour_hours}h)</span>{/if}
									</div>
									<div class="text-sm font-medium text-gray-900">
										{line.actual_labour_cost !== null && line.actual_labour_cost !== undefined
											? formatCurrency(line.actual_labour_cost)
											: '-'}
										{#if line.actual_labour_hours !== null && line.actual_labour_hours !== undefined}
											<span class="text-gray-400 text-xs">({line.actual_labour_hours}h)</span>
										{/if}
									</div>
									{#if line.actual_labour_cost !== null && line.actual_labour_cost !== undefined}
										{@const delta = getDeltaDisplay(line.quoted_labour_cost || 0, line.actual_labour_cost)}
										<div class="text-xs {delta.class}">{delta.text}</div>
									{/if}
								</div>
							{:else}
								<span class="text-gray-400 text-xs">-</span>
							{/if}
						</Table.Cell>

						<!-- Paint -->
						<Table.Cell class="hidden xl:table-cell text-right px-3 py-3">
							{#if showPaint(line.process_type)}
								<div class="space-y-0.5">
									<div class="text-xs text-gray-500">
										{formatCurrency(line.quoted_paint_cost || 0)}
										{#if line.paint_panels}<span class="text-gray-400">({line.paint_panels}p)</span>{/if}
									</div>
									<div class="text-sm font-medium text-gray-900">
										{line.actual_paint_cost !== null && line.actual_paint_cost !== undefined
											? formatCurrency(line.actual_paint_cost)
											: '-'}
										{#if line.actual_paint_panels !== null && line.actual_paint_panels !== undefined}
											<span class="text-gray-400 text-xs">({line.actual_paint_panels}p)</span>
										{/if}
									</div>
									{#if line.actual_paint_cost !== null && line.actual_paint_cost !== undefined}
										{@const delta = getDeltaDisplay(line.quoted_paint_cost || 0, line.actual_paint_cost)}
										<div class="text-xs {delta.class}">{delta.text}</div>
									{/if}
								</div>
							{:else}
								<span class="text-gray-400 text-xs">-</span>
							{/if}
						</Table.Cell>









						<!-- Total -->
						<Table.Cell class="text-right px-3 py-3">
							<div class="space-y-0.5">
								<div class="text-xs text-gray-500">{formatCurrency(line.quoted_total)}</div>
								<div class="text-sm font-bold text-gray-900">
									{line.actual_total !== null && line.actual_total !== undefined
										? formatCurrency(line.actual_total)
										: '-'}
								</div>
								{#if line.actual_total !== null && line.actual_total !== undefined}
									{@const delta = getDeltaDisplay(line.quoted_total, line.actual_total)}
									<div class="text-xs font-medium {delta.class}">{delta.text}</div>
								{/if}
							</div>
						</Table.Cell>


                    </Table.Row>
                    {/if}
                {/each}
            {/if}
        </Table.Body>
	</Table.Root>
</div>



<!-- Row Actions Dialog -->
<Dialog.Root bind:open={rowActionsOpen}>
    <Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Line Actions</Dialog.Title>
			{#if currentLine}
				<Dialog.Description>{currentLine.description}</Dialog.Description>
			{/if}
		</Dialog.Header>
        {#if currentLine}
            {#if frc.status === 'in_progress'}
                <div class="space-y-2">
                    <Button
                        variant="outline"
                        class="w-full"
                        onclick={() => {
                            onAgree(currentLine!);
                            rowActionsOpen = false;
                        }}
                        disabled={currentLine.decision === 'agree' || currentLine.removed_via_additionals || currentLine.declined_via_additionals}
                    >
                        <Check class="h-4 w-4 mr-2" />
                        Agree with Quoted Amount
                    </Button>
                    <Button
                        variant="outline"
                        class="w-full"
                        onclick={() => {
                            onAdjust(currentLine!);
                            rowActionsOpen = false;
                        }}
                        disabled={currentLine.removed_via_additionals || currentLine.declined_via_additionals}
                    >
                        <AlertCircle class="h-4 w-4 mr-2" />
                        Adjust Amount
                    </Button>
                </div>
                <div class="space-y-2 mt-3">
                    <p class="text-xs text-gray-600">Attach Invoice</p>
                    <select
                        class="w-full border rounded px-2 py-1 text-sm"
                        disabled={currentLine.removed_via_additionals || currentLine.declined_via_additionals}
                        onchange={(e) => onLinkDocument(currentLine!, (e.target as HTMLSelectElement).value)}
                    >
                        <option value="">Select Document</option>
                        {#each documents as doc (doc.id)}
                            <option value={doc.id}>{doc.label || doc.document_type} ({new Date(doc.created_at).toLocaleDateString()})</option>
                        {/each}
                    </select>
                    <div class="flex items-center gap-2">
                        <input
                            id="matched-toggle"
                            type="checkbox"
                            checked={currentLine.matched || false}
                            disabled={currentLine.removed_via_additionals || currentLine.declined_via_additionals}
                            oninput={(e) => onToggleMatched(currentLine!, (e.target as HTMLInputElement).checked)}
                        />
                        <label for="matched-toggle" class="text-xs text-gray-700">Matched to invoice</label>
                    </div>
                </div>
            {:else}
                <p class="text-sm text-gray-500">FRC is completed. No actions available.</p>
            {/if}
        {/if}
    </Dialog.Content>
</Dialog.Root>
