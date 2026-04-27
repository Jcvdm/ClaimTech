<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import LoadingButton from '$lib/components/ui/button/LoadingButton.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import RatesAndRepairerConfiguration from './RatesAndRepairerConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import DeclineReasonModal from './DeclineReasonModal.svelte';
	import ReversalReasonModal from './ReversalReasonModal.svelte';
	import CombinedTotalsSummary from './CombinedTotalsSummary.svelte';
	import OriginalEstimateLinesPanel from './OriginalEstimateLinesPanel.svelte';
	import AdditionalsPhotosPanel from './AdditionalsPhotosPanel.svelte';
	import DocumentCard from './DocumentCard.svelte';
	import AdditionalLineItemCard from './AdditionalLineItemCard.svelte';
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog';
	import {
		Check,
		X,
		Clock,
		Trash2,
		RotateCcw,
		Undo2,
		AlertTriangle,
		RefreshCw,
		ShieldCheck,
		Package,
		Recycle,
		FileText,
		Plus,
		Camera,
		Settings,
		Info
	} from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import type {
		AssessmentAdditionals,
		AdditionalLineItem,
		Estimate,
		EstimateLineItem,
		VehicleValues,
		AdditionalsPhoto,
		DocumentGenerationStatus
	} from '$lib/types/assessment';
	import type { Repairer } from '$lib/types/repairer';
	import { additionalsService } from '$lib/services/additionals.service';
	import { additionalsPhotosService } from '$lib/services/additionals-photos.service';
	import { documentGenerationService } from '$lib/services/document-generation.service';
	import { validateAdditionals, type TabValidation } from '$lib/utils/validation';
	import { formatCurrency, formatCurrencyValue } from '$lib/utils/formatters';

	interface Props {
		assessmentId: string;
		estimate: Estimate;
		vehicleValues: VehicleValues | null;
		repairers: Repairer[];
		excessAmount?: number | null; // Excess payment from request
		onUpdate: () => Promise<void>;
		onDownloadDocument: (type: string) => void;
		onValidationUpdate?: (validation: TabValidation) => void;
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const assessmentId = $derived(props.assessmentId);
	const estimate = $derived(props.estimate);
	const vehicleValues = $derived(props.vehicleValues);
	const repairers = $derived(props.repairers);
	const excessAmount = $derived(props.excessAmount ?? 0);
	const onUpdate = $derived(props.onUpdate);
	const onDownloadDocument = $derived(props.onDownloadDocument);

	// Validation for badge prevention
	// Additionals tab has no required fields, so always reports 0 missing fields
	const validation = $derived.by(() => {
		return validateAdditionals(additionals);
	});

	// Report validation to parent for badge updates
	let lastValidationKey = '';

	$effect(() => {
		// Create stable key for semantic comparison
		const key = `${validation.isComplete}|${validation.missingFields.join(',')}`;

		// Only report if validation actually changed
		if (props.onValidationUpdate && key !== lastValidationKey) {
			lastValidationKey = key;
			props.onValidationUpdate(validation);
		}
	});

	let additionals = $state<AssessmentAdditionals | null>(null);
	let additionalsPhotos = $state<AdditionalsPhoto[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showDeclineModal = $state(false);
	let selectedLineItemId = $state<string | null>(null);
	let showReversalModal = $state(false);
	let reversalAction = $state<'reverse' | 'reinstate' | 'reinstate-original' | null>(null);
	let reversalTargetId = $state<string | null>(null);
	let ratesOpen = $state(false);
	let quickAddOpen = $state(false);
	let totalsDetailsOpen = $state(false);

	// Derived totals for the bottom sticky strip (mirrors CombinedTotalsSummary logic)
	const stripOriginalTotal = $derived(() => estimate?.total || 0);

	const stripRemovedTotal = $derived(() => {
		if (!additionals?.line_items) return 0;
		return additionals.line_items
			.filter((li) => li.action === 'removed' && li.status === 'approved')
			.reduce((sum, li) => sum + Math.abs(li.total || 0), 0);
	});

	const stripReversedTargets = $derived(() => {
		if (!additionals?.line_items) return new Set<string>();
		return new Set(
			additionals.line_items
				.filter((li) => li.action === 'reversal' && li.reverses_line_id)
				.map((li) => li.reverses_line_id!)
		);
	});

	const stripAddedItemsTotal = $derived(() => {
		if (!additionals?.line_items) return 0;
		return additionals.line_items
			.filter(
				(li) =>
					li.action === 'added' &&
					li.status === 'approved' &&
					!!li.id &&
					!stripReversedTargets().has(li.id)
			)
			.reduce((sum, li) => sum + (li.total || 0), 0);
	});

	const stripCombinedTotal = $derived(() => {
		return (estimate?.total || 0) + (additionals?.total_approved || 0);
	});

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

	// Document generation state
	let generationStatus = $state<DocumentGenerationStatus>({
		report_generated: false,
		estimate_generated: false,
		photos_pdf_generated: false,
		photos_zip_generated: false,
		frc_report_generated: false,
		additionals_letter_generated: false,
		all_generated: false,
		generated_at: null
	});

	let generating = $state(false);
	let progress = $state(0);
	let progressMessage = $state('');

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
	let reversedTargets = $derived(
		() =>
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
			const updatedAdditionals = await additionalsService.declineLineItem(
				assessmentId,
				selectedLineItemId,
				reason
			);

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
				updatedAdditionals = await additionalsService.reverseApprovedLineItem(
					assessmentId,
					reversalTargetId,
					reason
				);
			} else if (reversalAction === 'reinstate') {
				updatedAdditionals = await additionalsService.reinstateDeclinedLineItem(
					assessmentId,
					reversalTargetId,
					reason
				);
			} else if (reversalAction === 'reinstate-original') {
				updatedAdditionals = await additionalsService.reinstateRemovedOriginal(
					assessmentId,
					reversalTargetId,
					reason
				);
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
			const updatedAdditionals = await additionalsService.addRemovedLineItem(
				assessmentId,
				originalItem
			);

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

	// Get status badge variant
	function getStatusBadgeVariant(status: string): 'success' | 'destructive-soft' | 'warning' {
		switch (status) {
			case 'approved':
				return 'success';
			case 'declined':
				return 'destructive-soft';
			default:
				return 'warning';
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
		if (!additionals) return { pending: 0, approved: 0, declined: 0, reversed: 0, removed: 0 };

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
				if (item.action === 'removed') {
					acc.removed++;
					return acc;
				}
				// Otherwise count by status
				acc[item.status]++;
				return acc;
			},
			{ pending: 0, approved: 0, declined: 0, reversed: 0, removed: 0 }
		);
	});

	$effect(() => {
		loadAdditionals();
		loadGenerationStatus();
	});

	async function loadGenerationStatus() {
		generationStatus = await documentGenerationService.getGenerationStatus(assessmentId);
	}

	async function handleGenerateAdditionalsLetter() {
		generating = true;
		progress = 0;
		progressMessage = 'Starting...';
		error = null;
		try {
			await documentGenerationService.generateDocument(
				assessmentId,
				'additionals_letter',
				(prog, msg) => {
					progress = prog;
					progressMessage = msg;
				}
			);
			await loadGenerationStatus();
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate Additionals Letter';
		} finally {
			generating = false;
			progress = 0;
			progressMessage = '';
		}
	}
</script>

<div class="space-y-6">
	{#if loading}
		<Card class="p-6">
			<p class="text-center text-gray-600">Loading additionals...</p>
		</Card>
	{:else if error}
		<Card class="border-destructive-border bg-destructive-soft p-6">
			<p class="text-destructive">{error}</p>
		</Card>
	{:else if additionals}
		<!-- Info Banner -->
		<Card class="border-border bg-muted p-4">
			<p class="text-sm text-foreground">
				<strong>Additionals:</strong>
				{#if additionals.line_items.length === 0}
					This estimate has been finalized. You can now add supplementary repairs, replacement
					parts, or exclude items from the original estimate as needed. Use the "Quick Add" form
					below to get started.
				{:else}
					Add new line items to this finalized estimate. Rates and repairer are locked from the
					original estimate. You can exclude lines from the original estimate or replace them with
					repair items.
				{/if}
			</p>
		</Card>

		<!-- Rates Mismatch Warning Banner -->
		{#if ratesDiffer() && additionals}
			<Card class="border-2 border-yellow-400 bg-yellow-50 p-4">
				<div class="flex items-start gap-3">
					<AlertTriangle class="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
					<div class="flex-1">
						<h4 class="font-semibold text-yellow-900">Rates Mismatch Detected</h4>
						<p class="mt-1 text-sm text-yellow-800">
							The estimate rates have changed since this additionals record was created. Additionals
							are using the original rates from finalization time to preserve the audit trail.
						</p>
						<div class="mt-3 grid grid-cols-2 gap-4 text-xs">
							<div class="space-y-1">
								<p class="font-semibold text-yellow-900">Original Rates (Additionals):</p>
								{#if estimate.repairer_id !== additionals?.repairer_id}
									<p class="text-yellow-700">
										Repairer: {repairers.find((r) => r.id === additionals?.repairer_id)?.name ||
											'None'}
									</p>
								{/if}
								{#if estimate.labour_rate !== additionals?.labour_rate}
									<p class="text-yellow-700">Labour: R{additionals?.labour_rate}/hr</p>
								{/if}
								{#if estimate.paint_rate !== additionals?.paint_rate}
									<p class="text-yellow-700">Paint: R{additionals?.paint_rate}/panel</p>
								{/if}
								{#if estimate.vat_percentage !== additionals?.vat_percentage}
									<p class="text-yellow-700">VAT: {additionals?.vat_percentage}%</p>
								{/if}
								{#if estimate.oem_markup_percentage !== additionals.oem_markup_percentage}
									<p class="text-yellow-700">OEM Markup: {additionals.oem_markup_percentage}%</p>
								{/if}
								{#if estimate.alt_markup_percentage !== additionals.alt_markup_percentage}
									<p class="text-yellow-700">ALT Markup: {additionals.alt_markup_percentage}%</p>
								{/if}
								{#if estimate.second_hand_markup_percentage !== additionals.second_hand_markup_percentage}
									<p class="text-yellow-700">
										2nd Hand Markup: {additionals.second_hand_markup_percentage}%
									</p>
								{/if}
								{#if estimate.outwork_markup_percentage !== additionals.outwork_markup_percentage}
									<p class="text-yellow-700">
										Outwork Markup: {additionals.outwork_markup_percentage}%
									</p>
								{/if}
							</div>
							<div class="space-y-1">
								<p class="font-semibold text-yellow-900">Current Rates (Estimate):</p>
								{#if estimate.repairer_id !== additionals.repairer_id}
									<p class="text-yellow-700">
										Repairer: {repairers.find((r) => r.id === estimate.repairer_id)?.name || 'None'}
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
									<p class="text-yellow-700">
										2nd Hand Markup: {estimate.second_hand_markup_percentage}%
									</p>
								{/if}
								{#if estimate.outwork_markup_percentage !== additionals.outwork_markup_percentage}
									<p class="text-yellow-700">
										Outwork Markup: {estimate.outwork_markup_percentage}%
									</p>
								{/if}
							</div>
						</div>
						<div class="mt-4 flex justify-end">
							<div class="mt-4 flex justify-end">
								<LoadingButton
									size="sm"
									variant="outline"
									onclick={handleSyncRates}
									{loading}
									class="border-yellow-600 text-yellow-900 hover:bg-yellow-100"
								>
									{#if !loading}
										<RefreshCw class="mr-2 h-4 w-4" />
									{/if}
									Sync Rates from Estimate
								</LoadingButton>
							</div>
						</div>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Original Estimate Lines Management -->
		<OriginalEstimateLinesPanel
			{estimate}
			{additionals}
			removedOriginalLineIds={removedOriginalLineIds()}
			onRemoveOriginal={handleRemoveOriginal}
		/>

		<!-- Rates Display Dialog (Read-only) -->
		<ResponsiveDialog.Root bind:open={ratesOpen}>
			<ResponsiveDialog.Content class="sm:max-w-3xl">
				<ResponsiveDialog.Header>
					<ResponsiveDialog.Title>Rates & Repairer Configuration</ResponsiveDialog.Title>
					<ResponsiveDialog.Description>
						View the locked rates and repairer used for these additionals.
					</ResponsiveDialog.Description>
				</ResponsiveDialog.Header>
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
					embedded={true}
				/>
			</ResponsiveDialog.Content>
		</ResponsiveDialog.Root>

		<!-- Quick Add Line Item Dialog -->
		<ResponsiveDialog.Root bind:open={quickAddOpen}>
			<ResponsiveDialog.Content class="sm:max-w-2xl">
				<ResponsiveDialog.Header>
					<ResponsiveDialog.Title>Add additional line item</ResponsiveDialog.Title>
				</ResponsiveDialog.Header>
				<QuickAddLineItem
					labourRate={additionals.labour_rate}
					paintRate={additionals.paint_rate}
					oemMarkup={additionals.oem_markup_percentage}
					altMarkup={additionals.alt_markup_percentage}
					secondHandMarkup={additionals.second_hand_markup_percentage}
					outworkMarkup={additionals.outwork_markup_percentage}
					onAddLineItem={(item) => {
						void handleAddLineItem(item).then(() => (quickAddOpen = false));
					}}
					enablePhotos={true}
					{assessmentId}
					parentId={additionals.id}
					photoCategory="additionals"
					onPhotosUploaded={handlePhotosUpdate}
				/>
			</ResponsiveDialog.Content>
		</ResponsiveDialog.Root>

		<!-- Line Items Table -->
		<Card class="p-2 sm:p-3">
			<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<h3 class="text-lg font-semibold">Additional Line Items</h3>
				<div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
					<Button
						onclick={() => (ratesOpen = true)}
						size="sm"
						variant="outline"
						title="Rates & repairer"
						aria-label="Rates & repairer"
					>
						<Settings class="h-4 w-4" />
					</Button>
					<Button
						onclick={() => (quickAddOpen = true)}
						size="sm"
						variant="ghost"
						title="Add line with photos"
						aria-label="Add line with photos"
					>
						<Camera class="h-4 w-4" />
					</Button>
					<Badge variant="warning" class="text-xs">
						{statusCounts().pending} Pending
					</Badge>
					<Badge variant="success" class="text-xs">
						{statusCounts().approved} Approved
					</Badge>
					<Badge variant="muted" class="text-xs">
						{statusCounts().removed} Removed
					</Badge>
					<Badge variant="destructive-soft" class="text-xs">
						{statusCounts().declined} Declined
					</Badge>
					<Badge variant="secondary" class="text-xs">
						{statusCounts().reversed} Reversed
					</Badge>
				</div>
			</div>

			{#if additionals.line_items.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="mb-4 rounded-full bg-slate-100 p-4">
						<Plus class="h-8 w-8 text-slate-400" />
					</div>
					<h3 class="mb-2 text-lg font-medium text-slate-900">No Additional Items</h3>
					<p class="mb-4 max-w-md text-sm text-slate-600">
						Additional work items can be added after the estimate is finalized. Use the "Quick Add
						Line Item" form above to add new repairs, parts, or outwork discovered after the initial
						assessment.
					</p>
					<p class="text-xs text-slate-500">
						Items you add will appear here for approval or decline.
					</p>
				</div>
			{:else}
				<!-- Mobile: Card Layout -->
				<div class="space-y-3 md:hidden">
					{#each additionals.line_items as item (item.id)}
						{@const isRemoved = item.action === 'removed'}
						{@const isReversal = item.action === 'reversal'}
						{@const isReversed = !!(item.id && reversedTargets().has(item.id))}
						{@const reversalEntry = item.id ? reversedBy().get(item.id) : null}
						<AdditionalLineItemCard
							{item}
							{isRemoved}
							{isReversal}
							{isReversed}
							reversalReason={reversalEntry?.reversal_reason}
							labourRate={additionals.labour_rate}
							paintRate={additionals.paint_rate}
							onUpdateDescription={(value) => {
								updateLocalDescription(item.id!, value);
								updatePending(item.id!, { description: value });
							}}
							onUpdatePartType={(value) => {
								updateLocalPartType(item.id!, value);
								updatePending(item.id!, { part_type: value });
							}}
							onEditPartPrice={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
							onEditSA={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
							onEditLabour={() => handleLabourClick(item.id!, item.labour_hours || null)}
							onEditPaint={() => handlePaintClick(item.id!, item.paint_panels || null)}
							onEditOutwork={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
							onApprove={() => handleApprove(item.id!)}
							onDecline={() => handleDeclineClick(item.id!)}
							onDelete={() => handleDelete(item.id!)}
							onReverse={() => handleReverseClick(item.id!)}
							onReinstate={() => handleReinstateClick(item.id!)}
							onReinstateOriginal={() => handleReinstateOriginalClick(item.original_line_id!)}
						/>
					{/each}
				</div>

				<div class="hidden md:block">
					<Table.Root class="table-fixed">
						<Table.Header class="sticky top-0 z-10 bg-white">
							<Table.Row class="border-b border-border hover:bg-transparent">
								<Table.Head
									class="w-[112px] px-2 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
									>Type / Part</Table.Head
								>
								<Table.Head
									class="px-3 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
									>Description</Table.Head
								>
								<Table.Head
									class="w-[380px] px-2 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
									>Costs</Table.Head
								>
								<Table.Head
									class="w-[96px] px-2 text-right text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
									>Total</Table.Head
								>
								<Table.Head
									class="w-[112px] px-2 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
									>State</Table.Head
								>
								<Table.Head
									class="w-[116px] px-2 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
									>Review</Table.Head
								>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each additionals.line_items as item (item.id)}
								{@const isRemoved = item.action === 'removed'}
								{@const isReversal = item.action === 'reversal'}
								{@const isReversed = item.id && reversedTargets().has(item.id)}
								{@const rowClass = isRemoved
									? 'bg-destructive-soft'
									: isReversal
										? 'bg-muted'
										: isReversed
											? 'bg-muted'
											: ''}
								{@const StatusIcon = getStatusIcon(item.status)}
								<Table.Row class="hover:bg-gray-50 {rowClass}">
									<Table.Cell class="px-2 py-2 align-top">
										<div class="flex flex-col gap-1.5">
											<span
												class="inline-flex w-fit min-w-8 justify-center rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"
											>
												{item.process_type}
											</span>
											{#if item.process_type === 'N'}
												{#if !isRemoved && !isReversal && item.status === 'pending'}
													<select
														value={item.part_type || ''}
														oninput={(e) => updateLocalPartType(item.id!, e.currentTarget.value)}
														onblur={(e) =>
															updatePending(item.id!, { part_type: e.currentTarget.value })}
														class="w-fit rounded-sm border border-input bg-background px-1.5 py-0.5 text-[11px] font-semibold"
													>
														<option value="">-</option>
														<option value="OEM">OEM</option>
														<option value="ALT">ALT</option>
														<option value="2ND">2ND</option>
													</select>
												{:else if item.part_type}
													<Badge class="w-fit bg-gray-100 text-gray-800">{item.part_type}</Badge>
												{:else}
													<span class="text-xs text-muted-foreground">No part</span>
												{/if}
											{:else}
												<span class="text-xs text-muted-foreground">No part</span>
											{/if}
										</div>
									</Table.Cell>

									<Table.Cell class="px-3 py-2 align-top">
										<div>
											{#if !isRemoved && !isReversal && item.status === 'pending'}
												<Input
													type="text"
													value={item.description}
													oninput={(e) => updateLocalDescription(item.id!, e.currentTarget.value)}
													onblur={(e) =>
														updatePending(item.id!, { description: e.currentTarget.value })}
													class="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
												/>
											{:else}
												<span
													class={isRemoved
														? 'text-destructive line-through'
														: isReversal || isReversed
															? 'text-foreground'
															: ''}>{item.description}</span
												>
											{/if}
											{#if isReversal && item.reversal_reason}<p
													class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
												>
													<RotateCcw class="h-3 w-3" />Reversal: {item.reversal_reason}
												</p>{/if}
											{#if isReversed && item.id}
												{@const reversalEntry = reversedBy().get(item.id)}
												{#if reversalEntry?.reversal_reason}<p
														class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
													>
														<RotateCcw class="h-3 w-3" />Reversed: {reversalEntry.reversal_reason}
													</p>{/if}
											{/if}
											{#if item.decline_reason}<p class="mt-1 text-xs text-destructive">
													Declined: {item.decline_reason}
												</p>{/if}
										</div>
									</Table.Cell>

									<Table.Cell class="px-2 py-2 align-top">
										<div class="grid grid-cols-5 gap-1">
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													Part
												</div>
												{#if !isRemoved && !isReversal && item.status === 'pending' && item.process_type === 'N'}{#if editingPartPrice === item.id}<Input
															type="number"
															min="0"
															step="0.01"
															bind:value={tempPartPriceNett}
															onkeydown={(e) => {
																if (e.key === 'Enter') handlePartPriceSave(item.id!);
																if (e.key === 'Escape') handlePartPriceCancel();
															}}
															onblur={() => handlePartPriceSave(item.id!)}
															class="h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
															autofocus
														/>{:else}<button
															onclick={() =>
																handlePartPriceClick(item.id!, item.part_price_nett || null)}
															class="font-mono-tabular w-full text-right text-xs font-medium hover:text-foreground/70"
															>{formatCurrencyValue(item.part_price_nett || 0)}</button
														>{/if}{:else}<span
														class="font-mono-tabular text-xs {isRemoved || isReversal
															? 'text-foreground'
															: 'text-muted-foreground'}"
														>{formatCurrencyValue(item.part_price_nett || 0)}</span
													>{/if}
											</div>
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													S&A
												</div>
												{#if !isRemoved && !isReversal && item.status === 'pending' && ['N', 'R', 'P', 'B'].includes(item.process_type)}{#if editingSA === item.id}<Input
															type="number"
															min="0"
															step="0.25"
															bind:value={tempSAHours}
															onkeydown={(e) => {
																if (e.key === 'Enter') handleSASave(item.id!);
																if (e.key === 'Escape') handleSACancel();
															}}
															onblur={() => handleSASave(item.id!)}
															class="h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
															autofocus
														/>{:else}<button
															onclick={() =>
																handleSAClick(item.id!, item.strip_assemble_hours || null)}
															class="font-mono-tabular w-full text-right text-xs font-medium hover:text-foreground/70"
															>{formatCurrencyValue(item.strip_assemble || 0)}</button
														>{/if}{:else}<span
														class="font-mono-tabular text-xs {isRemoved || isReversal
															? 'text-foreground'
															: 'text-muted-foreground'}"
														>{formatCurrencyValue(item.strip_assemble || 0)}</span
													>{/if}
											</div>
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													Lab
												</div>
												{#if !isRemoved && !isReversal && item.status === 'pending' && ['N', 'R', 'A'].includes(item.process_type)}{#if editingLabour === item.id}<Input
															type="number"
															min="0"
															step="0.5"
															bind:value={tempLabourHours}
															onkeydown={(e) => {
																if (e.key === 'Enter') handleLabourSave(item.id!);
																if (e.key === 'Escape') handleLabourCancel();
															}}
															onblur={() => handleLabourSave(item.id!)}
															class="h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
															autofocus
														/>{:else}<button
															onclick={() => handleLabourClick(item.id!, item.labour_hours || null)}
															class="font-mono-tabular w-full text-right text-xs font-medium hover:text-foreground/70"
															>{formatCurrencyValue(item.labour_cost || 0)}</button
														>{/if}{:else}<span
														class="font-mono-tabular text-xs {isRemoved || isReversal
															? 'text-foreground'
															: 'text-muted-foreground'}"
														>{formatCurrencyValue(item.labour_cost || 0)}</span
													>{/if}
											</div>
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													Paint
												</div>
												{#if !isRemoved && !isReversal && item.status === 'pending' && ['N', 'R', 'P', 'B'].includes(item.process_type)}{#if editingPaint === item.id}<Input
															type="number"
															min="0"
															step="0.5"
															bind:value={tempPaintPanels}
															onkeydown={(e) => {
																if (e.key === 'Enter') handlePaintSave(item.id!);
																if (e.key === 'Escape') handlePaintCancel();
															}}
															onblur={() => handlePaintSave(item.id!)}
															class="h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
															autofocus
														/>{:else}<button
															onclick={() => handlePaintClick(item.id!, item.paint_panels || null)}
															class="font-mono-tabular w-full text-right text-xs font-medium hover:text-foreground/70"
															>{formatCurrencyValue(item.paint_cost || 0)}</button
														>{/if}{:else}<span
														class="font-mono-tabular text-xs {isRemoved || isReversal
															? 'text-foreground'
															: 'text-muted-foreground'}"
														>{formatCurrencyValue(item.paint_cost || 0)}</span
													>{/if}
											</div>
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													Out
												</div>
												{#if !isRemoved && !isReversal && item.status === 'pending' && item.process_type === 'O'}{#if editingOutwork === item.id}<Input
															type="number"
															min="0"
															step="0.01"
															bind:value={tempOutworkNett}
															onkeydown={(e) => {
																if (e.key === 'Enter') handleOutworkSave(item.id!);
																if (e.key === 'Escape') handleOutworkCancel();
															}}
															onblur={() => handleOutworkSave(item.id!)}
															class="h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
															autofocus
														/>{:else}<button
															onclick={() =>
																handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
															class="font-mono-tabular w-full text-right text-xs font-medium hover:text-foreground/70"
															>{formatCurrencyValue(item.outwork_charge_nett || 0)}</button
														>{/if}{:else}<span
														class="font-mono-tabular text-xs {isRemoved || isReversal
															? 'text-foreground'
															: 'text-muted-foreground'}"
														>{formatCurrencyValue(item.outwork_charge_nett || 0)}</span
													>{/if}
											</div>
										</div>
									</Table.Cell>

									<Table.Cell
										class="font-mono-tabular px-3 py-2 text-right align-top font-medium {isRemoved ||
										isReversal
											? 'text-foreground'
											: ''}">{formatCurrencyValue(item.total)}</Table.Cell
									>
									<Table.Cell class="px-2 py-2 align-top">
										{#if isReversal}<Badge variant="secondary"
												><RotateCcw class="mr-1 h-3 w-3" />Reversal</Badge
											>{:else if isRemoved}<Badge variant="destructive-soft"
												><Trash2 class="mr-1 h-3 w-3" />Removed</Badge
											>{:else if isReversed}<Badge variant="secondary"
												><RotateCcw class="mr-1 h-3 w-3" />Reversed</Badge
											>{:else}<Badge variant={getStatusBadgeVariant(item.status)}
												><StatusIcon class="mr-1 h-3 w-3" />{item.status}</Badge
											>{/if}
									</Table.Cell>
									<Table.Cell class="px-2 py-2 align-top">
										<div class="flex flex-wrap gap-1">
											{#if item.action === 'reversal'}<span
													class="flex items-center gap-1 text-xs text-muted-foreground italic"
													><RotateCcw class="h-3 w-3" />Reversal</span
												>
											{:else if isReversed}<span
													class="flex items-center gap-1 text-xs text-muted-foreground italic"
													><RotateCcw class="h-3 w-3" />Reversed</span
												>
											{:else if !isRemoved && item.status === 'pending' && item.id}
												<Button
													size="sm"
													onclick={() => handleApprove(item.id!)}
													class="h-7 px-2"
													title="Approve"><Check class="h-3 w-3" /></Button
												><Button
													size="sm"
													variant="outline"
													onclick={() => handleDeclineClick(item.id!)}
													class="h-7 px-2"
													title="Decline"><X class="h-3 w-3" /></Button
												><Button
													size="sm"
													variant="ghost"
													onclick={() => handleDelete(item.id!)}
													class="h-7 px-2 text-destructive hover:bg-destructive/10"
													title="Delete"><Trash2 class="h-3 w-3" /></Button
												>
											{:else if !isRemoved && item.status === 'approved' && item.id}<Button
													size="sm"
													variant="outline"
													onclick={() => handleReverseClick(item.id!)}
													class="h-7 px-2 text-warning hover:bg-warning/10"
													title="Reverse this approval"><Undo2 class="h-3 w-3" /></Button
												>
											{:else if !isRemoved && item.status === 'declined' && item.id}<Button
													size="sm"
													variant="outline"
													onclick={() => handleReinstateClick(item.id!)}
													class="h-7 px-2 text-success hover:bg-success/10"
													title="Reinstate this declined item"><RotateCcw class="h-3 w-3" /></Button
												>
											{:else if isRemoved && item.original_line_id}<Button
													size="sm"
													variant="outline"
													onclick={() => handleReinstateOriginalClick(item.original_line_id!)}
													class="h-7 px-2 text-success hover:bg-success/10"
													title="Reinstate original line"><RotateCcw class="h-3 w-3" /></Button
												>{/if}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</Card>

		<!-- Bottom-sticky compact totals strip -->
		<div class="sticky bottom-0 z-20 -mx-2 sm:-mx-3 mt-3 border-t border-border bg-card shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.1)]">
			<div class="px-3 sm:px-6 py-2.5">
				<div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
					<span class="flex items-center gap-1.5">
						<span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Original</span>
						<span class="font-mono-tabular">{formatCurrency(stripOriginalTotal())}</span>
					</span>
					<span class="flex items-center gap-1.5">
						<span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Removed</span>
						<span class="font-mono-tabular text-destructive">−{formatCurrency(stripRemovedTotal())}</span>
					</span>
					<span class="flex items-center gap-1.5">
						<span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Added (Approved)</span>
						<span class="font-mono-tabular text-success">+{formatCurrency(stripAddedItemsTotal())}</span>
					</span>

					<span class="ml-auto flex items-center gap-3">
						<span class="flex items-center gap-2">
							<span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Combined</span>
							<span class="font-mono-tabular text-base font-bold">{formatCurrency(stripCombinedTotal())}</span>
						</span>
						<Button size="sm" variant="outline" onclick={() => (totalsDetailsOpen = true)}>
							<Info class="h-3.5 w-3.5 mr-1.5" />
							Details
						</Button>
					</span>
				</div>
			</div>
		</div>

		<!-- Totals Details Dialog -->
		<ResponsiveDialog.Root bind:open={totalsDetailsOpen}>
			<ResponsiveDialog.Content class="sm:max-w-2xl">
				<ResponsiveDialog.Header>
					<ResponsiveDialog.Title>Additionals Totals</ResponsiveDialog.Title>
					<ResponsiveDialog.Description>
						Combined totals including original estimate, removed lines, and approved additions.
					</ResponsiveDialog.Description>
				</ResponsiveDialog.Header>
				<CombinedTotalsSummary {estimate} {additionals} {vehicleValues} {excessAmount} />
			</ResponsiveDialog.Content>
		</ResponsiveDialog.Root>

		<!-- Document Generation -->
		<div class="grid gap-4 md:grid-cols-1">
			<DocumentCard
				title="Additionals Letter"
				description="Summary of approved and declined additionals with totals and notes"
				icon={FileText}
				generated={!!generationStatus.additionals_letter_generated}
				generatedAt={generationStatus.generated_at}
				{generating}
				{progress}
				{progressMessage}
				onGenerate={handleGenerateAdditionalsLetter}
				onDownload={() => onDownloadDocument('additionals_letter')}
			/>
		</div>

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
