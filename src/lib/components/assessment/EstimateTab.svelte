<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import RatesAndRepairerConfiguration from './RatesAndRepairerConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import EstimatePhotosPanel from './EstimatePhotosPanel.svelte';
	import AssessmentResultSelector from './AssessmentResultSelector.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import BettermentModal from './BettermentModal.svelte';
    import { Plus, Trash2, Check, CircleAlert, CircleCheck, CircleX, Info, Percent, ShieldCheck, Package, Recycle, RefreshCw } from 'lucide-svelte';
import type {
	Estimate,
	EstimateLineItem,
	EstimatePhoto,
	VehicleValues,
	VehicleIdentification,
	AssessmentResultType
} from '$lib/types/assessment';
import type { VehicleDetails } from '$lib/utils/report-data-helpers';
import type { Repairer } from '$lib/types/repairer';
	import { getProcessTypeOptions, getProcessTypeConfig, getProcessTypeBadgeColor } from '$lib/constants/processTypes';
	import { createEmptyLineItem, calculateLineItemTotal, calculateBetterment } from '$lib/utils/estimateCalculations';
	import {
		calculateEstimateThreshold,
		getThresholdColorClasses,
		formatWarrantyStatus,
		getWarrantyStatusClasses
	} from '$lib/utils/estimateThresholds';
	import { formatCurrency } from '$lib/utils/formatters';
	import { validateEstimate, type TabValidation } from '$lib/utils/validation';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';
	import { generatePartsListText } from '$lib/utils/csv-generator';
	import * as Dialog from '$lib/components/ui/dialog';

	interface Props {
		estimate: Estimate | null;
		assessmentId: string;
		assessmentNumber: string; // For filename generation
		estimatePhotos: EstimatePhoto[];
		vehicleValues: VehicleValues | null;
		vehicleIdentification: VehicleIdentification | null; // For parts list CSV
		repairers: Repairer[];
		excessAmount?: number | null; // Excess payment from request
		onUpdateEstimate: (data: Partial<Estimate>) => void;
		onAddLineItem: (item: EstimateLineItem) => Promise<EstimateLineItem>;
		onUpdateLineItem: (itemId: string, data: Partial<EstimateLineItem>) => Promise<EstimateLineItem>;
		onDeleteLineItem: (itemId: string) => Promise<void>;
		onBulkDeleteLineItems: (itemIds: string[]) => Promise<void>;
		onPhotosUpdate: () => void;
		onUpdateRates: (
			labourRate: number,
			paintRate: number,
			vatPercentage: number,
			oemMarkup: number,
			altMarkup: number,
			secondHandMarkup: number,
			outworkMarkup: number
		) => void;
		onUpdateRepairer: (repairerId: string | null) => void;
		onRepairersUpdate: () => void;
		onUpdateAssessmentResult: (result: AssessmentResultType | null) => void;
		onComplete: () => void;
		onRegisterSave?: (saveFn: () => Promise<void>) => void; // Expose save function to parent
		onNotesUpdate?: () => void; // Callback to refresh notes display
		vehicleDetails?: VehicleDetails | null;
		onValidationUpdate?: (validation: TabValidation) => void;
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const estimate = $derived(props.estimate);
	const assessmentId = $derived(props.assessmentId);
	const assessmentNumber = $derived(props.assessmentNumber);
	const estimatePhotos = $derived(props.estimatePhotos);
	const vehicleValues = $derived(props.vehicleValues);
	const vehicleIdentification = $derived(props.vehicleIdentification);
	const repairers = $derived(props.repairers);
	const excessAmount = $derived(props.excessAmount ?? 0);
	const onUpdateEstimate = $derived(props.onUpdateEstimate);
	const onPhotosUpdate = $derived(props.onPhotosUpdate);
	const onRepairersUpdate = $derived(props.onRepairersUpdate);
	const onRegisterSave = $derived(props.onRegisterSave);
	const vehicleDetails = $derived(props.vehicleDetails);


	// Option A: Full-tab local buffer (no per-field PATCH)
	function deepClone<T>(obj: T): T {
		try { return structuredClone(obj); } catch { return JSON.parse(JSON.stringify(obj)); }
	}

	/**
	 * Ensure all line items have unique IDs
	 * This handles legacy data that was saved without IDs
	 */
	function ensureLineItemIds(items: any[]): EstimateLineItem[] {
		return (items ?? []).map((item) => {
			if (item && item.id) {
				return item;
			}
			// Generate ID for items without one (legacy data)
			return { ...(item || {}), id: crypto.randomUUID() } as EstimateLineItem;
		});
	}

	let localEstimate = $state<Estimate | null>(null);
	let dirty = $state(false);
	let saving = $state(false);
	let recalculating = $state(false);

	// Parts list modal state
	let showPartsListModal = $state(false);
	let partsListText = $state('');

	$effect(() => {
		// When parent estimate changes and we are not dirty, resync local buffer
		if (!dirty) {
			if (estimate) {
				const cloned = deepClone(estimate);
				// Normalize line items to ensure all have IDs (handles legacy data)
				cloned.line_items = ensureLineItemIds(cloned.line_items);
				localEstimate = cloned;
			} else {
				localEstimate = null;
			}
		}
	});

	function markDirty() { dirty = true; }

	async function saveAll() {
		if (!localEstimate) return;
		saving = true;
		try {
			await onUpdateEstimate({
				line_items: localEstimate.line_items,
				labour_rate: localEstimate.labour_rate,
				paint_rate: localEstimate.paint_rate,
				vat_percentage: localEstimate.vat_percentage,
				oem_markup_percentage: localEstimate.oem_markup_percentage,
				alt_markup_percentage: localEstimate.alt_markup_percentage,
				second_hand_markup_percentage: localEstimate.second_hand_markup_percentage,
				outwork_markup_percentage: localEstimate.outwork_markup_percentage,
				repairer_id: localEstimate.repairer_id,
				assessment_result: localEstimate.assessment_result
			});
			dirty = false;
		} finally {
			saving = false;
		}
	}

	// Register save function with parent on mount
	$effect(() => {
		if (onRegisterSave) {
			onRegisterSave(saveAll);
		}
	});

	function discardAll() {
		localEstimate = estimate ? deepClone(estimate) : null;
		dirty = false;
	}

	// Convenience getter for local line items
	// Filter out any items without IDs as a defensive fallback
	const localLineItems = $derived(() => {
		if (!localEstimate) return [];
		const items = localEstimate.line_items ?? [];
		// Belt-and-braces: filter out any items that somehow don't have IDs
		return items.filter((item) => item && item.id);
	});


	function updateLocalItem(itemId: string, patch: Partial<EstimateLineItem>) {
		if (!localEstimate) return;
		const idx = localEstimate.line_items.findIndex((i) => i.id === itemId);
		if (idx === -1) return;
		localEstimate.line_items[idx] = { ...localEstimate.line_items[idx], ...patch } as EstimateLineItem;
		// Recompute derived totals for display
		const item = localEstimate.line_items[idx];
		item.total = calculateLineItemTotal(item, localEstimate.labour_rate, localEstimate.paint_rate);
		markDirty();
	}

	function addLocalLine(item: Partial<EstimateLineItem>) {
		if (!localEstimate) return;

		// Ensure every new item has a unique id (generate if missing)
		const id = item.id ?? crypto.randomUUID();
		const li = { ...item, id } as EstimateLineItem;

		// Ensure total is present/consistent with current rates
		li.total = calculateLineItemTotal(
			li,
			localEstimate.labour_rate,
			localEstimate.paint_rate
		);

		localEstimate.line_items = [...localEstimate.line_items, li];
		markDirty();
	}

	function removeLocalLines(ids: string[]) {
		if (!localEstimate) return;
		localEstimate.line_items = localEstimate.line_items.filter((i) => !ids.includes(i.id!));
		markDirty();
	}



	const onComplete = $derived(props.onComplete);

	const processTypeOptions = getProcessTypeOptions();

	// State for betterment modal
	let showBettermentModal = $state(false);
	let bettermentItem = $state<EstimateLineItem | null>(null);

	function handleBettermentClick(item: EstimateLineItem) {
		bettermentItem = item;
		showBettermentModal = true;
	}

	async function handleBettermentSave(percentages: any) {
		if (!bettermentItem || !localEstimate) return;

		const idx = localEstimate.line_items.findIndex((i) => i.id === bettermentItem!.id);
		if (idx === -1) return;

		// Update betterment percentages
		localEstimate.line_items[idx] = {
			...localEstimate.line_items[idx],
			...percentages
		};

		// Recalculate betterment_total and line total
		const item = localEstimate.line_items[idx];
		item.betterment_total = calculateBetterment(item);
		item.total = calculateLineItemTotal(item, localEstimate.labour_rate, localEstimate.paint_rate);

		// Add betterment note to assessment notes
		await addBettermentNote(item, percentages);

		markDirty();
		showBettermentModal = false;
		bettermentItem = null;
	}

	// Helper function to add betterment note
	async function addBettermentNote(item: EstimateLineItem, percentages: any) {
		try {
			// Build betterment details
			const bettermentDetails = [];

			if (percentages.betterment_part_percentage) {
				bettermentDetails.push(`Part: ${percentages.betterment_part_percentage}%`);
			}
			if (percentages.betterment_sa_percentage) {
				bettermentDetails.push(`S&A: ${percentages.betterment_sa_percentage}%`);
			}
			if (percentages.betterment_labour_percentage) {
				bettermentDetails.push(`Labour: ${percentages.betterment_labour_percentage}%`);
			}
			if (percentages.betterment_paint_percentage) {
				bettermentDetails.push(`Paint: ${percentages.betterment_paint_percentage}%`);
			}
			if (percentages.betterment_outwork_percentage) {
				bettermentDetails.push(`Outwork: ${percentages.betterment_outwork_percentage}%`);
			}

			const noteText = bettermentDetails.length > 0
				? `${bettermentDetails.join(', ')}\nTotal Deduction: ${formatCurrency(item.betterment_total || 0)}`
				: `No percentages applied\nTotal Deduction: ${formatCurrency(item.betterment_total || 0)}`;

			// Create betterment note (with deduplication)
			await assessmentNotesService.createBettermentNote(
				assessmentId,
				item.id!,
				item.description,
				noteText,
				item.betterment_total || 0,
				'estimate' // Track that this note was created from the estimate tab
			);

			// Trigger parent update to refresh notes display
			props.onNotesUpdate?.();
		} catch (error) {
			console.error('Error adding betterment note:', error);
		}
	}

	// Show parts list as plain text in modal for easy copy/paste
	function handleShowPartsListText() {
		const partsOnly = localLineItems().filter(item => item.process_type === 'N');

		if (partsOnly.length === 0) {
			console.warn('No parts to export');
			return;
		}

		// Prepare vehicle details from normalized vehicleDetails
		const csvVehicleDetails = vehicleDetails ? {
			vin_number: vehicleDetails.vin,
			vehicle_year: vehicleDetails.year,
			vehicle_make: vehicleDetails.make,
			vehicle_model: vehicleDetails.model
		} : undefined;

		// Generate plain text
		partsListText = generatePartsListText(partsOnly, csvVehicleDetails, {
			assessmentNumber: assessmentNumber,
			companyName: 'Claimtech', // TODO: Get from company settings
			companyEmail: 'info@claimtech.co.za' // TODO: Get from company settings
		});

		showPartsListModal = true;
	}


	// Copy parts list text to clipboard
	async function handleCopyPartsListText() {
		try {
			await navigator.clipboard.writeText(partsListText);
			// TODO: Show toast notification "Copied to clipboard"
			console.log('Parts list copied to clipboard');
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
	}

	// State for multi-select functionality
	let selectedItems = $state<Set<string>>(new Set());
	let selectAll = $state(false);

	// State for click-to-edit functionality
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

	function handleAddEmptyLineItem() {
	const newItem = createEmptyLineItem('N') as EstimateLineItem;
	addLocalLine(newItem);
}

	function handleUpdateLineItem(itemId: string, field: keyof EstimateLineItem, value: any) {
		updateLocalItem(itemId, { [field]: value } as Partial<EstimateLineItem>);
	}

	// Multi-select handlers

	// Local buffer: immediate local update, no network
	function scheduleUpdate(id: string, field: keyof EstimateLineItem, value: any) {
		handleUpdateLineItem(id, field, value);
	}
	function flushUpdate(id: string, field: keyof EstimateLineItem, value: any) {
		handleUpdateLineItem(id, field, value);
	}

	function handleToggleSelect(itemId: string) {
		if (selectedItems.has(itemId)) {
			selectedItems.delete(itemId);
		} else {
			selectedItems.add(itemId);
		}
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = selectedItems.size === localLineItems().length;
	}

	function handleSelectAll() {
		if (selectAll) {
			selectedItems.clear();
		} else {
			localLineItems().forEach((item: any) => {
				if (item.id) selectedItems.add(item.id);
			});
		}
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = !selectAll;


	}

	async function handleBulkDelete() {
		if (!confirm(`Delete ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}?`)) return;
		const ids = Array.from(selectedItems);
		removeLocalLines(ids);
		selectedItems.clear();
		selectedItems = new Set(selectedItems);
		selectAll = false;
	}


	// Click-to-edit S&A (hours input)
	// S&A cost = hours × labour_rate
	function handleSAClick(itemId: string, currentHours: number | null) {
		editingSA = itemId;
		// Use stored hours directly instead of recalculating from cost
		tempSAHours = currentHours;
	}

	function handleSASave(itemId: string) {
	if (tempSAHours !== null && localEstimate) {
		const saCost = tempSAHours * localEstimate.labour_rate;
		updateLocalItem(itemId, {
			strip_assemble_hours: tempSAHours,
			strip_assemble: saCost
		});
	}
	editingSA = null;
	tempSAHours = null;
}

	function handleSACancel() {
		editingSA = null;
		tempSAHours = null;
	}

	// Click-to-edit Labour (hours input)
	// Labour cost = hours × labour_rate
	function handleLabourClick(itemId: string, currentHours: number | null) {
		editingLabour = itemId;
		// Use stored hours directly instead of recalculating from cost
		tempLabourHours = currentHours;
	}

	function handleLabourSave(itemId: string) {
	if (tempLabourHours !== null && localEstimate) {
		const labourCost = tempLabourHours * localEstimate.labour_rate;
		updateLocalItem(itemId, {
			labour_hours: tempLabourHours,
			labour_cost: labourCost
		});
	}
	editingLabour = null;
	tempLabourHours = null;
}

	function handleLabourCancel() {
		editingLabour = null;
		tempLabourHours = null;
	}

	// Click-to-edit Paint (panels input)
	function handlePaintClick(itemId: string, currentPanels: number | null) {
		editingPaint = itemId;
		tempPaintPanels = currentPanels;
	}

	function handlePaintSave(itemId: string) {
	if (tempPaintPanels !== null && localEstimate) {
		const paintCost = tempPaintPanels * localEstimate.paint_rate;
		updateLocalItem(itemId, {
			paint_panels: tempPaintPanels,
			paint_cost: paintCost
		});
	}
	editingPaint = null;
	tempPaintPanels = null;
}

	function handlePaintCancel() {
		editingPaint = null;
		tempPaintPanels = null;
	}

	// Click-to-edit Part Price (nett price input)
	// Selling price = nett price × (1 + markup%)
	function handlePartPriceClick(itemId: string, currentNettPrice: number | null) {
		editingPartPrice = itemId;
		tempPartPriceNett = currentNettPrice;
	}

	function handlePartPriceSave(itemId: string, item: EstimateLineItem) {
		if (tempPartPriceNett !== null && estimate) {
			// Get markup percentage based on part type
			let markupPercentage = 0;
			if (item.part_type === 'OEM') markupPercentage = estimate.oem_markup_percentage;
			else if (item.part_type === 'ALT') markupPercentage = estimate.alt_markup_percentage;
			else if (item.part_type === '2ND') markupPercentage = estimate.second_hand_markup_percentage;

			// Calculate selling price with markup
			const sellingPrice = tempPartPriceNett * (1 + markupPercentage / 100);

			updateLocalItem(itemId, {
				part_price_nett: tempPartPriceNett,
				part_price: Number(sellingPrice.toFixed(2))
			});
		}
		editingPartPrice = null;
		tempPartPriceNett = null;
	}

	function handlePartPriceCancel() {
		editingPartPrice = null;
		tempPartPriceNett = null;
	}

	// Click-to-edit Outwork (nett price input)
	// Outwork selling price = nett price × (1 + markup%)
	function handleOutworkClick(itemId: string, currentNettPrice: number | null) {
		editingOutwork = itemId;
		tempOutworkNett = currentNettPrice;
	}

	function handleOutworkSave(itemId: string) {
		if (tempOutworkNett !== null && estimate) {
			const markupPercentage = estimate.outwork_markup_percentage;
			const sellingPrice = tempOutworkNett * (1 + markupPercentage / 100);

			updateLocalItem(itemId, {
				outwork_charge_nett: tempOutworkNett,
				outwork_charge: Number(sellingPrice.toFixed(2))
			});
		}
		editingOutwork = null;
		tempOutworkNett = null;
	}

	function handleOutworkCancel() {
		editingOutwork = null;
		tempOutworkNett = null;
	}

	async function saveAssessmentResult(result: AssessmentResultType | null) {
		if (!localEstimate) return;
		try {
			await onUpdateEstimate({ assessment_result: result });
		} catch (error) {
			console.error('Failed to save assessment result:', error);
		}
	}

	function handleUpdateAssessmentResult(result: AssessmentResultType | null) {
		if (!localEstimate) return;
		localEstimate.assessment_result = result;
		// Don't call markDirty() since we're saving immediately
		saveAssessmentResult(result);  // Dedicated save without overlay
	}

	// Calculate category totals (nett for parts/outwork; show aggregate markup separately)
	// Now includes betterment deduction
	const categoryTotals = $derived(() => {
		if (!estimate) return null;

		const vis = localLineItems();

		const effectivePct = (localEstimate?.sundries_percentage ?? estimate?.sundries_percentage ?? 1);

		const partsNett = vis
			.filter((i: any) => i.process_type === 'N')
			.reduce((sum: number, i: any) => sum + (i.part_price_nett || 0), 0);

		const saTotal = vis.reduce((sum: number, i: any) => sum + (i.strip_assemble || 0), 0);
		const labourTotal = vis.reduce((sum: number, i: any) => sum + (i.labour_cost || 0), 0);
		const paintTotal = vis.reduce((sum: number, i: any) => sum + (i.paint_cost || 0), 0);

		const outworkNett = vis
			.filter((i: any) => i.process_type === 'O')
			.reduce((sum: number, i: any) => sum + (i.outwork_charge_nett || 0), 0);

		// Calculate total betterment deduction
		const bettermentTotal = vis.reduce((sum: number, i: any) => sum + (i.betterment_total || 0), 0);

		// Aggregate markup (parts by type + outwork)
		let partsMarkup = 0;
		const percentSource = localEstimate ?? estimate;
		for (const i of vis) {
			if (i.process_type === 'N') {
				const nett = i.part_price_nett || 0;
				let m = 0;
				if (i.part_type === 'OEM') m = percentSource.oem_markup_percentage;
				else if (i.part_type === 'ALT') m = percentSource.alt_markup_percentage;
				else if (i.part_type === '2ND') m = percentSource.second_hand_markup_percentage;
				partsMarkup += nett * (m / 100);
			}
		}

		const outworkMarkup = outworkNett * (percentSource.outwork_markup_percentage / 100);
		const markupTotal = partsMarkup + outworkMarkup;

		// Subtotal now includes betterment deduction
        const subtotalExVat = partsNett + saTotal + labourTotal + paintTotal + outworkNett + markupTotal - bettermentTotal;
		const sundriesAmount = subtotalExVat * (effectivePct / 100);
        const vatAmount = (subtotalExVat + sundriesAmount) * ((percentSource.vat_percentage || 0) / 100);
        const totalIncVat = subtotalExVat + sundriesAmount + vatAmount;
		// Net amount payable after excess deduction
		const netPayable = totalIncVat - excessAmount;
		return {
			partsTotal: partsNett,
			saTotal,
			labourTotal,
			paintTotal,
			outworkTotal: outworkNett,
			markupTotal,
			bettermentTotal,
			subtotalExVat,
			sundriesAmount,
			sundriesPct: effectivePct,
			vatPercentage: percentSource.vat_percentage || 0,
			vatAmount,
			totalIncVat,
			excessAmount,
			netPayable
		};
	});

	// Check if estimate is complete
	const isComplete = $derived(() => {
		const totals = categoryTotals();
		return estimate !== null && (localLineItems().length > 0) && !!totals && (totals.totalIncVat > 0);
	});

	// Calculate threshold for estimate total vs retail borderline
	const thresholdResult = $derived(() => {
		if (!estimate || !vehicleValues) return null;
		return calculateEstimateThreshold(estimate.total, vehicleValues.borderline_writeoff_retail);
	});

	// Format warranty status
	const warrantyInfo = $derived(() => {
		if (!vehicleValues) return null;
		return formatWarrantyStatus(vehicleValues.warranty_status);
	});

	// Validation for warning banner
	const validation = $derived.by(() => {


		return validateEstimate(estimate);
	});

	// Report validation to parent for immediate badge updates
	$effect(() => {
		if (props.onValidationUpdate) {
			props.onValidationUpdate(validation);
		}
	});

	async function handleLocalUpdateRates(
		labourRate: number,
		paintRate: number,
		vatPercentage: number,
		oem: number,
		alt: number,
		secondHand: number,
		outwork: number
	) {
		if (!localEstimate) return;
		recalculating = true;
		dirty = true;
		localEstimate.labour_rate = labourRate;
		localEstimate.paint_rate = paintRate;
		localEstimate.vat_percentage = vatPercentage;
		localEstimate.oem_markup_percentage = oem;
		localEstimate.alt_markup_percentage = alt;
		localEstimate.second_hand_markup_percentage = secondHand;
		localEstimate.outwork_markup_percentage = outwork;
		localEstimate.line_items = localEstimate.line_items.map((i) => {
			const updated = { ...i } as EstimateLineItem;
			updated.total = calculateLineItemTotal(updated, labourRate, paintRate);
			return updated;
		});
		try {
			await props.onUpdateRates?.(
				labourRate,
				paintRate,
				vatPercentage,
				oem,
				alt,
				secondHand,
				outwork
			);
			dirty = false;
		} finally {
			recalculating = false;
		}
	}
	// B012 Fix: Save repairer immediately without overlay (same pattern as B011 assessment_result)
	async function saveRepairer(repairerId: string | null) {
		if (!localEstimate) return;
		try {
			await onUpdateEstimate({ repairer_id: repairerId });
		} catch (error) {
			console.error('Failed to save repairer:', error);
		}
	}

	function handleLocalUpdateRepairer(repairerId: string | null) {
		if (!localEstimate) return;
		localEstimate.repairer_id = repairerId;
		saveRepairer(repairerId);  // Immediate save, no overlay
	}

</script>

<div class="relative" aria-busy={recalculating || saving}>
    <div class={(recalculating || saving) ? 'space-y-6 blur-sm pointer-events-none' : 'space-y-6'}>
	<!-- Warning Banner -->

	<RequiredFieldsWarning missingFields={validation.missingFields} />
	{#if !estimate}
		<Card class="p-6 border-2 border-dashed border-gray-300">
			<p class="text-center text-gray-600">Loading estimate...</p>
		</Card>
	{:else}
		<!-- Warranty Status Hint -->
		{#if vehicleValues && warrantyInfo()}
			{@const warranty = warrantyInfo()!}
			{@const statusClasses = getWarrantyStatusClasses(warranty.color)}
			<Card class="p-4 {statusClasses.bg} border-2 {statusClasses.border}">
				<div class="flex items-start gap-3">
					<div class="mt-0.5">
						{#if warranty.icon === 'check'}
							<CircleCheck class="h-5 w-5 {statusClasses.text}" />
						{:else if warranty.icon === 'x'}
							<CircleX class="h-5 w-5 {statusClasses.text}" />

						{:else if warranty.icon === 'info'}
							<Info class="h-5 w-5 {statusClasses.text}" />
						{:else}
							<CircleAlert class="h-5 w-5 {statusClasses.text}" />
						{/if}
					</div>
					<div class="flex-1">
						<h4 class="text-sm font-semibold {statusClasses.text}">
							Warranty Status: {warranty.label}
						</h4>
						{#if vehicleValues.warranty_start_date && vehicleValues.warranty_end_date}
							<p class="mt-1 text-xs {statusClasses.text}">
								Valid from {new Date(vehicleValues.warranty_start_date).toLocaleDateString()} to {new Date(
									vehicleValues.warranty_end_date
								).toLocaleDateString()}
							</p>
						{/if}
						{#if vehicleValues.warranty_expiry_mileage}
							<p class="mt-0.5 text-xs {statusClasses.text}">
								Mileage limit: {vehicleValues.warranty_expiry_mileage === 'unlimited'
									? 'Unlimited'
									: `${parseInt(vehicleValues.warranty_expiry_mileage).toLocaleString()} km`}
							</p>
						{/if}
					</div>
				</div>
			</Card>
		{/if}

		<!-- Rates & Repairer Configuration -->
		<RatesAndRepairerConfiguration
			repairerId={localEstimate ? localEstimate.repairer_id : estimate.repairer_id}
			{repairers}
			labourRate={localEstimate ? localEstimate.labour_rate : estimate.labour_rate}
			paintRate={localEstimate ? localEstimate.paint_rate : estimate.paint_rate}
			vatPercentage={localEstimate ? localEstimate.vat_percentage : estimate.vat_percentage}
			oemMarkup={localEstimate ? localEstimate.oem_markup_percentage : estimate.oem_markup_percentage}
			altMarkup={localEstimate ? localEstimate.alt_markup_percentage : estimate.alt_markup_percentage}
			secondHandMarkup={localEstimate ? localEstimate.second_hand_markup_percentage : estimate.second_hand_markup_percentage}
			outworkMarkup={localEstimate ? localEstimate.outwork_markup_percentage : estimate.outwork_markup_percentage}
			onUpdateRates={handleLocalUpdateRates}
			onUpdateRepairer={handleLocalUpdateRepairer}
			{onRepairersUpdate}
			disabled={saving || recalculating}
		/>

		<!-- Quick Add Form -->
		<QuickAddLineItem
			labourRate={localEstimate ? localEstimate.labour_rate : estimate.labour_rate}
			paintRate={localEstimate ? localEstimate.paint_rate : estimate.paint_rate}
			oemMarkup={localEstimate ? localEstimate.oem_markup_percentage : estimate.oem_markup_percentage}
			altMarkup={localEstimate ? localEstimate.alt_markup_percentage : estimate.alt_markup_percentage}
			secondHandMarkup={localEstimate ? localEstimate.second_hand_markup_percentage : estimate.second_hand_markup_percentage}
			outworkMarkup={localEstimate ? localEstimate.outwork_markup_percentage : estimate.outwork_markup_percentage}
			onAddLineItem={(item) => { addLocalLine(item); }}
		/>

		<!-- Line Items Table -->
		<Card class="p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">Line Items</h3>
				<div class="flex gap-2">
					{#if dirty}
						<Button onclick={saveAll} size="sm" disabled={saving}>
							{saving ? 'Saving…' : 'Save Changes'}
						</Button>
						<Button onclick={discardAll} size="sm" variant="outline" disabled={saving}>
							Discard
						</Button>
					{/if}
					<!-- Parts List Button -->
					<Button
						onclick={handleShowPartsListText}
						size="sm"
						variant="outline"
						title="Parts List (for ordering)"
					>
						<Package class="h-4 w-4" />
					</Button>
					{#if selectedItems.size > 0}
						<Button onclick={handleBulkDelete} size="sm" variant="destructive">
							<Trash2 class="mr-2 h-4 w-4" />
							Delete Selected ({selectedItems.size})
						</Button>
					{/if}
					<Button onclick={handleAddEmptyLineItem} size="sm" variant="outline">
						<Plus class="mr-2 h-4 w-4" />
						Add Empty Row
					</Button>
				</div>
			</div>

			<div class="rounded-lg border overflow-x-auto max-h-[70vh] overflow-y-auto">
				<Table.Root>
					<Table.Header class="sticky top-0 z-10 bg-white">
						<Table.Row class="hover:bg-transparent border-b-2">
							<Table.Head class="w-[40px] px-2">
								<input
									type="checkbox"
									checked={selectAll}
									onchange={handleSelectAll}
									class="rounded border-gray-300 cursor-pointer"
									aria-label="Select all items"
								/>
							</Table.Head>
							<Table.Head class="w-[50px] px-2">Type</Table.Head>
							<Table.Head class="w-[60px] px-2">Part</Table.Head>
							<Table.Head class="min-w-[180px] flex-1 px-3">Description</Table.Head>
							<Table.Head class="w-[120px] text-right px-2">Part Price</Table.Head>
							<Table.Head class="w-[100px] text-right px-2">S&A</Table.Head>
							<Table.Head class="w-[120px] text-right px-2">Labour</Table.Head>
							<Table.Head class="w-[100px] text-right px-2">Paint</Table.Head>
							<Table.Head class="w-[120px] text-right px-2">Outwork</Table.Head>
							<Table.Head class="w-[40px] px-2 text-center" title="Betterment">%</Table.Head>
							<Table.Head class="w-[140px] text-right px-2">Total</Table.Head>
							<Table.Head class="w-[60px] px-2"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if localLineItems().length === 0}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={11} class="h-24 text-center text-gray-500">
									No line items added. Use "Quick Add" above or click "Add Empty Row".
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each localLineItems() as item (item.id)}
								<Table.Row class="hover:bg-gray-50">
									<!-- Checkbox -->
									<Table.Cell class="px-3 py-2">
										<input
											type="checkbox"
											checked={selectedItems.has(item.id!)}
											onchange={() => handleToggleSelect(item.id!)}
											class="rounded border-gray-300 cursor-pointer"
											aria-label="Select item"
										/>
									</Table.Cell>

									<!-- Process Type - Compact Badge Display -->
									<Table.Cell class="px-3 py-2">
										<div class="relative group">
											<select
												value={item.process_type}
												onchange={(e) =>
													handleUpdateLineItem(item.id!, 'process_type', e.currentTarget.value)}
												class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
											>
												{#each processTypeOptions as option}
													<option value={option.value}>{option.value} - {option.label}</option>
												{/each}
											</select>

											<!-- Visual Badge -->
											<div class="flex items-center justify-center pointer-events-none">
												<span class="px-2 py-1 text-xs font-semibold rounded {getProcessTypeBadgeColor(item.process_type)}">
													{item.process_type}
												</span>
											</div>

											<!-- Tooltip -->
											<div class="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap z-20 pointer-events-none">
												{getProcessTypeConfig(item.process_type).label}
											</div>
										</div>
									</Table.Cell>

									<!-- Part Type (N only) -->
									<Table.Cell class="px-3 py-2">
										{#if item.process_type === 'N'}
											<div class="relative group">
												<!-- Hidden select for functionality -->
												<select
													value={item.part_type || 'OEM'}
													onchange={(e) =>
														handleUpdateLineItem(item.id!, 'part_type', e.currentTarget.value)}
													class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
												>
													<option value="OEM">OEM</option>
													<option value="ALT">ALT</option>
													<option value="2ND">2ND</option>
												</select>

												<!-- Visual Badge with Icon -->
												<div class="flex items-center justify-center pointer-events-none">
													{#if item.part_type === 'OEM'}
														<div class="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-800">
															<ShieldCheck class="h-3 w-3" />
															<span class="text-xs font-semibold">OEM</span>
														</div>
													{:else if item.part_type === 'ALT'}
														<div class="flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800">
															<Package class="h-3 w-3" />
															<span class="text-xs font-semibold">ALT</span>
														</div>
													{:else if item.part_type === '2ND'}
														<div class="flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800">
															<Recycle class="h-3 w-3" />
															<span class="text-xs font-semibold">2ND</span>
														</div>
													{:else}
						<span class="text-xs text-gray-500">OEM</span>
					{/if}
					</div>
				</div>
				{:else}
					<span class="text-gray-400 text-sm">-</span>
				{/if}
									</Table.Cell>

									<!-- Description -->
									<Table.Cell class="px-3 py-2">
										<Input
											type="text"
											placeholder="Description"
											value={item.description}
											oninput={(e) =>
												scheduleUpdate(item.id!, 'description', e.currentTarget.value)}
											onblur={(e) => flushUpdate(item.id!, 'description', e.currentTarget.value)}
											class="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
										/>
									</Table.Cell>

									<!-- Part Price (N only) - Click to edit nett price -->
									<Table.Cell class="text-right px-3 py-2">
										{#if item.process_type === 'N'}
											{#if editingPartPrice === item.id}
												<div class="space-y-1">
													<Input
														type="number"
														min="0"
														step="0.01"
														bind:value={tempPartPriceNett}
														onkeydown={(e) => {
															if (e.key === 'Enter') handlePartPriceSave(item.id!, item);
															if (e.key === 'Escape') handlePartPriceCancel();
														}}
														onblur={() => handlePartPriceSave(item.id!, item)}
														class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
													<p class="text-xs text-gray-500 italic">Only input nett price</p>
												</div>
											{:else}
												<button
													onclick={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit nett price (selling price includes markup)"
												>
													{formatCurrency(item.part_price_nett || 0)}
												</button>
											{/if}
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Strip & Assemble (N,R,P,B) - Click to edit hours -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'P', 'B'].includes(item.process_type)}
											{#if editingSA === item.id}
												<Input
													type="number"
													min="0"
													step="0.25"
													bind:value={tempSAHours}
													onkeydown={(e) => {
														if (e.key === 'Enter') handleSASave(item.id!);
														if (e.key === 'Escape') handleSACancel();
													}}
													onblur={() => handleSASave(item.id!)}
													class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
													autofocus
												/>
											{:else}
												<button
													onclick={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit hours (S&A = hours × labour rate)"
												>
													{formatCurrency(item.strip_assemble || 0)}
												</button>
											{/if}
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Labour Cost (N,R,A) - Click to edit hours -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'A'].includes(item.process_type)}
											{#if editingLabour === item.id}
												<Input
													type="number"
													min="0"
													step="0.5"
													bind:value={tempLabourHours}
													onkeydown={(e) => {
														if (e.key === 'Enter') handleLabourSave(item.id!);
														if (e.key === 'Escape') handleLabourCancel();
													}}
													onblur={() => handleLabourSave(item.id!)}
													class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
													autofocus
												/>
											{:else}
												<button
													onclick={() => handleLabourClick(item.id!, item.labour_hours || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit hours (Labour = hours × labour rate)"
												>
													{formatCurrency(item.labour_cost || 0)}
												</button>
											{/if}
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Paint Cost (N,R,P,B) - Click to edit panels -->
									<Table.Cell class="text-right px-3 py-2">
										{#if ['N', 'R', 'P', 'B'].includes(item.process_type)}
											{#if editingPaint === item.id}
												<Input
													type="number"
													min="0"
													step="0.5"
													bind:value={tempPaintPanels}
													onkeydown={(e) => {
														if (e.key === 'Enter') handlePaintSave(item.id!);
														if (e.key === 'Escape') handlePaintCancel();
													}}
													onblur={() => handlePaintSave(item.id!)}
													class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
													autofocus
												/>
											{:else}
												<button
													onclick={() => handlePaintClick(item.id!, item.paint_panels || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit panels (Paint = panels × paint rate)"
												>
													{formatCurrency(item.paint_cost || 0)}
												</button>
											{/if}
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Outwork Charge (O only) - Click to edit nett price -->
									<Table.Cell class="text-right px-3 py-2">
										{#if item.process_type === 'O'}
											{#if editingOutwork === item.id}
												<div class="space-y-1">
													<Input
														type="number"
														min="0"
														step="0.01"
														bind:value={tempOutworkNett}
														onkeydown={(e) => {
															if (e.key === 'Enter') handleOutworkSave(item.id!);
															if (e.key === 'Escape') handleOutworkCancel();
														}}
														onblur={() => handleOutworkSave(item.id!)}
														class="border-0 text-right text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
													<p class="text-xs text-gray-500 italic">Only input nett price</p>
												</div>
											{:else}
												<button
													onclick={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
													class="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer w-full text-right"
													title="Click to edit nett price (selling price includes markup)"
												>
													{formatCurrency(item.outwork_charge_nett || 0)}
												</button>
											{/if}
										{:else}
											<span class="text-gray-400 text-xs">-</span>
										{/if}
									</Table.Cell>

									<!-- Betterment Icon -->
									<Table.Cell class="px-2 py-2 text-center">
										<button
											onclick={() => handleBettermentClick(item)}
											class="p-1.5 rounded-md transition-all {item.betterment_total && item.betterment_total > 0
												? 'bg-orange-100 hover:bg-orange-200 border border-orange-300 shadow-sm'
												: 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}"
											title="Set betterment percentages"
										>
											{#if item.betterment_total && item.betterment_total > 0}
												<Percent class="h-4 w-4 text-orange-700 font-bold" />
											{:else}
												<Percent class="h-4 w-4 text-gray-400" />
											{/if}
										</button>
									</Table.Cell>

									<!-- Total -->
									<Table.Cell class="text-right px-3 py-2 font-bold">
										{formatCurrency(item.total)}
									</Table.Cell>

									<!-- Actions -->
									<Table.Cell class="text-center px-2 py-2">
										<Button
											variant="ghost"
											size="sm"
											onclick={() => removeLocalLines([item.id!])}
											class="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card>

		<!-- Totals Summary -->
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Totals Breakdown</h3>

			{#if categoryTotals()}
			{@const totals = categoryTotals()}
				<div class="space-y-2">
					<!-- Category Totals -->
					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">Parts Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.partsTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">Markup Total</span>
						<span class="text-sm font-medium text-green-600">{formatCurrency(totals?.markupTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">S&A Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.saTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">Labour Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.labourTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-gray-600">Paint Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.paintTotal || 0)}</span>
					</div>

					<div class="flex items-center justify-between py-2 border-b">
						<span class="text-sm text-gray-600">Outwork Total</span>
						<span class="text-sm font-medium">{formatCurrency(totals?.outworkTotal || 0)}</span>
					</div>

					<!-- Betterment Deduction (NEW) -->
					{#if totals?.bettermentTotal && totals.bettermentTotal > 0}
						<div class="flex items-center justify-between py-2 border-t border-gray-200">
							<span class="text-sm font-medium text-gray-900">Betterment Deduction</span>
							<span class="text-sm font-bold text-red-600">
								-{formatCurrency(totals.bettermentTotal)}
							</span>
						</div>
					{/if}

					<!-- Subtotal -->
                <div class="flex items-center justify-between py-2 border-b-2">
                    <span class="text-base font-semibold text-gray-700">Subtotal (Ex VAT)</span>
                    <span class="text-lg font-semibold">{formatCurrency(totals?.subtotalExVat || 0)}</span>
                </div>

                <div class="flex items-center justify-between py-2 border-b-2">
					<span class="text-base font-semibold text-gray-700">Sundries ({Math.round(((totals?.sundriesPct ?? 1) * 100)) / 100}%)</span>
					<span class="text-lg font-semibold">{formatCurrency(totals?.sundriesAmount || 0)}</span>
                </div>

					<!-- VAT -->
					<div class="flex items-center justify-between py-2 border-b-2">
                        <span class="text-base font-semibold text-gray-700">VAT ({totals?.vatPercentage ?? 0}%)</span>
                        <span class="text-lg font-semibold">{formatCurrency(totals?.vatAmount || 0)}</span>
					</div>

					<!-- Excess Amount (if applicable) -->
					{#if totals?.excessAmount && totals.excessAmount > 0}
						<div class="flex items-center justify-between py-2 border-b-2">
							<span class="text-base font-semibold text-orange-700">Less: Excess</span>
							<span class="text-lg font-semibold text-orange-600">-{formatCurrency(totals.excessAmount)}</span>
						</div>
					{/if}

					<!-- Total with Color Coding -->
					{#if thresholdResult()}
						{@const threshold = thresholdResult()!}
						{@const colorClasses = getThresholdColorClasses(threshold.color)}
						<div class="pt-3 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-lg font-bold text-gray-900">Total (Inc VAT)</span>
								<span
									class="text-2xl font-bold {threshold.color === 'red'
										? 'text-red-600'
										: threshold.color === 'orange'
											? 'text-orange-600'
											: threshold.color === 'yellow'
												? 'text-yellow-600'
												: threshold.color === 'green'
													? 'text-green-600'
													: 'text-blue-600'}"
								>
									{formatCurrency(totals?.totalIncVat || 0)}
								</span>
							</div>

							<!-- Threshold Warning/Info -->
							{#if threshold.message}
								<div
									class="rounded-md border-2 p-3 {colorClasses.bg} {colorClasses.border}"
								>
									<div class="flex items-start gap-2">
										{#if threshold.showWarning}
											<CircleAlert class="mt-0.5 h-5 w-5 flex-shrink-0 {colorClasses.text}" />
										{:else}
											<Info class="mt-0.5 h-5 w-5 flex-shrink-0 {colorClasses.text}" />
										{/if}
										<div class="flex-1">
											<p class="text-sm font-medium {colorClasses.text}">
												{threshold.message}
											</p>
											{#if vehicleValues?.borderline_writeoff_retail}
												<p class="mt-1 text-xs {colorClasses.text}">
													Retail Borderline: {formatCurrency(
														vehicleValues.borderline_writeoff_retail
													)}
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<!-- Fallback if no threshold data -->
						<div class="flex items-center justify-between pt-3">
							<span class="text-lg font-bold text-gray-900">Total (Inc VAT)</span>
							<span class="text-2xl font-bold text-blue-600">{formatCurrency(totals?.totalIncVat || 0)}</span>
						</div>
					{/if}

					<!-- Net Payable (after excess deduction) -->
					{#if totals?.excessAmount && totals.excessAmount > 0}
						<div class="flex items-center justify-between pt-3 mt-2 border-t-2 border-green-200">
							<span class="text-lg font-bold text-green-800">Net Amount Payable</span>
							<span class="text-2xl font-bold text-green-600">{formatCurrency(totals.netPayable)}</span>
						</div>
						<p class="text-xs text-gray-500 mt-1">After excess deduction of {formatCurrency(totals.excessAmount)}</p>
					{/if}
				</div>
			{/if}
		</Card>

		<!-- Assessment Result Selector -->
		<AssessmentResultSelector
			assessmentResult={localEstimate ? localEstimate.assessment_result : estimate.assessment_result}
			onUpdate={handleUpdateAssessmentResult}
			disabled={!localEstimate || localLineItems().length === 0}
		/>

		<!-- Incident Photos -->
		<EstimatePhotosPanel
			estimateId={estimate.id}
			{assessmentId}
			photos={estimatePhotos}
			onUpdate={onPhotosUpdate}
		/>

		<!-- Actions -->
		<div class="flex justify-between">
			<Button variant="outline" onclick={() => {}}>Save Progress</Button>
			<Button onclick={onComplete} disabled={!isComplete}>
				<Check class="mr-2 h-4 w-4" />
				Complete Estimate
			</Button>
		</div>
		{/if}
	</div>
	{#if recalculating || saving}
		<div class="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
			<div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-white shadow border">
				<RefreshCw class="h-6 w-6 animate-spin text-blue-600" />
				<span class="text-sm font-medium text-gray-700">{saving ? 'Saving…' : 'Recalculating…'}</span>
			</div>
		</div>
	{/if}
</div>

<!-- Betterment Modal -->
<BettermentModal
	open={showBettermentModal}
	item={bettermentItem}
	onClose={() => {
		showBettermentModal = false;
		bettermentItem = null;
	}}
	onSave={handleBettermentSave}
/>

<!-- Parts List Text Modal -->
<Dialog.Root bind:open={showPartsListModal}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Parts Order Request</Dialog.Title>
			<Dialog.Description>
				Copy the text below and paste it into your email to suppliers.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Text Display Area -->
			<div class="relative">
				<pre class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">{partsListText}</pre>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={() => showPartsListModal = false}>
					Close
				</Button>
				<Button onclick={handleCopyPartsListText}>
					Copy to Clipboard
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
