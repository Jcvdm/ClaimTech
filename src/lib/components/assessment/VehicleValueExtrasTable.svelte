<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card } from '$lib/components/ui/card';
	import { Trash2, Plus } from 'lucide-svelte';
	import type { VehicleValueExtra } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/vehicleValuesCalculations';

	interface Props {
		extras: VehicleValueExtra[];
		onAddExtra: () => void;
		onUpdateExtra: (extraId: string, updates: Partial<VehicleValueExtra>) => void;
		onDeleteExtra: (extraId: string) => void;
		disabled?: boolean;
	}

	let { extras, onAddExtra, onUpdateExtra, onDeleteExtra, disabled = false }: Props = $props();

	// Calculate totals
	const tradeTotal = $derived(
		extras.reduce((sum, extra) => sum + (extra.trade_value || 0), 0)
	);
	const marketTotal = $derived(
		extras.reduce((sum, extra) => sum + (extra.market_value || 0), 0)
	);
	const retailTotal = $derived(
		extras.reduce((sum, extra) => sum + (extra.retail_value || 0), 0)
	);
</script>

<Card class="p-6">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900">Optional Extras</h3>
		<Button size="sm" onclick={onAddExtra} disabled={disabled}>
			<Plus class="mr-2 h-4 w-4" />
			Add Extra
		</Button>
	</div>

	{#if extras.length === 0}
		<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
			<p class="text-sm text-gray-500">No extras added yet</p>
			<p class="mt-1 text-xs text-gray-400">Click "Add Extra" to add optional equipment</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-gray-200 bg-gray-50">
						<th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
						<th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Trade Value</th>
						<th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Market Value</th>
						<th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Retail Value</th>
						<th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each extras as extra (extra.id)}
						<tr class="border-b border-gray-100 hover:bg-gray-50">
							<td class="px-4 py-3">
								<Input
									type="text"
									value={extra.description}
									oninput={(e) =>
										onUpdateExtra(extra.id, {
											description: (e.target as HTMLInputElement).value
										})}
									placeholder="e.g., Tow bar, Roof rack"
									disabled={disabled}
									class="w-full"
								/>
							</td>
							<td class="px-4 py-3">
								<Input
									type="number"
									value={extra.trade_value}
									oninput={(e) =>
										onUpdateExtra(extra.id, {
											trade_value: parseFloat((e.target as HTMLInputElement).value) || 0
										})}
									placeholder="0.00"
									disabled={disabled}
									class="w-full text-right"
									step="0.01"
									min="0"
								/>
							</td>
							<td class="px-4 py-3">
								<Input
									type="number"
									value={extra.market_value}
									oninput={(e) =>
										onUpdateExtra(extra.id, {
											market_value: parseFloat((e.target as HTMLInputElement).value) || 0
										})}
									placeholder="0.00"
									disabled={disabled}
									class="w-full text-right"
									step="0.01"
									min="0"
								/>
							</td>
							<td class="px-4 py-3">
								<Input
									type="number"
									value={extra.retail_value}
									oninput={(e) =>
										onUpdateExtra(extra.id, {
											retail_value: parseFloat((e.target as HTMLInputElement).value) || 0
										})}
									placeholder="0.00"
									disabled={disabled}
									class="w-full text-right"
									step="0.01"
									min="0"
								/>
							</td>
							<td class="px-4 py-3 text-center">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => onDeleteExtra(extra.id)}
									disabled={disabled}
								>
									<Trash2 class="h-4 w-4 text-red-600" />
								</Button>
							</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="border-t-2 border-gray-300 bg-gray-50 font-semibold">
						<td class="px-4 py-3 text-left text-sm text-gray-900">Total Extras</td>
						<td class="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(tradeTotal)}</td>
						<td class="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(marketTotal)}</td>
						<td class="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(retailTotal)}</td>
						<td class="px-4 py-3"></td>
					</tr>
				</tfoot>
			</table>
		</div>
	{/if}
</Card>

