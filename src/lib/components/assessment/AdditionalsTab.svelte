<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import RatesAndRepairerConfiguration from './RatesAndRepairerConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import DeclineReasonModal from './DeclineReasonModal.svelte';
	import ReversalReasonModal from './ReversalReasonModal.svelte';
	import CombinedTotalsSummary from './CombinedTotalsSummary.svelte';
	import OriginalEstimateLinesPanel from './OriginalEstimateLinesPanel.svelte';
	import AdditionalsPhotosPanel from './AdditionalsPhotosPanel.svelte';
    import { Check, X, Clock, Trash2, RotateCcw, Undo2, AlertTriangle, RefreshCw, ShieldCheck, Package, Recycle } from 'lucide-svelte';
    import { Input } from '$lib/components/ui/input';
	import type {
		AssessmentAdditionals,
		AdditionalLineItem,
		Estimate,
		EstimateLineItem,
		Repairer,
		VehicleValues,
		AdditionalsPhoto
	} from '$lib/types/assessment';
	import { additionalsService } from '$lib/services/additionals.service';
	import { additionalsPhotosService } from '$lib/services/additionals-photos.service';

	interface Props {
		assessmentId: string;
		estimate: Estimate;
		vehicleValues: VehicleValues | null;
		repairers: Repairer[];
		onUpdate: () => Promise<void>;
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const assessmentId = $derived(props.assessmentId);
	const estimate = $derived(props.estimate);
	const vehicleValues = $derived(props.vehicleValues);
	const repairers = $derived(props.repairers);
	const onUpdate = $derived(props.onUpdate);

	let additionals = $state<AssessmentAdditionals | null>(null);
	let additionalsPhotos = $state<AdditionalsPhoto[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showDeclineModal = $state(false);
	let selectedLineItemId = $state<string | null>(null);
    let showReversalModal = $state(false);
    let reversalAction = $state<'reverse' | 'reinstate' | 'reinstate-original' | null>(null);
    let reversalTargetId = $state<string | null>(null);

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

    function updateLocalDescription(lineItemId: string, value: string) {
        if (!additionals) return;
        const idx = additionals.line_items.findIndex((li) => li.id === lineItemId);
        if (idx !== -1) {
            additionals.line_items[idx].description = value;
            additionals = { ...additionals };
        }
    }

    function updateLocalPartType(lineItemId: string, value: string) {
        if (!additionals) return;
        const idx = additionals.line_items.findIndex((li) => li.id === lineItemId);
        if (idx !== -1) {
            additionals.line_items[idx].part_type = value as any;
            additionals = { ...additionals };
        }
    }

    async function updatePending(lineItemId: string, patch: any) {
        const updated = await additionalsService.updatePendingLineItem(assessmentId, lineItemId, patch);
        additionals = updated;
        await onUpdate();
    }

    function handleSAClick(id: string, currentHours: number | null) {
        editingSA = id;
        tempSAHours = currentHours;
    }
    async function handleSASave(id: string) {
        if (tempSAHours !== null) {
            await updatePending(id, { strip_assemble_hours: tempSAHours });
        }
        editingSA = null;
        tempSAHours = null;
    }
    function handleSACancel() {
        editingSA = null;
        tempSAHours = null;
    }

    function handleLabourClick(id: string, currentHours: number | null) {
        editingLabour = id;
        tempLabourHours = currentHours;
    }
    async function handleLabourSave(id: string) {
        if (tempLabourHours !== null) {
            await updatePending(id, { labour_hours: tempLabourHours });
        }
        editingLabour = null;
        tempLabourHours = null;
    }
    function handleLabourCancel() {
        editingLabour = null;
        tempLabourHours = null;
    }

    function handlePaintClick(id: string, currentPanels: number | null) {
        editingPaint = id;
        tempPaintPanels = currentPanels;
    }
    async function handlePaintSave(id: string) {
        if (tempPaintPanels !== null) {
            await updatePending(id, { paint_panels: tempPaintPanels });
        }
        editingPaint = null;
        tempPaintPanels = null;
    }
    function handlePaintCancel() {
        editingPaint = null;
        tempPaintPanels = null;
    }

    function handlePartPriceClick(id: string, currentNett: number | null) {
        editingPartPrice = id;
        tempPartPriceNett = currentNett;
    }
    async function handlePartPriceSave(id: string) {
        if (tempPartPriceNett !== null) {
            await updatePending(id, { part_price_nett: tempPartPriceNett });
        }
        editingPartPrice = null;
        tempPartPriceNett = null;
    }
    function handlePartPriceCancel() {
        editingPartPrice = null;
        tempPartPriceNett = null;
    }

    function handleOutworkClick(id: string, currentNett: number | null) {
        editingOutwork = id;
        tempOutworkNett = currentNett;
    }
    async function handleOutworkSave(id: string) {
        if (tempOutworkNett !== null) {
            await updatePending(id, { outwork_charge_nett: tempOutworkNett });
        }
        editingOutwork = null;
        tempOutworkNett = null;
    }
    function handleOutworkCancel() {
        editingOutwork = null;
        tempOutworkNett = null;
    }

	// Removed original line IDs (from additionals line_items with action='removed')
	let removedOriginalLineIds = $derived(() =>
		(additionals?.line_items || [])
			.filter((item) => item.action === 'removed' && item.original_line_id)
			.map((item) => item.original_line_id!)
	);

	// Reversed line item IDs (items that have been reversed by a reversal entry)
	let reversedTargets = $derived(() =>
		new Set(
			(additionals?.line_items || [])
				.filter((item) => item.action === 'reversal' && item.reverses_line_id)
				.map((item) => item.reverses_line_id!)
		)
	);

	// Map of reversed line IDs to their reversal entries (for showing reversal reasons)
	let reversedBy = $derived(() => {
		const map = new Map<string, AdditionalLineItem>();
		(additionals?.line_items || []).forEach((item) => {
			if (item.action === 'reversal' && item.reverses_line_id) {
				map.set(item.reverses_line_id, item);
			}
		});
		return map;
	});

	// Check if rates differ between estimate and additionals
	let ratesDiffer = $derived(() => {
		if (!additionals) return false;
		return (
			estimate.labour_rate !== additionals.labour_rate ||
			estimate.paint_rate !== additionals.paint_rate ||
			estimate.vat_percentage !== additionals.vat_percentage ||
			estimate.oem_markup_percentage !== additionals.oem_markup_percentage ||
			estimate.alt_markup_percentage !== additionals.alt_markup_percentage ||
			estimate.second_hand_markup_percentage !== additionals.second_hand_markup_percentage ||
			estimate.outwork_markup_percentage !== additionals.outwork_markup_percentage ||
			estimate.repairer_id !== additionals.repairer_id
		);
	});

	// Load or create additionals
	async function loadAdditionals() {
		loading = true;
		error = null;
		try {
			let data = await additionalsService.getByAssessment(assessmentId);

			// Create if doesn't exist (snapshot rates from estimate)
			if (!data) {
				data = await additionalsService.createDefault(assessmentId, estimate);
			}

			additionals = data;

			// Load additionals photos
			if (data.id) {
				additionalsPhotos = await additionalsPhotosService.getPhotosByAdditionals(data.id);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load additionals';
		} finally {
			loading = false;
		}
	}

	// Sync rates from estimate
	async function handleSyncRates() {
		if (!additionals) return;

		const confirmed = confirm(
			'This will update all additionals rates to match the current estimate rates and recalculate all line items. This action cannot be undone. Continue?'
		);

		if (!confirmed) return;

		try {
			error = null;
			loading = true;

			// Service updates DB and returns updated additionals
			const updatedAdditionals = await additionalsService.updateRates(assessmentId, {
				repairer_id: estimate.repairer_id,
				labour_rate: estimate.labour_rate,
				paint_rate: estimate.paint_rate,
				vat_percentage: estimate.vat_percentage,
				oem_markup_percentage: estimate.oem_markup_percentage,
				alt_markup_percentage: estimate.alt_markup_percentage,
				second_hand_markup_percentage: estimate.second_hand_markup_percentage,
				outwork_markup_percentage: estimate.outwork_markup_percentage
			});

			// Update local state
			additionals = updatedAdditionals;

			// Notify parent to refresh
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to sync rates';
		} finally {
			loading = false;
		}
	}

	// Add line item
	async function handleAddLineItem(item: any) {
		if (!additionals) return;

		try {
			error = null;
			// Service updates DB and returns updated additionals
			const updatedAdditionals = await additionalsService.addLineItem(assessmentId, item);

			// Update local state directly (triggers Svelte reactivity)
			additionals = updatedAdditionals;

			// ✅ No loadAdditionals() call - preserves user input in other fields
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add line item';
		}
	}

	// Approve line item
	async function handleApprove(lineItemId: string) {
		try {
			error = null;
			// Service updates DB and returns updated additionals
			const updatedAdditionals = await additionalsService.approveLineItem(assessmentId, lineItemId);

			// Update local state directly (triggers Svelte reactivity)
			additionals = updatedAdditionals;

			// ✅ No loadAdditionals() call - preserves user input in other fields
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to approve item';
		}
	}

	// Open decline modal
	function handleDeclineClick(lineItemId: string) {
		selectedLineItemId = lineItemId;
		showDeclineModal = true;
	}

	// Decline line item with reason
	async function handleDecline(reason: string) {
		if (!selectedLineItemId) return;

		try {
			error = null;
			// Service updates DB and returns updated additionals
			const updatedAdditionals = await additionalsService.declineLineItem(assessmentId, selectedLineItemId, reason);

			// Update local state directly (triggers Svelte reactivity)
			additionals = updatedAdditionals;

			// ✅ No loadAdditionals() call - preserves user input in other fields
			await onUpdate();
			showDeclineModal = false;
			selectedLineItemId = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to decline item';
		}
	}

	// Delete line item (pending only)
	async function handleDelete(lineItemId: string) {
		if (!confirm('Delete this line item?')) return;

		try {
			error = null;
			// Service updates DB and returns updated additionals
			const updatedAdditionals = await additionalsService.deleteLineItem(assessmentId, lineItemId);

			// Update local state directly (triggers Svelte reactivity)
			additionals = updatedAdditionals;

			// ✅ No loadAdditionals() call - preserves user input in other fields
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete item';
		}
	}

	// Open reversal modal for approved items
	function handleReverseClick(lineItemId: string) {
		reversalAction = 'reverse';
		reversalTargetId = lineItemId;
		showReversalModal = true;
	}

	// Open reversal modal for declined items
	function handleReinstateClick(lineItemId: string) {
		reversalAction = 'reinstate';
		reversalTargetId = lineItemId;
		showReversalModal = true;
	}

	// Open reversal modal for removed original lines
	function handleReinstateOriginalClick(originalLineId: string) {
		reversalAction = 'reinstate-original';
		reversalTargetId = originalLineId;
		showReversalModal = true;
	}

	// Handle reversal confirmation
	async function handleReversalConfirm(reason: string) {
		if (!reversalTargetId || !reversalAction) return;

		try {
			error = null;
			let updatedAdditionals: AssessmentAdditionals;

			if (reversalAction === 'reverse') {
				updatedAdditionals = await additionalsService.reverseApprovedLineItem(assessmentId, reversalTargetId, reason);
			} else if (reversalAction === 'reinstate') {
				updatedAdditionals = await additionalsService.reinstateDeclinedLineItem(assessmentId, reversalTargetId, reason);
			} else if (reversalAction === 'reinstate-original') {
				updatedAdditionals = await additionalsService.reinstateRemovedOriginal(assessmentId, reversalTargetId, reason);
			} else {
				return; // Should never happen
			}

			// Update local state directly (triggers Svelte reactivity)
			additionals = updatedAdditionals;

			// ✅ No loadAdditionals() call - preserves user input in other fields
			await onUpdate();
			showReversalModal = false;
			reversalAction = null;
			reversalTargetId = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to process reversal';
		}
	}

	// Cancel reversal modal
	function handleReversalCancel() {
		showReversalModal = false;
		reversalAction = null;
		reversalTargetId = null;
	}

	// Remove original estimate line (creates negative line item in additionals)
	async function handleRemoveOriginal(originalItem: EstimateLineItem) {
		if (!additionals) return;

		try {
			error = null;
			// Service updates DB and returns updated additionals
			const updatedAdditionals = await additionalsService.addRemovedLineItem(assessmentId, originalItem);

			// Update local state directly (triggers Svelte reactivity)
			additionals = updatedAdditionals;

			// ✅ No loadAdditionals() call - preserves user input in other fields
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to remove original line';
		}
	}

	// Refresh photos
	async function handlePhotosUpdate() {
		if (additionals?.id) {
			additionalsPhotos = await additionalsPhotosService.getPhotosByAdditionals(additionals.id);
		}
		await onUpdate();
	}

	// Get status badge class
	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'approved':
				return 'bg-green-100 text-green-800';
			case 'declined':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-yellow-100 text-yellow-800';
		}
	}

	// Get status icon component
	function getStatusIcon(status: string) {
		switch (status) {
			case 'approved':
				return Check;
			case 'declined':
				return X;
			default:
				return Clock;
		}
	}

	// Count by status (excluding reversed items from their original status)
	const statusCounts = $derived(() => {
		if (!additionals) return { pending: 0, approved: 0, declined: 0, reversed: 0 };

		// Build set of reversed line IDs
		const rset = new Set(
			(additionals.line_items || [])
				.filter((item) => item.action === 'reversal' && item.reverses_line_id)
				.map((item) => item.reverses_line_id!)
		);

		return additionals.line_items.reduce(
			(acc, item) => {
				// If this is a reversal entry OR this item has been reversed, count as "reversed"
				if (item.action === 'reversal' || (item.id && rset.has(item.id))) {
					acc.reversed++;
					return acc;
				}
				// Otherwise count by status
				acc[item.status]++;
				return acc;
			},
			{ pending: 0, approved: 0, declined: 0, reversed: 0 }
		);
	});

	$effect(() => {
		loadAdditionals();
	});
</script>

<div class="space-y-6">
	{#if loading}
		<Card class="p-6">
			<p class="text-center text-gray-600">Loading additionals...</p>
		</Card>
	{:else if error}
		<Card class="p-6 border-red-200 bg-red-50">
			<p class="text-red-800">{error}</p>
		</Card>
	{:else if additionals}
		<!-- Info Banner -->
		<Card class="p-4 bg-blue-50 border-blue-200">
			<p class="text-sm text-blue-900">
				<strong>Additionals:</strong> Add new line items to this finalized estimate. Rates and repairer
				are locked from the original estimate. You can exclude lines from the original estimate or
				replace them with repair items.
			</p>
		</Card>

		<!-- Rates Mismatch Warning Banner -->
		{#if ratesDiffer()}
			<Card class="p-4 bg-yellow-50 border-2 border-yellow-400">
				<div class="flex items-start gap-3">
					<AlertTriangle class="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
					<div class="flex-1">
						<h4 class="font-semibold text-yellow-900">Rates Mismatch Detected</h4>
						<p class="text-sm text-yellow-800 mt-1">
							The estimate rates have changed since this additionals record was created.
							Additionals are using the original rates from finalization time to preserve the audit trail.
						</p>
						<div class="mt-3 grid grid-cols-2 gap-4 text-xs">
							<div class="space-y-1">
								<p class="font-semibold text-yellow-900">Original Rates (Additionals):</p>
								{#if estimate.repairer_id !== additionals.repairer_id}
									<p class="text-yellow-700">
										Repairer: {repairers.find(r => r.id === additionals.repairer_id)?.name || 'None'}
									</p>
								{/if}
								{#if estimate.labour_rate !== additionals.labour_rate}
									<p class="text-yellow-700">Labour: R{additionals.labour_rate}/hr</p>
								{/if}
								{#if estimate.paint_rate !== additionals.paint_rate}
									<p class="text-yellow-700">Paint: R{additionals.paint_rate}/panel</p>
								{/if}
								{#if estimate.vat_percentage !== additionals.vat_percentage}
									<p class="text-yellow-700">VAT: {additionals.vat_percentage}%</p>
								{/if}
								{#if estimate.oem_markup_percentage !== additionals.oem_markup_percentage}
									<p class="text-yellow-700">OEM Markup: {additionals.oem_markup_percentage}%</p>
								{/if}
								{#if estimate.alt_markup_percentage !== additionals.alt_markup_percentage}
									<p class="text-yellow-700">ALT Markup: {additionals.alt_markup_percentage}%</p>
								{/if}
								{#if estimate.second_hand_markup_percentage !== additionals.second_hand_markup_percentage}
									<p class="text-yellow-700">2nd Hand Markup: {additionals.second_hand_markup_percentage}%</p>
								{/if}
								{#if estimate.outwork_markup_percentage !== additionals.outwork_markup_percentage}
									<p class="text-yellow-700">Outwork Markup: {additionals.outwork_markup_percentage}%</p>
								{/if}
							</div>
							<div class="space-y-1">
								<p class="font-semibold text-yellow-900">Current Rates (Estimate):</p>
								{#if estimate.repairer_id !== additionals.repairer_id}
									<p class="text-yellow-700">
										Repairer: {repairers.find(r => r.id === estimate.repairer_id)?.name || 'None'}
									</p>
								{/if}
								{#if estimate.labour_rate !== additionals.labour_rate}
									<p class="text-yellow-700">Labour: R{estimate.labour_rate}/hr</p>
								{/if}
								{#if estimate.paint_rate !== additionals.paint_rate}
									<p class="text-yellow-700">Paint: R{estimate.paint_rate}/panel</p>
								{/if}
								{#if estimate.vat_percentage !== additionals.vat_percentage}
									<p class="text-yellow-700">VAT: {estimate.vat_percentage}%</p>
								{/if}
								{#if estimate.oem_markup_percentage !== additionals.oem_markup_percentage}
									<p class="text-yellow-700">OEM Markup: {estimate.oem_markup_percentage}%</p>
								{/if}
								{#if estimate.alt_markup_percentage !== additionals.alt_markup_percentage}
									<p class="text-yellow-700">ALT Markup: {estimate.alt_markup_percentage}%</p>
								{/if}
								{#if estimate.second_hand_markup_percentage !== additionals.second_hand_markup_percentage}
									<p class="text-yellow-700">2nd Hand Markup: {estimate.second_hand_markup_percentage}%</p>
								{/if}
								{#if estimate.outwork_markup_percentage !== additionals.outwork_markup_percentage}
									<p class="text-yellow-700">Outwork Markup: {estimate.outwork_markup_percentage}%</p>
								{/if}
							</div>
						</div>
						<div class="mt-4 flex justify-end">
							<Button
								size="sm"
								variant="outline"
								onclick={handleSyncRates}
								disabled={loading}
								class="border-yellow-600 text-yellow-900 hover:bg-yellow-100"
							>
								<RefreshCw class="h-4 w-4 mr-2" />
								Sync Rates from Estimate
							</Button>
						</div>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Combined Totals Summary with Risk Indicator -->
		<CombinedTotalsSummary
			{estimate}
			{additionals}
			{vehicleValues}
		/>

		<!-- Original Estimate Lines Management -->
		<OriginalEstimateLinesPanel
			{estimate}
			removedOriginalLineIds={removedOriginalLineIds()}
			onRemoveOriginal={handleRemoveOriginal}
		/>

		<!-- Rates Display (Read-only) -->
		<RatesAndRepairerConfiguration
			repairerId={additionals.repairer_id}
			{repairers}
			labourRate={additionals.labour_rate}
			paintRate={additionals.paint_rate}
			vatPercentage={additionals.vat_percentage}
			oemMarkup={additionals.oem_markup_percentage}
			altMarkup={additionals.alt_markup_percentage}
			secondHandMarkup={additionals.second_hand_markup_percentage}
			outworkMarkup={additionals.outwork_markup_percentage}
			onUpdateRates={() => {}}
			onUpdateRepairer={() => {}}
			onRepairersUpdate={() => {}}
			disabled={true}
		/>

		<!-- Quick Add Line Item -->
		<QuickAddLineItem
			labourRate={additionals.labour_rate}
			paintRate={additionals.paint_rate}
			oemMarkup={additionals.oem_markup_percentage}
			altMarkup={additionals.alt_markup_percentage}
			secondHandMarkup={additionals.second_hand_markup_percentage}
			outworkMarkup={additionals.outwork_markup_percentage}
			onAddLineItem={handleAddLineItem}
		/>

		<!-- Line Items Table -->
		<Card class="p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold">Additional Line Items</h3>
				<div class="flex gap-2">
					<Badge class="bg-yellow-100 text-yellow-800">
						{statusCounts().pending} Pending
					</Badge>
					<Badge class="bg-green-100 text-green-800">
						{statusCounts().approved} Approved
					</Badge>
					<Badge class="bg-red-100 text-red-800">
						{statusCounts().declined} Declined
					</Badge>
					<Badge class="bg-blue-100 text-blue-800">
						{statusCounts().reversed} Reversed
					</Badge>
				</div>
			</div>

			{#if additionals.line_items.length === 0}
				<p class="text-center text-gray-500 py-8">No additional items yet</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="border-b">
							<tr class="text-left">
                                <th class="pb-2 font-medium">Type</th>
                                <th class="pb-2 font-medium">Part Type</th>
                                <th class="pb-2 font-medium">Description</th>
                                <th class="pb-2 font-medium text-right">Part</th>
                                <th class="pb-2 font-medium text-right">S&A</th>
                                <th class="pb-2 font-medium text-right">Labour</th>
                                <th class="pb-2 font-medium text-right">Paint</th>
                                <th class="pb-2 font-medium text-right">Outwork</th>
                                <th class="pb-2 font-medium text-right">Total</th>
                                <th class="pb-2 font-medium">Status</th>
                                <th class="pb-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each additionals.line_items as item (item.id)}
								{@const isRemoved = item.action === 'removed'}
								{@const isReversal = item.action === 'reversal'}
								{@const isReversed = item.id && reversedTargets().has(item.id)}
								{@const rowClass = isRemoved ? 'bg-red-50' : isReversal ? 'bg-blue-50' : isReversed ? 'bg-blue-50' : ''}
								{@const StatusIcon = getStatusIcon(item.status)}
								<tr class="border-b hover:bg-gray-50 {rowClass}">
									<td class="py-2">{item.process_type}</td>
                                    <td class="py-2">
                                        <div>
                                            {#if !isRemoved && !isReversal && item.status === 'pending'}
                                                <Input
                                                    type="text"
                                                    value={item.description}
                                                    oninput={(e) => updateLocalDescription(item.id!, e.currentTarget.value)}
                                                    onblur={(e) => updatePending(item.id!, { description: e.currentTarget.value })}
                                                    class="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                />
                                            {:else}
                                                <span class={isRemoved ? 'line-through text-red-600' : isReversal || isReversed ? 'text-blue-600' : ''}>
                                                    {item.description}
                                                </span>
                                            {/if}
                                            {#if isReversal && item.reversal_reason}
                                                <p class="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                                    <RotateCcw class="h-3 w-3" />
                                                    Reversal: {item.reversal_reason}
                                                </p>
                                            {/if}
                                            {#if isReversed && item.id}
                                                {@const reversalEntry = reversedBy().get(item.id)}
                                                {#if reversalEntry?.reversal_reason}
                                                    <p class="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                                        <RotateCcw class="h-3 w-3" />
                                                        Reversed: {reversalEntry.reversal_reason}
                                                    </p>
                                                {/if}
                                            {/if}
                                            {#if item.decline_reason}
                                                <p class="text-xs text-red-600 mt-1">Declined: {item.decline_reason}</p>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="py-2">
                                        {#if item.process_type === 'N'}
                                            {#if !isRemoved && !isReversal && item.status === 'pending'}
                                                <div class="flex items-center gap-2">
                                                    <select
                                                        value={item.part_type || ''}
                                                        oninput={(e) => updateLocalPartType(item.id!, e.currentTarget.value)}
                                                        onblur={(e) => updatePending(item.id!, { part_type: e.currentTarget.value })}
                                                        class="border rounded px-2 py-1 text-sm"
                                                    >
                                                        <option value="">—</option>
                                                        <option value="OEM">OEM</option>
                                                        <option value="ALT">ALT</option>
                                                        <option value="2ND">2ND</option>
                                                    </select>
                                                    {#if item.part_type}
                                                        {@const PTIcon = item.part_type === 'OEM' ? ShieldCheck : item.part_type === 'ALT' ? Package : item.part_type === '2ND' ? Recycle : null}
                                                        {#if PTIcon}
                                                            <Badge class="bg-gray-100 text-gray-800">
                                                                <PTIcon class="h-3 w-3 mr-1" />
                                                                {item.part_type}
                                                            </Badge>
                                                        {/if}
                                                    {/if}
                                                </div>
                                            {:else}
                                                {#if item.part_type}
                                                    {@const PTIcon = item.part_type === 'OEM' ? ShieldCheck : item.part_type === 'ALT' ? Package : item.part_type === '2ND' ? Recycle : null}
                                                    {#if PTIcon}
                                                        <Badge class="bg-gray-100 text-gray-800">
                                                            <PTIcon class="h-3 w-3 mr-1" />
                                                            {item.part_type}
                                                        </Badge>
                                                    {:else}
                                                        <span>—</span>
                                                    {/if}
                                                {:else}
                                                    <span>—</span>
                                                {/if}
                                            {/if}
                                        {:else}
                                            <span>—</span>
                                        {/if}
                                    </td>
                                    <td class="py-2 text-right {isRemoved || isReversal ? 'text-blue-600' : ''}">
                                        {#if !isRemoved && !isReversal && item.status === 'pending' && item.process_type === 'N'}
                                            {#if editingPartPrice === item.id}
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    bind:value={tempPartPriceNett}
                                                    onkeydown={(e) => { if (e.key === 'Enter') handlePartPriceSave(item.id!); if (e.key === 'Escape') handlePartPriceCancel(); }}
                                                    onblur={() => handlePartPriceSave(item.id!)}
                                                    class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    autofocus
                                                />
                                            {:else}
                                                <button
                                                    onclick={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
                                                    class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
                                                >
                                                    R {(item.part_price_nett || 0).toFixed(2)}
                                                </button>
                                            {/if}
                                        {:else}
                                            R {(item.part_price_nett || 0).toFixed(2)}
                                        {/if}
                                    </td>
                                    <td class="py-2 text-right {isRemoved || isReversal ? 'text-blue-600' : ''}">
                                        {#if !isRemoved && !isReversal && item.status === 'pending' && ['N','R','P','B'].includes(item.process_type)}
                                            {#if editingSA === item.id}
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.25"
                                                    bind:value={tempSAHours}
                                                    onkeydown={(e) => { if (e.key === 'Enter') handleSASave(item.id!); if (e.key === 'Escape') handleSACancel(); }}
                                                    onblur={() => handleSASave(item.id!)}
                                                    class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    autofocus
                                                />
                                            {:else}
                                                <button
                                                    onclick={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
                                                    class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
                                                >
                                                    R {(item.strip_assemble || 0).toFixed(2)}
                                                </button>
                                            {/if}
                                        {:else}
                                            R {(item.strip_assemble || 0).toFixed(2)}
                                        {/if}
                                    </td>
                                    <td class="py-2 text-right {isRemoved || isReversal ? 'text-blue-600' : ''}">
                                        {#if !isRemoved && !isReversal && item.status === 'pending' && ['N','R','A'].includes(item.process_type)}
                                            {#if editingLabour === item.id}
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    bind:value={tempLabourHours}
                                                    onkeydown={(e) => { if (e.key === 'Enter') handleLabourSave(item.id!); if (e.key === 'Escape') handleLabourCancel(); }}
                                                    onblur={() => handleLabourSave(item.id!)}
                                                    class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    autofocus
                                                />
                                            {:else}
                                                <button
                                                    onclick={() => handleLabourClick(item.id!, item.labour_hours || null)}
                                                    class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
                                                >
                                                    R {(item.labour_cost || 0).toFixed(2)}
                                                </button>
                                            {/if}
                                        {:else}
                                            R {(item.labour_cost || 0).toFixed(2)}
                                        {/if}
                                    </td>
                                    <td class="py-2 text-right {isRemoved || isReversal ? 'text-blue-600' : ''}">
                                        {#if !isRemoved && !isReversal && item.status === 'pending' && ['N','R','P','B'].includes(item.process_type)}
                                            {#if editingPaint === item.id}
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    bind:value={tempPaintPanels}
                                                    onkeydown={(e) => { if (e.key === 'Enter') handlePaintSave(item.id!); if (e.key === 'Escape') handlePaintCancel(); }}
                                                    onblur={() => handlePaintSave(item.id!)}
                                                    class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    autofocus
                                                />
                                            {:else}
                                                <button
                                                    onclick={() => handlePaintClick(item.id!, item.paint_panels || null)}
                                                    class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
                                                >
                                                    R {(item.paint_cost || 0).toFixed(2)}
                                                </button>
                                            {/if}
                                        {:else}
                                            R {(item.paint_cost || 0).toFixed(2)}
                                        {/if}
                                    </td>
                                    <td class="py-2 text-right {isRemoved || isReversal ? 'text-blue-600' : ''}">
                                        {#if !isRemoved && !isReversal && item.status === 'pending' && item.process_type === 'O'}
                                            {#if editingOutwork === item.id}
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    bind:value={tempOutworkNett}
                                                    onkeydown={(e) => { if (e.key === 'Enter') handleOutworkSave(item.id!); if (e.key === 'Escape') handleOutworkCancel(); }}
                                                    onblur={() => handleOutworkSave(item.id!)}
                                                    class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    autofocus
                                                />
                                            {:else}
                                                <button
                                                    onclick={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
                                                    class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
                                                >
                                                    R {(item.outwork_charge_nett || 0).toFixed(2)}
                                                </button>
                                            {/if}
                                        {:else}
                                            R {(item.outwork_charge_nett || 0).toFixed(2)}
                                        {/if}
                                    </td>
									<td class="py-2 text-right font-medium {isRemoved || isReversal ? 'text-blue-600' : ''}">R {item.total.toFixed(2)}</td>
									<td class="py-2">
										{#if isReversal}
											<Badge class="bg-blue-100 text-blue-800">
												<RotateCcw class="h-3 w-3 mr-1" />
												Reversal
											</Badge>
										{:else if isRemoved}
											<Badge class="bg-red-100 text-red-800">
												<Trash2 class="h-3 w-3 mr-1" />
												Removed
											</Badge>
										{:else if isReversed}
											<Badge class="bg-blue-100 text-blue-800">
												<RotateCcw class="h-3 w-3 mr-1" />
												Reversed
											</Badge>
										{:else}
											<Badge class={getStatusBadgeClass(item.status)}>
												<StatusIcon class="h-3 w-3 mr-1" />
												{item.status}
											</Badge>
										{/if}
									</td>
									<td class="py-2">
										<div class="flex gap-1">
											{#if item.action === 'reversal'}
												<!-- Reversal entries are immutable and auto-approved -->
												<span class="text-xs text-blue-600 italic flex items-center gap-1">
													<RotateCcw class="h-3 w-3" />
													Reversal
												</span>
											{:else if isReversed}
												<!-- Reversed items: no actions available (already reversed) -->
												<span class="text-xs text-blue-600 italic flex items-center gap-1">
													<RotateCcw class="h-3 w-3" />
													Reversed
												</span>
											{:else if !isRemoved && item.status === 'pending' && item.id}
												<!-- Pending items: can approve, decline, or delete -->
												<Button
													size="sm"
													onclick={() => handleApprove(item.id!)}
													class="h-7 px-2"
													title="Approve"
												>
													<Check class="h-3 w-3" />
												</Button>
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleDeclineClick(item.id!)}
													class="h-7 px-2"
													title="Decline"
												>
													<X class="h-3 w-3" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onclick={() => handleDelete(item.id!)}
													class="h-7 px-2 text-red-600"
													title="Delete"
												>
													<Trash2 class="h-3 w-3" />
												</Button>
											{:else if !isRemoved && item.status === 'approved' && item.id}
												<!-- Approved items: can reverse -->
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleReverseClick(item.id!)}
													class="h-7 px-2 text-orange-600"
													title="Reverse this approval"
												>
													<Undo2 class="h-3 w-3" />
												</Button>
											{:else if !isRemoved && item.status === 'declined' && item.id}
												<!-- Declined items: can reinstate -->
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleReinstateClick(item.id!)}
													class="h-7 px-2 text-green-600"
													title="Reinstate this declined item"
												>
													<RotateCcw class="h-3 w-3" />
												</Button>
											{:else if isRemoved && item.original_line_id}
												<!-- Removed original lines: can reinstate -->
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleReinstateOriginalClick(item.original_line_id!)}
													class="h-7 px-2 text-green-600"
													title="Reinstate original line"
												>
													<RotateCcw class="h-3 w-3" />
												</Button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>

		<!-- Totals (Approved Only) -->
		<Card class="p-6 bg-green-50 border-green-200">
			<h3 class="text-lg font-semibold mb-4">Approved Additionals Total</h3>
			<div class="space-y-2">
				<div class="flex justify-between">
					<span>Subtotal (Approved):</span>
					<span class="font-medium">R {additionals.subtotal_approved.toFixed(2)}</span>
				</div>
				<div class="flex justify-between">
					<span>VAT ({additionals.vat_percentage}%):</span>
					<span class="font-medium">R {additionals.vat_amount_approved.toFixed(2)}</span>
				</div>
				<div class="flex justify-between text-lg font-bold border-t pt-2">
					<span>Total (Approved):</span>
					<span>R {additionals.total_approved.toFixed(2)}</span>
				</div>
			</div>
		</Card>

		<!-- Additional Photos -->
		<AdditionalsPhotosPanel
			additionalsId={additionals.id}
			{assessmentId}
			photos={additionalsPhotos}
			onUpdate={handlePhotosUpdate}
		/>
	{/if}
</div>

<!-- Decline Reason Modal -->
{#if showDeclineModal}
	<DeclineReasonModal
		onConfirm={handleDecline}
		onCancel={() => {
			showDeclineModal = false;
			selectedLineItemId = null;
		}}
	/>
{/if}

<!-- Reversal Reason Modal -->
{#if showReversalModal}
	<ReversalReasonModal
		title={reversalAction === 'reverse'
			? 'Reverse Approved Item'
			: reversalAction === 'reinstate'
				? 'Reinstate Declined Item'
				: 'Reinstate Removed Original'}
		description={reversalAction === 'reverse'
			? 'This will create a reversal entry to exclude this approved item from the estimate.'
			: reversalAction === 'reinstate'
				? 'This will create a reversal entry to include this declined item in the estimate.'
				: 'This will create a reversal entry to restore the removed original line to the estimate.'}
		onConfirm={handleReversalConfirm}
		onCancel={handleReversalCancel}
	/>
{/if}

