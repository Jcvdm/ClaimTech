<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Settings, RefreshCw, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface Props {
		labourRate: number;
		paintRate: number;
		onUpdateRates: (labourRate: number, paintRate: number) => void;
		disabled?: boolean;
	}

	let { labourRate, paintRate, onUpdateRates, disabled = false }: Props = $props();

	let localLabourRate = $state(labourRate);
	let localPaintRate = $state(paintRate);
	let isExpanded = $state(false);
	let hasChanges = $derived(
		localLabourRate !== labourRate || localPaintRate !== paintRate
	);

	function handleUpdateRates() {
		onUpdateRates(localLabourRate, localPaintRate);
	}

	function handleReset() {
		localLabourRate = labourRate;
		localPaintRate = paintRate;
	}

	// Update local values when props change
	$effect(() => {
		localLabourRate = labourRate;
		localPaintRate = paintRate;
	});

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-ZA', {
			style: 'currency',
			currency: 'ZAR',
			minimumFractionDigits: 2
		}).format(amount);
	}
</script>

<Card class="border-blue-200 bg-blue-50">
	<button
		onclick={() => (isExpanded = !isExpanded)}
		class="flex w-full items-center justify-between p-4 text-left hover:bg-blue-100 transition-colors"
		type="button"
	>
		<div class="flex items-center gap-3">
			<Settings class="h-5 w-5 text-blue-600" />
			<div>
				<h3 class="text-base font-semibold text-gray-900">Rates Configuration</h3>
				<p class="text-sm text-gray-600">
					Labour: {formatCurrency(labourRate)}/hr • Paint: {formatCurrency(paintRate)}/panel
				</p>
			</div>
		</div>
		{#if isExpanded}
			<ChevronUp class="h-5 w-5 text-gray-500" />
		{:else}
			<ChevronDown class="h-5 w-5 text-gray-500" />
		{/if}
	</button>

	{#if isExpanded}
		<div class="border-t border-blue-200 p-4 space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Labour Rate -->
				<div>
					<label for="labour-rate" class="block text-sm font-medium text-gray-700 mb-2">
						Labour Rate (per hour)
					</label>
					<div class="flex items-center gap-2">
						<span class="text-gray-500">R</span>
						<Input
							id="labour-rate"
							type="number"
							min="0"
							step="0.01"
							bind:value={localLabourRate}
							{disabled}
							class="flex-1"
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						Cost per hour of labour (e.g., R500.00)
					</p>
				</div>

				<!-- Paint Rate -->
				<div>
					<label for="paint-rate" class="block text-sm font-medium text-gray-700 mb-2">
						Paint Rate (per panel)
					</label>
					<div class="flex items-center gap-2">
						<span class="text-gray-500">R</span>
						<Input
							id="paint-rate"
							type="number"
							min="0"
							step="0.01"
							bind:value={localPaintRate}
							{disabled}
							class="flex-1"
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						Cost per panel painted (e.g., R2000.00)
					</p>
				</div>
			</div>

			{#if hasChanges}
				<div class="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
					<div class="flex items-center gap-2">
						<RefreshCw class="h-4 w-4 text-yellow-600" />
						<span class="text-sm text-yellow-800">
							Rates have changed. Click "Update Rates" to recalculate all line items.
						</span>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" size="sm" onclick={handleReset}>
							Cancel
						</Button>
						<Button size="sm" onclick={handleUpdateRates} disabled={disabled}>
							Update Rates
						</Button>
					</div>
				</div>
			{/if}

			<div class="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200">
				<p class="font-medium mb-1">How rates work:</p>
				<ul class="list-disc list-inside space-y-1">
					<li>Labour: Enter hours (e.g., 1.5) × Labour Rate = Labour Cost</li>
					<li>Paint: Enter panels (e.g., 2) × Paint Rate = Paint Cost</li>
					<li>Changing rates will recalculate all existing line items</li>
				</ul>
			</div>
		</div>
	{/if}
</Card>

