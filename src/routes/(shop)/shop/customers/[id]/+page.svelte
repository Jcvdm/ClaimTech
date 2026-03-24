<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { ShopJobStatus } from '$lib/services/shop-job.service';

	let { data }: { data: PageData } = $props();

	let customer = $state(data.customer);

	let saving = $state(false);
	let saveSuccess = $state(false);

	// Editable fields
	let name = $state(customer.name ?? '');
	let phone = $state(customer.phone ?? '');
	let email = $state(customer.email ?? '');
	let address = $state(customer.address ?? '');
	let city = $state(customer.city ?? '');
	let province = $state(customer.province ?? '');
	let companyName = $state(customer.company_name ?? '');
	let vatNumber = $state(customer.vat_number ?? '');
	let idNumber = $state(customer.id_number ?? '');
	let notes = $state(customer.notes ?? '');

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

	let vehicles = $derived(
		Array.isArray(customer.shop_customer_vehicles) ? customer.shop_customer_vehicles : []
	);

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="space-y-6 pt-4">
	<!-- Header -->
	<div>
		<a href="/shop/customers" class="text-sm text-gray-500 hover:text-gray-700">&larr; Customers</a>
		<h1 class="mt-2 text-2xl font-semibold text-gray-900">{customer.name}</h1>
		{#if customer.company_name}
			<p class="mt-0.5 text-sm text-gray-500">{customer.company_name}</p>
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Customer Info Card (editable) -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
			<h2 class="mb-4 text-sm font-semibold text-gray-700">Customer Information</h2>
			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					saving = true;
					saveSuccess = false;
					return async ({ result, update }) => {
						saving = false;
						if (result.type === 'success') {
							saveSuccess = true;
							setTimeout(() => (saveSuccess = false), 3000);
						}
						await update({ reset: false });
					};
				}}
				class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
			>
				<div>
					<label for="name" class="block text-xs font-medium text-gray-500">Name *</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						bind:value={name}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div>
					<label for="phone" class="block text-xs font-medium text-gray-500">Phone</label>
					<input
						id="phone"
						name="phone"
						type="tel"
						bind:value={phone}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div>
					<label for="email" class="block text-xs font-medium text-gray-500">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						bind:value={email}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div>
					<label for="company_name" class="block text-xs font-medium text-gray-500">
						Company Name
					</label>
					<input
						id="company_name"
						name="company_name"
						type="text"
						bind:value={companyName}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div>
					<label for="vat_number" class="block text-xs font-medium text-gray-500">VAT Number</label>
					<input
						id="vat_number"
						name="vat_number"
						type="text"
						bind:value={vatNumber}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div>
					<label for="id_number" class="block text-xs font-medium text-gray-500">ID Number</label>
					<input
						id="id_number"
						name="id_number"
						type="text"
						bind:value={idNumber}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div class="sm:col-span-2 lg:col-span-3">
					<label for="address" class="block text-xs font-medium text-gray-500">Address</label>
					<input
						id="address"
						name="address"
						type="text"
						bind:value={address}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div>
					<label for="city" class="block text-xs font-medium text-gray-500">City</label>
					<input
						id="city"
						name="city"
						type="text"
						bind:value={city}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div>
					<label for="province" class="block text-xs font-medium text-gray-500">Province</label>
					<input
						id="province"
						name="province"
						type="text"
						bind:value={province}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					/>
				</div>
				<div class="sm:col-span-2 lg:col-span-3">
					<label for="notes" class="block text-xs font-medium text-gray-500">Notes</label>
					<textarea
						id="notes"
						name="notes"
						rows="2"
						bind:value={notes}
						class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
					></textarea>
				</div>
				<div class="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
					<button
						type="submit"
						disabled={saving}
						class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					{#if saveSuccess}
						<span class="text-sm text-green-600">Saved successfully.</span>
					{/if}
				</div>
			</form>
		</div>

		<!-- Vehicles Section -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-sm font-semibold text-gray-700">Registered Vehicles</h2>
			{#if vehicles.length === 0}
				<p class="text-sm text-gray-400">No vehicles registered for this customer.</p>
			{:else}
				<div class="divide-y divide-gray-100">
					{#each vehicles as vehicle}
						<div class="py-3 text-sm">
							<p class="font-medium text-gray-900">
								{vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make}
								{vehicle.model}
							</p>
							<div class="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
								{#if vehicle.reg_number}
									<span>Reg: {vehicle.reg_number}</span>
								{/if}
								{#if vehicle.color}
									<span>Color: {vehicle.color}</span>
								{/if}
								{#if vehicle.vin}
									<span>VIN: {vehicle.vin}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Job History -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 text-sm font-semibold text-gray-700">Job History</h2>
			{#if data.jobs.length === 0}
				<p class="text-sm text-gray-400">No jobs found for this customer.</p>
			{:else}
				<div class="divide-y divide-gray-100">
					{#each data.jobs as job}
						<div
							class="flex cursor-pointer items-center justify-between py-2.5 transition-colors hover:bg-gray-50"
							onclick={() => goto(`/shop/jobs/${job.id}`)}
						>
							<div class="text-sm">
								<p class="font-medium text-gray-900">{job.job_number}</p>
								<p class="text-xs text-gray-500">
									{job.vehicle_year ? `${job.vehicle_year} ` : ''}{job.vehicle_make}
									{job.vehicle_model}
									{#if job.vehicle_reg}
										({job.vehicle_reg})
									{/if}
								</p>
								<p class="text-xs text-gray-400">{formatDate(job.date_in)}</p>
							</div>
							<span
								class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusBadgeConfig[job.status as ShopJobStatus] ?? 'bg-gray-100 text-gray-700'}"
							>
								{STATUS_LABELS[job.status as ShopJobStatus] ?? job.status}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
