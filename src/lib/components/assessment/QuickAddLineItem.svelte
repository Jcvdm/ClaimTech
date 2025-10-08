<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, X } from 'lucide-svelte';
	import type { EstimateLineItem, ProcessType } from '$lib/types/assessment';
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
	let description = $state('');
	let partPrice = $state<number | null>(null);
	let stripAssemble = $state<number | null>(null);
	let labourHours = $state<number | null>(null);
	let paintPanels = $state<number | null>(null);
	let outworkCharge = $state<number | null>(null);
	let errors = $state<string[]>([]);

	const processTypeOptions = getProcessTypeOptions();

	// Conditional field visibility
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

<Card class="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900">Quick Add Line Item</h3>
		{#if description || partPrice || stripAssemble || labourHours || paintPanels || outworkCharge}
			<Button variant="ghost" size="sm" onclick={handleClear}>
				<X class="h-4 w-4 mr-1" />
				Clear
			</Button>
		{/if}
	</div>

	<div class="space-y-4">
		<!-- Process Type & Description Row -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<label for="process-type" class="block text-sm font-medium text-gray-700 mb-1">
					Process Type *
				</label>
				<select
					id="process-type"
					value={processType}
					onchange={handleProcessTypeChange}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each processTypeOptions as option}
						<option value={option.value}>
							{option.value} - {option.label}
						</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-gray-500">
					{processTypeOptions.find((o) => o.value === processType)?.description}
				</p>
			</div>

			<div class="md:col-span-3">
				<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
					Description *
				</label>
				<Input
					id="description"
					type="text"
					bind:value={description}
					placeholder="e.g., Front Bumper Replacement"
					class="w-full"
				/>
			</div>
		</div>

		<!-- Conditional Fields Row -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
			{#if showPartPrice}
				<div>
					<label for="part-price" class="block text-sm font-medium text-gray-700 mb-1">
						Part Price *
					</label>
					<Input
						id="part-price"
						type="number"
						min="0"
						step="0.01"
						bind:value={partPrice}
						placeholder="0.00"
					/>
				</div>
			{/if}

			{#if showStripAssemble}
				<div>
					<label for="strip-assemble" class="block text-sm font-medium text-gray-700 mb-1">
						Strip & Assemble *
					</label>
					<Input
						id="strip-assemble"
						type="number"
						min="0"
						step="0.01"
						bind:value={stripAssemble}
						placeholder="0.00"
					/>
				</div>
			{/if}

			{#if showLabour}
				<div>
					<label for="labour-hours" class="block text-sm font-medium text-gray-700 mb-1">
						Labour Hours *
					</label>
					<Input
						id="labour-hours"
						type="number"
						min="0"
						step="0.25"
						bind:value={labourHours}
						placeholder="0.00"
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
					<label for="paint-panels" class="block text-sm font-medium text-gray-700 mb-1">
						Paint Panels *
					</label>
					<Input
						id="paint-panels"
						type="number"
						min="0"
						step="0.5"
						bind:value={paintPanels}
						placeholder="0.0"
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
					<label for="outwork-charge" class="block text-sm font-medium text-gray-700 mb-1">
						Outwork Charge *
					</label>
					<Input
						id="outwork-charge"
						type="number"
						min="0"
						step="0.01"
						bind:value={outworkCharge}
						placeholder="0.00"
					/>
				</div>
			{/if}
		</div>

		<!-- Preview & Actions -->
		<div class="flex items-center justify-between pt-4 border-t border-gray-200">
			<div class="flex items-center gap-4">
				<div class="text-sm text-gray-600">
					<span class="font-medium">Preview Total:</span>
					<span class="ml-2 text-lg font-bold text-blue-600">
						{formatCurrency(previewTotal())}
					</span>
				</div>
			</div>

			<Button onclick={handleAdd} disabled={!description}>
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

