<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { ShopJobStatus } from '$lib/services/shop-job.service';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

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

	let job = $state(data.job);
	let saving = $state(false);
	let statusUpdating = $state(false);
	let creatingInvoice = $state(false);

	const existingInvoice = $derived(data.existingInvoice);
	const canCreateInvoice = $derived(
		job.status === 'ready_for_collection' || job.status === 'completed'
	);

	let currentStepIndex = $derived(
		STATUS_STEPS.indexOf(job.status as ShopJobStatus)
	);

	let nextStatus = $derived(
		VALID_TRANSITIONS[job.status as ShopJobStatus]?.find(
			(s) => s !== 'cancelled' && STATUS_STEPS.includes(s)
		) ?? null
	);

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
	let estimates = $derived(
		Array.isArray(job.shop_estimates) ? job.shop_estimates : []
	);
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

		<!-- Invoice Actions -->
		<div class="flex items-center gap-2">
			{#if form?.error}
				<p class="text-sm text-red-600">{form.error}</p>
			{/if}
			{#if existingInvoice}
				<Button variant="outline" size="sm" href="/shop/invoices/{existingInvoice.id}">
					View Invoice ({existingInvoice.invoice_number})
				</Button>
			{:else if canCreateInvoice}
				<form
					method="POST"
					action="?/createInvoice"
					use:enhance={() => {
						creatingInvoice = true;
						return async ({ update }) => {
							creatingInvoice = false;
							await update();
						};
					}}
				>
					<Button type="submit" variant="default" size="sm" disabled={creatingInvoice}>
						{creatingInvoice ? 'Creating...' : 'Create Invoice'}
					</Button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Status Progression -->
	{#if job.status !== 'cancelled'}
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-semibold text-gray-700">Workflow Status</h2>
					{#if nextStatus}
						<form
							method="POST"
							action="?/updateStatus"
							use:enhance={() => {
								statusUpdating = true;
								return async ({ result, update }) => {
									statusUpdating = false;
									if (result.type === 'success') {
										job = { ...job, status: nextStatus! };
									}
									await update();
								};
							}}
						>
							<input type="hidden" name="status" value={nextStatus} />
							<Button type="submit" size="sm" disabled={statusUpdating}>
								{statusUpdating ? 'Updating...' : `Advance to ${STATUS_LABELS[nextStatus]}`}
							</Button>
						</form>
					{/if}
				</div>

				<!-- Stepper -->
				<div class="mt-4 overflow-x-auto">
					<div class="flex min-w-max items-center gap-0">
						{#each STATUS_STEPS as step, i}
							{@const isPast = i < currentStepIndex}
							{@const isCurrent = i === currentStepIndex}
							{@const isFuture = i > currentStepIndex}
							<div class="flex items-center">
								<div class="flex flex-col items-center">
									<div
										class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
										{isPast ? 'bg-green-500 text-white' : ''}
										{isCurrent ? 'bg-slate-900 text-white' : ''}
										{isFuture ? 'bg-gray-200 text-gray-400' : ''}"
									>
										{#if isPast}
											&#10003;
										{:else}
											{i + 1}
										{/if}
									</div>
									<span
										class="mt-1 max-w-[80px] text-center text-xs leading-tight
										{isCurrent ? 'font-semibold text-gray-900' : ''}
										{isPast ? 'text-green-600' : ''}
										{isFuture ? 'text-gray-400' : ''}"
									>
										{STATUS_LABELS[step]}
									</span>
								</div>
								{#if i < STATUS_STEPS.length - 1}
									<div
										class="mx-1 h-0.5 w-8 {isPast || isCurrent ? 'bg-slate-400' : 'bg-gray-200'}"
									></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

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
						<Button variant="link" size="sm" href="/shop/customers/{job.customer_id}" class="mt-2 h-auto p-0 text-xs">
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
						<p class="text-gray-600"><span class="text-gray-400">Reg:</span> {job.vehicle_reg}</p>
					{/if}
					{#if job.vehicle_vin}
						<p class="text-gray-600"><span class="text-gray-400">VIN:</span> {job.vehicle_vin}</p>
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
						return async ({ update }) => {
							saving = false;
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
							<Input
								id="fault_codes"
								name="fault_codes"
								type="text"
								bind:value={faultCodes}
							/>
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
							return async ({ update }) => {
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

		<!-- Estimates Card -->
		{#if estimates.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Estimates</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="divide-y divide-gray-100">
						{#each estimates as estimate}
							<div class="flex items-center justify-between py-2.5 text-sm">
								<div>
									<p class="font-medium text-gray-900">{estimate.estimate_number}</p>
									<p class="text-xs text-gray-500 capitalize">{estimate.status}</p>
								</div>
								<div class="flex items-center gap-4">
									{#if estimate.total != null}
										<span class="font-medium text-gray-800">
											R {Number(estimate.total).toLocaleString('en-ZA', {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</span>
									{/if}
									<Button variant="link" size="sm" href="/shop/estimates/{estimate.id}" class="h-auto p-0 text-xs">
										View &rarr;
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

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
						return async ({ update }) => {
							saving = false;
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
