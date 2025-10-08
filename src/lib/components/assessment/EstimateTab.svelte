<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { Plus, Trash2, CheckCircle2 } from 'lucide-svelte';
	import type { Estimate, EstimateLineItem, EstimateCategory } from '$lib/types/assessment';

	interface Props {
		estimate: Estimate | null;
		assessmentId: string;
		onUpdateEstimate: (data: Partial<Estimate>) => void;
		onAddLineItem: (item: EstimateLineItem) => void;
		onUpdateLineItem: (itemId: string, data: Partial<EstimateLineItem>) => void;
		onDeleteLineItem: (itemId: string) => void;
		onComplete: () => void;
	}

	let {
		estimate,
		assessmentId,
		onUpdateEstimate,
		onAddLineItem,
		onUpdateLineItem,
		onDeleteLineItem,
		onComplete
	}: Props = $props();

	const categoryOptions: { value: EstimateCategory; label: string }[] = [
		{ value: 'parts', label: 'Parts' },
		{ value: 'labour', label: 'Labour' },
		{ value: 'paint', label: 'Paint' },
		{ value: 'other', label: 'Other' }
	];

	function handleAddLineItem() {
		const newItem: EstimateLineItem = {
			id: crypto.randomUUID(),
			description: '',
			category: 'parts',
			quantity: 1,
			unit_price: 0,
			total: 0
		};
		onAddLineItem(newItem);
	}

	function handleUpdateLineItem(itemId: string, field: keyof EstimateLineItem, value: any) {
		const item = estimate?.line_items.find((i) => i.id === itemId);
		if (!item) return;

		const updated: Partial<EstimateLineItem> = { [field]: value };

		// Auto-calculate total when quantity or unit_price changes
		if (field === 'quantity' || field === 'unit_price') {
			const quantity = field === 'quantity' ? Number(value) : item.quantity;
			const unitPrice = field === 'unit_price' ? Number(value) : item.unit_price;
			updated.total = quantity * unitPrice;
		}

		onUpdateLineItem(itemId, updated);
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-ZA', {
			style: 'currency',
			currency: estimate?.currency || 'ZAR',
			minimumFractionDigits: 2
		}).format(amount);
	}

	// Check if estimate is complete
	const isComplete = $derived(
		estimate !== null &&
		estimate.line_items.length > 0 &&
		estimate.total > 0
	);
</script>

<div class="space-y-6">
	{#if !estimate}
		<Card class="p-6 border-2 border-dashed border-gray-300">
			<p class="text-center text-gray-600">Loading estimate...</p>
		</Card>
	{:else}
		<!-- Line Items Table -->
		<Card class="p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">Line Items</h3>
				<Button onclick={handleAddLineItem} size="sm">
					<Plus class="mr-2 h-4 w-4" />
					Add Line Item
				</Button>
			</div>

			<div class="rounded-lg border">
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="w-[35%]">Description</Table.Head>
							<Table.Head class="w-[15%]">Category</Table.Head>
							<Table.Head class="w-[10%] text-right">Qty</Table.Head>
							<Table.Head class="w-[15%] text-right">Unit Price</Table.Head>
							<Table.Head class="w-[15%] text-right">Total</Table.Head>
							<Table.Head class="w-[10%]"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if estimate.line_items.length === 0}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={6} class="h-24 text-center text-gray-500">
									No line items added. Click "Add Line Item" to get started.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each estimate.line_items as item (item.id)}
								<Table.Row class="hover:bg-gray-50">
									<Table.Cell>
										<Input
											type="text"
											placeholder="Item description"
											value={item.description}
											oninput={(e) =>
												handleUpdateLineItem(item.id!, 'description', e.currentTarget.value)}
											class="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
										/>
									</Table.Cell>
									<Table.Cell>
										<select
											value={item.category}
											onchange={(e) =>
												handleUpdateLineItem(item.id!, 'category', e.currentTarget.value)}
											class="w-full rounded-md border-0 bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-0"
										>
											{#each categoryOptions as option}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Input
											type="number"
											min="0"
											step="1"
											value={item.quantity}
											oninput={(e) =>
												handleUpdateLineItem(item.id!, 'quantity', Number(e.currentTarget.value))}
											class="border-0 text-right focus-visible:ring-0 focus-visible:ring-offset-0"
										/>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Input
											type="number"
											min="0"
											step="0.01"
											value={item.unit_price}
											oninput={(e) =>
												handleUpdateLineItem(
													item.id!,
													'unit_price',
													Number(e.currentTarget.value)
												)}
											class="border-0 text-right focus-visible:ring-0 focus-visible:ring-offset-0"
										/>
									</Table.Cell>
									<Table.Cell class="text-right font-medium">
										{formatCurrency(item.total)}
									</Table.Cell>
									<Table.Cell class="text-center">
										<Button
											variant="ghost"
											size="sm"
											onclick={() => onDeleteLineItem(item.id!)}
											class="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card>

		<!-- Totals Summary -->
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Summary</h3>

			<div class="space-y-4">
				<div class="flex items-center justify-between border-b pb-3">
					<span class="text-sm text-gray-600">Subtotal</span>
					<span class="text-lg font-medium">{formatCurrency(estimate.subtotal)}</span>
				</div>

				<div class="flex items-center justify-between border-b pb-3">
					<div class="flex items-center gap-2">
						<span class="text-sm text-gray-600">VAT</span>
						<Input
							type="number"
							min="0"
							max="100"
							step="0.1"
							value={estimate.vat_percentage}
							oninput={(e) =>
								onUpdateEstimate({ vat_percentage: Number(e.currentTarget.value) })}
							class="w-20 h-8 text-sm"
						/>
						<span class="text-sm text-gray-600">%</span>
					</div>
					<span class="text-lg font-medium">{formatCurrency(estimate.vat_amount)}</span>
				</div>

				<div class="flex items-center justify-between border-t-2 pt-3">
					<span class="text-base font-semibold text-gray-900">Total</span>
					<span class="text-2xl font-bold text-blue-600">{formatCurrency(estimate.total)}</span>
				</div>
			</div>
		</Card>

		<!-- Notes -->
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Additional Notes</h3>
			<FormField
				label=""
				type="textarea"
				value={estimate.notes || ''}
				onInput={(e) => onUpdateEstimate({ notes: (e.target as HTMLTextAreaElement).value })}
				placeholder="Add any additional notes or comments about this estimate..."
				rows={4}
			/>
		</Card>

		<!-- Actions -->
		<div class="flex justify-between">
			<Button variant="outline" onclick={() => {}}>Save Progress</Button>
			<Button onclick={onComplete} disabled={!isComplete}>
				<CheckCircle2 class="mr-2 h-4 w-4" />
				Complete Estimate
			</Button>
		</div>
	{/if}
</div>

