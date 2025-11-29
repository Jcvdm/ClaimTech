<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Info } from 'lucide-svelte';
	import type { VehicleAccessory } from '$lib/types/assessment';
	import { formatCurrency, getAccessoryDisplayName } from '$lib/utils/vehicleValuesCalculations';

	interface Props {
		accessories: VehicleAccessory[];
		onUpdateAccessoryValue: (accessoryId: string, value: number | null) => void;
		disabled?: boolean;
	}

	let { accessories, onUpdateAccessoryValue, disabled = false }: Props = $props();

	// Calculate total
	const total = $derived(accessories.reduce((sum, acc) => sum + (acc.value || 0), 0));
</script>

<Card class="p-6">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900">Accessories</h3>
		<div class="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1">
			<Info class="h-4 w-4 text-blue-600" />
			<span class="text-xs text-blue-800">
				Value applies equally to Trade, Market, and Retail
			</span>
		</div>
	</div>

	{#if accessories.length === 0}
		<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
			<p class="text-sm text-gray-500">No accessories added yet</p>
			<p class="mt-1 text-xs text-gray-400">
				Add accessories in the 360° Exterior tab to see them here
			</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-gray-200 bg-gray-50">
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Accessory</th>
						<th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Value</th>
					</tr>
				</thead>
				<tbody>
					{#each accessories as accessory (accessory.id)}
						<tr class="border-b border-gray-100 hover:bg-gray-50">
							<td class="px-4 py-3 font-medium text-gray-900">
								{getAccessoryDisplayName(accessory.accessory_type, accessory.custom_name)}
							</td>
							<td class="px-4 py-3">
								<Input
									type="number"
									value={accessory.value || 0}
									oninput={(e) => {
										const value = parseFloat((e.target as HTMLInputElement).value) || 0;
										onUpdateAccessoryValue(accessory.id, value);
									}}
									placeholder="0.00"
									disabled={disabled}
									class="w-full text-right"
									step="0.01"
									min="0"
								/>
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="border-t-2 border-gray-300 bg-gray-50 font-semibold">
						<td class="px-4 py-3 text-left text-sm text-gray-900">Total Accessories</td>
						<td class="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(total)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	{/if}
</Card>
