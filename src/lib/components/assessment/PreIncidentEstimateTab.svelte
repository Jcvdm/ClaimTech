<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog';
	import { SaveIndicator } from '$lib/components/ui/save-indicator';
	import RatesConfiguration from './RatesConfiguration.svelte';
	import QuickAddLineItem from './QuickAddLineItem.svelte';
	import PreIncidentPhotosPanel from './PreIncidentPhotosPanel.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import LineItemCard from './LineItemCard.svelte';
	import { Plus, Trash2, Check, Camera, Settings } from 'lucide-svelte';
	import type {
		PreIncidentEstimate,
		EstimateLineItem,
		PreIncidentEstimatePhoto,
		ProcessType,
		PartType
	} from '$lib/types/assessment';
	import { getProcessTypeOptions } from '$lib/constants/processTypes';
	import {
		calculateLineItemTotal,
		calculatePartSellingPrice,
		calculateSACost,
		calculateLabourCost,
		calculatePaintCost,
		calculateOutworkSellingPrice,
		createEmptyLineItem,
		computeCategoryTotals
	} from '$lib/utils/estimateCalculations';
	import TotalsBreakdownDialog, { type BreakdownRow } from '$lib/components/assessment/TotalsBreakdownDialog.svelte';
	import TotalsStrip, { type StripField } from '$lib/components/assessment/TotalsStrip.svelte';
	import {
		formatCurrency,
		formatCurrencyValue,
		parseLocaleNumber
	} from '$lib/utils/formatters';
	import { validatePreIncidentEstimate, type TabValidation } from '$lib/utils/validation';

	interface Props {
		estimate: PreIncidentEstimate | null;
		assessmentId: string;
		estimatePhotos: PreIncidentEstimatePhoto[];
		onUpdateEstimate: (data: Partial<PreIncidentEstimate>) => void;
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
		onComplete: () => void;
		onRegisterSave?: (saveFn: () => Promise<void>) => void;
		onValidationUpdate?: (validation: TabValidation) => void;
	}

	let props: Props = $props();

	const estimate = $derived(props.estimate);
	const assessmentId = $derived(props.assessmentId);
	const estimatePhotos = $derived(props.estimatePhotos);
	const onUpdateEstimate = $derived(props.onUpdateEstimate);
	const onPhotosUpdate = $derived(props.onPhotosUpdate);
	const onComplete = $derived(props.onComplete);
	const onRegisterSave = $derived(props.onRegisterSave);
	const onValidationUpdate = $derived(props.onValidationUpdate);

	const processTypeOptions = getProcessTypeOptions();

	function deepClone<T>(obj: T): T {
		try {
			return structuredClone(obj);
		} catch {
			return JSON.parse(JSON.stringify(obj));
		}
	}

	function ensureLineItemIds(items: any[]): EstimateLineItem[] {
		return (items ?? []).map((item) => {
			if (item && item.id) return item;
			return { ...(item || {}), id: crypto.randomUUID() } as EstimateLineItem;
		});
	}

	function getPartMarkup(partType: PartType | null | undefined): number {
		if (!localEstimate) return 0;
		if (partType === 'ALT') return localEstimate.alt_markup_percentage || 0;
		if (partType === '2ND') return localEstimate.second_hand_markup_percentage || 0;
		return localEstimate.oem_markup_percentage || 0;
	}

	let localEstimate = $state<PreIncidentEstimate | null>(null);
	let dirty = $state(false);
	let saveInFlight = $state(false);
	let saving = $state(false);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let currentSavePromise: Promise<void> | null = null;
	let justSaved = $state(false);
	let justSavedTimeout: ReturnType<typeof setTimeout> | null = null;
	let ratesOpen = $state(false);
	let quickAddOpen = $state(false);
	let totalsDetailsOpen = $state(false);
	let dirtyRevision = 0;

	let selectedItems = $state<Set<string>>(new Set());
	let selectAll = $state(false);

	let editingSA = $state<string | null>(null);
	let editingLabour = $state<string | null>(null);
	let editingPaint = $state<string | null>(null);
	let editingPartPrice = $state<string | null>(null);
	let editingOutwork = $state<string | null>(null);
	let tempSAHours = $state('');
	let tempLabourHours = $state('');
	let tempPaintPanels = $state('');
	let tempPartPriceNett = $state('');
	let tempOutworkNett = $state('');

	let skeletonProcessType = $state<ProcessType>('N');
	let skeletonPartType = $state<PartType>('OEM');
	let skeletonDescription = $state('');
	let skeletonPartPriceNett = $state('');
	let skeletonSAHours = $state('');
	let skeletonLabourHours = $state('');
	let skeletonPaintPanels = $state('');
	let skeletonOutworkNett = $state('');

	function clearSavedState() {
		justSaved = false;
		if (justSavedTimeout) {
			clearTimeout(justSavedTimeout);
			justSavedTimeout = null;
		}
	}

	function markDirty() {
		dirty = true;
		dirtyRevision += 1;
		clearSavedState();
	}

	function syncSelectAll() {
		selectAll = selectedItems.size > 0 && selectedItems.size === localLineItems().length;
	}

	function scheduleSave() {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
		saveTimeout = setTimeout(() => {
			void saveNow();
		}, 1000);
	}

	async function saveAll() {
		if (!localEstimate || !dirty || saveInFlight) return;

		const revisionAtStart = dirtyRevision;
		saveInFlight = true;
		saving = true;
		let resolveCurrentSave!: () => void;
		currentSavePromise = new Promise<void>((resolve) => {
			resolveCurrentSave = resolve;
		});
		try {
			const totals = categoryTotals();
			await onUpdateEstimate({
				line_items: localEstimate.line_items,
				labour_rate: localEstimate.labour_rate,
				paint_rate: localEstimate.paint_rate,
				vat_percentage: localEstimate.vat_percentage,
				oem_markup_percentage: localEstimate.oem_markup_percentage,
				alt_markup_percentage: localEstimate.alt_markup_percentage,
				second_hand_markup_percentage: localEstimate.second_hand_markup_percentage,
				outwork_markup_percentage: localEstimate.outwork_markup_percentage,
				subtotal: totals?.subtotalExVat ?? 0,
				vat_amount: totals?.vatAmount ?? 0,
				total: totals?.totalIncVat ?? 0
			});
			if (dirtyRevision === revisionAtStart) {
				dirty = false;
				justSaved = true;
				if (justSavedTimeout) clearTimeout(justSavedTimeout);
				justSavedTimeout = setTimeout(() => {
					justSaved = false;
					justSavedTimeout = null;
				}, 2000);
			}
		} finally {
			resolveCurrentSave();
			currentSavePromise = null;
			saving = false;
			saveInFlight = false;
		}

		if (dirtyRevision !== revisionAtStart) {
			scheduleSave();
		}
	}

	async function saveNow() {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}
		while (saveInFlight && currentSavePromise) {
			await currentSavePromise;
		}
		await saveAll();
	}

	onMount(() => {
		const stableSave = async () => {
			await saveNow();
		};

		onRegisterSave?.(stableSave);
	});

	onDestroy(() => {
		if (saveTimeout) clearTimeout(saveTimeout);
		if (justSavedTimeout) clearTimeout(justSavedTimeout);
	});

	$effect(() => {
		if (!dirty && !saveInFlight) {
			if (estimate) {
				const cloned = deepClone(estimate);
				cloned.line_items = ensureLineItemIds(cloned.line_items);
				localEstimate = cloned;
				syncSelectAll();
			} else {
				localEstimate = null;
			}
		}
	});

	function setLineItem(itemId: string, patch: Partial<EstimateLineItem>) {
		if (!localEstimate) return;
		const idx = localEstimate.line_items.findIndex((item) => item.id === itemId);
		if (idx === -1) return;

		const updated = {
			...localEstimate.line_items[idx],
			...patch
		} as EstimateLineItem;

		updated.total = calculateLineItemTotal(updated, localEstimate.labour_rate, localEstimate.paint_rate);
		localEstimate.line_items[idx] = updated;
		localEstimate.line_items = [...localEstimate.line_items];
		markDirty();
		scheduleSave();
	}

	function updateProcessType(itemId: string, item: EstimateLineItem, value: ProcessType) {
		const patch: Partial<EstimateLineItem> = {
			process_type: value
		};

		if (value === 'N') {
			patch.part_type = item.part_type || 'OEM';
		} else {
			patch.part_type = undefined;
			patch.part_price_nett = undefined;
			patch.part_price = undefined;
		}

		if (!['N', 'R', 'P', 'B'].includes(value)) {
			patch.strip_assemble_hours = undefined;
			patch.strip_assemble = undefined;
		}

		if (!['N', 'R', 'A'].includes(value)) {
			patch.labour_hours = undefined;
			patch.labour_cost = undefined;
		}

		if (!['N', 'R', 'P', 'B'].includes(value)) {
			patch.paint_panels = undefined;
			patch.paint_cost = undefined;
		}

		if (value !== 'O') {
			patch.outwork_charge_nett = undefined;
			patch.outwork_charge = undefined;
		}

		setLineItem(itemId, patch);
	}

	function updatePartType(itemId: string, item: EstimateLineItem, value: PartType) {
		if (!localEstimate || item.process_type !== 'N') return;
		const partPriceNett = item.part_price_nett ?? null;
		const partPrice = calculatePartSellingPrice(partPriceNett, getPartMarkup(value));
		setLineItem(itemId, {
			part_type: value,
			part_price: partPriceNett != null ? partPrice : undefined
		});
	}

	function updateDescription(itemId: string, value: string) {
		setLineItem(itemId, { description: value });
	}

	function commitSA(itemId: string) {
		if (!localEstimate) return;
		const hours = parseLocaleNumber(tempSAHours);
		setLineItem(itemId, {
			strip_assemble_hours: hours,
			strip_assemble: hours != null ? calculateSACost(hours, localEstimate.labour_rate) : undefined
		});
		editingSA = null;
		tempSAHours = '';
	}

	function commitLabour(itemId: string) {
		if (!localEstimate) return;
		const hours = parseLocaleNumber(tempLabourHours);
		setLineItem(itemId, {
			labour_hours: hours,
			labour_cost: hours != null ? calculateLabourCost(hours, localEstimate.labour_rate) : undefined
		});
		editingLabour = null;
		tempLabourHours = '';
	}

	function commitPaint(itemId: string) {
		if (!localEstimate) return;
		const panels = parseLocaleNumber(tempPaintPanels);
		setLineItem(itemId, {
			paint_panels: panels,
			paint_cost: panels != null ? calculatePaintCost(panels, localEstimate.paint_rate) : undefined
		});
		editingPaint = null;
		tempPaintPanels = '';
	}

	function commitPartPrice(itemId: string, item: EstimateLineItem) {
		if (!localEstimate) return;
		const nett = parseLocaleNumber(tempPartPriceNett);
		const markup = getPartMarkup(item.part_type);
		setLineItem(itemId, {
			part_price_nett: nett,
			part_price: nett != null ? calculatePartSellingPrice(nett, markup) : undefined
		});
		editingPartPrice = null;
		tempPartPriceNett = '';
	}

	function commitOutwork(itemId: string) {
		if (!localEstimate) return;
		const nett = parseLocaleNumber(tempOutworkNett);
		setLineItem(itemId, {
			outwork_charge_nett: nett,
			outwork_charge: nett != null ? calculateOutworkSellingPrice(nett, localEstimate.outwork_markup_percentage) : undefined
		});
		editingOutwork = null;
		tempOutworkNett = '';
	}

	function handleSAClick(itemId: string, currentHours: number | null) {
		editingSA = itemId;
		tempSAHours = currentHours != null ? String(currentHours) : '';
	}

	function handleLabourClick(itemId: string, currentHours: number | null) {
		editingLabour = itemId;
		tempLabourHours = currentHours != null ? String(currentHours) : '';
	}

	function handlePaintClick(itemId: string, currentPanels: number | null) {
		editingPaint = itemId;
		tempPaintPanels = currentPanels != null ? String(currentPanels) : '';
	}

	function handlePartPriceClick(itemId: string, currentNettPrice: number | null) {
		editingPartPrice = itemId;
		tempPartPriceNett = currentNettPrice != null ? formatCurrencyValue(currentNettPrice) : '';
	}

	function handleOutworkClick(itemId: string, currentNettPrice: number | null) {
		editingOutwork = itemId;
		tempOutworkNett = currentNettPrice != null ? formatCurrencyValue(currentNettPrice) : '';
	}

	function handleCancelEdit(field: 'sa' | 'labour' | 'paint' | 'part' | 'outwork') {
		if (field === 'sa') {
			editingSA = null;
			tempSAHours = '';
		} else if (field === 'labour') {
			editingLabour = null;
			tempLabourHours = '';
		} else if (field === 'paint') {
			editingPaint = null;
			tempPaintPanels = '';
		} else if (field === 'part') {
			editingPartPrice = null;
			tempPartPriceNett = '';
		} else {
			editingOutwork = null;
			tempOutworkNett = '';
		}
	}

	function handleInputKeydown(e: KeyboardEvent, field: 'sa' | 'labour' | 'paint' | 'part' | 'outwork') {
		if (e.key === 'Enter') {
			(e.currentTarget as HTMLInputElement).blur();
		}

		if (e.key === 'Escape') {
			handleCancelEdit(field);
		}
	}

	function recalculateItemForRates(item: EstimateLineItem): EstimateLineItem {
		const updated = { ...item };

		if (updated.process_type === 'N') {
			updated.part_price = calculatePartSellingPrice(updated.part_price_nett, getPartMarkup(updated.part_type));
		} else {
			updated.part_type = undefined;
			updated.part_price_nett = undefined;
			updated.part_price = undefined;
		}

		if (['N', 'R', 'P', 'B'].includes(updated.process_type)) {
			updated.strip_assemble = calculateSACost(updated.strip_assemble_hours, localEstimate?.labour_rate || 0);
			updated.paint_cost = calculatePaintCost(updated.paint_panels, localEstimate?.paint_rate || 0);
		} else {
			updated.strip_assemble_hours = undefined;
			updated.strip_assemble = undefined;
			updated.paint_panels = undefined;
			updated.paint_cost = undefined;
		}

		if (['N', 'R', 'A'].includes(updated.process_type)) {
			updated.labour_cost = calculateLabourCost(updated.labour_hours, localEstimate?.labour_rate || 0);
		} else {
			updated.labour_hours = undefined;
			updated.labour_cost = undefined;
		}

		if (updated.process_type === 'O') {
			updated.outwork_charge = calculateOutworkSellingPrice(
				updated.outwork_charge_nett,
				localEstimate?.outwork_markup_percentage || 0
			);
		} else {
			updated.outwork_charge_nett = undefined;
			updated.outwork_charge = undefined;
		}

		updated.total = calculateLineItemTotal(
			updated,
			localEstimate?.labour_rate || 0,
			localEstimate?.paint_rate || 0
		);

		return updated;
	}

	function handleRatesUpdate(
		labourRate: number,
		paintRate: number,
		vatPercentage: number,
		oemMarkup: number,
		altMarkup: number,
		secondHandMarkup: number,
		outworkMarkup: number
	) {
		if (!localEstimate) return;

		localEstimate.labour_rate = labourRate;
		localEstimate.paint_rate = paintRate;
		localEstimate.vat_percentage = vatPercentage;
		localEstimate.oem_markup_percentage = oemMarkup;
		localEstimate.alt_markup_percentage = altMarkup;
		localEstimate.second_hand_markup_percentage = secondHandMarkup;
		localEstimate.outwork_markup_percentage = outworkMarkup;
		localEstimate.line_items = localEstimate.line_items.map((item) => recalculateItemForRates(item));
		localEstimate.line_items = [...localEstimate.line_items];
		markDirty();
		scheduleSave();
		ratesOpen = false;
	}

	function addLineItem(item: Partial<EstimateLineItem>) {
		if (!localEstimate) return;

		const newItem = createEmptyLineItem(item.process_type || 'N') as EstimateLineItem;
		newItem.id = item.id ?? crypto.randomUUID();
		newItem.process_type = item.process_type || 'N';
		newItem.part_type = item.part_type ?? (newItem.process_type === 'N' ? 'OEM' : undefined);
		newItem.description = item.description || '';

		if (item.part_price_nett != null) {
			newItem.part_price_nett = item.part_price_nett;
			newItem.part_price = calculatePartSellingPrice(
				item.part_price_nett,
				getPartMarkup(newItem.part_type)
			);
		}

		if (item.strip_assemble_hours != null) {
			newItem.strip_assemble_hours = item.strip_assemble_hours;
			newItem.strip_assemble = calculateSACost(item.strip_assemble_hours, localEstimate.labour_rate);
		}

		if (item.labour_hours != null) {
			newItem.labour_hours = item.labour_hours;
			newItem.labour_cost = calculateLabourCost(item.labour_hours, localEstimate.labour_rate);
		}

		if (item.paint_panels != null) {
			newItem.paint_panels = item.paint_panels;
			newItem.paint_cost = calculatePaintCost(item.paint_panels, localEstimate.paint_rate);
		}

		if (item.outwork_charge_nett != null) {
			newItem.outwork_charge_nett = item.outwork_charge_nett;
			newItem.outwork_charge = calculateOutworkSellingPrice(
				item.outwork_charge_nett,
				localEstimate.outwork_markup_percentage
			);
		}

		newItem.total = calculateLineItemTotal(newItem, localEstimate.labour_rate, localEstimate.paint_rate);
		localEstimate.line_items = [...localEstimate.line_items, newItem];
		syncSelectAll();
		markDirty();
		scheduleSave();
	}

	function handleDeleteLineItem(itemId: string) {
		if (!localEstimate) return;
		localEstimate.line_items = localEstimate.line_items.filter((item) => item.id !== itemId);
		selectedItems.delete(itemId);
		selectedItems = new Set(selectedItems);
		syncSelectAll();
		markDirty();
		scheduleSave();
	}

	function handleBulkDeleteLineItems(itemIds: string[]) {
		if (!localEstimate) return;
		const ids = new Set(itemIds);
		localEstimate.line_items = localEstimate.line_items.filter((item) => !ids.has(item.id!));
		selectedItems.clear();
		selectedItems = new Set(selectedItems);
		syncSelectAll();
		markDirty();
		scheduleSave();
	}

	function handleToggleSelect(itemId: string) {
		if (selectedItems.has(itemId)) {
			selectedItems.delete(itemId);
		} else {
			selectedItems.add(itemId);
		}
		selectedItems = new Set(selectedItems);
		syncSelectAll();
	}

	function handleSelectAll() {
		if (selectAll) {
			selectedItems.clear();
		} else {
			localLineItems().forEach((item) => {
				if (item.id) selectedItems.add(item.id);
			});
		}
		selectedItems = new Set(selectedItems);
		syncSelectAll();
	}

	function handleBulkDelete() {
		if (!confirm(`Delete ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}?`))
			return;
		handleBulkDeleteLineItems(Array.from(selectedItems));
	}

	function handleQuickAddLineItem(item: EstimateLineItem) {
		addLineItem(item);
		quickAddOpen = false;
	}

	function handleAddSkeletonLine() {
		if (!localEstimate) return;
		if (skeletonDescription.trim() === '') return;

		const newItem = createEmptyLineItem(skeletonProcessType) as EstimateLineItem;
		newItem.id = crypto.randomUUID();
		newItem.process_type = skeletonProcessType;
		newItem.part_type = skeletonProcessType === 'N' ? skeletonPartType : undefined;
		newItem.description = skeletonDescription.trim();

		const partPriceNett = parseLocaleNumber(skeletonPartPriceNett);
		const saHours = parseLocaleNumber(skeletonSAHours);
		const labourHours = parseLocaleNumber(skeletonLabourHours);
		const paintPanels = parseLocaleNumber(skeletonPaintPanels);
		const outworkNett = parseLocaleNumber(skeletonOutworkNett);

		if (partPriceNett != null) {
			newItem.part_price_nett = partPriceNett;
			newItem.part_price = calculatePartSellingPrice(partPriceNett, getPartMarkup(newItem.part_type));
		}

		if (saHours != null) {
			newItem.strip_assemble_hours = saHours;
			newItem.strip_assemble = calculateSACost(saHours, localEstimate.labour_rate);
		}

		if (labourHours != null) {
			newItem.labour_hours = labourHours;
			newItem.labour_cost = calculateLabourCost(labourHours, localEstimate.labour_rate);
		}

		if (paintPanels != null) {
			newItem.paint_panels = paintPanels;
			newItem.paint_cost = calculatePaintCost(paintPanels, localEstimate.paint_rate);
		}

		if (outworkNett != null) {
			newItem.outwork_charge_nett = outworkNett;
			newItem.outwork_charge = calculateOutworkSellingPrice(
				outworkNett,
				localEstimate.outwork_markup_percentage
			);
		}

		newItem.total = calculateLineItemTotal(newItem, localEstimate.labour_rate, localEstimate.paint_rate);
		localEstimate.line_items = [...localEstimate.line_items, newItem];
		syncSelectAll();
		markDirty();
		scheduleSave();
		resetSkeleton();
	}

	function resetSkeleton() {
		skeletonProcessType = 'N';
		skeletonPartType = 'OEM';
		skeletonDescription = '';
		skeletonPartPriceNett = '';
		skeletonSAHours = '';
		skeletonLabourHours = '';
		skeletonPaintPanels = '';
		skeletonOutworkNett = '';
	}

	function handleSkeletonProcessTypeChange(value: ProcessType) {
		skeletonProcessType = value;
		if (value === 'N') {
			skeletonPartType = 'OEM';
		} else {
			skeletonPartPriceNett = '';
			skeletonPartType = 'OEM';
		}
		if (!['N', 'R', 'P', 'B'].includes(value)) skeletonSAHours = '';
		if (!['N', 'R', 'A'].includes(value)) skeletonLabourHours = '';
		if (!['N', 'R', 'P', 'B'].includes(value)) skeletonPaintPanels = '';
		if (value !== 'O') skeletonOutworkNett = '';
	}

	function normalizeMoneyInput(value: string) {
		const parsed = parseLocaleNumber(value);
		return parsed != null ? formatCurrencyValue(parsed) : '';
	}

	function normalizeNumericInput(value: string) {
		const parsed = parseLocaleNumber(value);
		return parsed != null ? String(parsed) : '';
	}

	const localLineItems = $derived(() => {
		if (!localEstimate) return [];
		return (localEstimate.line_items || []).filter((item) => item && item.id);
	});

	const categoryTotals = $derived(() => {
		if (!localEstimate) return null;
		return computeCategoryTotals(
			localLineItems(),
			{
				labour_rate: localEstimate.labour_rate ?? 0,
				paint_rate: localEstimate.paint_rate ?? 0,
				oem_markup_percentage: localEstimate.oem_markup_percentage ?? 0,
				alt_markup_percentage: localEstimate.alt_markup_percentage ?? 0,
				second_hand_markup_percentage: localEstimate.second_hand_markup_percentage ?? 0,
				outwork_markup_percentage: localEstimate.outwork_markup_percentage ?? 0,
				vat_percentage: localEstimate.vat_percentage ?? 0,
				sundries_percentage: 0 // PreIncident has no sundries
			},
			{
				includeBetterment: false, // PreIncident has no betterment
				excessAmount: 0 // PreIncident has no excess
			}
		);
	});

	// Build breakdown rows for <TotalsBreakdownDialog>
	const breakdownRows = $derived.by((): BreakdownRow[] => {
		const totals = categoryTotals();
		if (!totals) return [];
		return [
			{ label: 'Parts Total', value: totals.partsTotal, border: 'bottom' },
			{ label: 'Parts Markup', value: totals.partsMarkup, color: 'success', border: 'bottom' },
			{ label: 'S&A Total', value: totals.saTotal, border: 'bottom' },
			{ label: 'Labour Total', value: totals.labourTotal, border: 'bottom' },
			{ label: 'Paint Total', value: totals.paintTotal, border: 'bottom' },
			{ label: 'Outwork Total', value: totals.outworkTotal, border: 'bottom' },
			{ label: 'Outwork Markup', value: totals.outworkMarkup, color: 'success', border: 'bottom' },
			{ label: 'Subtotal', value: totals.subtotalExVat, emphasis: 'subtotal' },
			{
				label: `VAT (${localEstimate?.vat_percentage ?? 0}%)`,
				value: totals.vatAmount,
				emphasis: 'subtotal'
			},
			{ label: 'Total', value: totals.totalIncVat, emphasis: 'total' }
		];
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

	const validation = $derived.by(() => validatePreIncidentEstimate(localEstimate));

	let lastValidationKey = '';
	$effect(() => {
		const key = `${validation.isComplete}|${validation.missingFields.join(',')}`;
		if (onValidationUpdate && key !== lastValidationKey) {
			lastValidationKey = key;
			onValidationUpdate(validation);
		}
	});

	function isApplicable(processType: ProcessType, field: 'sa' | 'labour' | 'paint' | 'part' | 'outwork') {
		if (field === 'part') return processType === 'N';
		if (field === 'sa') return ['N', 'R', 'P', 'B'].includes(processType);
		if (field === 'labour') return ['N', 'R', 'A'].includes(processType);
		if (field === 'paint') return ['N', 'R', 'P', 'B'].includes(processType);
		return processType === 'O';
	}

	async function handleCompleteClick() {
		try {
			await saveNow();
			onComplete();
		} catch (error) {
			console.error('Failed to save pre-incident estimate before completion:', error);
		}
	}
</script>

	<div class="space-y-6">
		<RequiredFieldsWarning missingFields={validation.missingFields} />

		{#if !localEstimate}
			<Card class="border-dashed border-border bg-muted/20 p-6">
				<p class="text-center text-sm text-muted-foreground">Loading pre-incident estimate...</p>
			</Card>
		{:else}
		<ResponsiveDialog.Root bind:open={ratesOpen}>
			<ResponsiveDialog.Content class="sm:max-w-3xl">
				<ResponsiveDialog.Header>
					<ResponsiveDialog.Title>Rates</ResponsiveDialog.Title>
					<ResponsiveDialog.Description>Pre-incident rates only.</ResponsiveDialog.Description>
				</ResponsiveDialog.Header>
				<RatesConfiguration
					labourRate={localEstimate.labour_rate}
					paintRate={localEstimate.paint_rate}
					vatPercentage={localEstimate.vat_percentage}
					oemMarkup={localEstimate.oem_markup_percentage}
					altMarkup={localEstimate.alt_markup_percentage}
					secondHandMarkup={localEstimate.second_hand_markup_percentage}
					outworkMarkup={localEstimate.outwork_markup_percentage}
					onUpdateRates={handleRatesUpdate}
					disabled={saving || saveInFlight}
				/>
			</ResponsiveDialog.Content>
		</ResponsiveDialog.Root>

		<ResponsiveDialog.Root bind:open={quickAddOpen}>
			<ResponsiveDialog.Content class="sm:max-w-2xl">
				<ResponsiveDialog.Header>
					<ResponsiveDialog.Title>Add line item</ResponsiveDialog.Title>
					<ResponsiveDialog.Description>
						Pre-incident photo capture stays enabled for this entry flow.
					</ResponsiveDialog.Description>
				</ResponsiveDialog.Header>
				<QuickAddLineItem
					labourRate={localEstimate.labour_rate}
					paintRate={localEstimate.paint_rate}
					oemMarkup={localEstimate.oem_markup_percentage}
					altMarkup={localEstimate.alt_markup_percentage}
					secondHandMarkup={localEstimate.second_hand_markup_percentage}
					outworkMarkup={localEstimate.outwork_markup_percentage}
					onAddLineItem={handleQuickAddLineItem}
					enablePhotos={true}
					{assessmentId}
					parentId={estimate?.id}
					photoCategory="pre-incident"
					onPhotosUploaded={onPhotosUpdate}
				/>
			</ResponsiveDialog.Content>
		</ResponsiveDialog.Root>

			<Card class="p-0">
				<div class="flex flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<h3 class="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
								Line Items
							</h3>
							<SaveIndicator {saving} saved={justSaved} class="ml-1" />
						</div>
						<p class="text-xs text-muted-foreground">
							Rates only. No repairer, betterment, or assessment result.
						</p>
					</div>

					<div class="flex flex-wrap items-center justify-end gap-2">
						{#if selectedItems.size > 0}
							<Button onclick={handleBulkDelete} size="sm" variant="destructive">
								<Trash2 class="h-4 w-4 sm:mr-2" />
								<span class="hidden sm:inline">Delete Selected ({selectedItems.size})</span>
							</Button>
						{/if}
						<Button onclick={() => (ratesOpen = true)} size="sm" variant="outline">
							<Settings class="h-4 w-4 sm:mr-1.5" />
							<span class="hidden sm:inline">Rates</span>
						</Button>
						<Button onclick={() => (quickAddOpen = true)} size="sm">
							<Camera class="h-4 w-4 sm:mr-1.5" />
							<span class="hidden sm:inline">Add line / camera</span>
						</Button>
					</div>
				</div>

				<div class="space-y-3 md:hidden p-3">
					{#if localLineItems().length === 0}
						<div class="rounded-sm border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
							<p class="text-sm text-muted-foreground">No line items yet.</p>
					</div>
				{/if}

				{#each localLineItems() as item (item.id)}
					<LineItemCard
						{item}
						labourRate={localEstimate.labour_rate}
						paintRate={localEstimate.paint_rate}
						selected={selectedItems.has(item.id!)}
						onToggleSelect={() => handleToggleSelect(item.id!)}
						onUpdateDescription={(value) => updateDescription(item.id!, value)}
						onUpdateProcessType={(value) => updateProcessType(item.id!, item, value as ProcessType)}
						onUpdatePartType={(value) => updatePartType(item.id!, item, value as PartType)}
						onEditPartPrice={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
						onEditSA={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
						onEditLabour={() => handleLabourClick(item.id!, item.labour_hours || null)}
						onEditPaint={() => handlePaintClick(item.id!, item.paint_panels || null)}
						onEditOutwork={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
						onEditBetterment={() => {}}
						onDelete={() => handleDeleteLineItem(item.id!)}
						showBetterment={false}
					/>
				{/each}

				<Card class="space-y-3 rounded-sm border border-dashed border-border bg-muted/20 p-3">
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<h4 class="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
								Add line item
							</h4>
							<Button variant="ghost" size="sm" onclick={resetSkeleton}>
								<span class="text-xs">Clear</span>
							</Button>
						</div>

						<div class="grid gap-3">
							<div>
								<label class="mb-1 block text-xs font-medium text-muted-foreground">Process Type</label>
								<select
									value={skeletonProcessType}
									onchange={(e) => handleSkeletonProcessTypeChange(e.currentTarget.value as ProcessType)}
									class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
								>
									{#each processTypeOptions as option}
										<option value={option.value}>
											{option.value} - {option.label}
										</option>
									{/each}
								</select>
							</div>

							{#if skeletonProcessType === 'N'}
								<div>
									<label class="mb-1 block text-xs font-medium text-muted-foreground">Part Type</label>
									<select
										value={skeletonPartType}
										onchange={(e) => (skeletonPartType = e.currentTarget.value as PartType)}
										class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
									>
										<option value="OEM">OEM</option>
										<option value="ALT">ALT</option>
										<option value="2ND">2ND</option>
									</select>
								</div>
							{/if}

							<div>
								<label class="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
								<textarea
									bind:value={skeletonDescription}
									rows="2"
									class="flex w-full resize-none rounded-md border-0 bg-background px-0 py-0 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-pre-wrap break-words disabled:cursor-not-allowed disabled:opacity-50"
								></textarea>
							</div>

							<div class="grid grid-cols-2 gap-1.5 xl:grid-cols-4">
								<div class="rounded-sm border border-border bg-background p-1.5">
									<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
										Part
									</div>
									<Input
										type="text"
										inputmode="decimal"
										value={skeletonPartPriceNett}
										oninput={(e) => (skeletonPartPriceNett = e.currentTarget.value)}
										onblur={(e) => (skeletonPartPriceNett = normalizeMoneyInput(e.currentTarget.value))}
										class="h-8 text-right text-sm font-mono-tabular"
										placeholder="0.00"
										disabled={skeletonProcessType !== 'N'}
									/>
								</div>
								<div class="rounded-sm border border-border bg-background p-1.5">
									<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
										S&A
									</div>
									<Input
										type="text"
										inputmode="decimal"
										value={skeletonSAHours}
										oninput={(e) => (skeletonSAHours = e.currentTarget.value)}
										onblur={(e) => (skeletonSAHours = normalizeNumericInput(e.currentTarget.value))}
										class="h-8 text-right text-sm font-mono-tabular"
										placeholder="0"
										disabled={!['N', 'R', 'P', 'B'].includes(skeletonProcessType)}
									/>
								</div>
								<div class="rounded-sm border border-border bg-background p-1.5">
									<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
										Labour
									</div>
									<Input
										type="text"
										inputmode="decimal"
										value={skeletonLabourHours}
										oninput={(e) => (skeletonLabourHours = e.currentTarget.value)}
										onblur={(e) => (skeletonLabourHours = normalizeNumericInput(e.currentTarget.value))}
										class="h-8 text-right text-sm font-mono-tabular"
										placeholder="0"
										disabled={!['N', 'R', 'A'].includes(skeletonProcessType)}
									/>
								</div>
								<div class="rounded-sm border border-border bg-background p-1.5">
									<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
										Paint
									</div>
									<Input
										type="text"
										inputmode="decimal"
										value={skeletonPaintPanels}
										oninput={(e) => (skeletonPaintPanels = e.currentTarget.value)}
										onblur={(e) => (skeletonPaintPanels = normalizeNumericInput(e.currentTarget.value))}
										class="h-8 text-right text-sm font-mono-tabular"
										placeholder="0"
										disabled={!['N', 'R', 'P', 'B'].includes(skeletonProcessType)}
									/>
								</div>
							</div>

							{#if skeletonProcessType === 'O'}
								<div class="rounded-sm border border-border bg-background p-1.5 xl:col-span-4">
									<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
										Outwork
									</div>
									<Input
										type="text"
										inputmode="decimal"
										value={skeletonOutworkNett}
										oninput={(e) => (skeletonOutworkNett = e.currentTarget.value)}
										onblur={(e) => (skeletonOutworkNett = normalizeMoneyInput(e.currentTarget.value))}
										class="h-8 text-right text-sm font-mono-tabular"
										placeholder="0.00"
									/>
								</div>
							{/if}

							<div class="flex items-center justify-between gap-3">
								<div class="text-sm font-mono-tabular text-muted-foreground">
									{formatCurrencyValue(categoryTotals()?.subtotalExVat ?? 0)}
								</div>
								<Button onclick={handleAddSkeletonLine} size="sm">
									<Plus class="mr-2 h-4 w-4" />
									Add line
								</Button>
							</div>
						</div>
					</div>
				</Card>
			</div>

			<div class="hidden md:block">
				<Table.Root class="table-fixed">
					<Table.Header class="sticky top-0 z-10 bg-background">
						<Table.Row class="border-b border-border hover:bg-transparent">
							<Table.Head class="w-14 px-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
							</Table.Head>
							<Table.Head class="w-[112px] px-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
								Type / Part
							</Table.Head>
							<Table.Head class="px-3 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
								Description
							</Table.Head>
							<Table.Head class="w-[440px] px-2 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
								Costs
							</Table.Head>
							<Table.Head class="w-28 px-2 text-right text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
								Total
							</Table.Head>
							<Table.Head class="w-20 px-2 text-right text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
								Actions
							</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#if localLineItems().length === 0}
							<Table.Row>
								<Table.Cell colspan={6} class="py-8 text-center text-sm text-muted-foreground">
									No line items yet. Use the add row below or the Add line / camera button.
								</Table.Cell>
							</Table.Row>
						{/if}

						{#each localLineItems() as item (item.id)}
							<Table.Row class="align-top hover:bg-muted/40">
								<Table.Cell class="px-2 py-2">
									<input
										type="checkbox"
										checked={selectedItems.has(item.id!)}
										onchange={() => handleToggleSelect(item.id!)}
										class="h-4 w-4 rounded border-border"
										aria-label="Select item"
									/>
								</Table.Cell>

								<Table.Cell class="px-2 py-2">
									<div class="space-y-2">
										<select
											value={item.process_type}
											onchange={(e) =>
												updateProcessType(item.id!, item, e.currentTarget.value as ProcessType)}
											class="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
										>
											{#each processTypeOptions as option}
												<option value={option.value}>
													{option.value} - {option.label}
												</option>
											{/each}
										</select>

										{#if item.process_type === 'N'}
											<select
												value={item.part_type || 'OEM'}
												onchange={(e) =>
													updatePartType(item.id!, item, e.currentTarget.value as PartType)}
												class="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
											>
												<option value="OEM">OEM</option>
												<option value="ALT">ALT</option>
												<option value="2ND">2ND</option>
											</select>
										{:else}
											<div class="rounded-md border border-dashed border-border px-2 py-1.5 text-sm text-muted-foreground">
												-
											</div>
										{/if}
									</div>
								</Table.Cell>

								<Table.Cell class="px-3 py-2 align-top">
									<textarea
										rows="2"
										value={item.description}
										oninput={(e) => updateDescription(item.id!, e.currentTarget.value)}
										onblur={(e) => {
											updateDescription(item.id!, e.currentTarget.value);
											void saveNow();
										}}
										class="flex w-full resize-none rounded-md border-0 bg-background px-0 py-0 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-pre-wrap break-words disabled:cursor-not-allowed disabled:opacity-50"
										placeholder="Description"
									></textarea>
								</Table.Cell>

								<Table.Cell class="px-2 py-2 align-top">
									<div class="grid grid-cols-[112px_66px_66px_82px_98px] gap-1">
										<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
											<div class="text-[10px] uppercase tracking-wide text-muted-foreground">
												Part
											</div>
											{#if item.process_type === 'N'}
												{#if editingPartPrice === item.id}
													<Input
														type="text"
														inputmode="decimal"
														bind:value={tempPartPriceNett}
														onkeydown={(e) => handleInputKeydown(e, 'part')}
														onblur={() => commitPartPrice(item.id!, item)}
														class="h-7 border-0 p-0 text-right text-xs font-mono-tabular focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
												{:else}
													<button
														type="button"
														onclick={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
														class="block w-full truncate text-right text-xs font-mono-tabular font-medium text-foreground hover:text-foreground/70"
													>
														{formatCurrencyValue(item.part_price || 0)}
													</button>
												{/if}
											{:else}
												<span class="text-xs text-muted-foreground">-</span>
											{/if}
										</div>

										<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
											<div class="text-[10px] uppercase tracking-wide text-muted-foreground">
												S&A
											</div>
											{#if isApplicable(item.process_type, 'sa')}
												{#if editingSA === item.id}
													<Input
														type="text"
														inputmode="decimal"
														bind:value={tempSAHours}
														onkeydown={(e) => handleInputKeydown(e, 'sa')}
														onblur={() => commitSA(item.id!)}
														class="h-7 border-0 p-0 text-right text-xs font-mono-tabular focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
												{:else}
													<button
														type="button"
														onclick={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
														class="block w-full truncate text-right text-xs font-mono-tabular font-medium text-foreground hover:text-foreground/70"
													>
														{formatCurrencyValue(item.strip_assemble || 0)}
													</button>
												{/if}
											{:else}
												<span class="text-xs text-muted-foreground">-</span>
											{/if}
										</div>

										<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
											<div class="text-[10px] uppercase tracking-wide text-muted-foreground">
												Labour
											</div>
											{#if isApplicable(item.process_type, 'labour')}
												{#if editingLabour === item.id}
													<Input
														type="text"
														inputmode="decimal"
														bind:value={tempLabourHours}
														onkeydown={(e) => handleInputKeydown(e, 'labour')}
														onblur={() => commitLabour(item.id!)}
														class="h-7 border-0 p-0 text-right text-xs font-mono-tabular focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
												{:else}
													<button
														type="button"
														onclick={() => handleLabourClick(item.id!, item.labour_hours || null)}
														class="block w-full truncate text-right text-xs font-mono-tabular font-medium text-foreground hover:text-foreground/70"
													>
														{formatCurrencyValue(item.labour_cost || 0)}
													</button>
												{/if}
											{:else}
												<span class="text-xs text-muted-foreground">-</span>
											{/if}
										</div>

										<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
											<div class="text-[10px] uppercase tracking-wide text-muted-foreground">
												Paint
											</div>
											{#if isApplicable(item.process_type, 'paint')}
												{#if editingPaint === item.id}
													<Input
														type="text"
														inputmode="decimal"
														bind:value={tempPaintPanels}
														onkeydown={(e) => handleInputKeydown(e, 'paint')}
														onblur={() => commitPaint(item.id!)}
														class="h-7 border-0 p-0 text-right text-xs font-mono-tabular focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
												{:else}
													<button
														type="button"
														onclick={() => handlePaintClick(item.id!, item.paint_panels || null)}
														class="block w-full truncate text-right text-xs font-mono-tabular font-medium text-foreground hover:text-foreground/70"
													>
														{formatCurrencyValue(item.paint_cost || 0)}
													</button>
												{/if}
											{:else}
												<span class="text-xs text-muted-foreground">-</span>
											{/if}
										</div>

										<div class="rounded-sm border bg-background px-1.5 py-1 text-right">
											<div class="text-[10px] uppercase tracking-wide text-muted-foreground">
												Outwork
											</div>
											{#if isApplicable(item.process_type, 'outwork')}
												{#if editingOutwork === item.id}
													<Input
														type="text"
														inputmode="decimal"
														bind:value={tempOutworkNett}
														onkeydown={(e) => handleInputKeydown(e, 'outwork')}
														onblur={() => commitOutwork(item.id!)}
														class="h-7 border-0 p-0 text-right text-xs font-mono-tabular focus-visible:ring-0 focus-visible:ring-offset-0"
														autofocus
													/>
												{:else}
													<button
														type="button"
														onclick={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
														class="block w-full truncate text-right text-xs font-mono-tabular font-medium text-foreground hover:text-foreground/70"
													>
														{formatCurrencyValue(item.outwork_charge || 0)}
													</button>
												{/if}
											{:else}
												<span class="text-xs text-muted-foreground">-</span>
											{/if}
										</div>
									</div>
								</Table.Cell>

								<Table.Cell class="px-2 py-2 text-right font-mono-tabular text-sm font-semibold">
									{formatCurrencyValue(item.total || 0)}
								</Table.Cell>

								<Table.Cell class="px-2 py-2 text-right">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleDeleteLineItem(item.id!)}
										class="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}

						<Table.Row>
							<Table.Cell colspan={6} class="bg-muted/20 p-3">
								<div class="rounded-sm border border-dashed border-border bg-background/70 p-3">
									<div class="flex items-center justify-between gap-3 pb-3">
										<div>
											<h4 class="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
												Add line item
											</h4>
											<p class="text-xs text-muted-foreground">Persistent inline entry row.</p>
										</div>
										<Button variant="ghost" size="sm" onclick={resetSkeleton}>
											<span class="text-xs">Clear</span>
										</Button>
									</div>

									<div class="grid gap-3 xl:grid-cols-[150px_110px_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
										<div class="space-y-1">
											<label class="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
												Process
											</label>
											<select
												value={skeletonProcessType}
												onchange={(e) =>
													handleSkeletonProcessTypeChange(e.currentTarget.value as ProcessType)}
												class="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
											>
												{#each processTypeOptions as option}
													<option value={option.value}>
														{option.value} - {option.label}
													</option>
												{/each}
											</select>
										</div>

										{#if skeletonProcessType === 'N'}
											<div class="space-y-1">
												<label class="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
													Part
												</label>
												<select
													value={skeletonPartType}
													onchange={(e) => (skeletonPartType = e.currentTarget.value as PartType)}
													class="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
												>
													<option value="OEM">OEM</option>
													<option value="ALT">ALT</option>
													<option value="2ND">2ND</option>
												</select>
											</div>
										{/if}

										<div class="space-y-1">
											<label class="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
												Description
											</label>
											<textarea
												bind:value={skeletonDescription}
												rows="2"
												class="flex w-full resize-none rounded-md border-0 bg-background px-0 py-0 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-pre-wrap break-words disabled:cursor-not-allowed disabled:opacity-50"
												placeholder="Description"
											></textarea>
										</div>

										<div class="grid grid-cols-2 gap-1.5 xl:grid-cols-4">
											<div class="rounded-sm border border-border bg-background p-1.5">
												<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
													Part
												</div>
												<Input
													type="text"
													inputmode="decimal"
													bind:value={skeletonPartPriceNett}
													onblur={(e) => (skeletonPartPriceNett = normalizeMoneyInput(e.currentTarget.value))}
													class="h-8 text-right text-sm font-mono-tabular"
													placeholder="0.00"
													disabled={skeletonProcessType !== 'N'}
												/>
											</div>
											<div class="rounded-sm border border-border bg-background p-1.5">
												<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
													S&A
												</div>
												<Input
													type="text"
													inputmode="decimal"
													bind:value={skeletonSAHours}
													onblur={(e) => (skeletonSAHours = normalizeNumericInput(e.currentTarget.value))}
													class="h-8 text-right text-sm font-mono-tabular"
													placeholder="0"
													disabled={!['N', 'R', 'P', 'B'].includes(skeletonProcessType)}
												/>
											</div>
											<div class="rounded-sm border border-border bg-background p-1.5">
												<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
													Labour
												</div>
												<Input
													type="text"
													inputmode="decimal"
													bind:value={skeletonLabourHours}
													onblur={(e) => (skeletonLabourHours = normalizeNumericInput(e.currentTarget.value))}
													class="h-8 text-right text-sm font-mono-tabular"
													placeholder="0"
													disabled={!['N', 'R', 'A'].includes(skeletonProcessType)}
												/>
											</div>
											<div class="rounded-sm border border-border bg-background p-1.5">
												<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
													Paint
												</div>
												<Input
													type="text"
													inputmode="decimal"
													bind:value={skeletonPaintPanels}
													onblur={(e) => (skeletonPaintPanels = normalizeNumericInput(e.currentTarget.value))}
													class="h-8 text-right text-sm font-mono-tabular"
													placeholder="0"
													disabled={!['N', 'R', 'P', 'B'].includes(skeletonProcessType)}
												/>
											</div>
										</div>

										{#if skeletonProcessType === 'O'}
											<div class="space-y-1 xl:col-span-4">
												<label class="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
													Outwork
												</label>
												<Input
													type="text"
													inputmode="decimal"
													bind:value={skeletonOutworkNett}
													onblur={(e) => (skeletonOutworkNett = normalizeMoneyInput(e.currentTarget.value))}
													class="h-8 text-right text-sm font-mono-tabular"
													placeholder="0.00"
												/>
											</div>
										{/if}

										<div class="flex items-center justify-between gap-3">
											<div class="text-sm font-mono-tabular text-muted-foreground">
												{formatCurrencyValue(categoryTotals()?.subtotalExVat ?? 0)}
											</div>
											<Button onclick={handleAddSkeletonLine} size="sm">
												<Plus class="mr-2 h-4 w-4" />
												Add line
											</Button>
										</div>
									</div>
								</div>
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
			</div>
		</Card>

		<TotalsStrip
			fields={stripFields}
			totalValue={categoryTotals()?.totalIncVat}
			onDetailsClick={() => (totalsDetailsOpen = true)}
			{saving}
			saved={justSaved}
			onSaveClick={saveNow}
			saveDisabled={!dirty || saving}
			onCompleteClick={handleCompleteClick}
			completeDisabled={!validation.isComplete || saving}
			completeLabel="Complete Pre-Incident Estimate"
		/>

		<TotalsBreakdownDialog
			rows={breakdownRows}
			title="Totals Breakdown"
			description="Derived from the local line items and rates."
			bind:open={totalsDetailsOpen}
			onOpenChange={(open) => (totalsDetailsOpen = open)}
		/>

		<PreIncidentPhotosPanel
			estimateId={localEstimate.id}
			{assessmentId}
			photos={estimatePhotos}
			onUpdate={onPhotosUpdate}
		/>
	{/if}
</div>
