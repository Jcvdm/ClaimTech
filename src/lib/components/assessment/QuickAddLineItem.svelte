<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, X } from 'lucide-svelte';
	import type { EstimateLineItem, ProcessType, PartType } from '$lib/types/assessment';
	import { getProcessTypeOptions } from '$lib/constants/processTypes';
	import {
		calculateLineItemTotal,
		calculatePartSellingPrice
	} from '$lib/utils/estimateCalculations';

	interface Props {
		labourRate: number;
		paintRate: number;
		oemMarkup: number;
		altMarkup: number;
		secondHandMarkup: number;
		outworkMarkup: number;
		onAddLineItem: (item: EstimateLineItem) => void;
	}

	let { labourRate, paintRate, oemMarkup, altMarkup, secondHandMarkup, outworkMarkup, onAddLineItem }: Props =
		$props();

	// Form state
	let processType = $state<ProcessType>('N');
	let partType = $state<PartType>('OEM');
	let description = $state('');
	let partPriceNett = $state<number | null>(null); // Nett price without markup
	let stripAssembleHours = $state<number | null>(null); // Hours for S&A
	let labourHours = $state<number | null>(null);
	let paintPanels = $state<number | null>(null);
	let outworkChargeNett = $state<number | null>(null); // Nett outwork cost without markup
	let errors = $state<string[]>([]);

	const processTypeOptions = getProcessTypeOptions();

	// Conditional field visibility
	const showPartType = $derived(processType === 'N');
	const showPartPrice = $derived(processType === 'N');
	const showStripAssemble = $derived(['N', 'R', 'P', 'B'].includes(processType));
	const showLabour = $derived(['N', 'R', 'A'].includes(processType));
	const showPaint = $derived(['N', 'R', 'P', 'B'].includes(processType));
	const showOutwork = $derived(processType === 'O');

	function handleProcessTypeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		processType = target.value as ProcessType;
		// Clear non-applicable fields
		if (!showPartType) partType = 'OEM';
		if (!showPartPrice) partPriceNett = null;
		if (!showStripAssemble) stripAssembleHours = null;
		if (!showLabour) labourHours = null;
		if (!showPaint) paintPanels = null;
		if (!showOutwork) outworkChargeNett = null;
		errors = [];
	}

	function handleAdd() {
		// Calculate costs
		const labourCost = labourHours ? labourHours * labourRate : 0;
		const paintCost = paintPanels ? paintPanels * paintRate : 0;
		const stripAssembleCost = stripAssembleHours ? stripAssembleHours * labourRate : 0;

		// Calculate part price with markup based on part type
		let markupPercentage = 0;
		if (partType === 'OEM') markupPercentage = oemMarkup;
		else if (partType === 'ALT') markupPercentage = altMarkup;
		else if (partType === '2ND') markupPercentage = secondHandMarkup;

		const partPrice = calculatePartSellingPrice(partPriceNett, markupPercentage);

		// Calculate outwork charge with markup
		const outworkCharge = calculatePartSellingPrice(outworkChargeNett, outworkMarkup);

		const item: EstimateLineItem = {
			id: crypto.randomUUID(),
			process_type: processType,
			part_type: showPartType ? partType : null,
			description,
			part_price_nett: partPriceNett,
			part_price: partPrice,
			strip_assemble_hours: stripAssembleHours,
			strip_assemble: stripAssembleCost,
			labour_hours: labourHours,
			labour_cost: labourCost,
			paint_panels: paintPanels,
			paint_cost: paintCost,
			outwork_charge_nett: outworkChargeNett,
			outwork_charge: outworkCharge,
			total: calculateLineItemTotal(
				{
					process_type: processType,
					part_price: partPrice,
					strip_assemble: stripAssembleCost,
					labour_cost: labourCost,
					paint_cost: paintCost,
					outwork_charge: outworkCharge
				} as EstimateLineItem,
				labourRate,
				paintRate
			)
		};

		// No validation - allow all fields to be optional
		onAddLineItem(item);
		handleClear();
	}

	function handleClear() {
		partType = 'OEM';
		description = '';
		partPriceNett = null;
		stripAssembleHours = null;
		labourHours = null;
		paintPanels = null;
		outworkChargeNett = null;
		errors = [];
	}
</script>

<Card class="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
	<div class="flex items-center justify-between mb-3 sm:mb-4">
		<h3 class="text-base sm:text-lg font-semibold text-gray-900">Quick Add Line Item</h3>
		{#if description || partPriceNett || stripAssembleHours || labourHours || paintPanels || outworkChargeNett}
			<Button variant="ghost" size="sm" onclick={handleClear}>
				<X class="h-4 w-4 mr-1" />
				<span class="hidden sm:inline">Clear</span>
			</Button>
		{/if}
	</div>

	<div class="space-y-3 sm:space-y-4">
		<!-- Process Type & Description Row -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
			<div>
				<label for="process-type" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
					Process Type *
				</label>
				<select
					id="process-type"
					value={processType}
					onchange={handleProcessTypeChange}
					class="w-full rounded-md border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each processTypeOptions as option}
						<option value={option.value}>
							{option.value} - {option.label}
						</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-gray-500 hidden sm:block">
					{processTypeOptions.find((o) => o.value === processType)?.description}
				</p>
			</div>

			<!-- Part Type (N only) -->
			{#if showPartType}
				<div class="sm:col-span-1">
					<label for="part-type" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Part Type
					</label>
					<select
						id="part-type"
						bind:value={partType}
						class="w-full rounded-md border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="OEM">OEM</option>
						<option value="ALT">ALT</option>
						<option value="2ND">2ND</option>
					</select>
				</div>
			{/if}

			<div class="sm:col-span-1 lg:col-span-3">
				<label for="description" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<Input
					id="description"
					type="text"
					bind:value={description}
					placeholder="e.g., Front Bumper Replacement"
					class="w-full text-xs sm:text-sm"
				/>
			</div>
		</div>

		<!-- Conditional Fields Row -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
			{#if showPartPrice}
				<div>
					<label for="part-price" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Part Price (Nett)
					</label>
					<Input
						id="part-price"
						type="number"
						min="0"
						step="0.01"
						bind:value={partPriceNett}
						placeholder="0.00"
						class="text-xs sm:text-sm"
					/>
					<p class="text-xs text-gray-500 mt-1">Enter nett price (without markup)</p>
				</div>
			{/if}

			{#if showStripAssemble}
				<div>
					<label for="strip-assemble" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						S&A Hours
					</label>
					<Input
						id="strip-assemble"
						type="number"
						min="0"
						step="0.25"
						bind:value={stripAssembleHours}
						placeholder="0.00"
						class="text-xs sm:text-sm"
					/>
					<p class="text-xs text-gray-500 mt-1">Hours × R{labourRate}/hr</p>
				</div>
			{/if}

			{#if showLabour}
				<div>
					<label for="labour-hours" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Labour Hours
					</label>
					<Input
						id="labour-hours"
						type="number"
						min="0"
						step="0.25"
						bind:value={labourHours}
						placeholder="0.00"
						class="text-xs sm:text-sm"
					/>
				</div>
			{/if}

			{#if showPaint}
				<div>
					<label for="paint-panels" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Paint Panels
					</label>
					<Input
						id="paint-panels"
						type="number"
						min="0"
						step="0.5"
						bind:value={paintPanels}
						placeholder="0.0"
						class="text-xs sm:text-sm"
					/>
				</div>
			{/if}

			{#if showOutwork}
				<div>
					<label for="outwork-charge" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Outwork Charge (Nett)
					</label>
					<Input
						id="outwork-charge"
						type="number"
						min="0"
						step="0.01"
						bind:value={outworkChargeNett}
						placeholder="0.00"
						class="text-xs sm:text-sm"
					/>
					<p class="mt-1 text-xs text-gray-500">Enter nett price (without markup)</p>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex justify-end pt-3 sm:pt-4 border-t border-gray-200">
			<Button onclick={handleAdd} class="w-full sm:w-auto">
				<Plus class="h-4 w-4 mr-2" />
				Add Line Item
			</Button>
		</div>
	</div>
</Card>

<style>
	/* Hide number input spinners */
	:global(input[type='number']::-webkit-inner-spin-button),
	:global(input[type='number']::-webkit-outer-spin-button) {
		-webkit-appearance: none;
		margin: 0;
	}
	:global(input[type='number']) {
		-moz-appearance: textfield;
		appearance: textfield;
	}
</style>
