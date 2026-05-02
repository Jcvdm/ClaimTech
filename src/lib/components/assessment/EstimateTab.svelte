<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	// B1: Using native <textarea> for description cells (bind:ref + typed events; Textarea shadcn lacks bind:ref)
	import * as Table from '$lib/components/ui/table';
	import RatesAndRepairerConfiguration from './RatesAndRepairerConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import EstimatePhotosPanel from './EstimatePhotosPanel.svelte';
	import AssessmentResultSelector from './AssessmentResultSelector.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import BettermentModal from './BettermentModal.svelte';
	import CostCell from './CostCell.svelte';
	import LineItemCard from './LineItemCard.svelte';
	import {
		Plus,
		Trash2,
		Check,
		CircleAlert,
		CircleCheck,
		CircleX,
		Info,
		Percent,
		ShieldCheck,
		Package,
		Recycle,
		RefreshCw,
		Camera,
		Settings
	} from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import type {
		Estimate,
		EstimateLineItem,
		EstimatePhoto,
		VehicleValues,
		VehicleIdentification,
		AssessmentResultType,
		ProcessType,
		PartType
	} from '$lib/types/assessment';
	import type { VehicleDetails } from '$lib/utils/report-data-helpers';
	import type { Repairer } from '$lib/types/repairer';
	import {
		getProcessTypeOptions,
		getProcessTypeConfig,
		getProcessTypeBadgeColor
	} from '$lib/constants/processTypes';
	import {
		createEmptyLineItem,
		calculateLineItemTotal,
		calculateBetterment,
		computeCategoryTotals
	} from '$lib/utils/estimateCalculations';
	import TotalsBreakdownDialog, { type BreakdownRow } from '$lib/components/assessment/TotalsBreakdownDialog.svelte';
	import TotalsStrip, { type StripField } from '$lib/components/assessment/TotalsStrip.svelte';
	import EstimateStickyTotals from './EstimateStickyTotals.svelte';
	import {
		calculateEstimateThreshold,
		getThresholdColorClasses,
		formatWarrantyStatus,
		getWarrantyStatusClasses
	} from '$lib/utils/estimateThresholds';
	import { formatCurrency, formatCurrencyValue, formatDate, parseLocaleNumber } from '$lib/utils/formatters';
	import { validateEstimate, type TabValidation } from '$lib/utils/validation';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';
	import { generatePartsListText } from '$lib/utils/csv-generator';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog';
	import { SaveIndicator } from '$lib/components/ui/save-indicator';

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
		onUpdateLineItem: (
			itemId: string,
			data: Partial<EstimateLineItem>
		) => Promise<EstimateLineItem>;
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
		try {
			return structuredClone(obj);
		} catch {
			return JSON.parse(JSON.stringify(obj));
		}
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
	let saveInFlight = $state(false); // Track when save is happening to prevent race conditions
	let recalculating = $state(false);
	let justSaved = $state(false);
	let justSavedTimeout: number | null = null;
	let quickAddOpen = $state(false);
	let ratesOpen = $state(false);
	let totalsDetailsOpen = $state(false);

	// Parts list modal state
	let showPartsListModal = $state(false);
	let partsListText = $state('');

	$effect(() => {
		// When parent estimate changes and we are not dirty and not saving, resync local buffer
		// This prevents race conditions where a save is in-flight and parent data updates prematurely
		if (!dirty && !saveInFlight) {
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

	function markDirty() {
		dirty = true;
	}

	// Timeout handle for debounced saves
	let saveTimeout: number | null = null;

	// Schedule a debounced save (1 second delay)
	function scheduleSave() {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
		saveTimeout = window.setTimeout(() => {
			saveNow();
		}, 1000);
	}

	// Save immediately (for tab changes, component unmount)
	async function saveNow() {
		console.log('[EstimateTab] saveNow called', { dirty, hasLocalEstimate: !!localEstimate });
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}
		await saveAll();
	}

	async function saveAll() {
		console.log('[EstimateTab] saveAll called', {
			hasLocalEstimate: !!localEstimate,
			dirty,
			lineItemCount: localEstimate?.line_items?.length ?? 0
		});

		if (!localEstimate) {
			console.warn('[EstimateTab] saveAll skipped - no local estimate');
			return;
		}

		if (!dirty) {
			console.log('[EstimateTab] saveAll skipped - no changes');
			return;
		}

		saveInFlight = true;
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
			justSaved = true;
			if (justSavedTimeout) clearTimeout(justSavedTimeout);
			justSavedTimeout = window.setTimeout(() => {
				justSaved = false;
				justSavedTimeout = null;
			}, 2000);
			console.log('[EstimateTab] Save successful');
		} catch (error) {
			console.error('[EstimateTab] Save failed:', error);
			throw error;
		} finally {
			saving = false;
			saveInFlight = false;
		}
	}

	// Register save function with parent on mount
	// Using onMount instead of $effect to avoid closure issues with stale state
	onMount(() => {
		const stableSave = async () => {
			console.log('[EstimateTab] stableSave called via parent');
			await saveNow();
		};
		if (props.onRegisterSave) {
			console.log('[EstimateTab] Registering save function with parent');
			props.onRegisterSave(stableSave);
		}
	});

	function discardAll() {
		// Clear any pending save timeout
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}
		localEstimate = estimate ? deepClone(estimate) : null;
		dirty = false;
	}

	// Convenience getter for local line items
	// Filter out any items without IDs as a defensive fallback
	const localLineItems = $derived.by(() => {
		if (!localEstimate) return [];
		const items = localEstimate.line_items ?? [];
		// Belt-and-braces: filter out any items that somehow don't have IDs
		return items.filter((item) => item && item.id);
	});

	function updateLocalItem(itemId: string, patch: Partial<EstimateLineItem>) {
		if (!localEstimate) return;
		const idx = localEstimate.line_items.findIndex((i) => i.id === itemId);
		if (idx === -1) return;
		localEstimate.line_items[idx] = {
			...localEstimate.line_items[idx],
			...patch
		} as EstimateLineItem;
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
		li.total = calculateLineItemTotal(li, localEstimate.labour_rate, localEstimate.paint_rate);

		localEstimate.line_items = [...localEstimate.line_items, li];
		// Mark dirty - auto-save happens on tab change or explicit save
		// This enables rapid line item entry without waiting for each save
		markDirty();
		scheduleSave(); // Queue debounced save as backup
		console.log('[EstimateTab] Line item added, save scheduled', { id: li.id });
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

			const noteText =
				bettermentDetails.length > 0
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
		const partsOnly = localLineItems.filter((item) => item.process_type === 'N');

		if (partsOnly.length === 0) {
			console.warn('No parts to export');
			return;
		}

		// Prepare vehicle details from normalized vehicleDetails
		const csvVehicleDetails = vehicleDetails
			? {
					vin_number: vehicleDetails.vin,
					vehicle_year: vehicleDetails.year,
					vehicle_make: vehicleDetails.make,
					vehicle_model: vehicleDetails.model
				}
			: undefined;

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

	// ---------- Skeleton row state (Phase 8e) ----------
	let skeletonProcessType = $state<ProcessType>('N');
	let skeletonPartType = $state<PartType>('OEM');
	let skeletonDescription = $state('');
	let skeletonPartPriceNett = $state<number | null>(null);
	let skeletonSAHours = $state<number | null>(null);
	let skeletonLabourHours = $state<number | null>(null);
	let skeletonPaintPanels = $state<number | null>(null);
	let skeletonOutworkNett = $state<number | null>(null);

	// Captures the pre-edit value of whichever cost cell currently holds focus.
	// Used to support Escape→revert (cell restores this value, then blurs).
	let originalCostValue = $state('');

	// Ref to description input for focus management
	let skeletonDescInput = $state<HTMLTextAreaElement | null>(null); // B1: Textarea ref
	let skeletonDescInputMobile = $state<HTMLInputElement | null>(null);
	let skeletonMobileHint = $state('');

	function resetSkeleton() {
		skeletonProcessType = 'N';
		skeletonPartType = 'OEM';
		skeletonDescription = '';
		skeletonPartPriceNett = null;
		skeletonSAHours = null;
		skeletonLabourHours = null;
		skeletonPaintPanels = null;
		skeletonOutworkNett = null;
	}

	function skeletonHasContent(): boolean {
		return (
			skeletonDescription.trim() !== '' ||
			skeletonPartPriceNett != null ||
			skeletonSAHours != null ||
			skeletonLabourHours != null ||
			skeletonPaintPanels != null ||
			skeletonOutworkNett != null
		);
	}

	function commitSkeleton(opts: { refocus?: boolean; mobile?: boolean } = {}) {
		if (!skeletonHasContent()) {
			if (opts.mobile) {
				skeletonMobileHint = 'Enter a description first';
			}
			return;
		}
		if (!localEstimate) return;

		const newItem = createEmptyLineItem(skeletonProcessType) as EstimateLineItem;
		newItem.description = skeletonDescription.trim();
		if (skeletonProcessType === 'N') {
			newItem.part_type = skeletonPartType;
		}

		if (skeletonPartPriceNett != null) {
			newItem.part_price_nett = skeletonPartPriceNett;
			// Calculate selling price with markup based on part type
			let markupPercentage = 0;
			const partType = skeletonProcessType === 'N' ? skeletonPartType : null;
			if (partType === 'OEM') markupPercentage = localEstimate.oem_markup_percentage;
			else if (partType === 'ALT') markupPercentage = localEstimate.alt_markup_percentage;
			else if (partType === '2ND') markupPercentage = localEstimate.second_hand_markup_percentage;
			newItem.part_price = Number(
				(skeletonPartPriceNett * (1 + markupPercentage / 100)).toFixed(2)
			);
		}
		if (skeletonSAHours != null) {
			newItem.strip_assemble_hours = skeletonSAHours;
			newItem.strip_assemble = skeletonSAHours * localEstimate.labour_rate;
		}
		if (skeletonLabourHours != null) {
			newItem.labour_hours = skeletonLabourHours;
			newItem.labour_cost = skeletonLabourHours * localEstimate.labour_rate;
		}
		if (skeletonPaintPanels != null) {
			newItem.paint_panels = skeletonPaintPanels;
			newItem.paint_cost = skeletonPaintPanels * localEstimate.paint_rate;
		}
		if (skeletonOutworkNett != null) {
			newItem.outwork_charge_nett = skeletonOutworkNett;
			newItem.outwork_charge = Number(
				(skeletonOutworkNett * (1 + localEstimate.outwork_markup_percentage / 100)).toFixed(2)
			);
		}

		addLocalLine(newItem);
		resetSkeleton();
		skeletonMobileHint = '';

		if (opts.refocus) {
			// Return focus to description input on next tick so user can keep typing
			setTimeout(() => {
				if (opts.mobile) {
					skeletonDescInputMobile?.focus();
				} else {
					skeletonDescInput?.focus();
				}
			}, 0);
		}
	}

	function handleSkeletonDescriptionBlur() {
		// Commit only when there's actual content
		if (skeletonDescription.trim() !== '' || skeletonHasContent()) {
			commitSkeleton({ refocus: true });
		}
	}

	async function handleUpdateLineItem(itemId: string, field: keyof EstimateLineItem, value: any) {
		updateLocalItem(itemId, { [field]: value } as Partial<EstimateLineItem>);
		scheduleSave(); // Debounced save instead of immediate
	}

	// Multi-select handlers

	// Local buffer: immediate local update, no network
	function scheduleUpdate(id: string, field: keyof EstimateLineItem, value: any) {
		handleUpdateLineItem(id, field, value);
	}
	async function flushUpdate(id: string, field: keyof EstimateLineItem, value: any) {
		handleUpdateLineItem(id, field, value);
		await saveNow(); // A1: actually flush — clears debounce timer and awaits saveAll
	}

	function handleToggleSelect(itemId: string) {
		if (selectedItems.has(itemId)) {
			selectedItems.delete(itemId);
		} else {
			selectedItems.add(itemId);
		}
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = selectedItems.size === localLineItems.length;
	}

	function handleSelectAll() {
		if (selectAll) {
			selectedItems.clear();
		} else {
			localLineItems.forEach((item: any) => {
				if (item.id) selectedItems.add(item.id);
			});
		}
		selectedItems = new Set(selectedItems); // Trigger reactivity
		selectAll = !selectAll;
	}

	async function handleBulkDelete() {
		if (!confirm(`Delete ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}?`))
			return;
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

	async function handleSASave(itemId: string) {
		if (tempSAHours !== null) {
			const valueToSave = tempSAHours;
			editingSA = null;
			tempSAHours = null;
			commitSA(itemId, valueToSave);
		}
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

	async function handleLabourSave(itemId: string) {
		if (tempLabourHours !== null) {
			const valueToSave = tempLabourHours;
			editingLabour = null;
			tempLabourHours = null;
			commitLabour(itemId, valueToSave);
		}
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

	async function handlePaintSave(itemId: string) {
		if (tempPaintPanels !== null) {
			const valueToSave = tempPaintPanels;
			editingPaint = null;
			tempPaintPanels = null;
			commitPaint(itemId, valueToSave);
		}
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

	async function handlePartPriceSave(itemId: string, _item: EstimateLineItem) {
		if (tempPartPriceNett !== null) {
			const valueToSave = tempPartPriceNett;
			editingPartPrice = null;
			tempPartPriceNett = null;
			commitPartPrice(itemId, valueToSave);
		}
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

	async function handleOutworkSave(itemId: string) {
		if (tempOutworkNett !== null) {
			const valueToSave = tempOutworkNett;
			editingOutwork = null;
			tempOutworkNett = null;
			commitOutwork(itemId, valueToSave);
		}
	}

	function handleOutworkCancel() {
		editingOutwork = null;
		tempOutworkNett = null;
	}

	// ---- Always-edit commit functions (replace click-to-edit save handlers for desktop table) ----

	function commitPartPrice(itemId: string, value: number | null) {
		if (!localEstimate) return;
		const item = localEstimate.line_items.find((i) => i.id === itemId);
		if (!item) return;
		const newNett = value ?? 0;
		if ((item.part_price_nett ?? 0) === newNett) return; // unchanged → no-op
		let markupPercentage = 0;
		if (item.part_type === 'OEM') markupPercentage = localEstimate.oem_markup_percentage;
		else if (item.part_type === 'ALT') markupPercentage = localEstimate.alt_markup_percentage;
		else if (item.part_type === '2ND') markupPercentage = localEstimate.second_hand_markup_percentage;
		const newSelling = Number((newNett * (1 + markupPercentage / 100)).toFixed(2));
		updateLocalItem(itemId, { part_price_nett: newNett, part_price: newSelling });
		scheduleSave();
	}

	function commitSA(itemId: string, hours: number | null) {
		if (!localEstimate) return;
		const item = localEstimate.line_items.find((i) => i.id === itemId);
		if (!item) return;
		const newHours = hours ?? 0;
		if ((item.strip_assemble_hours ?? 0) === newHours) return; // unchanged → no-op
		const saCost = newHours * localEstimate.labour_rate;
		updateLocalItem(itemId, { strip_assemble_hours: newHours, strip_assemble: saCost });
		scheduleSave();
	}

	function commitLabour(itemId: string, hours: number | null) {
		if (!localEstimate) return;
		const item = localEstimate.line_items.find((i) => i.id === itemId);
		if (!item) return;
		const newHours = hours ?? 0;
		if ((item.labour_hours ?? 0) === newHours) return; // unchanged → no-op
		const labourCost = newHours * localEstimate.labour_rate;
		updateLocalItem(itemId, { labour_hours: newHours, labour_cost: labourCost });
		scheduleSave();
	}

	function commitPaint(itemId: string, panels: number | null) {
		if (!localEstimate) return;
		const item = localEstimate.line_items.find((i) => i.id === itemId);
		if (!item) return;
		const newPanels = panels ?? 0;
		if ((item.paint_panels ?? 0) === newPanels) return; // unchanged → no-op
		const paintCost = newPanels * localEstimate.paint_rate;
		updateLocalItem(itemId, { paint_panels: newPanels, paint_cost: paintCost });
		scheduleSave();
	}

	function commitOutwork(itemId: string, nett: number | null) {
		if (!localEstimate) return;
		const item = localEstimate.line_items.find((i) => i.id === itemId);
		if (!item) return;
		const newNett = nett ?? 0;
		if ((item.outwork_charge_nett ?? 0) === newNett) return; // unchanged → no-op
		const markupPercentage = localEstimate.outwork_markup_percentage;
		const sellingPrice = Number((newNett * (1 + markupPercentage / 100)).toFixed(2));
		updateLocalItem(itemId, { outwork_charge_nett: newNett, outwork_charge: sellingPrice });
		scheduleSave();
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
		saveAssessmentResult(result); // Dedicated save without overlay
	}

	// Calculate category totals (nett for parts/outwork; show aggregate markup separately)
	// Now includes betterment deduction
	const categoryTotals = $derived(() => {
		if (!estimate) return null;
		const percentSource = localEstimate ?? estimate;
		return computeCategoryTotals(
			localLineItems,
			{
				labour_rate: percentSource.labour_rate ?? 0,
				paint_rate: percentSource.paint_rate ?? 0,
				oem_markup_percentage: percentSource.oem_markup_percentage ?? 0,
				alt_markup_percentage: percentSource.alt_markup_percentage ?? 0,
				second_hand_markup_percentage: percentSource.second_hand_markup_percentage ?? 0,
				outwork_markup_percentage: percentSource.outwork_markup_percentage ?? 0,
				vat_percentage: percentSource.vat_percentage ?? 0,
				sundries_percentage: percentSource.sundries_percentage ?? 1
			},
			{
				includeBetterment: true,
				excessAmount: excessAmount ?? 0
			}
		);
	});

	// Build breakdown rows for <TotalsBreakdownDialog>
	const breakdownRows = $derived.by((): BreakdownRow[] => {
		const totals = categoryTotals();
		if (!totals) return [];
		const rows: BreakdownRow[] = [
			{ label: 'Parts Total', value: totals.partsTotal, border: 'bottom' },
			{ label: 'Parts Markup', value: totals.partsMarkup, color: 'success', border: 'bottom' },
			{ label: 'S&A Total', value: totals.saTotal, border: 'bottom' },
			{ label: 'Labour Total', value: totals.labourTotal, border: 'bottom' },
			{ label: 'Paint Total', value: totals.paintTotal, border: 'bottom' },
			{ label: 'Outwork Total', value: totals.outworkTotal, border: 'bottom' },
			{ label: 'Outwork Markup', value: totals.outworkMarkup, color: 'success', border: 'bottom' }
		];
		if (totals.bettermentTotal && totals.bettermentTotal > 0) {
			rows.push({
				label: 'Betterment Deduction',
				value: `-${formatCurrency(totals.bettermentTotal)}`,
				color: 'destructive',
				emphasis: 'bold',
				border: 'top'
			});
		}
		rows.push({ label: 'Subtotal (Ex VAT)', value: totals.subtotalExVat, emphasis: 'subtotal' });
		rows.push({
			label: `Sundries (${Math.round((totals.sundriesPct ?? 1) * 100) / 100}%)`,
			value: totals.sundriesAmount,
			emphasis: 'subtotal'
		});
		rows.push({
			label: `VAT (${totals.vatPercentage ?? 0}%)`,
			value: totals.vatAmount,
			emphasis: 'subtotal'
		});
		if (totals.excessAmount && totals.excessAmount > 0) {
			rows.push({
				label: 'Less: Excess',
				value: `-${formatCurrency(totals.excessAmount)}`,
				color: 'warning',
				emphasis: 'subtotal'
			});
		}
		// Map threshold color to BreakdownRow color token
		const threshold = thresholdResult();
		let totalIncColor: BreakdownRow['color'] = 'default';
		if (threshold) {
			totalIncColor =
				threshold.color === 'red'
					? 'destructive'
					: threshold.color === 'orange' || threshold.color === 'yellow'
						? 'warning'
						: 'success';
		}
		rows.push({
			label: 'Total (Inc VAT)',
			value: totals.totalIncVat,
			emphasis: 'total',
			color: totalIncColor
		});
		if (totals.excessAmount && totals.excessAmount > 0) {
			rows.push({
				label: 'Net Amount Payable',
				value: totals.netPayable,
				color: 'success',
				emphasis: 'total'
			});
		}
		return rows;
	});

	const stripFields = $derived.by((): StripField[] => {
		const totals = categoryTotals();
		if (!totals) return [];
		return [
			{ label: 'Parts', value: totals.partsTotal },
			{ label: 'Markup', value: totals.markupTotal },
			{ label: 'S&A', value: totals.saTotal },
			{ label: 'Labour', value: totals.labourTotal },
			{ label: 'Paint', value: totals.paintTotal },
			{ label: 'Outwork', value: totals.outworkTotal },
			{ label: 'VAT', value: totals.vatAmount }
		];
	});

	// Check if estimate is complete
	const isComplete = $derived(() => {
		const totals = categoryTotals();
		return estimate !== null && localLineItems.length > 0 && !!totals && totals.totalIncVat > 0;
	});

	// Calculate threshold for estimate total vs retail borderline
	const thresholdResult = $derived(() => {
		if (!estimate || !vehicleValues) return null;
		return calculateEstimateThreshold(estimate.total, vehicleValues.borderline_writeoff_retail);
	});

	// Threshold color class for the bottom sticky strip Total
	const thresholdColorClass = $derived.by(() => {
		const threshold = thresholdResult();
		if (!threshold) return 'text-blue-600';
		return threshold.color === 'red'
			? 'text-red-600'
			: threshold.color === 'orange'
				? 'text-orange-600'
				: threshold.color === 'yellow'
					? 'text-yellow-600'
					: threshold.color === 'green'
						? 'text-green-600'
						: 'text-blue-600';
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
		// A2: flush any pending line-item edits first so rate change applies on a clean baseline
		await saveNow();
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
		saveRepairer(repairerId); // Immediate save, no overlay
	}

	// Cleanup on component destroy
	onDestroy(() => {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
		if (justSavedTimeout) {
			clearTimeout(justSavedTimeout);
			justSavedTimeout = null;
		}
	});
</script>

<div class="relative" aria-busy={recalculating || saving}>
	<div class={recalculating ? 'pointer-events-none space-y-6 blur-sm' : 'space-y-6'}>
		<!-- Warning Banner -->

		<RequiredFieldsWarning missingFields={validation.missingFields} />
		{#if !estimate}
			<Card class="border-2 border-dashed border-gray-300 p-6">
				<p class="text-center text-gray-600">Loading estimate...</p>
			</Card>
		{:else}
			<!-- MOBILE: sticky totals card (Phase 3) -->
			<div class="sticky top-0 z-10 -mx-2 mb-3 sm:-mx-3 md:hidden">
				<EstimateStickyTotals
					totalIncVat={categoryTotals()?.totalIncVat ?? 0}
					thresholdPct={thresholdResult()?.pct ?? null}
					thresholdColor={thresholdColorClass}
					partsTotal={categoryTotals()?.partsTotal ?? 0}
					labourTotal={categoryTotals()?.labourTotal ?? 0}
					paintTotal={categoryTotals()?.paintTotal ?? 0}
					vatAmount={categoryTotals()?.vatAmount ?? 0}
					tone="light"
				/>
			</div>

			<!-- Warranty Status Hint -->
			{#if vehicleValues && warrantyInfo()}
				{@const warranty = warrantyInfo()!}
				{@const statusClasses = getWarrantyStatusClasses(warranty.color)}

				<!-- MOBILE compact warranty pill -->
				<div class="md:hidden mb-3 flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs {statusClasses.bg} {statusClasses.border}">
					{#if warranty.icon === 'check'}
						<CircleCheck class="h-3.5 w-3.5 shrink-0 {statusClasses.text}" />
					{:else if warranty.icon === 'x'}
						<CircleX class="h-3.5 w-3.5 shrink-0 {statusClasses.text}" />
					{:else if warranty.icon === 'info'}
						<Info class="h-3.5 w-3.5 shrink-0 {statusClasses.text}" />
					{:else}
						<CircleAlert class="h-3.5 w-3.5 shrink-0 {statusClasses.text}" />
					{/if}
					<span class="font-semibold {statusClasses.text}">{warranty.label}</span>
					{#if vehicleValues.warranty_expiry_mileage && vehicleValues.warranty_expiry_mileage !== 'unlimited'}
						<span class="opacity-70 {statusClasses.text}">
							· {parseInt(vehicleValues.warranty_expiry_mileage).toLocaleString()} km limit
						</span>
					{/if}
				</div>

				<!-- DESKTOP full warranty card -->
				<Card class="hidden md:block p-4 {statusClasses.bg} border {statusClasses.border}">
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
									Valid from {formatDate(vehicleValues.warranty_start_date)} to {formatDate(
										vehicleValues.warranty_end_date
									)}
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

			<!-- Rates & Repairer Configuration Dialog -->
			<ResponsiveDialog.Root bind:open={ratesOpen}>
				<ResponsiveDialog.Content class="sm:max-w-3xl">
					<ResponsiveDialog.Header>
						<ResponsiveDialog.Title>Rates & Repairer Configuration</ResponsiveDialog.Title>
						<ResponsiveDialog.Description>
							Update the repairer, labour, paint, VAT, and markup rates used by this estimate.
						</ResponsiveDialog.Description>
					</ResponsiveDialog.Header>
					<RatesAndRepairerConfiguration
						repairerId={localEstimate ? localEstimate.repairer_id : estimate.repairer_id}
						{repairers}
						labourRate={localEstimate ? localEstimate.labour_rate : estimate.labour_rate}
						paintRate={localEstimate ? localEstimate.paint_rate : estimate.paint_rate}
						vatPercentage={localEstimate ? localEstimate.vat_percentage : estimate.vat_percentage}
						oemMarkup={localEstimate
							? localEstimate.oem_markup_percentage
							: estimate.oem_markup_percentage}
						altMarkup={localEstimate
							? localEstimate.alt_markup_percentage
							: estimate.alt_markup_percentage}
						secondHandMarkup={localEstimate
							? localEstimate.second_hand_markup_percentage
							: estimate.second_hand_markup_percentage}
						outworkMarkup={localEstimate
							? localEstimate.outwork_markup_percentage
							: estimate.outwork_markup_percentage}
						onUpdateRates={handleLocalUpdateRates}
						onUpdateRepairer={handleLocalUpdateRepairer}
						{onRepairersUpdate}
						disabled={saving || recalculating}
						embedded={true}
					/>
				</ResponsiveDialog.Content>
			</ResponsiveDialog.Root>

			<!-- Quick Add Dialog -->
			<ResponsiveDialog.Root bind:open={quickAddOpen}>
				<ResponsiveDialog.Content class="sm:max-w-2xl">
					<ResponsiveDialog.Header>
						<ResponsiveDialog.Title>Add line item</ResponsiveDialog.Title>
					</ResponsiveDialog.Header>
					<QuickAddLineItem
						labourRate={localEstimate ? localEstimate.labour_rate : estimate.labour_rate}
						paintRate={localEstimate ? localEstimate.paint_rate : estimate.paint_rate}
						oemMarkup={localEstimate
							? localEstimate.oem_markup_percentage
							: estimate.oem_markup_percentage}
						altMarkup={localEstimate
							? localEstimate.alt_markup_percentage
							: estimate.alt_markup_percentage}
						secondHandMarkup={localEstimate
							? localEstimate.second_hand_markup_percentage
							: estimate.second_hand_markup_percentage}
						outworkMarkup={localEstimate
							? localEstimate.outwork_markup_percentage
							: estimate.outwork_markup_percentage}
						onAddLineItem={(item) => {
							addLocalLine(item);
							quickAddOpen = false;
						}}
						enablePhotos={true}
						{assessmentId}
						parentId={estimate.id}
						photoCategory="estimate"
						onPhotosUploaded={onPhotosUpdate}
					/>
				</ResponsiveDialog.Content>
			</ResponsiveDialog.Root>

			<!-- Line Items Section (full-width, single-column) -->
			<Card class="p-0">
					<!-- Header - Responsive -->
					<div class="px-3 sm:px-4 py-3 border-b border-border mb-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<h3 class="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
							Line Items
							<span class="font-mono-tabular ml-2 text-xs text-muted-foreground"
								>({localLineItems.length})</span
							>
							{#if dirty}
								<span
									class="ml-2 inline-flex items-center rounded-full border border-warning-border bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning"
								>
									Unsaved
								</span>
							{/if}
							<SaveIndicator {saving} saved={justSaved} class="ml-2" />
						</h3>
						<div class="flex flex-wrap gap-2">
							{#if dirty}
								<Button onclick={saveAll} size="sm" disabled={saving} class="flex-1 sm:flex-none">
									{saving ? 'Saving…' : 'Save'}
								</Button>
								<Button
									onclick={discardAll}
									size="sm"
									variant="outline"
									disabled={saving}
									class="flex-1 sm:flex-none"
								>
									Discard
								</Button>
							{/if}
							<Button
								onclick={() => (ratesOpen = true)}
								size="sm"
								variant="outline"
								title="Rates & repairer"
								aria-label="Rates & repairer"
							>
								<Settings class="h-4 w-4 sm:mr-1.5" />
								<span class="hidden sm:inline">Rates</span>
							</Button>
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
									<Trash2 class="h-4 w-4 sm:mr-2" />
									<span class="hidden sm:inline">Delete ({selectedItems.size})</span>
								</Button>
							{/if}
							<Button
								onclick={() => (quickAddOpen = true)}
								size="sm"
								variant="ghost"
								title="Add line with photos"
								aria-label="Add line with photos"
							>
								<Camera class="h-4 w-4 sm:mr-1.5" />
								<span>Add line</span>
							</Button>
						</div>
					</div>

					<!-- Mobile: Card Layout -->
					<div class="space-y-3 md:hidden p-3">
						{#each localLineItems as item (item.id)}
							<LineItemCard
								{item}
								labourRate={localEstimate?.labour_rate ?? estimate?.labour_rate ?? 0}
								paintRate={localEstimate?.paint_rate ?? estimate?.paint_rate ?? 0}
								selected={selectedItems.has(item.id!)}
								onToggleSelect={() => handleToggleSelect(item.id!)}
								onUpdateDescription={(value) =>
									handleUpdateLineItem(item.id!, 'description', value)}
								onUpdateProcessType={(value) =>
									handleUpdateLineItem(item.id!, 'process_type', value)}
								onUpdatePartType={(value) => handleUpdateLineItem(item.id!, 'part_type', value)}
								onEditPartPrice={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
								onEditSA={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
								onEditLabour={() => handleLabourClick(item.id!, item.labour_hours || null)}
								onEditPaint={() => handlePaintClick(item.id!, item.paint_panels || null)}
								onEditOutwork={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
								onEditBetterment={() => handleBettermentClick(item)}
								onDelete={() => removeLocalLines([item.id!])}
								compact={true}
							/>
						{/each}

						<!-- Skeleton card (Phase 8e) - persistent add card -->
						<div class="space-y-3 rounded-sm border bg-muted/20 p-3">
							<p class="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
								New Line
							</p>
							<div class="grid grid-cols-2 gap-2">
								<label class="block">
									<span class="text-xs text-muted-foreground">Process</span>
									<select
										bind:value={skeletonProcessType}
										class="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm"
										aria-label="New line process type"
									>
										{#each processTypeOptions as option}
											<option value={option.value}>{option.value} - {option.label}</option>
										{/each}
									</select>
								</label>
								{#if skeletonProcessType === 'N'}
									<label class="block">
										<span class="text-xs text-muted-foreground">Part</span>
										<select
											bind:value={skeletonPartType}
											class="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm"
											aria-label="New line part type"
										>
											<option value="OEM">OEM</option>
											<option value="ALT">ALT</option>
											<option value="2ND">2ND</option>
										</select>
									</label>
								{/if}
							</div>
							<Input
								bind:ref={skeletonDescInputMobile}
								type="text"
								placeholder="Description — type to add"
								aria-label="New line description"
								bind:value={skeletonDescription}
								oninput={() => {
									if (skeletonMobileHint) skeletonMobileHint = '';
								}}
							/>
							{#if skeletonMobileHint}
								<p aria-live="polite" class="text-xs text-destructive">{skeletonMobileHint}</p>
							{/if}
							<Button
								onclick={() => commitSkeleton({ refocus: true, mobile: true })}
								size="sm"
								class="w-full"
							>
								Save
							</Button>
						</div>
					</div>

					<!-- Desktop: Table Layout -->
					<div class="hidden md:block">
						<Table.Root class="table-fixed">
							<Table.Header class="sticky top-0 z-10 bg-white">
								<Table.Row class="border-b border-border hover:bg-transparent">
									<Table.Head class="w-[40px] px-2">
										<input
											type="checkbox"
											checked={selectAll}
											onchange={handleSelectAll}
											class="cursor-pointer rounded border-gray-300"
											aria-label="Select all items"
										/>
									</Table.Head>
									<Table.Head
										class="w-[96px] px-2 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
										>Type / Part</Table.Head
									>
									<Table.Head
										class="px-3 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
										>Description</Table.Head
									>
									<Table.Head
										class="w-[440px] px-2 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
										>Costs</Table.Head
									>
									<Table.Head
										class="w-[44px] px-2 text-center text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
										title="Betterment">%</Table.Head
									>
									<Table.Head
										class="w-[112px] px-2 text-right text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase"
										>Total</Table.Head
									>
									<Table.Head class="w-[44px] px-2"></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each localLineItems as item (item.id)}
									<Table.Row class="hover:bg-muted/50">
										<Table.Cell class="px-3 py-2">
											<input
												type="checkbox"
												checked={selectedItems.has(item.id!)}
												onchange={() => handleToggleSelect(item.id!)}
												class="cursor-pointer rounded border-gray-300"
												aria-label="Select item"
											/>
										</Table.Cell>

										<Table.Cell class="px-2 py-2 align-top">
											<div class="flex flex-col gap-1.5">
												<div class="group relative w-fit">
													<select
														value={item.process_type}
														onchange={(e) =>
															handleUpdateLineItem(item.id!, 'process_type', e.currentTarget.value)}
														class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
													>
														{#each processTypeOptions as option}
															<option value={option.value}>{option.value} - {option.label}</option>
														{/each}
													</select>
													<span
														class="inline-flex min-w-8 justify-center rounded px-2 py-1 text-xs font-semibold {getProcessTypeBadgeColor(
															item.process_type
														)}"
													>
														{item.process_type}
													</span>
												</div>

												{#if item.process_type === 'N'}
													<div class="group relative w-fit">
														<select
															value={item.part_type || 'OEM'}
															onchange={(e) =>
																handleUpdateLineItem(item.id!, 'part_type', e.currentTarget.value)}
															class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
														>
															<option value="OEM">OEM</option>
															<option value="ALT">ALT</option>
															<option value="2ND">2ND</option>
														</select>
														<div
															class="pointer-events-none inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold {item.part_type ===
															'ALT'
																? 'border-success-border bg-success-soft text-success'
																: item.part_type === '2ND'
																	? 'border-warning-border bg-warning-soft text-warning'
																	: 'border-border bg-muted text-muted-foreground'}"
														>
															{#if item.part_type === 'ALT'}
																<Package class="h-3 w-3" />
															{:else if item.part_type === '2ND'}
																<Recycle class="h-3 w-3" />
															{:else}
																<ShieldCheck class="h-3 w-3" />
															{/if}
															{item.part_type || 'OEM'}
														</div>
													</div>
												{:else}
													<span class="text-xs text-muted-foreground">No part</span>
												{/if}
											</div>
										</Table.Cell>

										<Table.Cell class="px-3 py-2 align-top">
											<textarea
												placeholder="Description"
												rows={2}
												oninput={(e: Event) =>
													scheduleUpdate(item.id!, 'description', (e.currentTarget as HTMLTextAreaElement).value)}
												onblur={(e: Event) => flushUpdate(item.id!, 'description', (e.currentTarget as HTMLTextAreaElement).value)}
												class="flex w-full rounded-md border-0 bg-background px-0 py-0 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none whitespace-pre-wrap break-words disabled:cursor-not-allowed disabled:opacity-50"
											>{item.description}</textarea>
										</Table.Cell>

										<Table.Cell class="px-2 py-2 align-top">
											<div class="grid grid-cols-[112px_66px_66px_82px_98px] gap-1">
												<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
													<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
														Part
													</div>
													<CostCell
														editing={editingPartPrice === item.id}
														display={formatCurrencyValue(item.part_price_nett ?? 0)}
														inputValue={String(item.part_price_nett ?? '')}
														visible={item.process_type === 'N'}
														onEnterEdit={() => handlePartPriceClick(item.id!, item.part_price_nett ?? null)}
														onCommit={(raw) => { editingPartPrice = null; commitPartPrice(item.id!, parseFloat(raw) || 0); }}
														onCancel={() => handlePartPriceCancel()}
													/>
												</div>
												<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
													<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
														S&A
													</div>
													<CostCell
														editing={editingSA === item.id}
														display={formatCurrencyValue(item.strip_assemble ?? 0)}
														inputValue={String(item.strip_assemble_hours ?? '')}
														visible={['N', 'R', 'P', 'B'].includes(item.process_type)}
														onEnterEdit={() => handleSAClick(item.id!, item.strip_assemble_hours ?? null)}
														onCommit={(raw) => { editingSA = null; commitSA(item.id!, parseFloat(raw) || 0); }}
														onCancel={() => handleSACancel()}
													/>
												</div>
												<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
													<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
														Lab
													</div>
													<CostCell
														editing={editingLabour === item.id}
														display={formatCurrencyValue(item.labour_cost ?? 0)}
														inputValue={String(item.labour_hours ?? '')}
														visible={['N', 'R', 'A'].includes(item.process_type)}
														onEnterEdit={() => handleLabourClick(item.id!, item.labour_hours ?? null)}
														onCommit={(raw) => { editingLabour = null; commitLabour(item.id!, parseFloat(raw) || 0); }}
														onCancel={() => handleLabourCancel()}
													/>
												</div>
												<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
													<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
														Paint
													</div>
													<CostCell
														editing={editingPaint === item.id}
														display={formatCurrencyValue(item.paint_cost ?? 0)}
														inputValue={String(item.paint_panels ?? '')}
														visible={['N', 'R', 'P', 'B'].includes(item.process_type)}
														onEnterEdit={() => handlePaintClick(item.id!, item.paint_panels ?? null)}
														onCommit={(raw) => { editingPaint = null; commitPaint(item.id!, parseFloat(raw) || 0); }}
														onCancel={() => handlePaintCancel()}
													/>
												</div>
												<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
													<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
														Out
													</div>
													<CostCell
														editing={editingOutwork === item.id}
														display={formatCurrencyValue(item.outwork_charge_nett ?? 0)}
														inputValue={String(item.outwork_charge_nett ?? '')}
														visible={item.process_type === 'O'}
														onEnterEdit={() => handleOutworkClick(item.id!, item.outwork_charge_nett ?? null)}
														onCommit={(raw) => { editingOutwork = null; commitOutwork(item.id!, parseFloat(raw) || 0); }}
														onCancel={() => handleOutworkCancel()}
													/>
												</div>
											</div>
										</Table.Cell>

										<Table.Cell class="px-2 py-2 text-center align-top">
											<button
												onclick={() => handleBettermentClick(item)}
												class="rounded-sm p-1.5 transition-all {item.betterment_total &&
												item.betterment_total > 0
													? 'border border-warning-border bg-warning-soft hover:bg-warning-soft/80'
													: 'border border-border bg-muted hover:bg-muted/80'}"
												title="Set betterment percentages"
											>
												{#if item.betterment_total && item.betterment_total > 0}<Percent
														class="h-4 w-4 font-bold text-warning"
													/>{:else}<Percent class="h-4 w-4 text-gray-400" />{/if}
											</button>
										</Table.Cell>
										<Table.Cell class="font-mono-tabular px-3 py-2 text-right align-top font-bold"
											>{formatCurrencyValue(item.total)}</Table.Cell
										>
										<Table.Cell class="px-2 py-2 text-center align-top">
											<Button
												variant="ghost"
												size="sm"
												onclick={() => removeLocalLines([item.id!])}
												class="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
												><Trash2 class="h-4 w-4" /></Button
											>
										</Table.Cell>
									</Table.Row>
								{/each}
								<!-- Skeleton row (Phase 8e) - persistent add row -->
								<Table.Row class="bg-muted/20 hover:bg-muted/20">
									<Table.Cell class="px-3 py-2"
										><input
											type="checkbox"
											disabled
											class="cursor-not-allowed rounded border-gray-300 opacity-50"
											aria-label="Skeleton row (not selectable)"
											tabindex={-1}
										/></Table.Cell
									>
									<Table.Cell class="px-2 py-2 align-top">
										<div class="flex flex-col gap-1.5">
											<div class="group relative w-fit">
												<select
													bind:value={skeletonProcessType}
													class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
													aria-label="New line process type"
													>{#each processTypeOptions as option}<option value={option.value}
															>{option.value} - {option.label}</option
														>{/each}</select
												>
												<span
													class="inline-flex min-w-8 justify-center rounded px-2 py-1 text-xs font-semibold {getProcessTypeBadgeColor(
														skeletonProcessType
													)}">{skeletonProcessType}</span
												>
											</div>
											{#if skeletonProcessType === 'N'}
												<div class="group relative w-fit">
													<select
														bind:value={skeletonPartType}
														class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
														aria-label="New line part type"
														><option value="OEM">OEM</option><option value="ALT">ALT</option><option
															value="2ND">2ND</option
														></select
													>
													<span
														class="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
														>{skeletonPartType}</span
													>
												</div>
											{:else}<span class="text-xs text-muted-foreground">No part</span>{/if}
										</div>
									</Table.Cell>
									<Table.Cell class="px-3 py-2 align-top"
										><textarea
											bind:this={skeletonDescInput}
											placeholder="Description - type to add"
											aria-label="New line description"
											rows={2}
											bind:value={skeletonDescription}
											onblur={handleSkeletonDescriptionBlur}
											onkeydown={(e: KeyboardEvent) => {
												if (e.key === 'Enter') (e.currentTarget as HTMLTextAreaElement)?.blur();
											}}
											class="flex w-full rounded-md border-0 bg-background px-0 py-0 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none whitespace-pre-wrap break-words disabled:cursor-not-allowed disabled:opacity-50"
										></textarea></Table.Cell
									>
									<Table.Cell class="px-2 py-2 align-top">
										<div class="grid grid-cols-[112px_66px_66px_82px_98px] gap-1">
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													Part
												</div>
												{#if skeletonProcessType === 'N'}
													<Input
														type="text"
														inputmode="decimal"
														value={skeletonPartPriceNett !== null ? formatCurrencyValue(skeletonPartPriceNett) : ''}
														onfocus={(e) => { originalCostValue = (e.currentTarget as HTMLInputElement).value; (e.currentTarget as HTMLInputElement).select(); }}
														onblur={(e) => { skeletonPartPriceNett = parseLocaleNumber((e.currentTarget as HTMLInputElement).value); }}
														onkeydown={(e) => {
															if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
															if (e.key === 'Escape') {
																(e.currentTarget as HTMLInputElement).value = originalCostValue;
																(e.currentTarget as HTMLInputElement).blur();
															}
														}}
														placeholder="0,00"
														class="font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
													/>
												{:else}
													<span class="text-muted-foreground text-xs">-</span>
												{/if}
											</div>
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													S&A
												</div>
												{#if ['N', 'R', 'P', 'B'].includes(skeletonProcessType)}
													<Input
														type="text"
														inputmode="decimal"
														value={skeletonSAHours !== null ? String(skeletonSAHours) : ''}
														onfocus={(e) => { originalCostValue = (e.currentTarget as HTMLInputElement).value; (e.currentTarget as HTMLInputElement).select(); }}
														onblur={(e) => { skeletonSAHours = parseLocaleNumber((e.currentTarget as HTMLInputElement).value); }}
														onkeydown={(e) => {
															if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
															if (e.key === 'Escape') {
																(e.currentTarget as HTMLInputElement).value = originalCostValue;
																(e.currentTarget as HTMLInputElement).blur();
															}
														}}
														placeholder="0"
														class="font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
													/>
												{:else}
													<span class="text-muted-foreground text-xs">-</span>
												{/if}
											</div>
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													Lab
												</div>
												{#if ['N', 'R', 'A'].includes(skeletonProcessType)}
													<Input
														type="text"
														inputmode="decimal"
														value={skeletonLabourHours !== null ? String(skeletonLabourHours) : ''}
														onfocus={(e) => { originalCostValue = (e.currentTarget as HTMLInputElement).value; (e.currentTarget as HTMLInputElement).select(); }}
														onblur={(e) => { skeletonLabourHours = parseLocaleNumber((e.currentTarget as HTMLInputElement).value); }}
														onkeydown={(e) => {
															if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
															if (e.key === 'Escape') {
																(e.currentTarget as HTMLInputElement).value = originalCostValue;
																(e.currentTarget as HTMLInputElement).blur();
															}
														}}
														placeholder="0"
														class="font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
													/>
												{:else}
													<span class="text-muted-foreground text-xs">-</span>
												{/if}
											</div>
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													Paint
												</div>
												{#if ['N', 'R', 'P', 'B'].includes(skeletonProcessType)}
													<Input
														type="text"
														inputmode="decimal"
														value={skeletonPaintPanels !== null ? String(skeletonPaintPanels) : ''}
														onfocus={(e) => { originalCostValue = (e.currentTarget as HTMLInputElement).value; (e.currentTarget as HTMLInputElement).select(); }}
														onblur={(e) => { skeletonPaintPanels = parseLocaleNumber((e.currentTarget as HTMLInputElement).value); }}
														onkeydown={(e) => {
															if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
															if (e.key === 'Escape') {
																(e.currentTarget as HTMLInputElement).value = originalCostValue;
																(e.currentTarget as HTMLInputElement).blur();
															}
														}}
														placeholder="0"
														class="font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
													/>
												{:else}
													<span class="text-muted-foreground text-xs">-</span>
												{/if}
											</div>
											<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
												<div class="text-[10px] tracking-wide text-muted-foreground uppercase">
													Out
												</div>
												{#if skeletonProcessType === 'O'}
													<Input
														type="text"
														inputmode="decimal"
														value={skeletonOutworkNett !== null ? formatCurrencyValue(skeletonOutworkNett) : ''}
														onfocus={(e) => { originalCostValue = (e.currentTarget as HTMLInputElement).value; (e.currentTarget as HTMLInputElement).select(); }}
														onblur={(e) => { skeletonOutworkNett = parseLocaleNumber((e.currentTarget as HTMLInputElement).value); }}
														onkeydown={(e) => {
															if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
															if (e.key === 'Escape') {
																(e.currentTarget as HTMLInputElement).value = originalCostValue;
																(e.currentTarget as HTMLInputElement).blur();
															}
														}}
														placeholder="0,00"
														class="font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
													/>
												{:else}
													<span class="text-muted-foreground text-xs">-</span>
												{/if}
											</div>
										</div>
									</Table.Cell>
									<Table.Cell class="px-2 py-2 text-center"
										><span class="text-sm text-muted-foreground">-</span></Table.Cell
									>
									<Table.Cell class="font-mono-tabular px-3 py-2 text-right text-muted-foreground"
										>{formatCurrencyValue(0)}</Table.Cell
									>
									<Table.Cell class="px-2 py-2"></Table.Cell>
								</Table.Row>
							</Table.Body>
						</Table.Root>
					</div>
			</Card>

			<!-- Bottom-sticky compact totals strip (desktop only; mobile uses EstimateStickyTotals above) -->
			<div class="hidden md:block">
				<TotalsStrip
					fields={stripFields}
					totalValue={categoryTotals()?.totalIncVat}
					totalColorClass={thresholdColorClass}
					onDetailsClick={() => (totalsDetailsOpen = true)}
				/>
			</div>

			<!-- Totals Details Dialog -->
			<TotalsBreakdownDialog
				rows={breakdownRows}
				title="Totals Breakdown"
				description="Full breakdown including threshold check and assessment result."
				bind:open={totalsDetailsOpen}
				onOpenChange={(open) => (totalsDetailsOpen = open)}
			/>

			<!-- Threshold message banner (moved outside dialog — Option A) -->
			{#if thresholdResult()?.message}
				{@const threshold = thresholdResult()!}
				{@const colorClasses = getThresholdColorClasses(threshold.color)}
				<div class="rounded-md border-2 p-3 {colorClasses.bg} {colorClasses.border}">
					<div class="flex items-start gap-2">
						{#if threshold.showWarning}
							<CircleAlert class="mt-0.5 h-5 w-5 flex-shrink-0 {colorClasses.text}" />
						{:else}
							<Info class="mt-0.5 h-5 w-5 flex-shrink-0 {colorClasses.text}" />
						{/if}
						<div class="flex-1">
							<p class="text-sm font-medium {colorClasses.text}">{threshold.message}</p>
							{#if vehicleValues?.borderline_writeoff_retail}
								<p class="mt-1 text-xs {colorClasses.text}">
									Retail Borderline: {formatCurrency(vehicleValues.borderline_writeoff_retail)}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Assessment Result Selector -->
			<AssessmentResultSelector
				assessmentResult={localEstimate
					? localEstimate.assessment_result
					: estimate.assessment_result}
				onUpdate={handleUpdateAssessmentResult}
				disabled={!localEstimate || localLineItems.length === 0}
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
				<Button onclick={saveAll} size="sm" variant="outline" disabled={saving || !dirty}>
					{saving ? 'Saving...' : 'Save Progress'}
				</Button>
				<Button onclick={onComplete} disabled={!isComplete}>
					<Check class="mr-2 h-4 w-4" />
					Complete Estimate
				</Button>
			</div>
		{/if}
	</div>
	{#if recalculating}
		<div
			class="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm"
		>
			<div class="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow">
				<RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
				<span class="text-sm font-medium text-gray-700">Recalculating…</span>
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
				<pre
					class="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm whitespace-pre-wrap">{partsListText}</pre>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={() => (showPartsListModal = false)}>Close</Button>
				<Button onclick={handleCopyPartsListText}>Copy to Clipboard</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
