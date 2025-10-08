<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, X } from 'lucide-svelte';
	import type { EstimateLineItem, ProcessType, PartType } from '$lib/types/assessment';
	import { getProcessTypeOptions, isFieldRequired } from '$lib/constants/processTypes';
	import { calculateLineItemTotal, validateLineItem } from '$lib/utils/estimateCalculations';

	interface Props {
		labourRate: number;
		paintRate: number;
		onAddLineItem: (item: EstimateLineItem) => void;
	}

	let { labourRate, paintRate, onAddLineItem }: Props = $props();

	// Form state
	let processType = $state<ProcessType>('N');
	let partType = $state<PartType>('OEM');
	let description = $state('');
	let partPrice = $state<number | null>(null);
	let stripAssemble = $state<number | null>(null);
	let labourHours = $state<number | null>(null);
	let paintPanels = $state<number | null>(null);
	let outworkCharge = $state<number | null>(null);
	let errors = $state<string[]>([]);

	const processTypeOptions = getProcessTypeOptions();
	const partTypeOptions: Array<{ value: PartType; label: string; description: string }> = [
		{ value: 'OEM', label: 'OEM', description: 'Original Equipment Manufacturer' },
		{ value: 'ALT', label: 'ALT', description: 'Alternative/Aftermarket' },
		{ value: '2ND', label: '2ND', description: 'Second Hand/Used' }
	];

	// Conditional field visibility
	const showPartType = $derived(processType === 'N');
	const showPartPrice = $derived(processType === 'N');
	const showStripAssemble = $derived(['N', 'R', 'P', 'B'].includes(processType));
	const showLabour = $derived(['N', 'R', 'A'].includes(processType));
	const showPaint = $derived(['N', 'R', 'P', 'B'].includes(processType));
	const showOutwork = $derived(processType === 'O');

	// Calculate preview totals
	const previewLabourCost = $derived(
		showLabour && labourHours ? labourHours * labourRate : 0
	);
	const previewPaintCost = $derived(
		showPaint && paintPanels ? paintPanels * paintRate : 0
	);
	const previewTotal = $derived(() => {
		const item: Partial<EstimateLineItem> = {
			process_type: processType,
			part_price: partPrice,
			strip_assemble: stripAssemble,
			labour_hours: labourHours,
			paint_panels: paintPanels,
			outwork_charge: outworkCharge
		};
		return calculateLineItemTotal(item as EstimateLineItem, labourRate, paintRate);
	});

	function handleProcessTypeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		processType = target.value as ProcessType;
		// Clear non-applicable fields
		if (!showPartType) partType = 'OEM';
		if (!showPartPrice) partPrice = null;
		if (!showStripAssemble) stripAssemble = null;
		if (!showLabour) labourHours = null;
		if (!showPaint) paintPanels = null;
		if (!showOutwork) outworkCharge = null;
		errors = [];
	}

	function handleAdd() {
		const item: EstimateLineItem = {
			id: crypto.randomUUID(),
			process_type: processType,
			part_type: showPartType ? partType : null,
			description,
			part_price: partPrice,
			strip_assemble: stripAssemble,
			labour_hours: labourHours,
			labour_cost: previewLabourCost,
			paint_panels: paintPanels,
			paint_cost: previewPaintCost,
			outwork_charge: outworkCharge,
			total: previewTotal()
		};

		const validation = validateLineItem(item);
		if (!validation.isValid) {
			errors = validation.errors;
			return;
		}

		onAddLineItem(item);
		handleClear();
	}

	function handleClear() {
		partType = 'OEM';
		description = '';
		partPrice = null;
		stripAssemble = null;
		labourHours = null;
		paintPanels = null;
		outworkCharge = null;
		errors = [];
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-ZA', {
			style: 'currency',
			currency: 'ZAR',
			minimumFractionDigits: 2
		}).format(amount);
	}
</script>

<Card class="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
	<div class="flex items-center justify-between mb-3 sm:mb-4">
		<h3 class="text-base sm:text-lg font-semibold text-gray-900">Quick Add Line Item</h3>
		{#if description || partPrice || stripAssemble || labourHours || paintPanels || outworkCharge}
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

			<div class="sm:col-span-1 lg:col-span-3">
				<label for="description" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
					Description *
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

		<!-- Part Type (N only) -->
		{#if showPartType}
			<div class="grid grid-cols-3 gap-2 p-3 bg-white rounded-md border border-gray-200">
				<div class="col-span-3 mb-1">
					<span class="block text-xs sm:text-sm font-medium text-gray-700">
						Part Type *
					</span>
				</div>
				{#each partTypeOptions as option}
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="part-type"
							value={option.value}
							checked={partType === option.value}
							onchange={() => (partType = option.value)}
							class="text-blue-600 focus:ring-blue-500"
						/>
						<div class="flex flex-col">
							<span class="text-xs sm:text-sm font-medium text-gray-900">{option.label}</span>
							<span class="text-xs text-gray-500 hidden sm:block">{option.description}</span>
						</div>
					</label>
				{/each}
			</div>
		{/if}

		<!-- Conditional Fields Row -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
			{#if showPartPrice}
				<div>
					<label for="part-price" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Part Price *
					</label>
					<Input
						id="part-price"
						type="number"
						min="0"
						step="0.01"
						bind:value={partPrice}
						placeholder="0.00"
						class="text-xs sm:text-sm"
					/>
				</div>
			{/if}

			{#if showStripAssemble}
				<div>
					<label for="strip-assemble" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Strip & Assemble *
					</label>
					<Input
						id="strip-assemble"
						type="number"
						min="0"
						step="0.01"
						bind:value={stripAssemble}
						placeholder="0.00"
						class="text-xs sm:text-sm"
					/>
				</div>
			{/if}

			{#if showLabour}
				<div>
					<label for="labour-hours" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Labour Hours *
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
					{#if labourHours && labourHours > 0}
						<p class="mt-1 text-xs text-gray-500">
							= {formatCurrency(previewLabourCost)}
						</p>
					{/if}
				</div>
			{/if}

			{#if showPaint}
				<div>
					<label for="paint-panels" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Paint Panels *
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
					{#if paintPanels && paintPanels > 0}
						<p class="mt-1 text-xs text-gray-500">
							= {formatCurrency(previewPaintCost)}
						</p>
					{/if}
				</div>
			{/if}

			{#if showOutwork}
				<div>
					<label for="outwork-charge" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
						Outwork Charge *
					</label>
					<Input
						id="outwork-charge"
						type="number"
						min="0"
						step="0.01"
						bind:value={outworkCharge}
						placeholder="0.00"
						class="text-xs sm:text-sm"
					/>
				</div>
			{/if}
		</div>

		<!-- Preview & Actions -->
		<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-gray-200">
			<div class="text-xs sm:text-sm text-gray-600">
				<span class="font-medium">Preview Total:</span>
				<span class="ml-2 text-base sm:text-lg font-bold text-blue-600">
					{formatCurrency(previewTotal())}
				</span>
			</div>

			<Button onclick={handleAdd} disabled={!description} class="w-full sm:w-auto">
				<Plus class="h-4 w-4 mr-2" />
				Add Line Item
			</Button>
		</div>

		<!-- Errors -->
		{#if errors.length > 0}
			<div class="p-3 bg-red-50 border border-red-200 rounded-md">
				<p class="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
				<ul class="list-disc list-inside text-sm text-red-700">
					{#each errors as error}
						<li>{error}</li>
					{/each}
				</ul>
			</div>
		{/if}
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
