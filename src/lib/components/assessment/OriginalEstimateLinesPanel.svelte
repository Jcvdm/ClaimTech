<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Trash2 } from 'lucide-svelte';
	import type { Estimate, EstimateLineItem, AssessmentAdditionals } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		estimate: Estimate;
		additionals?: AssessmentAdditionals | null;
		removedOriginalLineIds: string[];
		onRemoveOriginal: (item: EstimateLineItem) => void;
	}

	let { estimate, additionals, removedOriginalLineIds, onRemoveOriginal }: Props = $props();

	let isOpen = $state(false);

	// Calculate removed total — use additionals as authoritative source (what was actually deducted)
	const removedTotal = $derived(() => {
		if (additionals?.line_items) {
			return additionals.line_items
				.filter((li) => li.action === 'removed' && li.status === 'approved')
				.reduce((sum, li) => sum + Math.abs(li.total || 0), 0);
		}
		// Fallback to estimate if no additionals
		return estimate.line_items
			.filter((item) => removedOriginalLineIds.includes(item.id!))
			.reduce((sum, item) => sum + (item.total || 0), 0);
	});

	// Process type labels
	const processTypeLabels: Record<string, string> = {
		N: 'New',
		R: 'Repair',
		P: 'Paint',
		B: 'Blend',
		A: 'Align',
		O: 'Outwork'
	};

	function handleRemove(item: EstimateLineItem) {
		onRemoveOriginal(item);
	}
</script>

<Card class="p-6">
	<div class="flex items-center justify-between mb-4">
		<div>
			<h3 class="text-lg font-semibold text-gray-900">Original Estimate Lines</h3>
			<p class="text-sm text-gray-600 mt-1">
				Remove lines from the original estimate. Removed lines will appear as negative items in Additionals.
			</p>
		</div>
		<Button variant="outline" onclick={() => (isOpen = true)}>
			Manage Lines ({estimate.line_items.length})
		</Button>
	</div>

	{#if removedOriginalLineIds.length > 0}
		<div class="rounded-md bg-destructive-soft border border-destructive-border p-3">
			<div class="flex items-start gap-2">
				<Trash2 class="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
				<div class="flex-1">
					<p class="text-sm font-medium text-destructive">
						{removedOriginalLineIds.length} line{removedOriginalLineIds.length > 1 ? 's' : ''} removed
					</p>
					<p class="text-xs text-destructive mt-1">
						Removed total: <span class="font-mono-tabular">{formatCurrency(removedTotal())}</span>
					</p>
				</div>
			</div>
		</div>
	{/if}
</Card>

<!-- Modal Dialog -->
<Dialog.Root open={isOpen} onOpenChange={(open) => (isOpen = open)}>
	<Dialog.Content class="sm:max-w-4xl max-h-[80vh] overflow-y-auto scroll-isolate">
		<Dialog.Header>
			<Dialog.Title>Manage Original Estimate Lines</Dialog.Title>
			<Dialog.Description>
				Remove lines from the original estimate. Removed lines will be added to Additionals as negative items,
				reducing the combined total. You can then add new items through the Additionals system.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Summary -->
			<div class="grid grid-cols-3 gap-4">
				<div class="rounded-lg border bg-gray-50 p-3">
					<p class="text-xs text-gray-600">Total Lines</p>
					<p class="text-lg font-semibold text-gray-900">{estimate.line_items.length}</p>
				</div>
				<div class="rounded-lg border bg-destructive-soft p-3">
					<p class="text-xs text-destructive">Removed Lines</p>
					<p class="text-lg font-semibold text-destructive">{removedOriginalLineIds.length}</p>
				</div>
				<div class="rounded-lg border bg-muted p-3">
					<p class="text-xs text-muted-foreground">Removed Total</p>
					<p class="text-lg font-semibold text-foreground font-mono-tabular">{formatCurrency(removedTotal())}</p>
				</div>
			</div>

			<!-- Line Items Table -->
			<div class="border rounded-lg overflow-hidden">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-12">Type</Table.Head>
							<Table.Head>Description</Table.Head>
							<Table.Head class="text-right">Total</Table.Head>
							<Table.Head class="text-center w-32">Status</Table.Head>
							<Table.Head class="text-right w-32">Action</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each estimate.line_items as item (item.id)}
							{@const isRemoved = removedOriginalLineIds.includes(item.id!)}
							<Table.Row class={isRemoved ? 'bg-destructive-soft' : ''}>
								<Table.Cell class="font-medium">
									<span
										class="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold {isRemoved
											? 'bg-destructive-border text-destructive'
											: 'bg-muted text-foreground'}"
									>
										{item.process_type}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div class="max-w-md">
										<p class="text-sm font-medium text-gray-900 {isRemoved ? 'line-through' : ''}">
											{item.description}
										</p>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<span class="font-medium font-mono-tabular {isRemoved ? 'text-destructive line-through' : 'text-gray-900'}">
										{formatCurrency(item.total || 0)}
									</span>
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if isRemoved}
										<Badge variant="destructive-soft">
											<Trash2 class="h-3 w-3 mr-1" />
											Removed
										</Badge>
									{:else}
										<Badge variant="success">
											Active
										</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										size="sm"
										variant="destructive"
										disabled={isRemoved}
										onclick={() => handleRemove(item)}
									>
										<Trash2 class="h-3 w-3 mr-1" />
										Remove
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<!-- Info Box -->
			<div class="rounded-md bg-muted border border-border-strong p-3">
				<p class="text-xs text-foreground">
					<strong>Note:</strong> Removed lines are added to Additionals as negative items, which reduces
					the combined total. The original estimate document remains unchanged. You can add replacement
					items through the Additionals "Add Line Item" feature.
				</p>
			</div>
		</div>

		<div class="flex justify-end mt-4">
			<Button onclick={() => (isOpen = false)}>Close</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

