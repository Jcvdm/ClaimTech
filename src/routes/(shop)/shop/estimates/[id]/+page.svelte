<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import type { ShopEstimateLineItem } from '$lib/services/shop-estimate.service';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const estimate = $derived(data.estimate);
	const job = $derived((estimate as { shop_jobs?: Record<string, unknown> }).shop_jobs ?? {});

	type EstimateStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'revised' | 'expired';

	const statusConfig: Record<EstimateStatus, { label: string; classes: string }> = {
		draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
		sent: { label: 'Sent', classes: 'bg-blue-100 text-blue-700' },
		approved: { label: 'Approved', classes: 'bg-green-100 text-green-700' },
		declined: { label: 'Declined', classes: 'bg-red-100 text-red-700' },
		revised: { label: 'Revised', classes: 'bg-orange-100 text-orange-700' },
		expired: { label: 'Expired', classes: 'bg-gray-100 text-gray-500' }
	};

	function getStatusConfig(status: string) {
		return (
			statusConfig[status as EstimateStatus] ?? {
				label: status,
				classes: 'bg-gray-100 text-gray-700'
			}
		);
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// ── Line Items state ──────────────────────────────────────────────────────────

	let lineItems = $state<ShopEstimateLineItem[]>(
		Array.isArray((estimate as { line_items?: ShopEstimateLineItem[] }).line_items)
			? [...((estimate as { line_items?: ShopEstimateLineItem[] }).line_items as ShopEstimateLineItem[])]
			: []
	);

	// New item form state
	let newItem = $state<{
		description: string;
		type: 'part' | 'labor' | 'sublet' | 'other';
		quantity: number;
		unit_price: number;
		markup_pct: number;
	}>({
		description: '',
		type: 'part',
		quantity: 1,
		unit_price: 0,
		markup_pct: 0
	});

	let showAddForm = $state(false);
	let savingLineItems = $state(false);
	let lineItemsDirty = $state(false);

	// Calculate totals from current line items
	const totals = $derived.by(() => {
		let parts = 0;
		let labor = 0;
		let sublet = 0;
		let sundries = 0;

		for (const item of lineItems) {
			const itemTotal = item.quantity * item.unit_price * (1 + item.markup_pct / 100);
			if (item.type === 'part') parts += itemTotal;
			else if (item.type === 'labor') labor += itemTotal;
			else if (item.type === 'sublet') sublet += itemTotal;
			else sundries += itemTotal;
		}

		const subtotal = parts + labor + sublet + sundries;
		const vatRate = (estimate as { vat_rate?: number }).vat_rate ?? 15;
		const vat = subtotal * (vatRate / 100);

		return {
			parts_total: parts,
			labor_total: labor,
			sublet_total: sublet,
			sundries_total: sundries,
			subtotal,
			vat_rate: vatRate,
			vat_amount: vat,
			total: subtotal + vat
		};
	});

	function addItem() {
		if (!newItem.description.trim()) return;

		const item: ShopEstimateLineItem = {
			id: crypto.randomUUID(),
			type: newItem.type,
			description: newItem.description.trim(),
			quantity: newItem.quantity,
			unit_price: newItem.unit_price,
			markup_pct: newItem.markup_pct,
			total: newItem.quantity * newItem.unit_price * (1 + newItem.markup_pct / 100)
		};

		lineItems = [...lineItems, item];
		lineItemsDirty = true;

		// Reset form
		newItem = {
			description: '',
			type: 'part',
			quantity: 1,
			unit_price: 0,
			markup_pct: 0
		};
		showAddForm = false;
	}

	function removeItem(id: string) {
		lineItems = lineItems.filter((item) => item.id !== id);
		lineItemsDirty = true;
	}

	function itemTotal(item: ShopEstimateLineItem) {
		return item.quantity * item.unit_price * (1 + item.markup_pct / 100);
	}

	// Notes state
	let notes = $state<string>((estimate as { notes?: string }).notes ?? '');
	let savingNotes = $state(false);

	const sc = $derived(getStatusConfig((estimate as { status?: string }).status ?? 'draft'));
	const status = $derived((estimate as { status?: string }).status ?? 'draft');
</script>

<div class="space-y-6 pt-4">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<a
			href="/shop/estimates"
			class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Estimates
		</a>
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
				<span
					class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {sc.classes}"
				>
					{sc.label}
				</span>
			</div>
			<p class="mt-1 text-sm text-gray-500">
				Created {formatDate((estimate as { created_at?: string }).created_at ?? '')}
				{#if (estimate as { version?: number }).version && (estimate as { version?: number }).version! > 1}
					· Version {(estimate as { version?: number }).version}
				{/if}
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2">
			{#if status === 'draft'}
				<form method="POST" action="?/send" use:enhance>
					<button
						type="submit"
						class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
					>
						Send to Customer
					</button>
				</form>
			{:else if status === 'sent'}
				<form method="POST" action="?/approve" use:enhance class="inline">
					<button
						type="submit"
						class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
					>
						Mark Approved
					</button>
				</form>
				<form method="POST" action="?/decline" use:enhance class="inline">
					<button
						type="submit"
						class="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
					>
						Mark Declined
					</button>
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
	<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Customer & Vehicle</h3>
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
					{[(job as { vehicle_year?: number }).vehicle_year, (job as { vehicle_make?: string }).vehicle_make, (job as { vehicle_model?: string }).vehicle_model]
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

		{#if (job as { damage_description?: string }).damage_description}
			<div class="mt-4 border-t border-gray-100 pt-4">
				<h4 class="mb-1 text-sm font-medium text-gray-500">Damage Description</h4>
				<p class="text-sm text-gray-700">{(job as { damage_description: string }).damage_description}</p>
			</div>
		{/if}
		{#if (job as { complaint?: string }).complaint}
			<div class="mt-4 border-t border-gray-100 pt-4">
				<h4 class="mb-1 text-sm font-medium text-gray-500">Complaint</h4>
				<p class="text-sm text-gray-700">{(job as { complaint: string }).complaint}</p>
			</div>
		{/if}
		{#if (job as { diagnosis?: string }).diagnosis}
			<div class="mt-4 pt-4">
				<h4 class="mb-1 text-sm font-medium text-gray-500">Diagnosis</h4>
				<p class="text-sm text-gray-700">{(job as { diagnosis: string }).diagnosis}</p>
			</div>
		{/if}
	</div>

	<!-- Line Items -->
	<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900">Line Items</h3>
			{#if status === 'draft' || status === 'revised'}
				<button
					type="button"
					onclick={() => (showAddForm = !showAddForm)}
					class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
				>
					<Plus class="h-4 w-4" />
					Add Item
				</button>
			{/if}
		</div>

		{#if lineItems.length === 0 && !showAddForm}
			<p class="py-6 text-center text-sm text-gray-400">
				No line items yet. Add items to build the estimate.
			</p>
		{/if}

		{#if lineItems.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-gray-100">
							<th class="pb-2 text-left font-medium text-gray-500">Description</th>
							<th class="pb-2 text-left font-medium text-gray-500">Category</th>
							<th class="pb-2 text-right font-medium text-gray-500">Qty</th>
							<th class="pb-2 text-right font-medium text-gray-500">Unit Price</th>
							<th class="pb-2 text-right font-medium text-gray-500">Markup %</th>
							<th class="pb-2 text-right font-medium text-gray-500">Total</th>
							{#if status === 'draft' || status === 'revised'}
								<th class="pb-2"></th>
							{/if}
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50">
						{#each lineItems as item (item.id)}
							<tr>
								<td class="py-2 pr-4 text-gray-900">{item.description}</td>
								<td class="py-2 pr-4 capitalize text-gray-600">{item.type}</td>
								<td class="py-2 pr-4 text-right text-gray-700">{item.quantity}</td>
								<td class="py-2 pr-4 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
								<td class="py-2 pr-4 text-right text-gray-700">{item.markup_pct}%</td>
								<td class="py-2 text-right font-medium text-gray-900">
									{formatCurrency(itemTotal(item))}
								</td>
								{#if status === 'draft' || status === 'revised'}
									<td class="py-2 pl-3">
										<button
											type="button"
											onclick={() => removeItem(item.id)}
											class="text-gray-400 hover:text-red-500"
											aria-label="Remove item"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Add Item Form -->
		{#if showAddForm}
			<div class="mt-4 rounded-xl border border-dashed border-gray-300 p-4">
				<h4 class="mb-3 text-sm font-medium text-gray-700">New Line Item</h4>
				<div class="grid gap-3 md:grid-cols-2">
					<div class="md:col-span-2">
						<label class="mb-1 block text-xs font-medium text-gray-600" for="new_description">
							Description *
						</label>
						<input
							id="new_description"
							type="text"
							bind:value={newItem.description}
							placeholder="e.g., Front bumper repair"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="new_type">
							Category
						</label>
						<select
							id="new_type"
							bind:value={newItem.type}
							class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						>
							<option value="part">Part</option>
							<option value="labor">Labor</option>
							<option value="sublet">Sublet</option>
							<option value="other">Other</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="new_quantity">
							Quantity
						</label>
						<input
							id="new_quantity"
							type="number"
							min="0.01"
							step="0.01"
							bind:value={newItem.quantity}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="new_unit_price">
							Unit Price (R)
						</label>
						<input
							id="new_unit_price"
							type="number"
							min="0"
							step="0.01"
							bind:value={newItem.unit_price}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="new_markup">
							Markup %
						</label>
						<input
							id="new_markup"
							type="number"
							min="0"
							step="0.01"
							bind:value={newItem.markup_pct}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						/>
					</div>
				</div>
				<div class="mt-3 flex items-center justify-between">
					<span class="text-sm text-gray-500">
						Total: <strong>{formatCurrency(newItem.quantity * newItem.unit_price * (1 + newItem.markup_pct / 100))}</strong>
					</span>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (showAddForm = false)}
							class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={addItem}
							disabled={!newItem.description.trim()}
							class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
						>
							Add
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Save Line Items Button -->
		{#if lineItemsDirty && (status === 'draft' || status === 'revised')}
			<form
				method="POST"
				action="?/saveLineItems"
				use:enhance={() => {
					savingLineItems = true;
					return async ({ update }) => {
						savingLineItems = false;
						lineItemsDirty = false;
						await update({ reset: false });
					};
				}}
				class="mt-4"
			>
				<input type="hidden" name="line_items" value={JSON.stringify(lineItems)} />
				<button
					type="submit"
					disabled={savingLineItems}
					class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
				>
					{savingLineItems ? 'Saving...' : 'Save Line Items'}
				</button>
			</form>
		{/if}
	</div>

	<!-- Totals Card -->
	<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Totals</h3>
		<div class="space-y-2 text-sm">
			<div class="flex justify-between text-gray-600">
				<span>Parts</span>
				<span>{formatCurrency(totals.parts_total)}</span>
			</div>
			<div class="flex justify-between text-gray-600">
				<span>Labour</span>
				<span>{formatCurrency(totals.labor_total)}</span>
			</div>
			<div class="flex justify-between text-gray-600">
				<span>Sublet</span>
				<span>{formatCurrency(totals.sublet_total)}</span>
			</div>
			<div class="flex justify-between text-gray-600">
				<span>Sundries / Other</span>
				<span>{formatCurrency(totals.sundries_total)}</span>
			</div>
			<div class="flex justify-between border-t border-gray-100 pt-2 font-medium text-gray-900">
				<span>Subtotal</span>
				<span>{formatCurrency(totals.subtotal)}</span>
			</div>
			<div class="flex justify-between text-gray-600">
				<span>VAT ({totals.vat_rate}%)</span>
				<span>{formatCurrency(totals.vat_amount)}</span>
			</div>
			<div class="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
				<span>Total</span>
				<span>{formatCurrency(totals.total)}</span>
			</div>
		</div>
	</div>

	<!-- Notes -->
	<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Notes</h3>
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
				<button
					type="submit"
					disabled={savingNotes}
					class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
				>
					{savingNotes ? 'Saving...' : 'Save Notes'}
				</button>
			</div>
		</form>
	</div>
</div>
