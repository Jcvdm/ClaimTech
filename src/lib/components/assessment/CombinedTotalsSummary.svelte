<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';
	import type { Estimate, AssessmentAdditionals, VehicleValues } from '$lib/types/assessment';
	import { formatCurrency } from '$lib/utils/formatters';
	import {
		calculateEstimateThreshold,
		getThresholdColorClasses,
		type ThresholdResult
	} from '$lib/utils/estimateThresholds';

	interface Props {
		estimate: Estimate;
		additionals: AssessmentAdditionals;
		vehicleValues: VehicleValues | null;
		excessAmount?: number | null;
	}

	let { estimate, additionals, vehicleValues, excessAmount = 0 }: Props = $props();

	// Calculate removed total from additionals (negative line items)
	const removedOriginalTotal = $derived(() => {
		if (!additionals?.line_items) return 0;
		return additionals.line_items
			.filter((li) => li.action === 'removed' && li.status === 'approved')
			.reduce((sum, li) => sum + Math.abs(li.total || 0), 0);
	});

	// Count removed lines
	const removedLineCount = $derived(() => {
		if (!additionals?.line_items) return 0;
		return additionals.line_items.filter((li) => li.action === 'removed').length;
	});

	// Calculate added items total (approved added lines only)
	const addedItemsTotal = $derived(() => {
		if (!additionals?.line_items) return 0;
		return additionals.line_items
			.filter((li) => li.action === 'added' && li.status === 'approved')
			.reduce((sum, li) => sum + (li.total || 0), 0);
	});

	// Count added lines
	const addedLineCount = $derived(() => {
		if (!additionals?.line_items) return 0;
		return additionals.line_items.filter((li) => li.action === 'added' && li.status === 'approved').length;
	});

	// Calculate combined total (additionals already includes negative removals)
	const combinedTotal = $derived(() => {
		const original = estimate?.total || 0;
		const additionalsApproved = additionals?.total_approved || 0;
		return original + additionalsApproved;
	});

	// Calculate threshold for risk indicator
	const threshold = $derived((): ThresholdResult | null => {
		if (!vehicleValues?.borderline_writeoff_retail) return null;
		return calculateEstimateThreshold(combinedTotal(), vehicleValues.borderline_writeoff_retail);
	});

	// Get color classes
	const colorClasses = $derived(() => {
		if (!threshold()) return getThresholdColorClasses('normal');
		return getThresholdColorClasses(threshold()!.color);
	});
</script>

<Card class="border-2 p-6 {colorClasses().border} {colorClasses().bg}">
	<div class="space-y-4">
		<!-- Header -->
		<div class="flex items-start justify-between">
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Delta vs Baseline</h3>
				<p class="mt-1 text-sm text-gray-600">Delta (New - Baseline)</p>
			</div>
			{#if threshold()?.showWarning}
				<AlertCircle class="h-6 w-6 {colorClasses().text}" />
			{/if}
		</div>

		<!-- Totals Breakdown -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<!-- Card 1: Baseline (Original) -->
			<div class="rounded-lg border bg-white p-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-xs font-medium text-gray-600 uppercase">Baseline (Original)</p>
					<Minus class="h-4 w-4 text-gray-400" />
				</div>
				<p class="text-xl font-bold text-gray-900">{formatCurrency(estimate?.total || 0)}</p>
				<p class="mt-1 text-xs text-gray-500">From finalized estimate</p>
			</div>

			<!-- Card 2: Net Change (Delta) -->
			<div class="rounded-lg border bg-white p-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-xs font-medium uppercase {(additionals?.total_approved || 0) >= 0 ? 'text-red-600' : 'text-green-600'}">Net Change (Delta)</p>
					{#if (additionals?.total_approved || 0) >= 0}
						<TrendingUp class="h-4 w-4 text-red-600" />
					{:else}
						<TrendingDown class="h-4 w-4 text-green-600" />
					{/if}
				</div>
				<p class="text-xl font-bold {(additionals?.total_approved || 0) >= 0 ? 'text-red-900' : 'text-green-900'}">
					{(additionals?.total_approved || 0) > 0 ? '+' : ''}{formatCurrency(additionals?.total_approved || 0)}
				</p>
				<p class="mt-1 text-xs text-gray-500">Net of removals + additions</p>
			</div>

			<!-- Card 3: Combined Total -->
			<div class="rounded-lg border bg-white p-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-xs font-medium text-blue-600 uppercase">Combined Total</p>
					<TrendingUp class="h-4 w-4 text-blue-600" />
				</div>
				<p class="text-xl font-bold text-blue-900">
					{formatCurrency(combinedTotal())}
				</p>
				<p class="mt-1 text-xs text-blue-600">Baseline + Net Change</p>
			</div>
		</div>

		<!-- Delta Breakdown -->
		<div class="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
			<p class="font-semibold text-gray-700">Change breakdown:</p>
			<div class="flex justify-between">
				<span>Items removed from original ({removedLineCount()} line{removedLineCount() !== 1 ? 's' : ''}):</span>
				<span class="text-red-600">-{formatCurrency(removedOriginalTotal())}</span>
			</div>
			<div class="flex justify-between">
				<span>New items approved ({addedLineCount()} line{addedLineCount() !== 1 ? 's' : ''}):</span>
				<span class="text-green-600">+{formatCurrency(addedItemsTotal())}</span>
			</div>
		</div>

		<!-- Risk Warning Message -->
		{#if threshold()?.showWarning}
			<div class="rounded-md border {colorClasses().border} {colorClasses().bg} p-4">
				<div class="flex items-start gap-3">
					<AlertCircle class="h-5 w-5 {colorClasses().text} mt-0.5 flex-shrink-0" />
					<div class="flex-1">
						<p class="text-sm font-medium {colorClasses().text}">
							{threshold()!.message}
						</p>
						{#if vehicleValues?.borderline_writeoff_retail}
							<p class="text-xs {colorClasses().text} mt-1 opacity-80">
								Borderline write-off threshold: {formatCurrency(
									vehicleValues.borderline_writeoff_retail
								)}
							</p>
						{/if}
					</div>
				</div>
			</div>
		{:else if threshold()}
			<div class="rounded-md border border-gray-200 bg-gray-50 p-3">
				<p class="text-xs text-gray-600">
					{threshold()!.message}
					{#if vehicleValues?.borderline_writeoff_retail}
						• Borderline threshold: {formatCurrency(vehicleValues.borderline_writeoff_retail)}
					{/if}
				</p>
			</div>
		{/if}

	</div>
</Card>
