<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, CheckCircle, ShieldCheck, Package, Recycle, Percent, Trash2 } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import type { EstimateLineItem } from '$lib/types/assessment';
	import {
		calculateSubtotal,
		calculateVAT,
		calculateTotal,
		recalculateLineItem
	} from '$lib/utils/estimateCalculations';
	import { formatCurrency } from '$lib/utils/formatters';
	import LineItemCard from '$lib/components/assessment/LineItemCard.svelte';
	import QuickAddLineItem from '$lib/components/assessment/QuickAddLineItem.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import { getProcessTypeBadgeColor, getProcessTypeConfig, getProcessTypeOptions } from '$lib/constants/processTypes';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const estimate = data.estimate;
	const job = (estimate as { shop_jobs?: Record<string, unknown> }).shop_jobs ?? {};
	const labourRate = data.labourRate;
	const paintRate = data.paintRate;
	const oemMarkup = data.oemMarkup;
	const altMarkup = data.altMarkup;
	const secondHandMarkup = data.secondHandMarkup;
	const outworkMarkup = data.outworkMarkup;
	const vatRate = data.vatRate;

	// ── Status helpers ────────────────────────────────────────────────────────

	type EstimateStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'revised' | 'expired';

	const statusVariant: Record<EstimateStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
		{
			draft: 'secondary',
			sent: 'default',
			approved: 'default',
			declined: 'destructive',
			revised: 'secondary',
			expired: 'outline'
		};

	const statusLabel: Record<EstimateStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		approved: 'Approved',
		declined: 'Declined',
		revised: 'Revised',
		expired: 'Expired'
	};

	function getStatusVariant(s: string) {
		return statusVariant[s as EstimateStatus] ?? 'secondary';
	}

	function getStatusLabel(s: string) {
		return statusLabel[s as EstimateStatus] ?? s;
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const status = $derived((estimate as { status?: string }).status ?? 'draft');
	const canEdit = $derived(status === 'draft' || status === 'revised');

	// ── Line Items state ──────────────────────────────────────────────────────

	let lineItems = $state<EstimateLineItem[]>(
		Array.isArray((estimate as { line_items?: EstimateLineItem[] }).line_items)
			? [...((estimate as { line_items?: EstimateLineItem[] }).line_items as EstimateLineItem[])]
			: []
	);
	let dirty = $state(false);
	let saving = $state(false);

	// ── Auto-save ─────────────────────────────────────────────────────────────

	let saveTimeout: ReturnType<typeof setTimeout>;

	function scheduleAutoSave() {
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => saveNow(), 1000);
	}

	async function saveNow() {
		if (!dirty || saving) return;
		saving = true;
		try {
			const formData = new FormData();
			formData.append('line_items', JSON.stringify(lineItems));
			formData.append('vat_rate', String(vatRate));
			await fetch('?/saveLineItems', { method: 'POST', body: formData });
			dirty = false;
		} catch (err) {
			console.error('Auto-save failed:', err);
		} finally {
			saving = false;
		}
	}

	// ── Line item CRUD ────────────────────────────────────────────────────────

	function addLineItem(item: EstimateLineItem) {
		lineItems = [...lineItems, { ...item, id: item.id ?? crypto.randomUUID() }];
		dirty = true;
		scheduleAutoSave();
	}

	function updateField(index: number, field: string, value: unknown) {
		const updated = { ...lineItems[index], [field]: value };
		const recalculated = recalculateLineItem(updated, labourRate, paintRate);
		lineItems = lineItems.map((it, i) => (i === index ? recalculated : it));
		dirty = true;
		scheduleAutoSave();
	}

	function updateFieldById(id: string, updates: Record<string, unknown>) {
		const index = lineItems.findIndex((item) => item.id === id);
		if (index === -1) return;
		let updated = { ...lineItems[index], ...updates };
		updated = recalculateLineItem(updated, labourRate, paintRate);
		lineItems = lineItems.map((item, i) => (i === index ? updated : item));
		dirty = true;
		scheduleAutoSave();
	}

	function deleteLineItem(id: string | undefined) {
		lineItems = lineItems.filter((it) => it.id !== id);
		dirty = true;
		scheduleAutoSave();
	}

	// ── Debounced description update ──────────────────────────────────────────

	let descriptionTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

	function scheduleDescUpdate(id: string, value: string) {
		clearTimeout(descriptionTimeouts.get(id));
		descriptionTimeouts.set(
			id,
			setTimeout(() => {
				updateFieldById(id, { description: value });
			}, 500)
		);
	}

	function flushDescUpdate(id: string, value: string) {
		clearTimeout(descriptionTimeouts.get(id));
		updateFieldById(id, { description: value });
	}

	// ── Process type options ──────────────────────────────────────────────────

	const processTypeOptions = getProcessTypeOptions();

	// ── Inline editing state ──────────────────────────────────────────────────

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

	// ── Click-to-edit handlers ────────────────────────────────────────────────

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
			updateFieldById(id, {
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
			const saCost = tempSAHours * labourRate;
			updateFieldById(id, {
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

	function handleLabourClick(id: string, currentHours: number | null) {
		editingLabour = id;
		tempLabourHours = currentHours;
	}

	function handleLabourSave(id: string) {
		if (tempLabourHours !== null) {
			const labourCost = tempLabourHours * labourRate;
			updateFieldById(id, {
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

	function handlePaintClick(id: string, currentPanels: number | null) {
		editingPaint = id;
		tempPaintPanels = currentPanels;
	}

	function handlePaintSave(id: string) {
		if (tempPaintPanels !== null) {
			const paintCost = tempPaintPanels * paintRate;
			updateFieldById(id, {
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

	function handleOutworkClick(id: string, currentNett: number | null) {
		editingOutwork = id;
		tempOutworkNett = currentNett;
	}

	function handleOutworkSave(id: string) {
		if (tempOutworkNett !== null) {
			const sellingPrice = tempOutworkNett * (1 + outworkMarkup / 100);
			updateFieldById(id, {
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

	// ── Derived totals ────────────────────────────────────────────────────────

	const subtotal = $derived(calculateSubtotal(lineItems));
	const vatAmount = $derived(calculateVAT(subtotal, vatRate));
	const total = $derived(calculateTotal(subtotal, vatAmount));

	// ── Notes state ──────────────────────────────────────────────────────────

	let notes = $state<string>((estimate as { notes?: string }).notes ?? '');
	let savingNotes = $state(false);
</script>

<div class="space-y-6 pt-4">
	<!-- Back navigation -->
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="sm" href="/shop/estimates" class="gap-1">
			<ArrowLeft class="h-4 w-4" />
			Back to Estimates
		</Button>
	</div>

	{#if form?.error}
		<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<!-- Estimate Header -->
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-semibold text-gray-900">
					{(estimate as { estimate_number?: string }).estimate_number ?? 'Estimate'}
				</h1>
				<Badge variant={getStatusVariant(status)}>
					{getStatusLabel(status)}
				</Badge>
				<!-- Auto-save indicator -->
				{#if saving}
					<Badge variant="outline" class="animate-pulse">Saving...</Badge>
				{:else if dirty && canEdit}
					<Button size="sm" variant="outline" onclick={saveNow}>Save</Button>
				{/if}
			</div>
			<p class="mt-1 text-sm text-gray-500">
				Created {formatDate((estimate as { created_at?: string }).created_at ?? '')}
				{#if (estimate as { version?: number }).version && (estimate as { version?: number }).version! > 1}
					&middot; Version {(estimate as { version?: number }).version}
				{/if}
			</p>
		</div>

		<!-- Status action buttons -->
		<div class="flex items-center gap-2">
			{#if status === 'draft'}
				<form method="POST" action="?/send" use:enhance>
					<Button type="submit" variant="default">Send to Customer</Button>
				</form>
			{:else if status === 'sent'}
				<form method="POST" action="?/approve" use:enhance class="inline">
					<Button type="submit" variant="default">Mark Approved</Button>
				</form>
				<form method="POST" action="?/decline" use:enhance class="inline">
					<Button type="submit" variant="destructive">Mark Declined</Button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Approved Banner -->
	{#if status === 'approved'}
		<div class="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
			<CheckCircle class="h-5 w-5 text-green-600" />
			<div>
				<p class="font-medium text-green-800">Estimate Approved</p>
				{#if (estimate as { approved_at?: string }).approved_at}
					<p class="text-sm text-green-700">
						Approved on {formatDate((estimate as { approved_at: string }).approved_at)}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Declined Banner -->
	{#if status === 'declined'}
		<div class="rounded-xl border border-red-200 bg-red-50 p-4">
			<p class="font-medium text-red-800">Estimate Declined</p>
		</div>
	{/if}

	<!-- Customer & Vehicle Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Customer &amp; Vehicle</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-6 md:grid-cols-2">
				<div class="space-y-2">
					<h4 class="text-sm font-medium text-gray-500">Customer</h4>
					<p class="font-medium text-gray-900">
						{(job as { customer_name?: string }).customer_name ?? '—'}
					</p>
					{#if (job as { customer_phone?: string }).customer_phone}
						<p class="text-sm text-gray-600">{(job as { customer_phone: string }).customer_phone}</p>
					{/if}
					{#if (job as { customer_email?: string }).customer_email}
						<p class="text-sm text-gray-600">{(job as { customer_email: string }).customer_email}</p>
					{/if}
				</div>
				<div class="space-y-2">
					<h4 class="text-sm font-medium text-gray-500">Vehicle</h4>
					<p class="font-medium text-gray-900">
						{[
							(job as { vehicle_year?: number }).vehicle_year,
							(job as { vehicle_make?: string }).vehicle_make,
							(job as { vehicle_model?: string }).vehicle_model
						]
							.filter(Boolean)
							.join(' ') || '—'}
					</p>
					{#if (job as { vehicle_reg?: string }).vehicle_reg}
						<p class="text-sm text-gray-600">
							Reg: {(job as { vehicle_reg: string }).vehicle_reg}
						</p>
					{/if}
					{#if (job as { vehicle_color?: string }).vehicle_color}
						<p class="text-sm text-gray-600">
							Color: {(job as { vehicle_color: string }).vehicle_color}
						</p>
					{/if}
					{#if (job as { vehicle_mileage?: number }).vehicle_mileage}
						<p class="text-sm text-gray-600">
							{(job as { vehicle_mileage: number }).vehicle_mileage.toLocaleString()} km
						</p>
					{/if}
					<p class="text-sm capitalize text-gray-600">
						Type: {(job as { job_type?: string }).job_type ?? '—'}
					</p>
				</div>
			</div>

			{#if (job as { damage_description?: string }).damage_description || (job as { complaint?: string }).complaint || (job as { diagnosis?: string }).diagnosis}
				<Separator class="my-4" />
				{#if (job as { damage_description?: string }).damage_description}
					<div class="mt-2">
						<h4 class="mb-1 text-sm font-medium text-gray-500">Damage Description</h4>
						<p class="text-sm text-gray-700">
							{(job as { damage_description: string }).damage_description}
						</p>
					</div>
				{/if}
				{#if (job as { complaint?: string }).complaint}
					<div class="mt-2">
						<h4 class="mb-1 text-sm font-medium text-gray-500">Complaint</h4>
						<p class="text-sm text-gray-700">{(job as { complaint: string }).complaint}</p>
					</div>
				{/if}
				{#if (job as { diagnosis?: string }).diagnosis}
					<div class="mt-2">
						<h4 class="mb-1 text-sm font-medium text-gray-500">Diagnosis</h4>
						<p class="text-sm text-gray-700">{(job as { diagnosis: string }).diagnosis}</p>
					</div>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Line Items Section -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-gray-900">Line Items</h2>
		</div>

		{#if lineItems.length === 0 && !canEdit}
			<p class="py-6 text-center text-sm text-gray-400">No line items on this estimate.</p>
		{/if}

		<!-- Mobile: Card Layout -->
		<div class="space-y-3 md:hidden">
			{#each lineItems as item, index (item.id ?? index)}
				<LineItemCard
					{item}
					{labourRate}
					{paintRate}
					onUpdateDescription={(value) => updateField(index, 'description', value)}
					onUpdateProcessType={(value) => updateField(index, 'process_type', value)}
					onUpdatePartType={(value) => updateField(index, 'part_type', value)}
					onEditPartPrice={() => handlePartPriceClick(item.id!, item.part_price_nett || null)}
					onEditSA={() => handleSAClick(item.id!, item.strip_assemble_hours || null)}
					onEditLabour={() => handleLabourClick(item.id!, item.labour_hours || null)}
					onEditPaint={() => handlePaintClick(item.id!, item.paint_panels || null)}
					onEditOutwork={() => handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
					onEditBetterment={() => {
						/* Betterment not used in shop module */
					}}
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
								No line items added. Use "Quick Add" below or add items.
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
												updateFieldById(item.id!, { process_type: e.currentTarget.value })}
											class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
										>
											{#each processTypeOptions as option}
												<option value={option.value}>{option.value} - {option.label}</option>
											{/each}
										</select>
										<div class="pointer-events-none flex items-center justify-center">
											<span
												class="rounded px-2 py-1 text-xs font-semibold {getProcessTypeBadgeColor(item.process_type)}"
											>
												{item.process_type}
											</span>
										</div>
										<div
											class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block"
										>
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
													updateFieldById(item.id!, { part_type: e.currentTarget.value })}
												class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
											>
												<option value="OEM">OEM</option>
												<option value="ALT">ALT</option>
												<option value="2ND">2ND</option>
											</select>
											<div class="pointer-events-none flex items-center justify-center">
												{#if item.part_type === 'OEM'}
													<div
														class="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-blue-800"
													>
														<ShieldCheck class="h-3 w-3" />
														<span class="text-xs font-semibold">OEM</span>
													</div>
												{:else if item.part_type === 'ALT'}
													<div
														class="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-green-800"
													>
														<Package class="h-3 w-3" />
														<span class="text-xs font-semibold">ALT</span>
													</div>
												{:else if item.part_type === '2ND'}
													<div
														class="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-amber-800"
													>
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
												title="Click to edit hours (S&A = hours × labour rate)"
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
												title="Click to edit hours (Labour = hours × labour rate)"
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
												title="Click to edit panels (Paint = panels × paint rate)"
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
												onclick={() =>
													handleOutworkClick(item.id!, item.outwork_charge_nett || null)}
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
										class="inline-flex p-1.5 rounded-md bg-gray-50 border border-gray-200"
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
		{#if canEdit}
			<QuickAddLineItem
				{labourRate}
				{paintRate}
				{oemMarkup}
				{altMarkup}
				{secondHandMarkup}
				{outworkMarkup}
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
				<Separator class="my-2" />
				<div class="flex justify-between font-medium text-gray-900">
					<span>Subtotal</span>
					<span>{formatCurrency(subtotal)}</span>
				</div>
				<div class="flex justify-between text-gray-600">
					<span>VAT ({vatRate}%)</span>
					<span>{formatCurrency(vatAmount)}</span>
				</div>
				<Separator class="my-2" />
				<div class="flex justify-between text-base font-semibold text-gray-900">
					<span>Total</span>
					<span>{formatCurrency(total)}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Notes -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Notes</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/updateNotes"
				use:enhance={() => {
					savingNotes = true;
					return async ({ update }) => {
						savingNotes = false;
						await update({ reset: false });
					};
				}}
			>
				<textarea
					name="notes"
					rows="4"
					bind:value={notes}
					placeholder="Add notes for the customer or internal reference..."
					class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
				></textarea>
				<div class="mt-2 flex justify-end">
					<Button type="submit" disabled={savingNotes}>
						{savingNotes ? 'Saving...' : 'Save Notes'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
