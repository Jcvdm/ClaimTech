<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, CheckCircle } from 'lucide-svelte';
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

	// ── Edit overlay state ────────────────────────────────────────────────────

	type EditTarget = {
		index: number;
		field: 'part_price_nett' | 'strip_assemble_hours' | 'labour_hours' | 'paint_panels' | 'outwork_charge_nett';
		label: string;
		step: string;
	};

	let editingTarget = $state<EditTarget | null>(null);
	let editValue = $state<number>(0);

	// ── Line item CRUD ────────────────────────────────────────────────────────

	function addLineItem(item: EstimateLineItem) {
		lineItems = [...lineItems, { ...item, id: item.id ?? crypto.randomUUID() }];
		dirty = true;
	}

	function updateField(index: number, field: string, value: unknown) {
		const updated = { ...lineItems[index], [field]: value };
		const recalculated = recalculateLineItem(updated, labourRate, paintRate);
		lineItems = lineItems.map((it, i) => (i === index ? recalculated : it));
		dirty = true;
	}

	function deleteLineItem(id: string | undefined) {
		lineItems = lineItems.filter((it) => it.id !== id);
		dirty = true;
	}

	function openEditField(index: number, field: EditTarget['field'], label: string, step: string) {
		editingTarget = { index, field, label, step };
		editValue = (lineItems[index][field] as number) ?? 0;
	}

	function saveEditField() {
		if (editingTarget) {
			updateField(editingTarget.index, editingTarget.field, editValue);
			editingTarget = null;
		}
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
			{#if dirty && canEdit}
				<form
					method="POST"
					action="?/saveLineItems"
					use:enhance={() => {
						saving = true;
						return async ({ update }) => {
							saving = false;
							dirty = false;
							await update({ reset: false });
						};
					}}
				>
					<input type="hidden" name="line_items" value={JSON.stringify(lineItems)} />
					<input type="hidden" name="vat_rate" value={String(vatRate)} />
					<Button type="submit" disabled={saving}>
						{saving ? 'Saving...' : 'Save Line Items'}
					</Button>
				</form>
			{/if}
		</div>

		{#if lineItems.length === 0 && !canEdit}
			<p class="py-6 text-center text-sm text-gray-400">No line items on this estimate.</p>
		{/if}

		<!-- Line item cards -->
		{#each lineItems as item, index (item.id ?? index)}
			<LineItemCard
				{item}
				{labourRate}
				{paintRate}
				onUpdateDescription={(value) => updateField(index, 'description', value)}
				onUpdateProcessType={(value) => updateField(index, 'process_type', value)}
				onUpdatePartType={(value) => updateField(index, 'part_type', value)}
				onEditPartPrice={() =>
					openEditField(index, 'part_price_nett', 'Part Price (Nett)', '0.01')}
				onEditSA={() => openEditField(index, 'strip_assemble_hours', 'S&A Hours', '0.25')}
				onEditLabour={() => openEditField(index, 'labour_hours', 'Labour Hours', '0.25')}
				onEditPaint={() => openEditField(index, 'paint_panels', 'Paint Panels', '0.5')}
				onEditOutwork={() =>
					openEditField(index, 'outwork_charge_nett', 'Outwork Charge (Nett)', '0.01')}
				onEditBetterment={() => {
					/* Betterment not used in shop module */
				}}
				onDelete={() => deleteLineItem(item.id)}
			/>
		{/each}

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

<!-- Edit field overlay -->
{#if editingTarget}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<Card.Root class="w-80">
			<Card.Header>
				<Card.Title>Edit {editingTarget.label}</Card.Title>
			</Card.Header>
			<Card.Content>
				<Input
					type="number"
					step={editingTarget.step}
					min="0"
					bind:value={editValue}
					autofocus
				/>
			</Card.Content>
			<Card.Footer class="flex justify-end gap-2">
				<Button variant="outline" onclick={() => (editingTarget = null)}>Cancel</Button>
				<Button onclick={saveEditField}>Apply</Button>
			</Card.Footer>
		</Card.Root>
	</div>
{/if}
