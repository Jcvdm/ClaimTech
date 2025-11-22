<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Trash2 } from 'lucide-svelte';
	import type { Estimate, EstimateLineItem } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		estimate: Estimate;
		removedOriginalLineIds: string[];
		onRemoveOriginal: (item: EstimateLineItem) => void;
	}

	let { estimate, removedOriginalLineIds, onRemoveOriginal }: Props = $props();

	let isOpen = $state(false);

	// Calculate removed total
	const removedTotal = $derived(() => {
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
		<div class="rounded-md bg-red-50 border border-red-200 p-3">
			<div class="flex items-start gap-2">
				<Trash2 class="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
				<div class="flex-1">
					<p class="text-sm font-medium text-red-900">
						{removedOriginalLineIds.length} line{removedOriginalLineIds.length > 1 ? 's' : ''} removed
					</p>
					<p class="text-xs text-red-700 mt-1">
						Removed total: {formatCurrency(removedTotal())}
					</p>
				</div>
			</div>
		</div>
	{/if}
</Card>

<!-- Modal Dialog -->
<Dialog.Root open={isOpen} onOpenChange={(open) => (isOpen = open)}>
	<Dialog.Content class="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
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
				<div class="rounded-lg border bg-red-50 p-3">
					<p class="text-xs text-red-600">Removed Lines</p>
					<p class="text-lg font-semibold text-red-900">{removedOriginalLineIds.length}</p>
				</div>
				<div class="rounded-lg border bg-blue-50 p-3">
					<p class="text-xs text-blue-600">Removed Total</p>
					<p class="text-lg font-semibold text-blue-900">{formatCurrency(removedTotal())}</p>
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
							<Table.Row class={isRemoved ? 'bg-red-50' : ''}>
								<Table.Cell class="font-medium">
									<span
										class="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold {isRemoved
											? 'bg-red-200 text-red-900'
											: 'bg-blue-100 text-blue-900'}"
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
									<span class="font-medium {isRemoved ? 'text-red-600 line-through' : 'text-gray-900'}">
										{formatCurrency(item.total || 0)}
									</span>
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if isRemoved}
										<span
											class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
										>
											<Trash2 class="h-3 w-3 mr-1" />
											Removed
										</span>
									{:else}
										<span
											class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
										>
											Active
										</span>
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
			<div class="rounded-md bg-blue-50 border border-blue-200 p-3">
				<p class="text-xs text-blue-900">
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

