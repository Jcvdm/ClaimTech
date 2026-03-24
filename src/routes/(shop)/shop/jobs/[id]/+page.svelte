<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import type { ShopJobStatus } from '$lib/services/shop-job.service';

	let { data }: { data: PageData } = $props();

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

	const statusBadgeConfig: Record<ShopJobStatus, string> = {
		quote_requested: 'bg-gray-100 text-gray-700',
		quoted: 'bg-blue-100 text-blue-700',
		approved: 'bg-green-100 text-green-700',
		checked_in: 'bg-yellow-100 text-yellow-700',
		in_progress: 'bg-orange-100 text-orange-700',
		quality_check: 'bg-purple-100 text-purple-700',
		ready_for_collection: 'bg-teal-100 text-teal-700',
		completed: 'bg-green-200 text-green-800',
		cancelled: 'bg-red-100 text-red-700'
	};

	const jobTypeBadgeConfig: Record<string, string> = {
		autobody: 'bg-blue-100 text-blue-700',
		mechanical: 'bg-orange-100 text-orange-700'
	};

	let job = $state(data.job);
	let saving = $state(false);
	let statusUpdating = $state(false);

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
				<a href="/shop/jobs" class="text-sm text-gray-500 hover:text-gray-700">&larr; Jobs</a>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-semibold text-gray-900">{job.job_number}</h1>
				<span
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium {statusBadgeConfig[job.status as ShopJobStatus] ?? 'bg-gray-100 text-gray-700'}"
				>
					{STATUS_LABELS[job.status as ShopJobStatus] ?? job.status}
				</span>
				<span
					class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium {jobTypeBadgeConfig[job.job_type] ?? 'bg-gray-100 text-gray-700'}"
				>
					{job.job_type === 'autobody' ? 'Autobody' : 'Mechanical'}
				</span>
			</div>
		</div>
	</div>

	<!-- Status Progression -->
	{#if job.status !== 'cancelled'}
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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
						<button
							type="submit"
							disabled={statusUpdating}
							class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
						>
							{statusUpdating ? 'Updating...' : `Advance to ${STATUS_LABELS[nextStatus]}`}
						</button>
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
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Customer Card -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-sm font-semibold text-gray-700">Customer</h2>
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
					<a
						href="/shop/customers/{job.customer_id}"
						class="mt-2 inline-block text-xs text-blue-600 hover:underline"
					>
						View customer profile &rarr;
					</a>
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
		</div>

		<!-- Vehicle Card -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-sm font-semibold text-gray-700">Vehicle</h2>
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
		</div>

		<!-- Job Details Card -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-sm font-semibold text-gray-700">Job Details</h2>
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
						<input
							id="fault_codes"
							name="fault_codes"
							type="text"
							bind:value={faultCodes}
							class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
						/>
					</div>
				{/if}
				<button
					type="submit"
					disabled={saving}
					class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save Details'}
				</button>
			</form>
		</div>

		<!-- Dates Card -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-sm font-semibold text-gray-700">Dates</h2>
			<div class="space-y-3 text-sm">
				<div>
					<span class="text-xs font-medium text-gray-400">Date In</span>
					<p class="mt-0.5 text-gray-800">{formatDate(job.date_in)}</p>
				</div>
				<div>
					<span class="text-xs font-medium text-gray-400">Date Completed</span>
					<p class="mt-0.5 text-gray-800">{formatDate(job.date_completed)}</p>
				</div>
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
						<input
							id="date_promised"
							name="date_promised"
							type="date"
							bind:value={datepromised}
							class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
						/>
						<button
							type="submit"
							class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
						>
							Save
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Estimates Card -->
		{#if estimates.length > 0}
			<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
				<h2 class="mb-4 text-sm font-semibold text-gray-700">Estimates</h2>
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
								<a
									href="/shop/estimates/{estimate.id}"
									class="text-xs text-blue-600 hover:underline"
								>
									View &rarr;
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Notes Card -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-sm font-semibold text-gray-700">Notes</h2>
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
				<button
					type="submit"
					disabled={saving}
					class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save Notes'}
				</button>
			</form>
		</div>
	</div>
</div>
