<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { PageData, ActionData } from './$types';
	import type { ShopJobStatus } from '$lib/services/shop-job.service';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Table from '$lib/components/ui/table';
	import ShopPhotosPanel from '$lib/components/shop/ShopPhotosPanel.svelte';
	import LineItemCard from '$lib/components/assessment/LineItemCard.svelte';
	import QuickAddLineItem from '$lib/components/assessment/QuickAddLineItem.svelte';
	import type { EstimateLineItem } from '$lib/types/assessment';
	import {
		calculateVAT,
		calculateTotal,
		recalculateLineItem
	} from '$lib/utils/estimateCalculations';
	import { formatCurrency } from '$lib/utils/formatters';
	import { Trash2, ShieldCheck, Package, Recycle, Percent, CheckCircle, ChevronDown, FileText, Download, Wrench, ClipboardList, Car, Receipt, DollarSign, ArrowRight } from 'lucide-svelte';
	import { getProcessTypeBadgeColor, getProcessTypeConfig, getProcessTypeOptions } from '$lib/constants/processTypes';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Status workflow order (excluding cancelled)
	const STATUS_STEPS: ShopJobStatus[] = [
		'quote_requested',
		'quoted',
		'approved',
		'checked_in',
		'in_progress',
		'quality_check',
		'ready_for_collection',
		'completed'
	];

	const STATUS_LABELS: Record<ShopJobStatus, string> = {
		quote_requested: 'Quote Requested',
		quoted: 'Quoted',
		approved: 'Approved',
		checked_in: 'Checked In',
		in_progress: 'In Progress',
		quality_check: 'Quality Check',
		ready_for_collection: 'Ready',
		completed: 'Completed',
		cancelled: 'Cancelled'
	};

	const VALID_TRANSITIONS: Record<ShopJobStatus, ShopJobStatus[]> = {
		quote_requested: ['quoted', 'cancelled'],
		quoted: ['approved', 'cancelled'],
		approved: ['checked_in', 'cancelled'],
		checked_in: ['in_progress', 'cancelled'],
		in_progress: ['quality_check', 'cancelled'],
		quality_check: ['ready_for_collection', 'in_progress'],
		ready_for_collection: ['completed'],
		completed: [],
		cancelled: []
	};

	type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

	const statusBadgeVariant: Record<ShopJobStatus, StatusVariant> = {
		quote_requested: 'secondary',
		quoted: 'default',
		approved: 'default',
		checked_in: 'secondary',
		in_progress: 'secondary',
		quality_check: 'default',
		ready_for_collection: 'default',
		completed: 'default',
		cancelled: 'destructive'
	};

	const jobTypeBadgeVariant: Record<string, StatusVariant> = {
		autobody: 'default',
		mechanical: 'secondary'
	};

	let job = $derived(data.job);
	let saving = $state(false);
	let statusUpdating = $state(false);
	let creatingInvoice = $state(false);

	const existingInvoice = $derived(data.existingInvoice);
	const canCreateInvoice = $derived(
		job.status === 'ready_for_collection' || job.status === 'completed'
	);

	let currentStepIndex = $derived(STATUS_STEPS.indexOf(job.status as ShopJobStatus));

	let nextStatus = $derived(
		VALID_TRANSITIONS[job.status as ShopJobStatus]?.find(
			(s) => s !== 'cancelled' && STATUS_STEPS.includes(s)
		) ?? null
	);

	const STEP_TAB_MAP: Record<string, string> = {
		'quoted': 'estimate',
		'approved': 'estimate',
		'checked_in': 'work',
		'in_progress': 'work',
		'quality_check': 'work',
		'ready_for_collection': 'overview',
		'completed': 'invoice',
	};

	function getStepTimestamp(step: string): string | null {
		const history = (job.status_history as Array<{ status: string; timestamp: string }>) || [];
		const entry = history.find(h => h.status === step);
		return entry?.timestamp ?? null;
	}

	function formatStepDate(timestamp: string | null): string {
		if (!timestamp) return '';
		const d = new Date(timestamp);
		return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ', ' +
			   d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
	}

	let transitioning = $state(false);

	async function handleStepClick(step: ShopJobStatus) {
		const nextStatuses = VALID_TRANSITIONS[job.status as ShopJobStatus] || [];
		if (!nextStatuses.includes(step) || transitioning) return;

		transitioning = true;
		try {
			const formData = new FormData();
			formData.set('status', step);
			const response = await fetch('?/updateStatus', { method: 'POST', body: formData });

			if (response.ok) {
				toast.success(`Moved to ${STATUS_LABELS[step]}`);
				activeTab = STEP_TAB_MAP[step] || 'overview';
				await invalidateAll();
			} else {
				toast.error('Failed to update status');
			}
		} catch {
			toast.error('Failed to update status');
		} finally {
			transitioning = false;
		}
	}

	// Tab visibility based on status
	const statusIndex = $derived(STATUS_STEPS.indexOf(job.status as ShopJobStatus));
	const showBooking = $derived(statusIndex >= STATUS_STEPS.indexOf('approved'));
	const showWork = $derived(statusIndex >= STATUS_STEPS.indexOf('checked_in'));
	const showInvoice = $derived(statusIndex >= STATUS_STEPS.indexOf('ready_for_collection'));

	let activeTab = $state('overview');

	// Photos from server
	const photos = $derived(data.photos ?? []);

	async function refreshPhotos() {
		await invalidateAll();
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Reactive local editable fields
	let notes = $state(job.notes ?? '');
	let datepromised = $state(job.date_promised ?? '');
	let damageDescription = $state(job.damage_description ?? '');
	let complaint = $state(job.complaint ?? '');
	let diagnosis = $state(job.diagnosis ?? '');
	let faultCodes = $state(job.fault_codes ?? '');

	// Linked estimates (array from join)
	let estimates = $derived(Array.isArray(job.shop_estimates) ? job.shop_estimates : []);

	// Vehicle Check-In Details state
	let vehicleMileage = $state<string>(String(job.vehicle_mileage ?? ''));
	let vehicleVin = $state<string>(job.vehicle_vin ?? '');
	let engineNumber = $state<string>((job as Record<string, unknown>).engine_number as string ?? '');
	let vehicleReg = $state<string>(job.vehicle_reg ?? '');
	let vehicleDetailsDirty = $state(false);
	let savingVehicleDetails = $state(false);

	let vehicleSaveTimeout: ReturnType<typeof setTimeout>;

	function scheduleVehicleSave() {
		vehicleDetailsDirty = true;
		clearTimeout(vehicleSaveTimeout);
		vehicleSaveTimeout = setTimeout(() => saveVehicleDetails(), 1500);
	}

	async function saveVehicleDetails() {
		if (!vehicleDetailsDirty || savingVehicleDetails) return;
		savingVehicleDetails = true;
		try {
			const form = new FormData();
			form.append('vehicle_mileage', vehicleMileage);
			form.append('vehicle_vin', vehicleVin);
			form.append('engine_number', engineNumber);
			form.append('vehicle_reg', vehicleReg);
			await fetch('?/updateVehicleDetails', { method: 'POST', body: form });
			vehicleDetailsDirty = false;
		} finally {
			savingVehicleDetails = false;
		}
	}

	// ── Estimate inline editor ────────────────────────────────────────────────

	const estimate = $derived(data.estimate);
	const canEditEstimate = $derived(
		estimate != null &&
		['draft', 'revised'].includes((estimate as { status?: string }).status ?? '')
	);

	let labourRate = $state(data.labourRate ?? 450);
	let paintRate = $state(data.paintRate ?? 350);
	let oemMarkup = $state(data.oemMarkup ?? 25);
	let altMarkup = $state(data.altMarkup ?? 25);
	let secondHandMarkup = $state(data.secondHandMarkup ?? 25);
	let outworkMarkup = $state(data.outworkMarkup ?? 25);
	const vatRate = $derived(data.vatRate ?? 15);

	// Sync rates from server data when page data updates
	$effect(() => {
		labourRate = data.labourRate ?? 450;
		paintRate = data.paintRate ?? 350;
		oemMarkup = data.oemMarkup ?? 25;
		altMarkup = data.altMarkup ?? 25;
		secondHandMarkup = data.secondHandMarkup ?? 25;
		outworkMarkup = data.outworkMarkup ?? 25;
	});

	let showRatesPanel = $state(false);
	let savingRates = $state(false);
	let ratesSaveTimer: ReturnType<typeof setTimeout>;

	let lineItems = $state<EstimateLineItem[]>(
		Array.isArray((data.estimate as { line_items?: EstimateLineItem[] } | null)?.line_items)
			? [...((data.estimate as { line_items: EstimateLineItem[] }).line_items)]
			: []
	);
	let estimateDirty = $state(false);
	let savingLineItems = $state(false);

	let saveTimer: ReturnType<typeof setTimeout>;

	function scheduleEstimateAutoSave() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveEstimateLineItemsNow(), 1000);
	}

	async function saveEstimateLineItemsNow() {
		const est = estimate as { id?: string } | null;
		if (!estimateDirty || savingLineItems || !est?.id) return;
		savingLineItems = true;
		try {
			const fd = new FormData();
			fd.append('estimate_id', est.id);
			fd.append('line_items', JSON.stringify(lineItems));
			fd.append('vat_rate', String(vatRate));
			fd.append('oem_markup_pct', String(oemMarkup));
			fd.append('alt_markup_pct', String(altMarkup));
			fd.append('second_hand_markup_pct', String(secondHandMarkup));
			fd.append('outwork_markup_pct', String(outworkMarkup));
			await fetch('?/saveEstimateLineItems', { method: 'POST', body: fd });
			estimateDirty = false;
		} catch (err) {
			console.error('Auto-save failed:', err);
		} finally {
			savingLineItems = false;
		}
	}

	function addLineItem(item: EstimateLineItem) {
		lineItems = [...lineItems, { ...item, id: item.id ?? crypto.randomUUID() }];
		estimateDirty = true;
		scheduleEstimateAutoSave();
	}

	function updateEstimateFieldById(id: string, updates: Record<string, unknown>) {
		const index = lineItems.findIndex((item) => item.id === id);
		if (index === -1) return;
		let updated = { ...lineItems[index], ...updates };
		updated = recalculateLineItem(updated, labourRate, paintRate);
		lineItems = lineItems.map((item, i) => (i === index ? updated : item));
		estimateDirty = true;
		scheduleEstimateAutoSave();
	}

	function updateEstimateField(index: number, field: string, value: unknown) {
		const updated = { ...lineItems[index], [field]: value };
		const recalculated = recalculateLineItem(updated, labourRate, paintRate);
		lineItems = lineItems.map((it, i) => (i === index ? recalculated : it));
		estimateDirty = true;
		scheduleEstimateAutoSave();
	}

	function deleteLineItem(id: string | undefined) {
		lineItems = lineItems.filter((it) => it.id !== id);
		estimateDirty = true;
		scheduleEstimateAutoSave();
	}

	let descriptionTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

	function scheduleDescUpdate(id: string, value: string) {
		clearTimeout(descriptionTimeouts.get(id));
		descriptionTimeouts.set(
			id,
			setTimeout(() => {
				updateEstimateFieldById(id, { description: value });
			}, 500)
		);
	}

	function flushDescUpdate(id: string, value: string) {
		clearTimeout(descriptionTimeouts.get(id));
		updateEstimateFieldById(id, { description: value });
	}

	const processTypeOptions = getProcessTypeOptions();

	// Inline editing state
	let editingPartPrice = $state<string | null>(null);
	let tempPartPriceNett = $state<number | null>(null);
	let editingSA = $state<string | null>(null);
	let tempSAHours = $state<number | null>(null);
	let editingLabour = $state<string | null>(null);
	let tempLabourHours = $state<number | null>(null);
	let editingPaint = $state<string | null>(null);
	let tempPaintPanels = $state<number | null>(null);
	let editingOutwork = $state<string | null>(null);
	let tempOutworkNett = $state<number | null>(null);

	function handlePartPriceClick(id: string, currentNett: number | null) {
		editingPartPrice = id;
		tempPartPriceNett = currentNett;
	}

	function handlePartPriceSave(id: string, item: EstimateLineItem) {
		if (tempPartPriceNett !== null) {
			let markupPercentage = 0;
			if (item.part_type === 'OEM') markupPercentage = oemMarkup;
			else if (item.part_type === 'ALT') markupPercentage = altMarkup;
			else if (item.part_type === '2ND') markupPercentage = secondHandMarkup;
			const sellingPrice = tempPartPriceNett * (1 + markupPercentage / 100);
			updateEstimateFieldById(id, {
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

	function handleSAClick(id: string, currentHours: number | null) {
		editingSA = id;
		tempSAHours = currentHours;
	}

	function handleSASave(id: string) {
		if (tempSAHours !== null) {
			updateEstimateFieldById(id, {
				strip_assemble_hours: tempSAHours,
				strip_assemble: tempSAHours * labourRate
			});
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

	function handleLabourSave(id: string) {
		if (tempLabourHours !== null) {
			updateEstimateFieldById(id, {
				labour_hours: tempLabourHours,
				labour_cost: tempLabourHours * labourRate
			});
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

	function handlePaintSave(id: string) {
		if (tempPaintPanels !== null) {
			updateEstimateFieldById(id, {
				paint_panels: tempPaintPanels,
				paint_cost: tempPaintPanels * paintRate
			});
		}
		editingPaint = null;
		tempPaintPanels = null;
	}

	function handlePaintCancel() {
		editingPaint = null;
		tempPaintPanels = null;
	}

	function handleOutworkClick(id: string, currentNett: number | null) {
		editingOutwork = id;
		tempOutworkNett = currentNett;
	}

	function handleOutworkSave(id: string) {
		if (tempOutworkNett !== null) {
			const sellingPrice = tempOutworkNett * (1 + outworkMarkup / 100);
			updateEstimateFieldById(id, {
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

	function scheduleRatesSave() {
		clearTimeout(ratesSaveTimer);
		ratesSaveTimer = setTimeout(() => saveRatesNow(), 1000);
	}

	async function saveRatesNow() {
		const est = estimate as { id?: string } | null;
		if (!est?.id || savingRates) return;
		savingRates = true;
		try {
			const fd = new FormData();
			fd.append('estimate_id', est.id);
			fd.append('labour_rate', String(labourRate));
			fd.append('paint_rate', String(paintRate));
			fd.append('oem_markup_pct', String(oemMarkup));
			fd.append('alt_markup_pct', String(altMarkup));
			fd.append('second_hand_markup_pct', String(secondHandMarkup));
			fd.append('outwork_markup_pct', String(outworkMarkup));
			const response = await fetch('?/updateEstimateRates', { method: 'POST', body: fd });
			if (response.ok) {
				toast.success('Rates updated');
			} else {
				toast.error('Failed to save rates');
			}
		} catch {
			toast.error('Failed to save rates');
		} finally {
			savingRates = false;
		}
	}

	// Category totals breakdown (matching assessment EstimateTab pattern)
	const partsNett = $derived(
		lineItems.filter(i => i.process_type === 'N').reduce((sum, i) => sum + (i.part_price_nett || 0), 0)
	);
	const saTotal = $derived(lineItems.reduce((sum, i) => sum + (i.strip_assemble || 0), 0));
	const labourTotalCalc = $derived(lineItems.reduce((sum, i) => sum + (i.labour_cost || 0), 0));
	const paintTotalCalc = $derived(lineItems.reduce((sum, i) => sum + (i.paint_cost || 0), 0));
	const outworkNett = $derived(
		lineItems.filter(i => i.process_type === 'O').reduce((sum, i) => sum + (i.outwork_charge_nett || 0), 0)
	);

	// Aggregate markup (parts by type + outwork)
	const markupTotal = $derived.by(() => {
		let partsMarkup = 0;
		for (const item of lineItems) {
			if (item.process_type === 'N' && item.part_price_nett) {
				let m = 0;
				if (item.part_type === 'OEM') m = oemMarkup;
				else if (item.part_type === 'ALT') m = altMarkup;
				else if (item.part_type === '2ND') m = secondHandMarkup;
				partsMarkup += item.part_price_nett * (m / 100);
			}
		}
		const owMarkup = outworkNett * (outworkMarkup / 100);
		return Number((partsMarkup + owMarkup).toFixed(2));
	});

	const estimateSubtotal = $derived(
		Number((partsNett + saTotal + labourTotalCalc + paintTotalCalc + outworkNett + markupTotal).toFixed(2))
	);
	const estimateVatAmount = $derived(calculateVAT(estimateSubtotal, vatRate));
	const estimateTotal = $derived(calculateTotal(estimateSubtotal, estimateVatAmount));

	let estimateNotes = $state<string>(
		(data.estimate as { notes?: string } | null)?.notes ?? ''
	);
	let savingEstimateNotes = $state(false);

	type EstimateStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'revised' | 'expired';

	const estimateStatusVariant: Record<EstimateStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
		draft: 'secondary',
		sent: 'default',
		approved: 'default',
		declined: 'destructive',
		revised: 'secondary',
		expired: 'outline'
	};

	const estimateStatusLabel: Record<EstimateStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		approved: 'Approved',
		declined: 'Declined',
		revised: 'Revised',
		expired: 'Expired'
	};

	function getEstimateStatusVariant(s: string) {
		return estimateStatusVariant[s as EstimateStatus] ?? 'secondary';
	}

	function getEstimateStatusLabel(s: string) {
		return estimateStatusLabel[s as EstimateStatus] ?? s;
	}

	// PDF generation state
	let generatingPdf = $state(false);
	let pdfProgress = $state(0);
	let pdfMessage = $state('');
	let currentPdfUrl = $state<string | null>(
		(data.estimate as { pdf_url?: string | null } | null)?.pdf_url ?? null
	);

	// Sync pdf_url when estimate data updates
	$effect(() => {
		const est = data.estimate as { pdf_url?: string | null } | null;
		if (est?.pdf_url !== undefined) {
			currentPdfUrl = est.pdf_url ?? null;
		}
	});

	async function handleGeneratePDF() {
		const est = estimate as { id?: string } | null;
		if (!est?.id || generatingPdf) return;

		generatingPdf = true;
		pdfProgress = 0;
		pdfMessage = 'Starting...';

		try {
			const response = await fetch('/api/generate-shop-estimate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ estimateId: est.id })
			});

			if (!response.ok || !response.body) {
				toast.error('Failed to start PDF generation');
				generatingPdf = false;
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					try {
						const event = JSON.parse(line.slice(6));
						if (event.status === 'processing' || event.status === 'progress') {
							pdfProgress = event.progress ?? pdfProgress;
							pdfMessage = event.message ?? pdfMessage;
						} else if (event.status === 'complete') {
							pdfProgress = 100;
							pdfMessage = 'Complete';
							currentPdfUrl = event.url;
							toast.success('PDF generated successfully');
							generatingPdf = false;
						} else if (event.status === 'error') {
							toast.error(event.error ?? 'PDF generation failed');
							generatingPdf = false;
						}
					} catch {
						// ignore malformed SSE lines
					}
				}
			}
		} catch (err) {
			console.error('PDF generation error:', err);
			toast.error('Failed to generate PDF');
		} finally {
			generatingPdf = false;
		}
	}

	async function handleDownloadPDF() {
		if (!currentPdfUrl) return;
		try {
			const res = await fetch(currentPdfUrl);
			if (!res.ok) { toast.error('Failed to download PDF'); return; }
			const blob = await res.blob();
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = `${job.job_number ?? 'estimate'}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(a.href);
		} catch {
			toast.error('Failed to download PDF');
		}
	}

</script>

<div class="space-y-6 pt-4">
	<!-- Header -->
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="sm" href="/shop/jobs">&larr; Jobs</Button>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-semibold text-gray-900">{job.job_number}</h1>
				<Badge variant={statusBadgeVariant[job.status as ShopJobStatus] ?? 'secondary'}>
					{STATUS_LABELS[job.status as ShopJobStatus] ?? job.status}
				</Badge>
				<Badge variant={jobTypeBadgeVariant[job.job_type] ?? 'secondary'}>
					{job.job_type === 'autobody' ? 'Autobody' : 'Mechanical'}
				</Badge>

			</div>
		</div>
	</div>

	<!-- Error message -->
	{#if form?.error}
		<p class="text-sm text-red-600">{form.error}</p>
	{/if}

	<!-- Tabbed layout -->
	<Tabs.Root bind:value={activeTab}>
		<Tabs.List class="flex h-auto w-full snap-x snap-mandatory gap-1.5 overflow-x-auto bg-transparent p-0 pb-2 scrollbar-hide sm:flex sm:snap-none sm:gap-2 sm:overflow-visible sm:pb-0">
			<Tabs.Trigger value="overview" class="relative flex h-8 min-w-[4.5rem] shrink-0 snap-start items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm sm:h-9 sm:px-3 sm:py-2 sm:text-sm">
				<ClipboardList class="h-3.5 w-3.5" />
				Overview
			</Tabs.Trigger>
			{#if showBooking}
				<Tabs.Trigger value="booking" class="relative flex h-8 min-w-[4.5rem] shrink-0 snap-start items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm sm:h-9 sm:px-3 sm:py-2 sm:text-sm">
					<Car class="h-3.5 w-3.5" />
					Booking
				</Tabs.Trigger>
			{/if}
			<Tabs.Trigger value="estimate" class="relative flex h-8 min-w-[4.5rem] shrink-0 snap-start items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm sm:h-9 sm:px-3 sm:py-2 sm:text-sm">
				<DollarSign class="h-3.5 w-3.5" />
				Estimate
			</Tabs.Trigger>
			{#if showWork}
				<Tabs.Trigger value="work" class="relative flex h-8 min-w-[4.5rem] shrink-0 snap-start items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm sm:h-9 sm:px-3 sm:py-2 sm:text-sm">
					<Wrench class="h-3.5 w-3.5" />
					Work
				</Tabs.Trigger>
			{/if}
			{#if showInvoice}
				<Tabs.Trigger value="invoice" class="relative flex h-8 min-w-[4.5rem] shrink-0 snap-start items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-offset-background transition-all hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-sm sm:h-9 sm:px-3 sm:py-2 sm:text-sm">
					<Receipt class="h-3.5 w-3.5" />
					Invoice
				</Tabs.Trigger>
			{/if}
		</Tabs.List>

		<!-- OVERVIEW TAB -->
		<Tabs.Content value="overview">
			<div class="mt-4 space-y-6">
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!-- Customer Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Customer</Card.Title>
						</Card.Header>
						<Card.Content>
							{#if job.shop_customers}
								<div class="space-y-2 text-sm">
									<p class="font-medium text-gray-900">{job.shop_customers.name}</p>
									{#if job.shop_customers.phone}
										<p class="text-gray-600">
											<span class="text-gray-400">Phone:</span>
											{job.shop_customers.phone}
										</p>
									{/if}
									{#if job.shop_customers.email}
										<p class="text-gray-600">
											<span class="text-gray-400">Email:</span>
											{job.shop_customers.email}
										</p>
									{/if}
									<Button
										variant="link"
										size="sm"
										href="/shop/customers/{job.customer_id}"
										class="mt-2 h-auto p-0 text-xs"
									>
										View customer profile &rarr;
									</Button>
								</div>
							{:else}
								<div class="space-y-2 text-sm">
									<p class="font-medium text-gray-900">{job.customer_name}</p>
									{#if job.customer_phone}
										<p class="text-gray-600">
											<span class="text-gray-400">Phone:</span>
											{job.customer_phone}
										</p>
									{/if}
									{#if job.customer_email}
										<p class="text-gray-600">
											<span class="text-gray-400">Email:</span>
											{job.customer_email}
										</p>
									{/if}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Vehicle Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Vehicle</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2 text-sm">
								<p class="font-medium text-gray-900">
									{job.vehicle_year ? `${job.vehicle_year} ` : ''}{job.vehicle_make}
									{job.vehicle_model}
								</p>
								{#if job.vehicle_reg}
									<p class="text-gray-600">
										<span class="text-gray-400">Reg:</span>
										{job.vehicle_reg}
									</p>
								{/if}
								{#if job.vehicle_vin}
									<p class="text-gray-600">
										<span class="text-gray-400">VIN:</span>
										{job.vehicle_vin}
									</p>
								{/if}
								{#if job.vehicle_color}
									<p class="text-gray-600">
										<span class="text-gray-400">Color:</span>
										{job.vehicle_color}
									</p>
								{/if}
								{#if job.vehicle_mileage}
									<p class="text-gray-600">
										<span class="text-gray-400">Mileage:</span>
										{job.vehicle_mileage.toLocaleString()} km
									</p>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Job Details Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Job Details</Card.Title>
						</Card.Header>
						<Card.Content>
							<form
								method="POST"
								action="?/update"
								use:enhance={() => {
									saving = true;
									return async ({ result, update }) => {
										saving = false;
										if (result.type === 'success') {
											toast.success('Details saved');
										} else if (result.type === 'failure') {
											toast.error((result.data as { error?: string })?.error || 'Something went wrong');
										}
										await update({ reset: false });
									};
								}}
								class="space-y-4 text-sm"
							>
								{#if job.job_type === 'autobody'}
									<div>
										<label for="damage_description" class="block text-xs font-medium text-gray-500">
											Damage Description
										</label>
										<textarea
											id="damage_description"
											name="damage_description"
											rows="3"
											bind:value={damageDescription}
											class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
										></textarea>
									</div>
								{:else}
									<div>
										<label for="complaint" class="block text-xs font-medium text-gray-500">
											Customer Complaint
										</label>
										<textarea
											id="complaint"
											name="complaint"
											rows="2"
											bind:value={complaint}
											class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
										></textarea>
									</div>
									<div>
										<label for="diagnosis" class="block text-xs font-medium text-gray-500">
											Diagnosis
										</label>
										<textarea
											id="diagnosis"
											name="diagnosis"
											rows="2"
											bind:value={diagnosis}
											class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
										></textarea>
									</div>
									<div>
										<label for="fault_codes" class="block text-xs font-medium text-gray-500">
											Fault Codes
										</label>
										<Input id="fault_codes" name="fault_codes" type="text" bind:value={faultCodes} />
									</div>
								{/if}
								<Button type="submit" size="sm" disabled={saving}>
									{saving ? 'Saving...' : 'Save Details'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>

					<!-- Dates Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Dates</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3 text-sm">
								<div>
									<span class="text-xs font-medium text-gray-400">Date Quoted</span>
									<p class="mt-0.5 text-gray-800">{formatDate(job.date_quoted)}</p>
								</div>
								<div>
									<span class="text-xs font-medium text-gray-400">Date Booked</span>
									<p class="mt-0.5 text-gray-800">{formatDate(job.date_booked)}</p>
								</div>
								<div>
									<span class="text-xs font-medium text-gray-400">Date In</span>
									<p class="mt-0.5 text-gray-800">{formatDate(job.date_in)}</p>
								</div>
								<div>
									<span class="text-xs font-medium text-gray-400">Date Completed</span>
									<p class="mt-0.5 text-gray-800">{formatDate(job.date_completed)}</p>
								</div>
								<Separator />
								<form
									method="POST"
									action="?/update"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												toast.success('Saved');
											} else if (result.type === 'failure') {
												toast.error((result.data as { error?: string })?.error || 'Something went wrong');
											}
											await update({ reset: false });
										};
									}}
								>
									<label for="date_promised" class="block text-xs font-medium text-gray-400">
										Date Promised
									</label>
									<div class="mt-1 flex items-center gap-2">
										<Input
											id="date_promised"
											name="date_promised"
											type="date"
											bind:value={datepromised}
											class="w-auto"
										/>
										<Button type="submit" size="sm">Save</Button>
									</div>
								</form>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Notes Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Notes</Card.Title>
						</Card.Header>
						<Card.Content>
							<form
								method="POST"
								action="?/update"
								use:enhance={() => {
									saving = true;
									return async ({ result, update }) => {
										saving = false;
										if (result.type === 'success') {
											toast.success('Notes saved');
										} else if (result.type === 'failure') {
											toast.error((result.data as { error?: string })?.error || 'Something went wrong');
										}
										await update({ reset: false });
									};
								}}
								class="space-y-3"
							>
								<textarea
									name="notes"
									rows="4"
									bind:value={notes}
									placeholder="Add notes about this job..."
									class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
								></textarea>
								<Button type="submit" size="sm" disabled={saving}>
									{saving ? 'Saving...' : 'Save Notes'}
								</Button>
							</form>
						</Card.Content>
					</Card.Root>
				</div>
			</div>
		</Tabs.Content>

		<!-- BOOKING TAB -->
		{#if showBooking}
			<Tabs.Content value="booking">
				<div class="mt-4 space-y-6">
					{#if job.status === 'approved'}
						<Card.Root class="border-blue-200 bg-blue-50">
							<Card.Content class="py-4">
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-blue-900">Vehicle ready for check-in</p>
										<p class="text-sm text-blue-700">Fill in details below, then book in the vehicle.</p>
									</div>
									<Button
										class="bg-blue-600 hover:bg-blue-700"
										disabled={transitioning}
										onclick={() => handleStepClick('checked_in' as ShopJobStatus)}
									>
										{transitioning ? 'Booking in...' : 'Book In Vehicle'}
										<ArrowRight class="ml-1.5 h-4 w-4" />
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
					<!-- Check-In Info -->
					{#if (data.job as any).checked_in_at}
						<Card.Root>
							<Card.Content class="py-4">
								<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
									<div class="flex items-center gap-2">
										<CheckCircle class="h-4 w-4 text-green-500" />
										<span class="font-medium text-gray-700">Checked in</span>
									</div>
									<span class="text-gray-500">
										{new Date((data.job as any).checked_in_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
										at {new Date((data.job as any).checked_in_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
									</span>
									{#if data.checkedInByName}
										<span class="text-gray-500">by <span class="font-medium text-gray-700">{data.checkedInByName}</span></span>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					{/if}

					<!-- Vehicle Check-In Details Card -->
					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between">
								<div>
									<Card.Title>Vehicle Check-In Details</Card.Title>
									<Card.Description>Verify and update vehicle details at check-in</Card.Description>
								</div>
								{#if savingVehicleDetails}
									<Badge variant="outline" class="animate-pulse">Saving...</Badge>
								{:else if vehicleDetailsDirty}
									<Button size="sm" variant="outline" onclick={saveVehicleDetails}>Save</Button>
								{/if}
							</div>
						</Card.Header>
						<Card.Content>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-1">
									<label for="checkin_mileage" class="text-sm font-medium text-gray-700">Mileage (km)</label>
									<Input id="checkin_mileage" type="number" bind:value={vehicleMileage} placeholder="e.g. 85000" oninput={scheduleVehicleSave} />
								</div>
								<div class="space-y-1">
									<label for="checkin_vin" class="text-sm font-medium text-gray-700">VIN Number</label>
									<Input id="checkin_vin" bind:value={vehicleVin} placeholder="17-character VIN" oninput={scheduleVehicleSave} />
								</div>
								<div class="space-y-1">
									<label for="checkin_engine" class="text-sm font-medium text-gray-700">Engine Number</label>
									<Input id="checkin_engine" bind:value={engineNumber} placeholder="Engine number" oninput={scheduleVehicleSave} />
								</div>
								<div class="space-y-1">
									<label for="checkin_reg" class="text-sm font-medium text-gray-700">Registration</label>
									<Input id="checkin_reg" bind:value={vehicleReg} placeholder="e.g. ABC 123 GP" oninput={scheduleVehicleSave} />
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<ShopPhotosPanel
						jobId={job.id}
						category="before"
						labelPrefix="ID"
						photos={photos.filter((p: { category: string; label?: string | null }) =>
							p.category === 'before' && (p.label?.startsWith('ID:') || p.label?.startsWith('ID '))
						)}
						title="Vehicle Identification Photos"
						description="Registration plate, VIN, odometer, engine number"
						onUpdate={refreshPhotos}
					/>

					<ShopPhotosPanel
						jobId={job.id}
						category="before"
						labelPrefix="360"
						photos={photos.filter((p: { category: string; label?: string | null }) =>
							p.category === 'before' && (p.label?.startsWith('360:') || p.label?.startsWith('360 '))
						)}
						title="360 Exterior Photos"
						description="Front, rear, left side, right side, angles"
						onUpdate={refreshPhotos}
					/>

					<ShopPhotosPanel
						jobId={job.id}
						category="damage"
						photos={photos.filter((p: { category: string }) => p.category === 'damage')}
						title="Pre-Existing Damage"
						description="Document any existing damage before work begins"
						onUpdate={refreshPhotos}
					/>

					</div>
			</Tabs.Content>
		{/if}

		<!-- ESTIMATE TAB -->
		<Tabs.Content value="estimate">
			<div class="mt-4 space-y-4">
				{#if job.status === 'quote_requested'}
					<Card.Root class="border-amber-200 bg-amber-50">
						<Card.Content class="py-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium text-amber-900">Quote pending</p>
									<p class="text-sm text-amber-700">Create the estimate, then mark as quoted.</p>
								</div>
								<Button
									variant="outline"
									disabled={transitioning}
									onclick={() => handleStepClick('quoted' as ShopJobStatus)}
								>
									{transitioning ? 'Updating...' : 'Mark as Quoted'}
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
				{#if estimate == null}
					<Card.Root>
						<Card.Content class="py-10 text-center text-sm text-gray-500">
							No estimate for this job yet.
						</Card.Content>
					</Card.Root>
				{:else}
					{@const estimateStatus = (estimate as { status?: string }).status ?? 'draft'}
					{@const estimateNumber = (estimate as { estimate_number?: string }).estimate_number ?? 'Estimate'}
					{@const estimateId = (estimate as { id: string }).id}

					<!-- Status bar -->
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<span class="text-lg font-semibold text-gray-900">{estimateNumber}</span>
							<Badge variant={getEstimateStatusVariant(estimateStatus)}>
								{getEstimateStatusLabel(estimateStatus)}
							</Badge>
							{#if savingLineItems}
								<Badge variant="outline" class="animate-pulse">Saving...</Badge>
							{:else if estimateDirty && canEditEstimate}
								<Button size="sm" variant="outline" onclick={saveEstimateLineItemsNow}>Save</Button>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							{#if estimateStatus === 'draft'}
								<form method="POST" action="?/sendEstimate" use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											toast.success('Estimate sent to customer');
										} else if (result.type === 'failure') {
											toast.error((result.data as { error?: string })?.error || 'Failed to send estimate');
										}
										await update({ reset: false });
									};
								}}>
									<input type="hidden" name="estimate_id" value={estimateId} />
									<Button type="submit" variant="outline" size="sm">Send to Customer</Button>
								</form>
							<form method="POST" action="?/approveEstimate" use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										toast.success('Estimate accepted');
									} else if (result.type === 'failure') {
										toast.error((result.data as { error?: string })?.error || 'Failed to accept estimate');
									}
									await update({ reset: false });
								};
							}} class="inline">
								<input type="hidden" name="estimate_id" value={estimateId} />
								<Button type="submit" variant="default" size="sm">Accept</Button>
							</form>
							<form method="POST" action="?/declineEstimate" use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										toast.success('Estimate declined');
									} else if (result.type === 'failure') {
										toast.error((result.data as { error?: string })?.error || 'Failed to decline estimate');
									}
									await update({ reset: false });
								};
							}} class="inline">
								<input type="hidden" name="estimate_id" value={estimateId} />
								<Button type="submit" variant="destructive" size="sm">Decline</Button>
							</form>
						{:else if estimateStatus === 'sent'}
								<form method="POST" action="?/approveEstimate" use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											toast.success('Estimate approved');
										} else if (result.type === 'failure') {
											toast.error((result.data as { error?: string })?.error || 'Failed to approve estimate');
										}
										await update({ reset: false });
									};
								}} class="inline">
									<input type="hidden" name="estimate_id" value={estimateId} />
									<Button type="submit" variant="default" size="sm">Mark Approved</Button>
								</form>
								<form method="POST" action="?/declineEstimate" use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											toast.success('Estimate declined');
										} else if (result.type === 'failure') {
											toast.error((result.data as { error?: string })?.error || 'Failed to decline estimate');
										}
										await update({ reset: false });
									};
								}} class="inline">
									<input type="hidden" name="estimate_id" value={estimateId} />
									<Button type="submit" variant="destructive" size="sm">Mark Declined</Button>
								</form>
							{/if}
						</div>
					</div>

					<!-- Approved Banner -->
					{#if estimateStatus === 'approved'}
						<div class="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
							<CheckCircle class="h-5 w-5 text-green-600" />
							<div>
								<p class="font-medium text-green-800">Estimate Approved</p>
								{#if (estimate as { approved_at?: string }).approved_at}
									<p class="text-sm text-green-700">
										Approved on {new Date((estimate as { approved_at: string }).approved_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
									</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Declined Banner -->
					{#if estimateStatus === 'declined'}
						<div class="rounded-xl border border-red-200 bg-red-50 p-4">
							<p class="font-medium text-red-800">Estimate Declined</p>
						</div>
					{/if}

					<!-- Rates & Markups Panel (collapsible) -->
					<div class="rounded-lg border bg-white">
						<button
							type="button"
							class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
							onclick={() => showRatesPanel = !showRatesPanel}
						>
							<span>Rates &amp; Markups {#if savingRates}<span class="ml-2 text-xs font-normal text-gray-400 animate-pulse">Saving...</span>{/if}</span>
							<ChevronDown class="h-4 w-4 transition-transform {showRatesPanel ? 'rotate-180' : ''}" />
						</button>
						{#if showRatesPanel}
						<div class="border-t px-4 py-4">
							<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
								<div>
									<label for="rate-labour" class="block text-xs font-medium text-gray-500">Labour Rate (R/hr)</label>
									<input
										id="rate-labour"
										type="number"
										step="0.01"
										min="0"
										value={labourRate}
										oninput={(e) => { labourRate = parseFloat((e.target as HTMLInputElement).value) || 0; scheduleRatesSave(); }}
										class="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label for="rate-paint" class="block text-xs font-medium text-gray-500">Paint Rate (R/hr)</label>
									<input
										id="rate-paint"
										type="number"
										step="0.01"
										min="0"
										value={paintRate}
										oninput={(e) => { paintRate = parseFloat((e.target as HTMLInputElement).value) || 0; scheduleRatesSave(); }}
										class="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label for="rate-oem" class="block text-xs font-medium text-gray-500">OEM Markup (%)</label>
									<input
										id="rate-oem"
										type="number"
										step="0.01"
										min="0"
										value={oemMarkup}
										oninput={(e) => { oemMarkup = parseFloat((e.target as HTMLInputElement).value) || 0; scheduleRatesSave(); }}
										class="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label for="rate-alt" class="block text-xs font-medium text-gray-500">Alt Markup (%)</label>
									<input
										id="rate-alt"
										type="number"
										step="0.01"
										min="0"
										value={altMarkup}
										oninput={(e) => { altMarkup = parseFloat((e.target as HTMLInputElement).value) || 0; scheduleRatesSave(); }}
										class="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label for="rate-2nd" class="block text-xs font-medium text-gray-500">2nd Hand Markup (%)</label>
									<input
										id="rate-2nd"
										type="number"
										step="0.01"
										min="0"
										value={secondHandMarkup}
										oninput={(e) => { secondHandMarkup = parseFloat((e.target as HTMLInputElement).value) || 0; scheduleRatesSave(); }}
										class="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label for="rate-outwork" class="block text-xs font-medium text-gray-500">Outwork Markup (%)</label>
									<input
										id="rate-outwork"
										type="number"
										step="0.01"
										min="0"
										value={outworkMarkup}
										oninput={(e) => { outworkMarkup = parseFloat((e.target as HTMLInputElement).value) || 0; scheduleRatesSave(); }}
										class="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
							</div>
							<p class="mt-3 text-xs text-gray-400">Changes apply to new line items added after saving. Existing line items are not recalculated automatically.</p>
						</div>
						{/if}
					</div>

					<!-- Line Items Section -->
					<div class="space-y-3">
						<h2 class="text-base font-semibold text-gray-900">Line Items</h2>

						{#if lineItems.length === 0 && !canEditEstimate}
							<p class="py-6 text-center text-sm text-gray-400">No line items on this estimate.</p>
						{/if}

						<!-- Mobile: Card Layout -->
						<div class="space-y-3 md:hidden">
							{#each lineItems as item, index (item.id ?? index)}
								<LineItemCard
									{item}
									labourRate={labourRate}
									paintRate={paintRate}
									onUpdateDescription={(value) => updateEstimateField(index, 'description', value)}
									onUpdateProcessType={(value) => updateEstimateField(index, 'process_type', value)}
									onUpdatePartType={(value) => updateEstimateField(index, 'part_type', value)}
									onEditPartPrice={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
									onEditSA={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
									onEditLabour={() => handleLabourClick(item.id!, item.labour_hours || null)}
									onEditPaint={() => handlePaintClick(item.id!, item.paint_panels || null)}
									onEditOutwork={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
									onEditBetterment={() => {/* Betterment not used in shop module */}}
									onDelete={() => deleteLineItem(item.id)}
								/>
							{/each}
						</div>

						<!-- Desktop: Table Layout -->
						<div class="hidden overflow-x-auto rounded-lg border md:block">
							<Table.Root>
								<Table.Header class="sticky top-0 z-10 bg-white">
									<Table.Row class="border-b-2 hover:bg-transparent">
										<Table.Head class="w-[50px] px-2">Type</Table.Head>
										<Table.Head class="w-[60px] px-2">Part</Table.Head>
										<Table.Head class="min-w-[180px] flex-1 px-3">Description</Table.Head>
										<Table.Head class="w-[120px] px-2 text-right">Part Price</Table.Head>
										<Table.Head class="w-[100px] px-2 text-right">S&amp;A</Table.Head>
										<Table.Head class="w-[120px] px-2 text-right">Labour</Table.Head>
										<Table.Head class="w-[100px] px-2 text-right">Paint</Table.Head>
										<Table.Head class="w-[120px] px-2 text-right">Outwork</Table.Head>
										<Table.Head class="w-[40px] px-2 text-center" title="Betterment">%</Table.Head>
										<Table.Head class="w-[140px] px-2 text-right">Total</Table.Head>
										<Table.Head class="w-[60px] px-2"></Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#if lineItems.length === 0}
										<Table.Row class="hover:bg-transparent">
											<Table.Cell colspan={11} class="h-24 text-center text-gray-500">
												No line items added. Use "Quick Add" below to add items.
											</Table.Cell>
										</Table.Row>
									{:else}
										{#each lineItems as item (item.id)}
											<Table.Row class="hover:bg-gray-50">
												<!-- Process Type -->
												<Table.Cell class="px-3 py-2">
													<div class="group relative">
														<select
															value={item.process_type}
															onchange={(e) =>
																updateEstimateFieldById(item.id!, { process_type: e.currentTarget.value })}
															class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
														>
															{#each processTypeOptions as option}
																<option value={option.value}>{option.value} - {option.label}</option>
															{/each}
														</select>
														<div class="pointer-events-none flex items-center justify-center">
															<span class="rounded px-2 py-1 text-xs font-semibold {getProcessTypeBadgeColor(item.process_type)}">
																{item.process_type}
															</span>
														</div>
														<div class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
															{getProcessTypeConfig(item.process_type).label}
														</div>
													</div>
												</Table.Cell>

												<!-- Part Type (N only) -->
												<Table.Cell class="px-3 py-2">
													{#if item.process_type === 'N'}
														<div class="group relative">
															<select
																value={item.part_type || 'OEM'}
																onchange={(e) =>
																	updateEstimateFieldById(item.id!, { part_type: e.currentTarget.value })}
																class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
															>
																<option value="OEM">OEM</option>
																<option value="ALT">ALT</option>
																<option value="2ND">2ND</option>
															</select>
															<div class="pointer-events-none flex items-center justify-center">
																{#if item.part_type === 'OEM'}
																	<div class="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-blue-800">
																		<ShieldCheck class="h-3 w-3" />
																		<span class="text-xs font-semibold">OEM</span>
																	</div>
																{:else if item.part_type === 'ALT'}
																	<div class="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-green-800">
																		<Package class="h-3 w-3" />
																		<span class="text-xs font-semibold">ALT</span>
																	</div>
																{:else if item.part_type === '2ND'}
																	<div class="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-amber-800">
																		<Recycle class="h-3 w-3" />
																		<span class="text-xs font-semibold">2ND</span>
																	</div>
																{:else}
																	<span class="text-xs text-gray-500">OEM</span>
																{/if}
															</div>
														</div>
													{:else}
														<span class="text-sm text-gray-400">-</span>
													{/if}
												</Table.Cell>

												<!-- Description -->
												<Table.Cell class="px-3 py-2">
													<Input
														type="text"
														placeholder="Description"
														value={item.description}
														oninput={(e) => scheduleDescUpdate(item.id!, e.currentTarget.value)}
														onblur={(e) => flushDescUpdate(item.id!, e.currentTarget.value)}
														class="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
													/>
												</Table.Cell>

												<!-- Part Price (N only) -->
												<Table.Cell class="px-3 py-2 text-right">
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
																<p class="text-xs italic text-gray-500">Only input nett price</p>
															</div>
														{:else}
															<button
																onclick={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
																class="w-full cursor-pointer text-right text-sm font-medium text-blue-600 hover:text-blue-800"
																title="Click to edit nett price (selling price includes markup)"
															>
																{formatCurrency(item.part_price_nett || 0)}
															</button>
														{/if}
													{:else}
														<span class="text-xs text-gray-400">-</span>
													{/if}
												</Table.Cell>

												<!-- S&A (N,R,P,B) -->
												<Table.Cell class="px-3 py-2 text-right">
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
																class="w-full cursor-pointer text-right text-sm font-medium text-blue-600 hover:text-blue-800"
																title="Click to edit hours (S&A = hours x labour rate)"
															>
																{formatCurrency(item.strip_assemble || 0)}
															</button>
														{/if}
													{:else}
														<span class="text-xs text-gray-400">-</span>
													{/if}
												</Table.Cell>

												<!-- Labour (N,R,A) -->
												<Table.Cell class="px-3 py-2 text-right">
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
																class="w-full cursor-pointer text-right text-sm font-medium text-blue-600 hover:text-blue-800"
																title="Click to edit hours (Labour = hours x labour rate)"
															>
																{formatCurrency(item.labour_cost || 0)}
															</button>
														{/if}
													{:else}
														<span class="text-xs text-gray-400">-</span>
													{/if}
												</Table.Cell>

												<!-- Paint (N,R,P,B) -->
												<Table.Cell class="px-3 py-2 text-right">
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
																class="w-full cursor-pointer text-right text-sm font-medium text-blue-600 hover:text-blue-800"
																title="Click to edit panels (Paint = panels x paint rate)"
															>
																{formatCurrency(item.paint_cost || 0)}
															</button>
														{/if}
													{:else}
														<span class="text-xs text-gray-400">-</span>
													{/if}
												</Table.Cell>

												<!-- Outwork (O only) -->
												<Table.Cell class="px-3 py-2 text-right">
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
																<p class="text-xs italic text-gray-500">Only input nett price</p>
															</div>
														{:else}
															<button
																onclick={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
																class="w-full cursor-pointer text-right text-sm font-medium text-blue-600 hover:text-blue-800"
																title="Click to edit nett price (selling price includes markup)"
															>
																{formatCurrency(item.outwork_charge_nett || 0)}
															</button>
														{/if}
													{:else}
														<span class="text-xs text-gray-400">-</span>
													{/if}
												</Table.Cell>

												<!-- Betterment (no-op in shop) -->
												<Table.Cell class="px-2 py-2 text-center">
													<div
														class="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1.5"
														title="Betterment not applicable in shop module"
													>
														<Percent class="h-4 w-4 text-gray-300" />
													</div>
												</Table.Cell>

												<!-- Total -->
												<Table.Cell class="px-3 py-2 text-right font-bold">
													{formatCurrency(item.total)}
												</Table.Cell>

												<!-- Actions -->
												<Table.Cell class="px-2 py-2 text-center">
													<Button
														variant="ghost"
														size="sm"
														onclick={() => deleteLineItem(item.id)}
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

						<!-- Quick Add (draft / revised only) -->
						{#if canEditEstimate}
							<QuickAddLineItem
								labourRate={labourRate}
								paintRate={paintRate}
								oemMarkup={oemMarkup}
								altMarkup={altMarkup}
								secondHandMarkup={secondHandMarkup}
								outworkMarkup={outworkMarkup}
								onAddLineItem={addLineItem}
								enablePhotos={false}
							/>
						{/if}
					</div>

					<!-- Totals Card -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Totals</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2 text-sm">
								{#if partsNett > 0}
									<div class="flex justify-between text-gray-600">
										<span>Parts Total (nett)</span>
										<span>{formatCurrency(partsNett)}</span>
									</div>
								{/if}
								{#if markupTotal > 0}
									<div class="flex justify-between text-green-600">
										<span>Markup Total</span>
										<span>{formatCurrency(markupTotal)}</span>
									</div>
								{/if}
								{#if saTotal > 0}
									<div class="flex justify-between text-gray-600">
										<span>S&amp;A Total</span>
										<span>{formatCurrency(saTotal)}</span>
									</div>
								{/if}
								{#if labourTotalCalc > 0}
									<div class="flex justify-between text-gray-600">
										<span>Labour Total</span>
										<span>{formatCurrency(labourTotalCalc)}</span>
									</div>
								{/if}
								{#if paintTotalCalc > 0}
									<div class="flex justify-between text-gray-600">
										<span>Paint Total</span>
										<span>{formatCurrency(paintTotalCalc)}</span>
									</div>
								{/if}
								{#if outworkNett > 0}
									<div class="flex justify-between text-gray-600">
										<span>Outwork Total (nett)</span>
										<span>{formatCurrency(outworkNett)}</span>
									</div>
								{/if}
								<Separator class="my-2" />
								<div class="flex justify-between font-medium text-gray-900">
									<span>Subtotal (Ex VAT)</span>
									<span>{formatCurrency(estimateSubtotal)}</span>
								</div>
								<div class="flex justify-between text-gray-600">
									<span>VAT ({vatRate}%)</span>
									<span>{formatCurrency(estimateVatAmount)}</span>
								</div>
								<Separator class="my-2" />
								<div class="flex justify-between text-base font-bold text-gray-900">
									<span>Grand Total</span>
									<span>{formatCurrency(estimateTotal)}</span>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Estimate Notes -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Estimate Notes</Card.Title>
						</Card.Header>
						<Card.Content>
							<form
								method="POST"
								action="?/updateEstimateNotes"
								use:enhance={() => {
									savingEstimateNotes = true;
									return async ({ result, update }) => {
										savingEstimateNotes = false;
										if (result.type === 'success') {
											toast.success('Estimate notes saved');
										} else if (result.type === 'failure') {
											toast.error((result.data as { error?: string })?.error || 'Something went wrong');
										}
										await update({ reset: false });
									};
								}}
							>
								<input type="hidden" name="estimate_id" value={estimateId} />
								<textarea
									name="notes"
									rows="4"
									bind:value={estimateNotes}
									placeholder="Add notes for the customer or internal reference..."
									class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
								></textarea>
								<div class="mt-2 flex justify-end">
									<Button type="submit" disabled={savingEstimateNotes}>
										{savingEstimateNotes ? 'Saving...' : 'Save Notes'}
									</Button>
								</div>
							</form>
						</Card.Content>
					</Card.Root>

					<!-- PDF Generation -->
					<Card.Root>
						<Card.Content class="py-3">
							{#if generatingPdf}
								<div class="w-full">
									<div class="mb-1 flex items-center justify-between text-xs text-gray-500">
										<span>{pdfMessage}</span>
										<span>{pdfProgress}%</span>
									</div>
									<div class="h-2 overflow-hidden rounded-full bg-gray-200">
										<div
											class="h-full rounded-full bg-blue-600 transition-all duration-300"
											style="width: {pdfProgress}%"
										></div>
									</div>
								</div>
							{:else}
								<div class="flex items-center gap-3">
									<Button onclick={handleGeneratePDF} variant="outline" size="sm">
										<FileText class="mr-2 h-4 w-4" />
										{currentPdfUrl ? 'Regenerate PDF' : 'Generate PDF'}
									</Button>
									{#if currentPdfUrl}
										<a
											href={currentPdfUrl}
											target="_blank"
											class="text-sm font-medium text-blue-600 hover:underline"
										>
											View PDF
										</a>
										<Button onclick={handleDownloadPDF} variant="outline" size="sm">
											<Download class="mr-2 h-4 w-4" />
											Download PDF
										</Button>
									{/if}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}

			<!-- Parts Tracking (visible from approved status) -->
			{#if statusIndex >= STATUS_STEPS.indexOf('approved')}
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-base">Parts Tracking</Card.Title>
					</Card.Header>
					<Card.Content>
						<!-- Parts Ordered -->
						<div class="flex items-center justify-between py-2.5 border-b last:border-0">
							<div class="flex items-center gap-3">
								{#if (job as any).parts_ordered_at}
									<CheckCircle class="h-4 w-4 text-green-500" />
								{:else}
									<div class="h-4 w-4 rounded-full border-2 border-gray-300"></div>
								{/if}
								<div>
									<span class="text-sm font-medium text-gray-700">Parts Ordered</span>
									{#if (job as any).parts_ordered_at}
										<p class="text-xs text-gray-500">
											{new Date((job as any).parts_ordered_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
											at {new Date((job as any).parts_ordered_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
											{#if data.milestoneUserNames?.[(job as any).parts_ordered_by]}
												&middot; {data.milestoneUserNames[(job as any).parts_ordered_by]}
											{/if}
										</p>
									{/if}
								</div>
							</div>
							<form method="POST" action="?/setMilestone" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
								<input type="hidden" name="milestone" value="parts_ordered" />
								<input type="hidden" name="action" value={(job as any).parts_ordered_at ? 'clear' : 'set'} />
								<Button type="submit" variant={(job as any).parts_ordered_at ? 'outline' : 'default'} size="sm">
									{(job as any).parts_ordered_at ? 'Undo' : 'Mark Done'}
								</Button>
							</form>
						</div>
						<!-- Parts Arrived -->
						<div class="flex items-center justify-between py-2.5 last:border-0">
							<div class="flex items-center gap-3">
								{#if (job as any).parts_arrived_at}
									<CheckCircle class="h-4 w-4 text-green-500" />
								{:else}
									<div class="h-4 w-4 rounded-full border-2 border-gray-300"></div>
								{/if}
								<div>
									<span class="text-sm font-medium text-gray-700">Parts Arrived</span>
									{#if (job as any).parts_arrived_at}
										<p class="text-xs text-gray-500">
											{new Date((job as any).parts_arrived_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
											at {new Date((job as any).parts_arrived_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
											{#if data.milestoneUserNames?.[(job as any).parts_arrived_by]}
												&middot; {data.milestoneUserNames[(job as any).parts_arrived_by]}
											{/if}
										</p>
									{/if}
								</div>
							</div>
							<form method="POST" action="?/setMilestone" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
								<input type="hidden" name="milestone" value="parts_arrived" />
								<input type="hidden" name="action" value={(job as any).parts_arrived_at ? 'clear' : 'set'} />
								<Button type="submit" variant={(job as any).parts_arrived_at ? 'outline' : 'default'} size="sm">
									{(job as any).parts_arrived_at ? 'Undo' : 'Mark Done'}
								</Button>
							</form>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
			</div>
		</Tabs.Content>

		<!-- WORK TAB -->
		{#if showWork}
			<Tabs.Content value="work">
				<div class="mt-4 space-y-6">
					{#if job.status === 'checked_in'}
						<Card.Root class="border-green-200 bg-green-50">
							<Card.Content class="py-4">
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-green-900">Vehicle checked in</p>
										<p class="text-sm text-green-700">Start working on this job.</p>
									</div>
									<Button class="bg-green-600 hover:bg-green-700" disabled={transitioning}
										onclick={() => handleStepClick('in_progress' as ShopJobStatus)}>
										{transitioning ? 'Updating...' : 'Start Work'}
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{:else if job.status === 'in_progress'}
						<Card.Root class="border-purple-200 bg-purple-50">
							<Card.Content class="py-4">
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-purple-900">Work in progress</p>
										<p class="text-sm text-purple-700">Send for quality check when work is done.</p>
									</div>
									<Button class="bg-purple-600 hover:bg-purple-700" disabled={transitioning}
										onclick={() => handleStepClick('quality_check' as ShopJobStatus)}>
										{transitioning ? 'Updating...' : 'Quality Check'}
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{:else if job.status === 'quality_check'}
						<Card.Root class="border-green-200 bg-green-50">
							<Card.Content class="py-4">
								<div class="flex items-center justify-between gap-3">
									<div>
										<p class="font-medium text-green-900">Quality check</p>
										<p class="text-sm text-green-700">Mark as ready or send back to work.</p>
									</div>
									<div class="flex gap-2">
										<Button variant="outline" disabled={transitioning}
											onclick={() => handleStepClick('in_progress' as ShopJobStatus)}>
											Back to Work
										</Button>
										<Button class="bg-green-600 hover:bg-green-700" disabled={transitioning}
											onclick={() => handleStepClick('ready_for_collection' as ShopJobStatus)}>
											{transitioning ? 'Updating...' : 'Ready for Collection'}
										</Button>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}

					<!-- Work Milestones -->
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-base">Work Milestones</Card.Title>
						</Card.Header>
						<Card.Content>
							<!-- Parts Ordered -->
							<div class="flex items-center justify-between py-2.5 border-b last:border-0">
								<div class="flex items-center gap-3">
									{#if (job as any).parts_ordered_at}
										<CheckCircle class="h-4 w-4 text-green-500" />
									{:else}
										<div class="h-4 w-4 rounded-full border-2 border-gray-300"></div>
									{/if}
									<div>
										<span class="text-sm font-medium text-gray-700">Parts Ordered</span>
										{#if (job as any).parts_ordered_at}
											<p class="text-xs text-gray-500">
												{new Date((job as any).parts_ordered_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
												at {new Date((job as any).parts_ordered_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
												{#if data.milestoneUserNames?.[(job as any).parts_ordered_by]}
													&middot; {data.milestoneUserNames[(job as any).parts_ordered_by]}
												{/if}
											</p>
										{/if}
									</div>
								</div>
								<form method="POST" action="?/setMilestone" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
									<input type="hidden" name="milestone" value="parts_ordered" />
									<input type="hidden" name="action" value={(job as any).parts_ordered_at ? 'clear' : 'set'} />
									<Button type="submit" variant={(job as any).parts_ordered_at ? 'outline' : 'default'} size="sm">
										{(job as any).parts_ordered_at ? 'Undo' : 'Mark Done'}
									</Button>
								</form>
							</div>
							<!-- Parts Arrived -->
							<div class="flex items-center justify-between py-2.5 border-b last:border-0">
								<div class="flex items-center gap-3">
									{#if (job as any).parts_arrived_at}
										<CheckCircle class="h-4 w-4 text-green-500" />
									{:else}
										<div class="h-4 w-4 rounded-full border-2 border-gray-300"></div>
									{/if}
									<div>
										<span class="text-sm font-medium text-gray-700">Parts Arrived</span>
										{#if (job as any).parts_arrived_at}
											<p class="text-xs text-gray-500">
												{new Date((job as any).parts_arrived_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
												at {new Date((job as any).parts_arrived_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
												{#if data.milestoneUserNames?.[(job as any).parts_arrived_by]}
													&middot; {data.milestoneUserNames[(job as any).parts_arrived_by]}
												{/if}
											</p>
										{/if}
									</div>
								</div>
								<form method="POST" action="?/setMilestone" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
									<input type="hidden" name="milestone" value="parts_arrived" />
									<input type="hidden" name="action" value={(job as any).parts_arrived_at ? 'clear' : 'set'} />
									<Button type="submit" variant={(job as any).parts_arrived_at ? 'outline' : 'default'} size="sm">
										{(job as any).parts_arrived_at ? 'Undo' : 'Mark Done'}
									</Button>
								</form>
							</div>
							<!-- Strip Started -->
							<div class="flex items-center justify-between py-2.5 last:border-0">
								<div class="flex items-center gap-3">
									{#if (job as any).strip_started_at}
										<CheckCircle class="h-4 w-4 text-green-500" />
									{:else}
										<div class="h-4 w-4 rounded-full border-2 border-gray-300"></div>
									{/if}
									<div>
										<span class="text-sm font-medium text-gray-700">Strip Started</span>
										{#if (job as any).strip_started_at}
											<p class="text-xs text-gray-500">
												{new Date((job as any).strip_started_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
												at {new Date((job as any).strip_started_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
												{#if data.milestoneUserNames?.[(job as any).strip_started_by]}
													&middot; {data.milestoneUserNames[(job as any).strip_started_by]}
												{/if}
											</p>
										{/if}
									</div>
								</div>
								<form method="POST" action="?/setMilestone" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
									<input type="hidden" name="milestone" value="strip_started" />
									<input type="hidden" name="action" value={(job as any).strip_started_at ? 'clear' : 'set'} />
									<Button type="submit" variant={(job as any).strip_started_at ? 'outline' : 'default'} size="sm">
										{(job as any).strip_started_at ? 'Undo' : 'Mark Done'}
									</Button>
								</form>
							</div>
						</Card.Content>
					</Card.Root>

					<ShopPhotosPanel
						jobId={job.id}
						category="during"
						photos={photos.filter((p: { category: string }) => p.category === 'during')}
						title="Work Progress Photos"
						description="Document work as it progresses"
						onUpdate={refreshPhotos}
					/>
				</div>
			</Tabs.Content>
		{/if}

		<!-- INVOICE TAB -->
		{#if showInvoice}
			<Tabs.Content value="invoice">
				<div class="mt-4 space-y-4">
					{#if job.status === 'ready_for_collection'}
						<Card.Root class="border-green-200 bg-green-50">
							<Card.Content class="py-4">
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-green-900">Ready for collection</p>
										<p class="text-sm text-green-700">Mark as complete when customer collects.</p>
									</div>
									<Button class="bg-green-600 hover:bg-green-700" disabled={transitioning}
										onclick={() => handleStepClick('completed' as ShopJobStatus)}>
										{transitioning ? 'Updating...' : 'Mark as Complete'}
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
					{#if existingInvoice}
						<Card.Root>
							<Card.Header>
								<Card.Title>Invoice</Card.Title>
							</Card.Header>
							<Card.Content>
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-gray-900">{existingInvoice.invoice_number}</p>
										<p class="text-xs text-gray-500 capitalize">{existingInvoice.status ?? ''}</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										href="/shop/invoices/{existingInvoice.id}"
									>
										View Invoice
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{:else if canCreateInvoice}
						<Card.Root>
							<Card.Content class="py-8 text-center">
								<p class="mb-4 text-sm text-gray-500">No invoice has been created for this job yet.</p>
								{#if form?.error}
									<p class="mb-3 text-sm text-red-600">{form.error}</p>
								{/if}
								<form
									method="POST"
									action="?/createInvoice"
									use:enhance={() => {
										creatingInvoice = true;
										return async ({ result, update }) => {
											creatingInvoice = false;
											if (result.type === 'success') {
												toast.success('Invoice created');
											} else if (result.type === 'failure') {
												toast.error((result.data as { error?: string })?.error || 'Failed to create invoice');
											}
											await update();
										};
									}}
								>
									<Button type="submit" variant="default" size="sm" disabled={creatingInvoice}>
										{creatingInvoice ? 'Creating...' : 'Create Invoice'}
									</Button>
								</form>
							</Card.Content>
						</Card.Root>
					{:else}
						<Card.Root>
							<Card.Content class="py-10 text-center text-sm text-gray-500">
								Invoice will be available once the job is ready for collection.
							</Card.Content>
						</Card.Root>
					{/if}
				</div>
			</Tabs.Content>
		{/if}
	</Tabs.Root>
</div>
