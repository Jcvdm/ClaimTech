<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import RatesConfiguration from './RatesConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import { Plus, Trash2, Check } from 'lucide-svelte';
	import type { Estimate, EstimateLineItem } from '$lib/types/assessment';
	import { getProcessTypeOptions } from '$lib/constants/processTypes';
	import { createEmptyLineItem, calculateLineItemTotal } from '$lib/utils/estimateCalculations';

	interface Props {
		estimate: Estimate | null;
		assessmentId: string;
		onUpdateEstimate: (data: Partial<Estimate>) => void;
		onAddLineItem: (item: EstimateLineItem) => void;
		onUpdateLineItem: (itemId: string, data: Partial<EstimateLineItem>) => void;
		onDeleteLineItem: (itemId: string) => void;
		onUpdateRates: (labourRate: number, paintRate: number) => void;
		onComplete: () => void;
	}

	let {
		estimate,
		assessmentId,
		onUpdateEstimate,
		onAddLineItem,
		onUpdateLineItem,
		onDeleteLineItem,
		onUpdateRates,
		onComplete
	}: Props = $props();

	const processTypeOptions = getProcessTypeOptions();

	function handleAddEmptyLineItem() {
		const newItem = createEmptyLineItem('N') as EstimateLineItem;
		onAddLineItem(newItem);
	}

	function handleUpdateLineItem(itemId: string, field: keyof EstimateLineItem, value: any) {
		onUpdateLineItem(itemId, { [field]: value });
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
		<!-- Rates Configuration -->
		<RatesConfiguration
			labourRate={estimate.labour_rate}
			paintRate={estimate.paint_rate}
			onUpdateRates={onUpdateRates}
		/>

		<!-- Quick Add Form -->
		<QuickAddLineItem
			labourRate={estimate.labour_rate}
			paintRate={estimate.paint_rate}
			onAddLineItem={onAddLineItem}
		/>

		<!-- Line Items Table -->
		<Card class="p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">Line Items</h3>
				<Button onclick={handleAddEmptyLineItem} size="sm" variant="outline">
					<Plus class="mr-2 h-4 w-4" />
					Add Empty Row
				</Button>
			</div>

			<div class="rounded-lg border overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="w-[80px] px-3">Type</Table.Head>
							<Table.Head class="w-[90px] px-3">Part Type</Table.Head>
							<Table.Head class="min-w-[200px] px-3">Description</Table.Head>
							<Table.Head class="w-[120px] text-right px-3">Part</Table.Head>
							<Table.Head class="w-[120px] text-right px-3">S&A</Table.Head>
							<Table.Head class="w-[90px] text-right px-3">Hrs</Table.Head>
							<Table.Head class="w-[130px] text-right px-3">Labour</Table.Head>
							<Table.Head class="w-[90px] text-right px-3">Panels</Table.Head>
							<Table.Head class="w-[130px] text-right px-3">Paint</Table.Head>
							<Table.Head class="w-[130px] text-right px-3">Outwork</Table.Head>
							<Table.Head class="w-[140px] text-right px-3">Total</Table.Head>
							<Table.Head class="w-[70px] px-2"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if estimate.line_items.length === 0}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={12} class="h-24 text-center text-gray-500">
									No line items added. Use "Quick Add" above or click "Add Empty Row".
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each estimate.line_items as item (item.id)}
								<Table.Row class="hover:bg-gray-50">
									<!-- Process Type -->
									<Table.Cell class="px-3 py-2">
										<select
											value={item.process_type}
											onchange={(e) =>
												handleUpdateLineItem(item.id!, 'process_type', e.currentTarget.value)}
											class="w-full rounded-md border-0 bg-transparent px-2 py-1 text-xs font-mono focus:outline-none focus:ring-0"
										>
											{#each processTypeOptions as option}
												<option value={option.value}>{option.value}</option>
											{/each}
										</select>
									</Table.Cell>

									<!-- Part Type (N only) -->
									<Table.Cell class="px-3 py-2">
										{#if item.process_type === 'N'}
											<select
												value={item.part_type || 'OEM'}
												onchange={(e) =>
													handleUpdateLineItem(item.id!, 'part_type', e.currentTarget.value)}
												class="w-full rounded-md border-0 bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-0"
											>
												<option value="OEM">OEM</option>
												<option value="ALT">ALT</option>
												<option value="2ND">2ND</option>
											</select>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Description -->
									<Table.Cell class="px-3 py-2">
										<Input
											type="text"
											placeholder="Description"
											value={item.description}
											oninput={(e) =>
												handleUpdateLineItem(item.id!, 'description', e.currentTarget.value)}
											class="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
										/>
									</Table.Cell>

									<!-- Part Price (N only) -->
									<Table.Cell class="text-right px-3 py-2">
										{#if item.process_type === 'N'}
											<Input
												type="number"
												min="0"
												step="0.01"
												value={item.part_price}
												oninput={(e) =>
													handleUpdateLineItem(item.id!, 'part_price', Number(e.currentTarget.value))}
												class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
											/>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Strip & Assemble (N,R,P,B) -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'P', 'B'].includes(item.process_type)}
											<Input
												type="number"
												min="0"
												step="0.01"
												value={item.strip_assemble}
												oninput={(e) =>
													handleUpdateLineItem(item.id!, 'strip_assemble', Number(e.currentTarget.value))}
												class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
											/>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Labour Hours (N,R,A) -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'A'].includes(item.process_type)}
											<Input
												type="number"
												min="0"
												step="0.25"
												value={item.labour_hours}
												oninput={(e) =>
													handleUpdateLineItem(item.id!, 'labour_hours', Number(e.currentTarget.value))}
												class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
											/>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Labour Cost (calculated) -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'A'].includes(item.process_type)}
											<span class="text-sm font-medium text-gray-700">
												{formatCurrency(item.labour_cost || 0)}
											</span>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Paint Panels (N,R,P,B) -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'P', 'B'].includes(item.process_type)}
											<Input
												type="number"
												min="0"
												step="0.5"
												value={item.paint_panels}
												oninput={(e) =>
													handleUpdateLineItem(item.id!, 'paint_panels', Number(e.currentTarget.value))}
												class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
											/>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Paint Cost (calculated) -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'P', 'B'].includes(item.process_type)}
											<span class="text-sm font-medium text-gray-700">
												{formatCurrency(item.paint_cost || 0)}
											</span>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Outwork Charge (O only) -->
									<Table.Cell class="text-right px-3 py-2">
										{#if item.process_type === 'O'}
											<Input
												type="number"
												min="0"
												step="0.01"
												value={item.outwork_charge}
												oninput={(e) =>
													handleUpdateLineItem(item.id!, 'outwork_charge', Number(e.currentTarget.value))}
												class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
											/>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Total -->
									<Table.Cell class="text-right px-3 py-2 font-bold">
										{formatCurrency(item.total)}
									</Table.Cell>

									<!-- Actions -->
									<Table.Cell class="text-center px-2 py-2">
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
			<textarea
				value={estimate.notes || ''}
				oninput={(e) => onUpdateEstimate({ notes: e.currentTarget.value })}
				placeholder="Add any additional notes or comments about this estimate..."
				rows={4}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			></textarea>
		</Card>

		<!-- Actions -->
		<div class="flex justify-between">
			<Button variant="outline" onclick={() => {}}>Save Progress</Button>
			<Button onclick={onComplete} disabled={!isComplete}>
				<Check class="mr-2 h-4 w-4" />
				Complete Estimate
			</Button>
		</div>
	{/if}
</div>

