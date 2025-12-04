<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import RatesConfiguration from './RatesConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import PreIncidentPhotosPanel from './PreIncidentPhotosPanel.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { Plus, Trash2, Check } from 'lucide-svelte';
	import type {
		PreIncidentEstimate,
		EstimateLineItem,
		PreIncidentEstimatePhoto
	} from '$lib/types/assessment';
	import { getProcessTypeOptions } from '$lib/constants/processTypes';
	import { createEmptyLineItem, calculateLineItemTotal } from '$lib/utils/estimateCalculations';
	import { formatCurrency } from '$lib/utils/formatters';
	import { validatePreIncidentEstimate, type TabValidation } from '$lib/utils/validation';

	interface Props {
		estimate: PreIncidentEstimate | null;
		assessmentId: string;
		estimatePhotos: PreIncidentEstimatePhoto[];
		onUpdateEstimate: (data: Partial<PreIncidentEstimate>) => void;
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
		onRegisterSave?: (saveFn: () => Promise<void>) => void; // Expose save function to parent
		onValidationUpdate?: (validation: TabValidation) => void;
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const estimate = $derived(props.estimate);
	const assessmentId = $derived(props.assessmentId);
	const estimatePhotos = $derived(props.estimatePhotos);
	const onUpdateEstimate = $derived(props.onUpdateEstimate);
	const onPhotosUpdate = $derived(props.onPhotosUpdate);
	const onUpdateRates = $derived(props.onUpdateRates);
	const onComplete = $derived(props.onComplete);
	const onRegisterSave = $derived(props.onRegisterSave);
	const onValidationUpdate = $derived(props.onValidationUpdate);

	const processTypeOptions = getProcessTypeOptions();

	// Local buffer pattern (same as EstimateTab)
	function deepClone<T>(obj: T): T {
		try { return structuredClone(obj); } catch { return JSON.parse(JSON.stringify(obj)); }
	}

	/**
	 * Ensure all line items have unique IDs
	 * This handles legacy data that was saved without IDs
	 */
	function ensureLineItemIds(items: any[]): EstimateLineItem[] {
		return (items ?? []).map((item) => {
			if (item && item.id) {
				return item;
			}
			// Generate ID for items without one (legacy data)
			return { ...(item || {}), id: crypto.randomUUID() } as EstimateLineItem;
		});
	}

	let localEstimate = $state<PreIncidentEstimate | null>(null);
	let dirty = $state(false);
	let saving = $state(false);

	$effect(() => {
		// When parent estimate changes and we are not dirty, resync local buffer
		if (!dirty) {
			if (estimate) {
				const cloned = deepClone(estimate);
				// Normalize line items to ensure all have IDs (handles legacy data)
				cloned.line_items = ensureLineItemIds(cloned.line_items);
				localEstimate = cloned;
			} else {
				localEstimate = null;
			}
		}
	});

	function markDirty() {
		dirty = true;
	}

	async function saveAll() {
		if (!localEstimate) return;
		saving = true;
		try {
			await onUpdateEstimate({
				line_items: localEstimate.line_items,
				labour_rate: localEstimate.labour_rate,
				paint_rate: localEstimate.paint_rate,
				vat_percentage: localEstimate.vat_percentage,
				oem_markup_percentage: localEstimate.oem_markup_percentage,
				alt_markup_percentage: localEstimate.alt_markup_percentage,
				second_hand_markup_percentage: localEstimate.second_hand_markup_percentage,
				outwork_markup_percentage: localEstimate.outwork_markup_percentage
			});
			dirty = false;
		} finally {
			saving = false;
		}
	}

	// Register save function with parent on mount
	$effect(() => {
		if (onRegisterSave) {
			onRegisterSave(saveAll);
		}
	});

	function discardAll() {
		localEstimate = estimate ? deepClone(estimate) : null;
		dirty = false;
	}

	// Convenience getter for local line items
	// Filter out any items without IDs as a defensive fallback
	const localLineItems = $derived(() => {
		if (!localEstimate) return [];
		return (localEstimate.line_items || []).filter((item) => item && item.id);
	});

	// State for multi-select functionality
	let selectedItems = $state<Set<string>>(new Set());
	let selectAll = $state(false);

	// State for click-to-edit functionality
	let editingSA = $state<string | null>(null);
	let editingLabour = $state<string | null>(null);
	let editingPaint = $state<string | null>(null);
	let editingPartPrice = $state<string | null>(null);
	let editingOutwork = $state<string | null>(null);
	let tempSAHours = $state<number | null>(null);
	let tempLabourHours = $state<number | null>(null);
	let tempPaintPanels = $state<number | null>(null);
	let tempPartPriceNett = $state<number | null>(null);
	let tempOutworkNett = $state<number | null>(null);

	function handleAddEmptyLineItem() {
		if (!localEstimate) return;
		const newItem = createEmptyLineItem('N') as EstimateLineItem;
		newItem.id = crypto.randomUUID();
		localEstimate.line_items = [...localEstimate.line_items, newItem];
		markDirty();
	}

	/**
	 * Add a line item with values (used by QuickAddLineItem component)
	 * Similar to EstimateTab's addLocalLine() function
	 */
	function addLocalLine(item: Partial<EstimateLineItem>) {
		if (!localEstimate) return;

		// Ensure every new item has a unique id (generate if missing)
		const id = item.id ?? crypto.randomUUID();
		const li = { ...item, id } as EstimateLineItem;

		// Ensure total is present/consistent with current rates
		li.total = calculateLineItemTotal(
			li,
			localEstimate.labour_rate,
			localEstimate.paint_rate
		);

		localEstimate.line_items = [...localEstimate.line_items, li];
		markDirty();
	}

	function handleUpdateLineItem(itemId: string, field: keyof EstimateLineItem, value: any) {
		if (!localEstimate) return;
		const idx = localEstimate.line_items.findIndex((item) => item.id === itemId);
		if (idx === -1) return;

		const updated = { ...localEstimate.line_items[idx], [field]: value };
		// Recalculate total for this line item
		updated.total = calculateLineItemTotal(
			updated,
			localEstimate.labour_rate,
			localEstimate.paint_rate
		);

		localEstimate.line_items[idx] = updated;
		localEstimate.line_items = [...localEstimate.line_items]; // Trigger reactivity
		markDirty();
	}

	function handleDeleteLineItem(itemId: string) {
		if (!localEstimate) return;
		localEstimate.line_items = localEstimate.line_items.filter((item) => item.id !== itemId);
		markDirty();
	}

	function handleBulkDeleteLineItems(itemIds: string[]) {
		if (!localEstimate) return;
		const idsSet = new Set(itemIds);
		localEstimate.line_items = localEstimate.line_items.filter((item) => !idsSet.has(item.id!));
		markDirty();
	}


	// Multi-select handlers
	function handleToggleSelect(itemId: string) {
		if (selectedItems.has(itemId)) {
			selectedItems.delete(itemId);
		} else {
			selectedItems.add(itemId);
		}
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = selectedItems.size === localLineItems().length;
	}

	function handleSelectAll() {
		if (selectAll) {
			selectedItems.clear();
		} else {
			localLineItems().forEach((item) => {
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
		handleBulkDeleteLineItems(itemIdsArray);

		selectedItems.clear();
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = false;
	}

	// Click-to-edit S&A (hours input)
	// S&A cost = hours × labour_rate
	function handleSAClick(itemId: string, currentHours: number | null) {
		editingSA = itemId;
		// Use stored hours directly instead of recalculating from cost
		tempSAHours = currentHours;
	}

	function handleSASave(itemId: string) {
		if (tempSAHours !== null && localEstimate) {
			const saCost = tempSAHours * localEstimate.labour_rate;
			handleUpdateLineItem(itemId, 'strip_assemble_hours', tempSAHours);
			handleUpdateLineItem(itemId, 'strip_assemble', saCost);
		}
		editingSA = null;
		tempSAHours = null;
	}

	function handleSACancel() {
		editingSA = null;
		tempSAHours = null;
	}

	// Click-to-edit Labour (hours input)
	// Labour cost = hours × labour_rate
	function handleLabourClick(itemId: string, currentHours: number | null) {
		editingLabour = itemId;
		// Use stored hours directly instead of recalculating from cost
		tempLabourHours = currentHours;
	}

	function handleLabourSave(itemId: string) {
		if (tempLabourHours !== null && localEstimate) {
			const labourCost = tempLabourHours * localEstimate.labour_rate;
			handleUpdateLineItem(itemId, 'labour_hours', tempLabourHours);
			handleUpdateLineItem(itemId, 'labour_cost', labourCost);
		}
		editingLabour = null;
		tempLabourHours = null;
	}

	function handleLabourCancel() {
		editingLabour = null;
		tempLabourHours = null;
	}

	// Click-to-edit Paint (panels input)
	function handlePaintClick(itemId: string, currentPanels: number | null) {
		editingPaint = itemId;
		tempPaintPanels = currentPanels;
	}

	function handlePaintSave(itemId: string) {
		if (tempPaintPanels !== null && localEstimate) {
			const paintCost = tempPaintPanels * localEstimate.paint_rate;
			handleUpdateLineItem(itemId, 'paint_panels', tempPaintPanels);
			handleUpdateLineItem(itemId, 'paint_cost', paintCost);
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
		if (tempPartPriceNett !== null && localEstimate) {
			// Get markup percentage based on part type
			let markupPercentage = 0;
			if (item.part_type === 'OEM') markupPercentage = localEstimate.oem_markup_percentage;
			else if (item.part_type === 'ALT') markupPercentage = localEstimate.alt_markup_percentage;
			else if (item.part_type === '2ND') markupPercentage = localEstimate.second_hand_markup_percentage;

			// Calculate selling price with markup
			const sellingPrice = tempPartPriceNett * (1 + markupPercentage / 100);

			handleUpdateLineItem(itemId, 'part_price_nett', tempPartPriceNett);
			handleUpdateLineItem(itemId, 'part_price', Number(sellingPrice.toFixed(2)));
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
		if (tempOutworkNett !== null && localEstimate) {
			const markupPercentage = localEstimate.outwork_markup_percentage;
			const sellingPrice = tempOutworkNett * (1 + markupPercentage / 100);

			handleUpdateLineItem(itemId, 'outwork_charge_nett', tempOutworkNett);
			handleUpdateLineItem(itemId, 'outwork_charge', Number(sellingPrice.toFixed(2)));
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
		if (!localEstimate) return null;

		const partsTotal = localEstimate.line_items.reduce((sum, item) => sum + (item.part_price || 0), 0);
		const saTotal = localEstimate.line_items.reduce((sum, item) => sum + (item.strip_assemble || 0), 0);
		const labourTotal = localEstimate.line_items.reduce((sum, item) => sum + (item.labour_cost || 0), 0);
		const paintTotal = localEstimate.line_items.reduce((sum, item) => sum + (item.paint_cost || 0), 0);
		const outworkTotal = localEstimate.line_items.reduce((sum, item) => sum + (item.outwork_charge || 0), 0);

		// Calculate total markup (difference between selling price and nett price)
		const markupTotal = localEstimate.line_items.reduce((sum, item) => {
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
		localEstimate !== null &&
		localEstimate.line_items.length > 0 &&
		localEstimate.total > 0
	);

	// Validation for warning banner
	const validation = $derived.by(() => {
		return validatePreIncidentEstimate(localEstimate);
	});

	// Report validation to parent for immediate badge updates
	$effect(() => {
		if (onValidationUpdate) {
			onValidationUpdate(validation);
		}
	});
</script>

<div class="space-y-6">
	<!-- Warning Banner -->
	<RequiredFieldsWarning missingFields={validation.missingFields} />
	{#if !localEstimate}
		<Card class="p-6 border-2 border-dashed border-gray-300">
			<p class="text-center text-gray-600">Loading pre-incident estimate...</p>
		</Card>
	{:else}
		<!-- Rates Configuration -->
		<RatesConfiguration
			labourRate={localEstimate.labour_rate}
			paintRate={localEstimate.paint_rate}
			vatPercentage={localEstimate.vat_percentage}
			oemMarkup={localEstimate.oem_markup_percentage}
			altMarkup={localEstimate.alt_markup_percentage}
			secondHandMarkup={localEstimate.second_hand_markup_percentage}
			outworkMarkup={localEstimate.outwork_markup_percentage}
			onUpdateRates={onUpdateRates}
		/>

		<!-- Quick Add Form -->
		<QuickAddLineItem
			labourRate={localEstimate.labour_rate}
			paintRate={localEstimate.paint_rate}
			oemMarkup={localEstimate.oem_markup_percentage}
			altMarkup={localEstimate.alt_markup_percentage}
			secondHandMarkup={localEstimate.second_hand_markup_percentage}
			outworkMarkup={localEstimate.outwork_markup_percentage}
			onAddLineItem={(item) => { addLocalLine(item); }}
			enablePhotos={true}
			{assessmentId}
			parentId={estimate?.id}
			photoCategory="pre-incident"
			onPhotosUploaded={onPhotosUpdate}
		/>

		<!-- Line Items Table -->
		<Card class="p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">Line Items</h3>
				<div class="flex gap-2">
					{#if dirty}
						<Button onclick={saveAll} size="sm" disabled={saving}>
							{saving ? 'Saving…' : 'Save Changes'}
						</Button>
						<Button onclick={discardAll} size="sm" variant="outline" disabled={saving}>
							Discard
						</Button>
					{/if}
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
						{#if localLineItems().length === 0}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={11} class="h-24 text-center text-gray-500">
									No line items added. Use "Quick Add" above or click "Add Empty Row".
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each localLineItems() as item (item.id)}
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
													onclick={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
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

									<!-- Labour Cost (N,R,A) - Click to edit hours -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'A'].includes(item.process_type)}
											{#if editingLabour === item.id}
												<Input
													type="number"
													min="0"
													step="0.5"
													bind:value={tempLabourHours}
													onkeydown={(e) => {
														if (e.key === 'Enter') handleLabourSave(item.id!);
														if (e.key === 'Escape') handleLabourCancel();
													}}
													onblur={() => handleLabourSave(item.id!)}
													class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
													autofocus
												/>
											{:else}
												<button
													onclick={() => handleLabourClick(item.id!, item.labour_hours || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit hours (Labour = hours × labour rate)"
												>
													{formatCurrency(item.labour_cost || 0)}
												</button>
											{/if}
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
											onclick={() => handleDeleteLineItem(item.id!)}
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
						<span class="text-lg font-semibold">{formatCurrency(localEstimate.subtotal)}</span>
					</div>

					<!-- VAT -->
					<div class="flex items-center justify-between py-2 border-b-2">
						<span class="text-base font-semibold text-gray-700">VAT ({localEstimate.vat_percentage}%)</span>
						<span class="text-lg font-semibold">{formatCurrency(localEstimate.vat_amount)}</span>
					</div>

					<!-- Total -->
					<div class="flex items-center justify-between pt-3">
						<span class="text-lg font-bold text-gray-900">Total (Inc VAT)</span>
						<span class="text-2xl font-bold text-blue-600">{formatCurrency(localEstimate.total)}</span>
					</div>
				</div>
			{/if}
		</Card>

		<!-- Pre-Incident Damage Photos -->
		<PreIncidentPhotosPanel
			estimateId={localEstimate.id}
			{assessmentId}
			photos={estimatePhotos}
			onUpdate={onPhotosUpdate}
		/>

		<!-- Actions -->
		<div class="flex justify-between">
			<Button onclick={saveAll} size="sm" disabled={saving || !dirty}>
				{saving ? 'Saving…' : 'Save Progress'}
			</Button>
			<Button onclick={onComplete} disabled={!isComplete || dirty}>
				<Check class="mr-2 h-4 w-4" />
				Complete Pre-Incident Estimate
			</Button>
		</div>
	{/if}
</div>

