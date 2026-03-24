<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, CheckCircle } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import type { ShopInvoiceStatus, ShopInvoiceLineItem } from '$lib/services/shop-invoice.service';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const invoice = $derived(data.invoice);
	const job = $derived((invoice as { shop_jobs?: Record<string, unknown> }).shop_jobs ?? {});

	const statusVariant: Record<ShopInvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
		draft: 'secondary',
		sent: 'default',
		paid: 'outline',
		partially_paid: 'default',
		overdue: 'destructive',
		void: 'secondary'
	};

	const statusLabel: Record<ShopInvoiceStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		paid: 'Paid',
		partially_paid: 'Partially Paid',
		overdue: 'Overdue',
		void: 'Void'
	};

	function getStatusVariant(status: string) {
		return statusVariant[status as ShopInvoiceStatus] ?? 'secondary';
	}

	function getStatusLabel(status: string) {
		return statusLabel[status as ShopInvoiceStatus] ?? status;
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const status = $derived((invoice as { status?: string }).status ?? 'draft');
	const lineItems = $derived<ShopInvoiceLineItem[]>(
		Array.isArray((invoice as { line_items?: ShopInvoiceLineItem[] }).line_items)
			? ((invoice as { line_items: ShopInvoiceLineItem[] }).line_items)
			: []
	);

	// Payment form state
	let paymentAmount = $state(String((invoice as { amount_due?: number }).amount_due ?? 0));
	let paymentMethod = $state('eft');
	let paymentReference = $state('');
	let paymentDate = $state(new Date().toISOString().split('T')[0]);
	let submittingSend = $state(false);
	let submittingPayment = $state(false);
	let submittingVoid = $state(false);
</script>

<div class="space-y-6 pt-4">
	<!-- Back Navigation -->
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="sm" href="/shop/invoices" class="gap-1">
			<ArrowLeft class="h-4 w-4" />
			Back to Invoices
		</Button>
	</div>

	{#if form?.error}
		<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<!-- Invoice Header -->
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-semibold text-gray-900">
					{(invoice as { invoice_number?: string }).invoice_number ?? 'Invoice'}
				</h1>
				<Badge variant={getStatusVariant(status)}>
					{getStatusLabel(status)}
				</Badge>
			</div>
			<p class="mt-1 text-sm text-gray-500">
				Issued {formatDate((invoice as { issue_date?: string }).issue_date ?? null)}
				· Due {formatDate((invoice as { due_date?: string }).due_date ?? null)}
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2">
			{#if status === 'draft'}
				<form
					method="POST"
					action="?/send"
					use:enhance={() => {
						submittingSend = true;
						return async ({ update }) => {
							submittingSend = false;
							await update();
						};
					}}
				>
					<Button type="submit" variant="default" disabled={submittingSend}>
						{submittingSend ? 'Sending...' : 'Mark as Sent'}
					</Button>
				</form>
			{/if}
			{#if status !== 'void' && status !== 'paid'}
				<form
					method="POST"
					action="?/void"
					use:enhance={() => {
						submittingVoid = true;
						return async ({ update }) => {
							submittingVoid = false;
							await update();
						};
					}}
				>
					<Button type="submit" variant="destructive" disabled={submittingVoid}>
						{submittingVoid ? 'Voiding...' : 'Void Invoice'}
					</Button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Paid Banner -->
	{#if status === 'paid'}
		<div class="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
			<CheckCircle class="h-5 w-5 text-green-600" />
			<div>
				<p class="font-medium text-green-800">Invoice Paid</p>
				{#if (invoice as { paid_at?: string }).paid_at}
					<p class="text-sm text-green-700">
						Paid on {formatDate((invoice as { paid_at: string }).paid_at)}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Void Banner -->
	{#if status === 'void'}
		<div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
			<p class="font-medium text-gray-700">This invoice has been voided</p>
		</div>
	{/if}

	<!-- Customer & Vehicle Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Customer & Vehicle</Card.Title>
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
						{[(job as { vehicle_year?: number }).vehicle_year, (job as { vehicle_make?: string }).vehicle_make, (job as { vehicle_model?: string }).vehicle_model]
							.filter(Boolean)
							.join(' ') || '—'}
					</p>
					{#if (job as { vehicle_reg?: string }).vehicle_reg}
						<p class="text-sm text-gray-600">Reg: {(job as { vehicle_reg: string }).vehicle_reg}</p>
					{/if}
					{#if (job as { vehicle_color?: string }).vehicle_color}
						<p class="text-sm text-gray-600">Color: {(job as { vehicle_color: string }).vehicle_color}</p>
					{/if}
					{#if (job as { job_number?: string }).job_number}
						<p class="text-sm text-gray-600">
							Job: <a href="/shop/jobs/{(invoice as { job_id?: string }).job_id}" class="text-slate-700 underline underline-offset-2">
								{(job as { job_number: string }).job_number}
							</a>
						</p>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Line Items Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Line Items</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if lineItems.length === 0}
				<p class="py-6 text-center text-sm text-gray-400">No line items on this invoice.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-gray-100">
								<th class="pb-2 text-left font-medium text-gray-500">Description</th>
								<th class="pb-2 text-left font-medium text-gray-500">Category</th>
								<th class="pb-2 text-right font-medium text-gray-500">Qty</th>
								<th class="pb-2 text-right font-medium text-gray-500">Unit Price</th>
								<th class="pb-2 text-right font-medium text-gray-500">Total</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-50">
							{#each lineItems as item (item.id)}
								<tr>
									<td class="py-2 pr-4 text-gray-900">{item.description}</td>
									<td class="py-2 pr-4 capitalize text-gray-600">{item.type}</td>
									<td class="py-2 pr-4 text-right text-gray-700">{item.quantity}</td>
									<td class="py-2 pr-4 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
									<td class="py-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Totals Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Totals</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-2 text-sm">
				<div class="flex justify-between text-gray-600">
					<span>Subtotal</span>
					<span>{formatCurrency((invoice as { subtotal?: number }).subtotal ?? 0)}</span>
				</div>
				{#if ((invoice as { discount_amount?: number }).discount_amount ?? 0) > 0}
					<div class="flex justify-between text-gray-600">
						<span>Discount</span>
						<span>-{formatCurrency((invoice as { discount_amount: number }).discount_amount)}</span>
					</div>
				{/if}
				<div class="flex justify-between text-gray-600">
					<span>VAT ({(invoice as { vat_rate?: number }).vat_rate ?? 15}%)</span>
					<span>{formatCurrency((invoice as { vat_amount?: number }).vat_amount ?? 0)}</span>
				</div>
				<Separator class="my-2" />
				<div class="flex justify-between font-semibold text-gray-900">
					<span>Total</span>
					<span>{formatCurrency((invoice as { total?: number }).total ?? 0)}</span>
				</div>
				{#if ((invoice as { amount_paid?: number }).amount_paid ?? 0) > 0}
					<div class="flex justify-between text-gray-600">
						<span>Amount Paid</span>
						<span class="text-green-700">-{formatCurrency((invoice as { amount_paid: number }).amount_paid)}</span>
					</div>
				{/if}
				<Separator class="my-2" />
				<div class="flex justify-between text-base font-bold">
					<span class={status === 'paid' ? 'text-green-700' : 'text-gray-900'}>Amount Due</span>
					<span class={status === 'paid' ? 'text-green-700' : 'text-gray-900'}>
						{formatCurrency((invoice as { amount_due?: number }).amount_due ?? 0)}
					</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Payment Section -->
	{#if status === 'sent' || status === 'partially_paid'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Record Payment</Card.Title>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/recordPayment"
					use:enhance={() => {
						submittingPayment = true;
						return async ({ update }) => {
							submittingPayment = false;
							await update();
						};
					}}
					class="space-y-4"
				>
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<label for="payment_amount" class="mb-1 block text-xs font-medium text-gray-600">
								Amount (R) *
							</label>
							<Input
								id="payment_amount"
								name="amount"
								type="number"
								min="0.01"
								step="0.01"
								bind:value={paymentAmount}
								required
							/>
						</div>
						<div>
							<label for="payment_method" class="mb-1 block text-xs font-medium text-gray-600">
								Payment Method *
							</label>
							<select
								id="payment_method"
								name="method"
								bind:value={paymentMethod}
								required
								class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
							>
								<option value="eft">EFT</option>
								<option value="cash">Cash</option>
								<option value="card">Card</option>
								<option value="cheque">Cheque</option>
							</select>
						</div>
						<div>
							<label for="payment_reference" class="mb-1 block text-xs font-medium text-gray-600">
								Reference
							</label>
							<Input
								id="payment_reference"
								name="reference"
								type="text"
								bind:value={paymentReference}
								placeholder="e.g., bank reference number"
							/>
						</div>
						<div>
							<label for="payment_date" class="mb-1 block text-xs font-medium text-gray-600">
								Payment Date
							</label>
							<Input
								id="payment_date"
								name="date"
								type="date"
								bind:value={paymentDate}
							/>
						</div>
					</div>
					<div class="flex justify-end">
						<Button type="submit" disabled={submittingPayment}>
							{submittingPayment ? 'Recording...' : 'Record Payment'}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Payment Details (if paid) -->
	{#if status === 'paid' && (invoice as { payment_method?: string }).payment_method}
		<Card.Root>
			<Card.Header>
				<Card.Title>Payment Details</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2 text-sm text-gray-700">
					<p>
						<span class="text-gray-500">Method:</span>
						<span class="ml-1 capitalize">{(invoice as { payment_method: string }).payment_method}</span>
					</p>
					{#if (invoice as { payment_reference?: string }).payment_reference}
						<p>
							<span class="text-gray-500">Reference:</span>
							<span class="ml-1">{(invoice as { payment_reference: string }).payment_reference}</span>
						</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
