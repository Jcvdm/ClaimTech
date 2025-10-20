<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { EstimateLineItem } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		open: boolean;
		item: EstimateLineItem | null;
		onClose: () => void;
		onSave: (percentages: BettermentPercentages) => void;
	}

	interface BettermentPercentages {
		betterment_part_percentage: number | null;
		betterment_sa_percentage: number | null;
		betterment_labour_percentage: number | null;
		betterment_paint_percentage: number | null;
		betterment_outwork_percentage: number | null;
	}

	let { open, item, onClose, onSave }: Props = $props();

	// Local state for percentages
	let partPercent = $state<number | null>(null);
	let saPercent = $state<number | null>(null);
	let labourPercent = $state<number | null>(null);
	let paintPercent = $state<number | null>(null);
	let outworkPercent = $state<number | null>(null);

	// Initialize from item when opened
	$effect(() => {
		if (open && item) {
			partPercent = item.betterment_part_percentage || null;
			saPercent = item.betterment_sa_percentage || null;
			labourPercent = item.betterment_labour_percentage || null;
			paintPercent = item.betterment_paint_percentage || null;
			outworkPercent = item.betterment_outwork_percentage || null;
		}
	});

	// Calculate preview of betterment deduction
	const previewBetterment = $derived(() => {
		if (!item) return 0;
		let total = 0;
		if (partPercent && item.part_price_nett) {
			total += (item.part_price_nett * partPercent) / 100;
		}
		if (saPercent && item.strip_assemble) {
			total += (item.strip_assemble * saPercent) / 100;
		}
		if (labourPercent && item.labour_cost) {
			total += (item.labour_cost * labourPercent) / 100;
		}
		if (paintPercent && item.paint_cost) {
			total += (item.paint_cost * paintPercent) / 100;
		}
		if (outworkPercent && item.outwork_charge_nett) {
			total += (item.outwork_charge_nett * outworkPercent) / 100;
		}
		return total;
	});

	function handleSave() {
		onSave({
			betterment_part_percentage: partPercent,
			betterment_sa_percentage: saPercent,
			betterment_labour_percentage: labourPercent,
			betterment_paint_percentage: paintPercent,
			betterment_outwork_percentage: outworkPercent
		});
		onClose();
	}

	function handleClear() {
		partPercent = null;
		saPercent = null;
		labourPercent = null;
		paintPercent = null;
		outworkPercent = null;
	}
</script>

<Dialog.Root {open} onOpenChange={onClose}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Set Betterment Percentages</Dialog.Title>
		</Dialog.Header>

		{#if item}
			<div class="space-y-4">
				<p class="text-sm text-gray-600">
					Apply percentage deductions to specific cost components. Betterment reduces the claimable
					amount.
				</p>

				<!-- Part Price Betterment -->
				{#if item.process_type === 'N' && item.part_price_nett}
					<div class="space-y-2">
						<Label>Part Price ({formatCurrency(item.part_price_nett)})</Label>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								min="0"
								max="100"
								step="1"
								bind:value={partPercent}
								placeholder="0"
								class="flex-1"
							/>
							<span class="text-sm text-gray-600 w-8">%</span>
							<span class="text-sm font-medium w-24 text-right">
								-{formatCurrency(
									partPercent ? (item.part_price_nett * partPercent) / 100 : 0
								)}
							</span>
						</div>
					</div>
				{/if}

				<!-- S&A Betterment -->
				{#if ['N', 'R', 'P', 'B'].includes(item.process_type) && item.strip_assemble}
					<div class="space-y-2">
						<Label>Strip & Assemble ({formatCurrency(item.strip_assemble)})</Label>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								min="0"
								max="100"
								step="1"
								bind:value={saPercent}
								placeholder="0"
								class="flex-1"
							/>
							<span class="text-sm text-gray-600 w-8">%</span>
							<span class="text-sm font-medium w-24 text-right">
								-{formatCurrency(saPercent ? (item.strip_assemble * saPercent) / 100 : 0)}
							</span>
						</div>
					</div>
				{/if}

				<!-- Labour Betterment -->
				{#if ['N', 'R', 'A'].includes(item.process_type) && item.labour_cost}
					<div class="space-y-2">
						<Label>Labour ({formatCurrency(item.labour_cost)})</Label>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								min="0"
								max="100"
								step="1"
								bind:value={labourPercent}
								placeholder="0"
								class="flex-1"
							/>
							<span class="text-sm text-gray-600 w-8">%</span>
							<span class="text-sm font-medium w-24 text-right">
								-{formatCurrency(labourPercent ? (item.labour_cost * labourPercent) / 100 : 0)}
							</span>
						</div>
					</div>
				{/if}

				<!-- Paint Betterment -->
				{#if ['N', 'R', 'P', 'B'].includes(item.process_type) && item.paint_cost}
					<div class="space-y-2">
						<Label>Paint ({formatCurrency(item.paint_cost)})</Label>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								min="0"
								max="100"
								step="1"
								bind:value={paintPercent}
								placeholder="0"
								class="flex-1"
							/>
							<span class="text-sm text-gray-600 w-8">%</span>
							<span class="text-sm font-medium w-24 text-right">
								-{formatCurrency(paintPercent ? (item.paint_cost * paintPercent) / 100 : 0)}
							</span>
						</div>
					</div>
				{/if}

				<!-- Outwork Betterment -->
				{#if item.process_type === 'O' && item.outwork_charge_nett}
					<div class="space-y-2">
						<Label>Outwork ({formatCurrency(item.outwork_charge_nett)})</Label>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								min="0"
								max="100"
								step="1"
								bind:value={outworkPercent}
								placeholder="0"
								class="flex-1"
							/>
							<span class="text-sm text-gray-600 w-8">%</span>
							<span class="text-sm font-medium w-24 text-right">
								-{formatCurrency(
									outworkPercent ? (item.outwork_charge_nett * outworkPercent) / 100 : 0
								)}
							</span>
						</div>
					</div>
				{/if}

				<!-- Total Betterment Preview -->
				<div class="pt-4 border-t">
					<div class="flex items-center justify-between">
						<span class="text-sm font-semibold">Total Betterment:</span>
						<span class="text-lg font-bold text-red-600">
							-{formatCurrency(previewBetterment())}
						</span>
					</div>
					<p class="text-xs text-gray-500 mt-1">
						This amount will be deducted from the line item total
					</p>
				</div>

				<!-- Actions -->
				<div class="flex gap-2 pt-2">
					<Button onclick={handleClear} variant="outline" class="flex-1"> Clear All </Button>
					<Button onclick={handleSave} class="flex-1"> Apply Betterment </Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

