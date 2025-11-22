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
	}

	let { estimate, additionals, vehicleValues }: Props = $props();

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
			<!-- Original Total -->
			<div class="rounded-lg border bg-white p-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-xs font-medium text-gray-600 uppercase">Baseline (Original)</p>
					<Minus class="h-4 w-4 text-gray-400" />
				</div>
				<p class="text-xl font-bold text-gray-900">{formatCurrency(estimate?.total || 0)}</p>
				<p class="mt-1 text-xs text-gray-500">From finalized estimate</p>
			</div>

			<!-- Removed Total -->
			<div class="rounded-lg border bg-white p-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-xs font-medium text-red-600 uppercase">Removed (Original)</p>
					<TrendingDown class="h-4 w-4 text-red-600" />
				</div>
				<p class="text-xl font-bold text-red-900">
					-{formatCurrency(removedOriginalTotal())}
				</p>
				<p class="mt-1 text-xs text-red-600">
					{removedLineCount()} line{removedLineCount() !== 1 ? 's' : ''}
				</p>
			</div>

			<!-- Additionals Approved Total -->
			<div class="rounded-lg border bg-white p-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-xs font-medium text-blue-600 uppercase">Delta (Net Change)</p>
					<TrendingUp class="h-4 w-4 text-blue-600" />
				</div>
				<p class="text-xl font-bold text-blue-900">
					{additionals?.total_approved && additionals.total_approved > 0 ? '+' : ''}{formatCurrency(
						additionals?.total_approved || 0
					)}
				</p>
				<p class="mt-1 text-xs text-blue-600">
					{additionals?.line_items.filter((li) => li.status === 'approved').length || 0} approved
				</p>
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

		<!-- Calculation Formula -->
		<div class="rounded-md border border-blue-200 bg-blue-50 p-3">
			<p class="font-mono text-xs text-blue-900">
				Delta = {formatCurrency(additionals?.total_approved || 0)}
			</p>
			<p class="mt-1 text-xs text-blue-700">
				Note: Delta includes negative values for removed original lines
			</p>
		</div>
	</div>
</Card>
