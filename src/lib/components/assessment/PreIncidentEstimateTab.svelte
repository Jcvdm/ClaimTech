<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import RatesConfiguration from './RatesConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import EstimatePhotosPanel from './EstimatePhotosPanel.svelte';
	import { Plus, Trash2, Check } from 'lucide-svelte';
	import type {
		PreIncidentEstimate,
		EstimateLineItem,
		PreIncidentEstimatePhoto
	} from '$lib/types/assessment';
	import { getProcessTypeOptions } from '$lib/constants/processTypes';
	import { createEmptyLineItem, calculateLineItemTotal } from '$lib/utils/estimateCalculations';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		estimate: PreIncidentEstimate | null;
		assessmentId: string;
		estimatePhotos: PreIncidentEstimatePhoto[];
		onUpdateEstimate: (data: Partial<PreIncidentEstimate>) => void;
		onAddLineItem: (item: EstimateLineItem) => void;
		onUpdateLineItem: (itemId: string, data: Partial<EstimateLineItem>) => void;
		onDeleteLineItem: (itemId: string) => void;
		onBulkDeleteLineItems: (itemIds: string[]) => void;
		onPhotosUpdate: () => void;
		onUpdateRates: (
			labourRate: number,
			paintRate: number,
			vatPercentage: number,
			oemMarkup: number,
			altMarkup: number,
			secondHandMarkup: number,
			outworkMarkup: number
		) => void;
		onComplete: () => void;
	}

	let {
		estimate,
		assessmentId,
		estimatePhotos,
		onUpdateEstimate,
		onAddLineItem,
		onUpdateLineItem,
		onDeleteLineItem,
		onBulkDeleteLineItems,
		onPhotosUpdate,
		onUpdateRates,
		onComplete
	}: Props = $props();

	const processTypeOptions = getProcessTypeOptions();

	// State for multi-select functionality
	let selectedItems = $state<Set<string>>(new Set());
	let selectAll = $state(false);

	// State for click-to-edit functionality
	let editingSA = $state<string | null>(null);
	let editingPaint = $state<string | null>(null);
	let editingPartPrice = $state<string | null>(null);
	let editingOutwork = $state<string | null>(null);
	let tempSAHours = $state<number | null>(null);
	let tempPaintPanels = $state<number | null>(null);
	let tempPartPriceNett = $state<number | null>(null);
	let tempOutworkNett = $state<number | null>(null);

	function handleAddEmptyLineItem() {
		const newItem = createEmptyLineItem('N') as EstimateLineItem;
		onAddLineItem(newItem);
	}

	function handleUpdateLineItem(itemId: string, field: keyof EstimateLineItem, value: any) {
		onUpdateLineItem(itemId, { [field]: value });
	}

	// Multi-select handlers
	function handleToggleSelect(itemId: string) {
		if (selectedItems.has(itemId)) {
			selectedItems.delete(itemId);
		} else {
			selectedItems.add(itemId);
		}
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = selectedItems.size === estimate!.line_items.length;
	}

	function handleSelectAll() {
		if (selectAll) {
			selectedItems.clear();
		} else {
			estimate!.line_items.forEach((item) => {
				if (item.id) selectedItems.add(item.id);
			});
		}
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = !selectAll;
	}

	function handleBulkDelete() {
		if (!confirm(`Delete ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}?`))
			return;

		// Convert Set to Array and call bulk delete handler
		const itemIdsArray = Array.from(selectedItems);
		onBulkDeleteLineItems(itemIdsArray);

		selectedItems.clear();
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = false;
	}

	// Click-to-edit S&A (hours input)
	// S&A cost = hours × labour_rate
	function handleSAClick(itemId: string, currentCost: number | null) {
		editingSA = itemId;
		// Calculate hours from current cost
		if (currentCost && estimate) {
			tempSAHours = currentCost / estimate.labour_rate;
		} else {
			tempSAHours = null;
		}
	}

	function handleSASave(itemId: string) {
		if (tempSAHours !== null && estimate) {
			const saCost = tempSAHours * estimate.labour_rate;
			onUpdateLineItem(itemId, {
				strip_assemble: saCost
			});
		}
		editingSA = null;
		tempSAHours = null;
	}

	function handleSACancel() {
		editingSA = null;
		tempSAHours = null;
	}

	// Click-to-edit Paint (panels input)
	function handlePaintClick(itemId: string, currentPanels: number | null) {
		editingPaint = itemId;
		tempPaintPanels = currentPanels;
	}

	function handlePaintSave(itemId: string) {
		if (tempPaintPanels !== null && estimate) {
			const paintCost = tempPaintPanels * estimate.paint_rate;
			onUpdateLineItem(itemId, {
				paint_panels: tempPaintPanels,
				paint_cost: paintCost
			});
		}
		editingPaint = null;
		tempPaintPanels = null;
	}

	function handlePaintCancel() {
		editingPaint = null;
		tempPaintPanels = null;
	}

	// Click-to-edit Part Price (nett price input)
	// Selling price = nett price × (1 + markup%)
	function handlePartPriceClick(itemId: string, currentNettPrice: number | null) {
		editingPartPrice = itemId;
		tempPartPriceNett = currentNettPrice;
	}

	function handlePartPriceSave(itemId: string, item: EstimateLineItem) {
		if (tempPartPriceNett !== null && estimate) {
			// Get markup percentage based on part type
			let markupPercentage = 0;
			if (item.part_type === 'OEM') markupPercentage = estimate.oem_markup_percentage;
			else if (item.part_type === 'ALT') markupPercentage = estimate.alt_markup_percentage;
			else if (item.part_type === '2ND') markupPercentage = estimate.second_hand_markup_percentage;

			// Calculate selling price with markup
			const sellingPrice = tempPartPriceNett * (1 + markupPercentage / 100);

			onUpdateLineItem(itemId, {
				part_price_nett: tempPartPriceNett,
				part_price: Number(sellingPrice.toFixed(2))
			});
		}
		editingPartPrice = null;
		tempPartPriceNett = null;
	}

	function handlePartPriceCancel() {
		editingPartPrice = null;
		tempPartPriceNett = null;
	}

	// Click-to-edit Outwork (nett price input)
	// Outwork selling price = nett price × (1 + markup%)
	function handleOutworkClick(itemId: string, currentNettPrice: number | null) {
		editingOutwork = itemId;
		tempOutworkNett = currentNettPrice;
	}

	function handleOutworkSave(itemId: string) {
		if (tempOutworkNett !== null && estimate) {
			const markupPercentage = estimate.outwork_markup_percentage;
			const sellingPrice = tempOutworkNett * (1 + markupPercentage / 100);

			onUpdateLineItem(itemId, {
				outwork_charge_nett: tempOutworkNett,
				outwork_charge: Number(sellingPrice.toFixed(2))
			});
		}
		editingOutwork = null;
		tempOutworkNett = null;
	}

	function handleOutworkCancel() {
		editingOutwork = null;
		tempOutworkNett = null;
	}

	// Calculate category totals
	const categoryTotals = $derived(() => {
		if (!estimate) return null;

		const partsTotal = estimate.line_items.reduce((sum, item) => sum + (item.part_price || 0), 0);
		const saTotal = estimate.line_items.reduce((sum, item) => sum + (item.strip_assemble || 0), 0);
		const labourTotal = estimate.line_items.reduce((sum, item) => sum + (item.labour_cost || 0), 0);
		const paintTotal = estimate.line_items.reduce((sum, item) => sum + (item.paint_cost || 0), 0);
		const outworkTotal = estimate.line_items.reduce((sum, item) => sum + (item.outwork_charge || 0), 0);

		// Calculate total markup (difference between selling price and nett price)
		const markupTotal = estimate.line_items.reduce((sum, item) => {
			if (item.part_price && item.part_price_nett) {
				return sum + (item.part_price - item.part_price_nett);
			}
			return sum;
		}, 0);

		return {
			partsTotal,
			saTotal,
			labourTotal,
			paintTotal,
			outworkTotal,
			markupTotal
		};
	});

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
			<p class="text-center text-gray-600">Loading pre-incident estimate...</p>
		</Card>
	{:else}
		<!-- Rates Configuration -->
		<RatesConfiguration
			labourRate={estimate.labour_rate}
			paintRate={estimate.paint_rate}
			vatPercentage={estimate.vat_percentage}
			oemMarkup={estimate.oem_markup_percentage}
			altMarkup={estimate.alt_markup_percentage}
			secondHandMarkup={estimate.second_hand_markup_percentage}
			outworkMarkup={estimate.outwork_markup_percentage}
			onUpdateRates={onUpdateRates}
		/>

		<!-- Quick Add Form -->
		<QuickAddLineItem
			labourRate={estimate.labour_rate}
			paintRate={estimate.paint_rate}
			oemMarkup={estimate.oem_markup_percentage}
			altMarkup={estimate.alt_markup_percentage}
			secondHandMarkup={estimate.second_hand_markup_percentage}
			outworkMarkup={estimate.outwork_markup_percentage}
			onAddLineItem={onAddLineItem}
		/>

		<!-- Line Items Table -->
		<Card class="p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">Line Items</h3>
				<div class="flex gap-2">
					{#if selectedItems.size > 0}
						<Button onclick={handleBulkDelete} size="sm" variant="destructive">
							<Trash2 class="mr-2 h-4 w-4" />
							Delete Selected ({selectedItems.size})
						</Button>
					{/if}
					<Button onclick={handleAddEmptyLineItem} size="sm" variant="outline">
						<Plus class="mr-2 h-4 w-4" />
						Add Empty Row
					</Button>
				</div>
			</div>

			<div class="rounded-lg border overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="w-[50px] px-3">
								<input
									type="checkbox"
									checked={selectAll}
									onchange={handleSelectAll}
									class="rounded border-gray-300 cursor-pointer"
									aria-label="Select all items"
								/>
							</Table.Head>
							<Table.Head class="w-[120px] px-3">Process Type</Table.Head>
							<Table.Head class="w-[100px] px-3">Part Type</Table.Head>
							<Table.Head class="min-w-[200px] px-3">Description</Table.Head>
							<Table.Head class="w-[140px] text-right px-3">Part Price</Table.Head>
							<Table.Head class="w-[140px] text-right px-3">S&A</Table.Head>
							<Table.Head class="w-[150px] text-right px-3">Labour</Table.Head>
							<Table.Head class="w-[150px] text-right px-3">Paint</Table.Head>
							<Table.Head class="w-[150px] text-right px-3">Outwork</Table.Head>
							<Table.Head class="w-[160px] text-right px-3">Total</Table.Head>
							<Table.Head class="w-[70px] px-2"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if estimate.line_items.length === 0}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={11} class="h-24 text-center text-gray-500">
									No line items added. Use "Quick Add" above or click "Add Empty Row".
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each estimate.line_items as item (item.id)}
								<Table.Row class="hover:bg-gray-50">
									<!-- Checkbox -->
									<Table.Cell class="px-3 py-2">
										<input
											type="checkbox"
											checked={selectedItems.has(item.id!)}
											onchange={() => handleToggleSelect(item.id!)}
											class="rounded border-gray-300 cursor-pointer"
											aria-label="Select item"
										/>
									</Table.Cell>

									<!-- Process Type -->
									<Table.Cell class="px-3 py-2">
										<select
											value={item.process_type}
											onchange={(e) =>
												handleUpdateLineItem(item.id!, 'process_type', e.currentTarget.value)}
											class="w-full rounded-md border-0 bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-0"
										>
											{#each processTypeOptions as option}
												<option value={option.value}>{option.value}-{option.label}</option>
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
												class="w-full rounded-md border-0 bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-0"
											>
												<option value="OEM">OEM</option>
												<option value="ALT">ALT</option>
												<option value="2ND">2ND</option>
											</select>
										{:else}
											<span class="text-gray-400 text-sm">-</span>
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

									<!-- Part Price (N only) - Click to edit nett price -->
									<Table.Cell class="text-right px-3 py-2">
										{#if item.process_type === 'N'}
											{#if editingPartPrice === item.id}
												<div class="space-y-1">
													<Input
														type="number"
														min="0"
														step="0.01"
														bind:value={tempPartPriceNett}
														onkeydown={(e) => {
															if (e.key === 'Enter') handlePartPriceSave(item.id!, item);
															if (e.key === 'Escape') handlePartPriceCancel();
														}}
														onblur={() => handlePartPriceSave(item.id!, item)}
														class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
													<p class="text-xs text-gray-500 italic">Only input nett price</p>
												</div>
											{:else}
												<button
													onclick={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit nett price (selling price includes markup)"
												>
													{formatCurrency(item.part_price || 0)}
												</button>
											{/if}
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Strip & Assemble (N,R,P,B) - Click to edit hours -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'P', 'B'].includes(item.process_type)}
											{#if editingSA === item.id}
												<Input
													type="number"
													min="0"
													step="0.25"
													bind:value={tempSAHours}
													onkeydown={(e) => {
														if (e.key === 'Enter') handleSASave(item.id!);
														if (e.key === 'Escape') handleSACancel();
													}}
													onblur={() => handleSASave(item.id!)}
													class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
													autofocus
												/>
											{:else}
												<button
													onclick={() => handleSAClick(item.id!, item.strip_assemble || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit hours (S&A = hours × labour rate)"
												>
													{formatCurrency(item.strip_assemble || 0)}
												</button>
											{/if}
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Labour Cost (calculated from hours × labour_rate) -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'A'].includes(item.process_type)}
											<span class="text-sm font-medium text-gray-700">
												{formatCurrency(item.labour_cost || 0)}
											</span>
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Paint Cost (N,R,P,B) - Click to edit panels -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'P', 'B'].includes(item.process_type)}
											{#if editingPaint === item.id}
												<Input
													type="number"
													min="0"
													step="0.5"
													bind:value={tempPaintPanels}
													onkeydown={(e) => {
														if (e.key === 'Enter') handlePaintSave(item.id!);
														if (e.key === 'Escape') handlePaintCancel();
													}}
													onblur={() => handlePaintSave(item.id!)}
													class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
													autofocus
												/>
											{:else}
												<button
													onclick={() => handlePaintClick(item.id!, item.paint_panels || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit panels (Paint = panels × paint rate)"
												>
													{formatCurrency(item.paint_cost || 0)}
												</button>
											{/if}
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Outwork Charge (O only) - Click to edit nett price -->
									<Table.Cell class="text-right px-3 py-2">
										{#if item.process_type === 'O'}
											{#if editingOutwork === item.id}
												<div class="space-y-1">
													<Input
														type="number"
														min="0"
														step="0.01"
														bind:value={tempOutworkNett}
														onkeydown={(e) => {
															if (e.key === 'Enter') handleOutworkSave(item.id!);
															if (e.key === 'Escape') handleOutworkCancel();
														}}
														onblur={() => handleOutworkSave(item.id!)}
														class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
													<p class="text-xs text-gray-500 italic">Only input nett price</p>
												</div>
											{:else}
												<button
													onclick={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit nett price (selling price includes markup)"
												>
													{formatCurrency(item.outwork_charge || 0)}
												</button>
											{/if}
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
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Totals Breakdown</h3>

			{#if categoryTotals()}
			{@const totals = categoryTotals()}
				<div class="space-y-2">
					<!-- Category Totals -->
					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">Parts Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.partsTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">Markup Total</span>
						<span class="text-sm font-medium text-green-600">{formatCurrency(totals?.markupTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">S&A Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.saTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">Labour Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.labourTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">Paint Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.paintTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2 border-b">
						<span class="text-sm text-gray-600">Outwork Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.outworkTotal || 0)}</span>
					</div>

					<!-- Subtotal -->
					<div class="flex items-center justify-between py-2 border-b-2">
						<span class="text-base font-semibold text-gray-700">Subtotal (Ex VAT)</span>
						<span class="text-lg font-semibold">{formatCurrency(estimate.subtotal)}</span>
					</div>

					<!-- VAT -->
					<div class="flex items-center justify-between py-2 border-b-2">
						<span class="text-base font-semibold text-gray-700">VAT ({estimate.vat_percentage}%)</span>
						<span class="text-lg font-semibold">{formatCurrency(estimate.vat_amount)}</span>
					</div>

					<!-- Total -->
					<div class="flex items-center justify-between pt-3">
						<span class="text-lg font-bold text-gray-900">Total (Inc VAT)</span>
						<span class="text-2xl font-bold text-blue-600">{formatCurrency(estimate.total)}</span>
					</div>
				</div>
			{/if}
		</Card>

		<!-- Pre-Incident Damage Photos -->
		<EstimatePhotosPanel
			estimateId={estimate.id}
			{assessmentId}
			photos={estimatePhotos}
			onUpdate={onPhotosUpdate}
		/>

		<!-- Actions -->
		<div class="flex justify-between">
			<Button variant="outline" onclick={() => {}}>Save Progress</Button>
			<Button onclick={onComplete} disabled={!isComplete}>
				<Check class="mr-2 h-4 w-4" />
				Complete Pre-Incident Estimate
			</Button>
		</div>
	{/if}
</div>

