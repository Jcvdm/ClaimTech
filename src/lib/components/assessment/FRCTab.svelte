<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import FRCLinesTable from './FRCLinesTable.svelte';
	import {
		FileText,
		Upload,
		Trash2,
		TrendingUp,
		TrendingDown,
		Minus
	} from 'lucide-svelte';
	import type {
		FinalRepairCosting,
		FRCLineItem,
		FRCDocument,
		Estimate,
		AssessmentAdditionals,
		VehicleValues
	} from '$lib/types/assessment';
	import { frcService } from '$lib/services/frc.service';
	import { frcDocumentsService } from '$lib/services/frc-documents.service';
	import { additionalsService } from '$lib/services/additionals.service';
	import { formatCurrency } from '$lib/utils/formatters';
	import { calculateDeltas } from '$lib/utils/frcCalculations';
	import { calculateSACost, calculateLabourCost, calculatePaintCost } from '$lib/utils/estimateCalculations';

	interface Props {
		assessmentId: string;
		estimate: Estimate;
		vehicleValues: VehicleValues | null;
		onUpdate: () => Promise<void>;
	}

	let { assessmentId, estimate, vehicleValues, onUpdate }: Props = $props();

	let frc = $state<FinalRepairCosting | null>(null);
	let additionals = $state<AssessmentAdditionals | null>(null);
	let documents = $state<FRCDocument[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let starting = $state(false);

	// Adjust modal state
	let showAdjustModal = $state(false);
	let adjustingLine = $state<FRCLineItem | null>(null);
	let adjustReason = $state('');
	let adjustError = $state<string | null>(null);

	// Component-based actual inputs
	let actualPartsNett = $state<number | null>(null);
	let actualSAHours = $state<number | null>(null);
	let actualLabourHours = $state<number | null>(null);
	let actualPaintPanels = $state<number | null>(null);
	let actualOutwork = $state<number | null>(null);

	// Document upload state
	let uploadingDocument = $state(false);
	let uploadError = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement>();

	// Load FRC and additionals
	async function loadFRC() {
		loading = true;
		error = null;
		try {
			const [frcData, additionalsData] = await Promise.all([
				frcService.getByAssessment(assessmentId),
				additionalsService.getByAssessment(assessmentId)
			]);

			frc = frcData;
			additionals = additionalsData;

			if (frc) {
				documents = await frcDocumentsService.getDocumentsByFRC(frc.id);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load FRC';
		} finally {
			loading = false;
		}
	}

	// Start FRC
	async function handleStartFRC() {
		starting = true;
		error = null;
		try {
			const newFRC = await frcService.startFRC(assessmentId, estimate, additionals);
			frc = newFRC;
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start FRC';
		} finally {
			starting = false;
		}
	}

	// Handle Agree decision
	async function handleAgree(line: FRCLineItem) {
		if (!frc) return;
		try {
			error = null;
			const updated = await frcService.updateLineDecision(frc.id, line.id, 'agree');
			frc = updated;
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update line';
		}
	}

	// Helper to get rates for a line (from estimate or additionals)
	function getRatesFor(line: FRCLineItem) {
		return {
			labour: line.labour_rate_snapshot || 0,
			paint: line.paint_rate_snapshot || 0
		};
	}

	// Derived quoted nett baseline (for apples-to-apples comparison)
	const quotedNettBaseline = $derived(() => {
		if (!adjustingLine) return 0;
		return (
			(adjustingLine.quoted_part_price_nett ?? 0) +
			(adjustingLine.quoted_strip_assemble ?? 0) +
			(adjustingLine.quoted_labour_cost ?? 0) +
			(adjustingLine.quoted_paint_cost ?? 0) +
			(adjustingLine.quoted_outwork_charge_nett ?? 0)
		);
	});

	// Derived actual total from component inputs (nett-based)
	const derivedActualTotal = $derived(() => {
		if (!adjustingLine) return 0;
		const rates = getRatesFor(adjustingLine);
		const sa = calculateSACost(actualSAHours, rates.labour);
		const labour = calculateLabourCost(actualLabourHours, rates.labour);
		const paint = calculatePaintCost(actualPaintPanels, rates.paint);
		return (actualPartsNett ?? 0) + sa + labour + paint + (actualOutwork ?? 0);
	});

	// Open adjust modal
	function openAdjustModal(line: FRCLineItem) {
		adjustingLine = line;
		adjustReason = line.adjust_reason || '';
		adjustError = null;

		// Initialize component inputs from existing actuals or null
		actualPartsNett = line.actual_part_price_nett ?? null;
		actualSAHours = line.actual_strip_assemble_hours ?? null;
		actualLabourHours = line.actual_labour_hours ?? null;
		actualPaintPanels = line.actual_paint_panels ?? null;
		actualOutwork = line.actual_outwork_charge ?? null;

		showAdjustModal = true;
	}

	// Handle Adjust decision
	async function handleAdjustSubmit() {
		if (!frc || !adjustingLine) return;

		adjustError = null;

		// Validate
		if (!adjustReason || adjustReason.trim() === '') {
			adjustError = 'Adjust reason is required';
			return;
		}

		const totalToSave = derivedActualTotal();
		if (totalToSave <= 0) {
			adjustError = 'Enter at least one actual amount';
			return;
		}

		try {
			const rates = getRatesFor(adjustingLine);
			const updated = await frcService.updateLineDecision(
				frc.id,
				adjustingLine.id,
				'adjust',
				totalToSave,
				adjustReason,
				{
					actual_part_price_nett: actualPartsNett,
					actual_strip_assemble_hours: actualSAHours,
					actual_strip_assemble: actualSAHours ? calculateSACost(actualSAHours, rates.labour) : null,
					actual_labour_hours: actualLabourHours,
					actual_labour_cost: actualLabourHours ? calculateLabourCost(actualLabourHours, rates.labour) : null,
					actual_paint_panels: actualPaintPanels,
					actual_paint_cost: actualPaintPanels ? calculatePaintCost(actualPaintPanels, rates.paint) : null,
					actual_outwork_charge: actualOutwork
				}
			);
			frc = updated;
			showAdjustModal = false;
			adjustingLine = null;
			await onUpdate();
		} catch (err) {
			adjustError = err instanceof Error ? err.message : 'Failed to update line';
		}
	}

	// Cancel adjust modal
	function handleAdjustCancel() {
		showAdjustModal = false;
		adjustingLine = null;
		adjustError = null;
		actualPartsNett = null;
		actualSAHours = null;
		actualLabourHours = null;
		actualPaintPanels = null;
		actualOutwork = null;
	}

	// Upload document
	async function handleDocumentUpload(event: Event) {
		if (!frc) return;

		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploadingDocument = true;
		uploadError = null;

		try {
			const newDoc = await frcDocumentsService.uploadDocument(
				file,
				frc.id,
				assessmentId,
				file.name,
				'invoice'
			);
			documents = [...documents, newDoc];
			await onUpdate();
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Failed to upload document';
		} finally {
			uploadingDocument = false;
			input.value = '';
		}
	}

	// Delete document
	async function handleDeleteDocument(documentId: string) {
		if (!confirm('Are you sure you want to delete this document?')) return;

		try {
			uploadError = null;
			await frcDocumentsService.deleteDocument(documentId);
			documents = documents.filter((d) => d.id !== documentId);
			await onUpdate();
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Failed to delete document';
		}
	}

	// Complete FRC
	async function handleCompleteFRC() {
		if (!frc) return;
		if (!confirm('Are you sure you want to mark this FRC as completed?')) return;

		try {
			error = null;
			const updated = await frcService.completeFRC(frc.id);
			frc = updated;
			await onUpdate();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to complete FRC';
		}
	}

	// Calculate deltas for display
	const quotedVsActual = $derived(() => {
		if (!frc) return null;
		return calculateDeltas(frc.quoted_total, frc.actual_total);
	});

	const partsDeltas = $derived(() => {
		if (!frc) return null;
		return calculateDeltas(frc.quoted_parts_total, frc.actual_parts_total);
	});

	const labourDeltas = $derived(() => {
		if (!frc) return null;
		return calculateDeltas(frc.quoted_labour_total, frc.actual_labour_total);
	});

	const paintDeltas = $derived(() => {
		if (!frc) return null;
		return calculateDeltas(frc.quoted_paint_total, frc.actual_paint_total);
	});

	const outworkDeltas = $derived(() => {
		if (!frc) return null;
		return calculateDeltas(frc.quoted_outwork_total, frc.actual_outwork_total);
	});

	// Check if all lines have decisions
	const allLinesDecided = $derived(() => {
		if (!frc) return false;
		return frc.line_items.every((line) => line.decision !== 'pending');
	});

	$effect(() => {
		loadFRC();
	});
</script>

<div class="space-y-6">
	{#if loading}
		<Card class="p-6">
			<p class="text-center text-gray-600">Loading FRC...</p>
		</Card>
	{:else if error}
		<Card class="p-6 border-red-200 bg-red-50">
			<p class="text-red-800">{error}</p>
		</Card>
	{:else if !frc || frc.status === 'not_started'}
		<!-- Start FRC -->
		<Card class="p-6">
			<div class="text-center space-y-4">
				<FileText class="mx-auto h-12 w-12 text-gray-400" />
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Final Repair Costing</h3>
					<p class="mt-2 text-sm text-gray-600">
						Start the FRC process to reconcile quoted estimates with actual repair costs.
					</p>
					<p class="mt-1 text-xs text-gray-500">
						This will create a snapshot of the final estimate (original + approved additionals).
					</p>
				</div>
				<Button onclick={handleStartFRC} disabled={starting}>
					{starting ? 'Starting...' : 'Start FRC'}
				</Button>
			</div>
		</Card>
	{:else}
		<!-- FRC Status Banner -->
		<Card class="p-4 {frc.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium {frc.status === 'completed' ? 'text-green-900' : 'text-blue-900'}">
						FRC Status: {frc.status === 'completed' ? 'Completed' : 'In Progress'}
					</p>
					<p class="text-xs {frc.status === 'completed' ? 'text-green-700' : 'text-blue-700'}">
						{frc.line_items.length} line items • Started {new Date(frc.started_at!).toLocaleDateString()}
						{#if frc.completed_at}
							• Completed {new Date(frc.completed_at).toLocaleDateString()}
						{/if}
					</p>
				</div>
				{#if frc.status === 'in_progress' && allLinesDecided()}
					<Button onclick={handleCompleteFRC} size="sm">
						Mark as Completed
					</Button>
				{/if}
			</div>
		</Card>

		<!-- Totals Summary -->
		<Card class="p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Quoted vs Actual Totals</h3>

			<div class="space-y-6">
				<!-- ORIGINAL ESTIMATE SECTION -->
				<div>
					<h4 class="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wide">Original Estimate</h4>
					<div class="space-y-2 pl-4 border-l-2 border-blue-200">
						<!-- Parts (Nett) -->
						<div class="flex items-center justify-between py-1">
							<span class="text-sm text-gray-700">Parts (Nett)</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_estimate_parts_nett)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_estimate_parts_nett)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_estimate_parts_nett - frc.quoted_estimate_parts_nett)}
								</span>
							</div>
						</div>
						<!-- Labour -->
						<div class="flex items-center justify-between py-1">
							<span class="text-sm text-gray-700">Labour</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_estimate_labour)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_estimate_labour)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_estimate_labour - frc.quoted_estimate_labour)}
								</span>
							</div>
						</div>
						<!-- Paint -->
						<div class="flex items-center justify-between py-1">
							<span class="text-sm text-gray-700">Paint</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_estimate_paint)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_estimate_paint)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_estimate_paint - frc.quoted_estimate_paint)}
								</span>
							</div>
						</div>
						<!-- Outwork (Nett) -->
						<div class="flex items-center justify-between py-1">
							<span class="text-sm text-gray-700">Outwork (Nett)</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_estimate_outwork_nett)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_estimate_outwork_nett)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_estimate_outwork_nett - frc.quoted_estimate_outwork_nett)}
								</span>
							</div>
						</div>
						<!-- Markup -->
						<div class="flex items-center justify-between py-1 border-t pt-2">
							<span class="text-sm font-medium text-gray-700">Markup</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_estimate_markup)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_estimate_markup)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_estimate_markup - frc.quoted_estimate_markup)}
								</span>
							</div>
						</div>
						<!-- Subtotal -->
						<div class="flex items-center justify-between py-2 bg-blue-50 px-3 rounded">
							<span class="text-sm font-semibold text-blue-900">Subtotal</span>
							<div class="flex items-center gap-4">
								<span class="text-sm font-medium text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_estimate_subtotal)}</span>
								<span class="text-sm font-semibold text-blue-900 w-24 text-right">{formatCurrency(frc.actual_estimate_subtotal)}</span>
								<span class="text-xs font-medium text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_estimate_subtotal - frc.quoted_estimate_subtotal)}
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- ADDITIONALS SECTION -->
				<div>
					<h4 class="text-sm font-bold text-purple-900 mb-3 uppercase tracking-wide">Additionals</h4>
					<div class="space-y-2 pl-4 border-l-2 border-purple-200">
						<!-- Parts (Nett) -->
						<div class="flex items-center justify-between py-1">
							<span class="text-sm text-gray-700">Parts (Nett)</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_additionals_parts_nett)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_additionals_parts_nett)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_additionals_parts_nett - frc.quoted_additionals_parts_nett)}
								</span>
							</div>
						</div>
						<!-- Labour -->
						<div class="flex items-center justify-between py-1">
							<span class="text-sm text-gray-700">Labour</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_additionals_labour)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_additionals_labour)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_additionals_labour - frc.quoted_additionals_labour)}
								</span>
							</div>
						</div>
						<!-- Paint -->
						<div class="flex items-center justify-between py-1">
							<span class="text-sm text-gray-700">Paint</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_additionals_paint)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_additionals_paint)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_additionals_paint - frc.quoted_additionals_paint)}
								</span>
							</div>
						</div>
						<!-- Outwork (Nett) -->
						<div class="flex items-center justify-between py-1">
							<span class="text-sm text-gray-700">Outwork (Nett)</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_additionals_outwork_nett)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_additionals_outwork_nett)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_additionals_outwork_nett - frc.quoted_additionals_outwork_nett)}
								</span>
							</div>
						</div>
						<!-- Markup -->
						<div class="flex items-center justify-between py-1 border-t pt-2">
							<span class="text-sm font-medium text-gray-700">Markup</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_additionals_markup)}</span>
								<span class="text-sm text-gray-900 w-24 text-right">{formatCurrency(frc.actual_additionals_markup)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_additionals_markup - frc.quoted_additionals_markup)}
								</span>
							</div>
						</div>
						<!-- Subtotal -->
						<div class="flex items-center justify-between py-2 bg-purple-50 px-3 rounded">
							<span class="text-sm font-semibold text-purple-900">Subtotal</span>
							<div class="flex items-center gap-4">
								<span class="text-sm font-medium text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_additionals_subtotal)}</span>
								<span class="text-sm font-semibold text-purple-900 w-24 text-right">{formatCurrency(frc.actual_additionals_subtotal)}</span>
								<span class="text-xs font-medium text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_additionals_subtotal - frc.quoted_additionals_subtotal)}
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- COMBINED TOTAL SECTION -->
				<div class="pt-4 border-t-2 border-gray-300">
					<h4 class="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Combined Total</h4>
					<div class="space-y-2">
						<!-- Subtotal -->
						<div class="flex items-center justify-between py-2">
							<span class="text-sm font-semibold text-gray-900">Subtotal</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_subtotal)}</span>
								<span class="text-sm font-semibold text-gray-900 w-24 text-right">{formatCurrency(frc.actual_subtotal)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_subtotal - frc.quoted_subtotal)}
								</span>
							</div>
						</div>
						<!-- VAT -->
						<div class="flex items-center justify-between py-2">
							<span class="text-sm font-medium text-gray-700">VAT ({frc.vat_percentage}%)</span>
							<div class="flex items-center gap-4">
								<span class="text-sm text-gray-600 w-24 text-right">{formatCurrency(frc.quoted_vat_amount)}</span>
								<span class="text-sm font-medium text-gray-900 w-24 text-right">{formatCurrency(frc.actual_vat_amount)}</span>
								<span class="text-xs text-gray-500 w-20 text-right">
									{formatCurrency(frc.actual_vat_amount - frc.quoted_vat_amount)}
								</span>
							</div>
						</div>
						<!-- Total -->
						<div class="flex items-center justify-between py-3 bg-gray-900 text-white px-4 rounded-lg">
							<span class="text-base font-bold">Total (Inc VAT)</span>
							<div class="flex items-center gap-4">
								<span class="text-base font-medium w-24 text-right">{formatCurrency(frc.quoted_total)}</span>
								<span class="text-xl font-bold w-24 text-right">{formatCurrency(frc.actual_total)}</span>
								{#if quotedVsActual()}
									<div class="flex items-center gap-1 w-20 justify-end">
										{#if quotedVsActual()!.isOver}
											<TrendingUp class="h-4 w-4 text-red-400" />
											<span class="text-xs font-semibold text-red-400">
												+{formatCurrency(quotedVsActual()!.delta)}
											</span>
										{:else if quotedVsActual()!.isUnder}
											<TrendingDown class="h-4 w-4 text-green-400" />
											<span class="text-xs font-semibold text-green-400">
												{formatCurrency(quotedVsActual()!.delta)}
											</span>
										{:else}
											<Minus class="h-4 w-4 text-gray-400" />
											<span class="text-xs font-semibold text-gray-400">
												{formatCurrency(0)}
											</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Legend -->
				<div class="pt-4 border-t">
					<p class="text-xs text-gray-500 text-center">
						Legend: <span class="font-medium">Quoted</span> → <span class="font-medium">Actual</span> → <span class="font-medium">Delta</span>
					</p>
				</div>
			</div>
		</Card>

		<!-- Line Items Table -->
		<Card class="p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
			<FRCLinesTable
				{frc}
				onAgree={handleAgree}
				onAdjust={openAdjustModal}
			/>
		</Card>

		<!-- Documents Panel -->
		<Card class="p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold text-gray-900">FRC Documents</h3>
				<Button size="sm" onclick={() => fileInput?.click()} disabled={uploadingDocument}>
					<Upload class="h-4 w-4 mr-2" />
					{uploadingDocument ? 'Uploading...' : 'Upload Document'}
				</Button>
			</div>

			{#if uploadError}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
					<p class="text-sm text-red-800">{uploadError}</p>
				</div>
			{/if}

			{#if documents.length === 0}
				<div class="text-center py-8 text-gray-500">
					<FileText class="mx-auto h-12 w-12 text-gray-400 mb-2" />
					<p class="text-sm">No documents uploaded yet</p>
					<p class="text-xs mt-1">Upload invoices and attachments to support the FRC</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each documents as doc (doc.id)}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
							<div class="flex items-center gap-3">
								<FileText class="h-5 w-5 text-gray-600" />
								<div>
									<p class="text-sm font-medium text-gray-900">{doc.label || 'Document'}</p>
									<p class="text-xs text-gray-500">
										{doc.document_type} • {new Date(doc.created_at).toLocaleDateString()}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									onclick={() => window.open(doc.document_url, '_blank')}
								>
									View
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onclick={() => handleDeleteDocument(doc.id)}
								>
									<Trash2 class="h-4 w-4 text-red-600" />
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<input
				type="file"
				bind:this={fileInput}
				onchange={handleDocumentUpload}
				accept="application/pdf,image/*"
				class="hidden"
			/>
		</Card>
	{/if}
</div>

<!-- Adjust Modal -->
<Dialog.Root bind:open={showAdjustModal}>
	<Dialog.Content class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Adjust Line Item</Dialog.Title>
			<Dialog.Description>
				Enter actual amounts from the invoice and provide a reason for the adjustment.
			</Dialog.Description>
		</Dialog.Header>

		{#if adjustingLine}
			<div class="space-y-4 py-4">
				<div>
					<p class="text-sm font-medium text-gray-900 mb-1">{adjustingLine.description}</p>
					<p class="text-xs text-gray-500 mb-2">
						Process Type: <Badge variant="outline">{adjustingLine.process_type}</Badge>
					</p>
				</div>

				<!-- Quoted Breakdown (Read-only) -->
				<div class="rounded-lg bg-gray-50 p-3 border border-gray-200">
					<p class="text-xs font-semibold text-gray-700 mb-2">Quoted Breakdown (Nett Values)</p>
					<div class="grid grid-cols-2 gap-2 text-xs">
						{#if adjustingLine.quoted_part_price_nett !== null && adjustingLine.quoted_part_price_nett !== undefined && adjustingLine.quoted_part_price_nett > 0}
							<div class="text-gray-600">Parts (nett):</div>
							<div class="text-right font-medium">{formatCurrency(adjustingLine.quoted_part_price_nett)}</div>
						{/if}
						{#if adjustingLine.quoted_strip_assemble !== null && adjustingLine.quoted_strip_assemble !== undefined && adjustingLine.quoted_strip_assemble > 0}
							<div class="text-gray-600">S&A:</div>
							<div class="text-right font-medium">
								{formatCurrency(adjustingLine.quoted_strip_assemble)}
								{#if adjustingLine.strip_assemble_hours}({adjustingLine.strip_assemble_hours}h){/if}
							</div>
						{/if}
						{#if adjustingLine.quoted_labour_cost !== null && adjustingLine.quoted_labour_cost !== undefined && adjustingLine.quoted_labour_cost > 0}
							<div class="text-gray-600">Labour:</div>
							<div class="text-right font-medium">
								{formatCurrency(adjustingLine.quoted_labour_cost)}
								{#if adjustingLine.labour_hours}({adjustingLine.labour_hours}h){/if}
							</div>
						{/if}
						{#if adjustingLine.quoted_paint_cost !== null && adjustingLine.quoted_paint_cost !== undefined && adjustingLine.quoted_paint_cost > 0}
							<div class="text-gray-600">Paint:</div>
							<div class="text-right font-medium">
								{formatCurrency(adjustingLine.quoted_paint_cost)}
								{#if adjustingLine.paint_panels}({adjustingLine.paint_panels}p){/if}
							</div>
						{/if}
						{#if adjustingLine.quoted_outwork_charge_nett !== null && adjustingLine.quoted_outwork_charge_nett !== undefined && adjustingLine.quoted_outwork_charge_nett > 0}
							<div class="text-gray-600">Outwork (nett):</div>
							<div class="text-right font-medium">{formatCurrency(adjustingLine.quoted_outwork_charge_nett)}</div>
						{/if}
						<div class="text-gray-700 font-semibold border-t pt-1">Nett Total:</div>
						<div class="text-right font-semibold border-t pt-1">{formatCurrency(quotedNettBaseline())}</div>
					</div>
					{#if adjustingLine.quoted_total > quotedNettBaseline()}
						<p class="text-xs text-gray-500 mt-2">
							Note: Quoted selling total (with markup) is {formatCurrency(adjustingLine.quoted_total)}
						</p>
					{/if}
				</div>

				<!-- Actual Component Inputs -->
				<div class="space-y-3">
					<p class="text-sm font-semibold text-gray-900">Actual Amounts (from Invoice)</p>

					{#if adjustingLine.quoted_part_price_nett !== null && adjustingLine.quoted_part_price_nett !== undefined && adjustingLine.quoted_part_price_nett > 0}
						<div class="space-y-1">
							<Label for="actual-parts-nett">Parts (Nett Price)</Label>
							<Input
								id="actual-parts-nett"
								type="number"
								step="0.01"
								min="0"
								bind:value={actualPartsNett}
								placeholder="Enter actual nett part price"
							/>
						</div>
					{/if}

					{#if adjustingLine.quoted_strip_assemble !== null && adjustingLine.quoted_strip_assemble !== undefined && adjustingLine.quoted_strip_assemble > 0}
						<div class="space-y-1">
							<Label for="actual-sa-hours">S&A Hours</Label>
							<Input
								id="actual-sa-hours"
								type="number"
								step="0.1"
								min="0"
								bind:value={actualSAHours}
								placeholder="Enter actual S&A hours"
							/>
							{#if actualSAHours !== null}
								{@const rates = getRatesFor(adjustingLine)}
								<p class="text-xs text-gray-500">
									Cost: {formatCurrency(calculateSACost(actualSAHours, rates.labour))} @ {formatCurrency(rates.labour)}/h
								</p>
							{/if}
						</div>
					{/if}

					{#if adjustingLine.quoted_labour_cost !== null && adjustingLine.quoted_labour_cost !== undefined && adjustingLine.quoted_labour_cost > 0}
						<div class="space-y-1">
							<Label for="actual-labour-hours">Labour Hours</Label>
							<Input
								id="actual-labour-hours"
								type="number"
								step="0.1"
								min="0"
								bind:value={actualLabourHours}
								placeholder="Enter actual labour hours"
							/>
							{#if actualLabourHours !== null}
								{@const rates = getRatesFor(adjustingLine)}
								<p class="text-xs text-gray-500">
									Cost: {formatCurrency(calculateLabourCost(actualLabourHours, rates.labour))} @ {formatCurrency(rates.labour)}/h
								</p>
							{/if}
						</div>
					{/if}

					{#if adjustingLine.quoted_paint_cost !== null && adjustingLine.quoted_paint_cost !== undefined && adjustingLine.quoted_paint_cost > 0}
						<div class="space-y-1">
							<Label for="actual-paint-panels">Paint Panels</Label>
							<Input
								id="actual-paint-panels"
								type="number"
								step="0.1"
								min="0"
								bind:value={actualPaintPanels}
								placeholder="Enter actual paint panels"
							/>
							{#if actualPaintPanels !== null}
								{@const rates = getRatesFor(adjustingLine)}
								<p class="text-xs text-gray-500">
									Cost: {formatCurrency(calculatePaintCost(actualPaintPanels, rates.paint))} @ {formatCurrency(rates.paint)}/panel
								</p>
							{/if}
						</div>
					{/if}

					{#if adjustingLine.quoted_outwork_charge_nett !== null && adjustingLine.quoted_outwork_charge_nett !== undefined && adjustingLine.quoted_outwork_charge_nett > 0}
						<div class="space-y-1">
							<Label for="actual-outwork">Outwork Amount (Nett)</Label>
							<Input
								id="actual-outwork"
								type="number"
								step="0.01"
								min="0"
								bind:value={actualOutwork}
								placeholder="Enter actual nett outwork amount"
							/>
						</div>
					{/if}

					<!-- Derived Actual Total -->
					<div class="rounded-lg bg-blue-50 p-3 border border-blue-200">
						<div class="flex justify-between items-center">
							<span class="text-sm font-semibold text-blue-900">Actual Total (Nett, ex VAT):</span>
							<span class="text-lg font-bold text-blue-900">{formatCurrency(derivedActualTotal())}</span>
						</div>
						{#if derivedActualTotal() - quotedNettBaseline() !== 0}
							{@const delta = derivedActualTotal() - quotedNettBaseline()}
							<p class="text-xs mt-1 {delta > 0 ? 'text-red-600' : 'text-green-600'}">
								{delta > 0 ? '+' : ''}{formatCurrency(delta)} vs quoted nett
							</p>
						{/if}
					</div>
				</div>

				<div class="space-y-2">
					<Label for="adjust-reason">Reason for Adjustment *</Label>
					<Textarea
						id="adjust-reason"
						bind:value={adjustReason}
						placeholder="Explain why the actual cost differs from the quoted amount..."
						rows={3}
					/>
				</div>

				{#if adjustError}
					<div class="p-3 bg-red-50 border border-red-200 rounded-md">
						<p class="text-sm text-red-800">{adjustError}</p>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={handleAdjustCancel}>Cancel</Button>
				<Button onclick={handleAdjustSubmit}>Save Adjustment</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

