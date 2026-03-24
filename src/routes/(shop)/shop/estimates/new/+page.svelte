<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	type ShopCustomer = { id: string; name: string; phone: string | null; email: string | null };

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Cast customers to typed array (shop_customers is not in generated types yet)
	const customers = $derived((data.customers as unknown as ShopCustomer[]) ?? []);

	let job_type = $state<'autobody' | 'mechanical'>('autobody');
	let use_existing_customer = $state(false);
	let selected_customer_id = $state('');
	let submitting = $state(false);

	// When a customer is selected from the dropdown, pre-fill the fields
	const selectedCustomer = $derived(
		customers.find((c) => c.id === selected_customer_id) ?? null
	);

	let customer_name = $state('');
	let customer_phone = $state('');
	let customer_email = $state('');

	$effect(() => {
		if (selectedCustomer) {
			customer_name = selectedCustomer.name ?? '';
			customer_phone = selectedCustomer.phone ?? '';
			customer_email = selectedCustomer.email ?? '';
		}
	});
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

	<div>
		<h1 class="text-2xl font-semibold text-gray-900">New Estimate</h1>
		<p class="mt-1 text-sm text-gray-500">Create a new repair estimate for a customer.</p>
	</div>

	{#if form?.error}
		<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	{#if !data.settings}
		<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
			Shop settings have not been configured yet. Please set up shop settings before creating estimates.
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
		class="space-y-6"
	>
		<!-- Hidden shop_id -->
		{#if data.settings}
			<input type="hidden" name="shop_id" value={data.settings.id} />
		{/if}

		<!-- Job Type -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Job Type</h3>
			<div class="flex gap-4">
				<label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 px-5 py-4 transition-colors {job_type === 'autobody' ? 'border-slate-800 bg-slate-50' : 'border-gray-200 hover:border-gray-300'}">
					<input
						type="radio"
						name="job_type"
						value="autobody"
						bind:group={job_type}
						class="sr-only"
					/>
					<div class="h-4 w-4 rounded-full border-2 {job_type === 'autobody' ? 'border-slate-800 bg-slate-800' : 'border-gray-400'}"></div>
					<span class="font-medium text-gray-900">Autobody</span>
				</label>
				<label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 px-5 py-4 transition-colors {job_type === 'mechanical' ? 'border-slate-800 bg-slate-50' : 'border-gray-200 hover:border-gray-300'}">
					<input
						type="radio"
						name="job_type"
						value="mechanical"
						bind:group={job_type}
						class="sr-only"
					/>
					<div class="h-4 w-4 rounded-full border-2 {job_type === 'mechanical' ? 'border-slate-800 bg-slate-800' : 'border-gray-400'}"></div>
					<span class="font-medium text-gray-900">Mechanical</span>
				</label>
			</div>
		</div>

		<!-- Customer Info -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Customer Information</h3>

			{#if customers.length > 0}
				<div class="mb-4">
					<label class="flex items-center gap-2 text-sm font-medium text-gray-700">
						<input
							type="checkbox"
							bind:checked={use_existing_customer}
							class="h-4 w-4 rounded border-gray-300 text-slate-800"
						/>
						Select existing customer
					</label>
				</div>

				{#if use_existing_customer}
					<div class="mb-4">
						<label class="mb-1.5 block text-sm font-medium text-gray-700" for="customer_id">
							Customer
						</label>
						<select
							id="customer_id"
							name="customer_id"
							bind:value={selected_customer_id}
							class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						>
							<option value="">Select a customer...</option>
							{#each customers as customer}
								<option value={customer.id}>{customer.name}</option>
							{/each}
						</select>
					</div>
				{/if}
			{/if}

			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="customer_name">
						Customer Name <span class="text-red-500">*</span>
					</label>
					<input
						id="customer_name"
						name="customer_name"
						type="text"
						bind:value={customer_name}
						required
						placeholder="Full name"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="customer_phone">
						Phone
					</label>
					<input
						id="customer_phone"
						name="customer_phone"
						type="tel"
						bind:value={customer_phone}
						placeholder="+27 82 123 4567"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
			</div>
			<div class="mt-4">
				<label class="mb-1.5 block text-sm font-medium text-gray-700" for="customer_email">
					Email
				</label>
				<input
					id="customer_email"
					name="customer_email"
					type="email"
					bind:value={customer_email}
					placeholder="customer@example.com"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
				/>
			</div>
		</div>

		<!-- Vehicle Info -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Vehicle Information</h3>
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="vehicle_make">
						Make <span class="text-red-500">*</span>
					</label>
					<input
						id="vehicle_make"
						name="vehicle_make"
						type="text"
						required
						placeholder="e.g., BMW, Toyota"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="vehicle_model">
						Model <span class="text-red-500">*</span>
					</label>
					<input
						id="vehicle_model"
						name="vehicle_model"
						type="text"
						required
						placeholder="e.g., 320i, Corolla"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
			</div>
			<div class="mt-4 grid gap-4 md:grid-cols-3">
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="vehicle_year">
						Year
					</label>
					<input
						id="vehicle_year"
						name="vehicle_year"
						type="number"
						min="1900"
						max="2100"
						placeholder="2023"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="vehicle_color">
						Color
					</label>
					<input
						id="vehicle_color"
						name="vehicle_color"
						type="text"
						placeholder="White, Black, Silver"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="vehicle_mileage">
						Mileage (km)
					</label>
					<input
						id="vehicle_mileage"
						name="vehicle_mileage"
						type="number"
						min="0"
						placeholder="50000"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
			</div>
			<div class="mt-4 grid gap-4 md:grid-cols-2">
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="vehicle_reg">
						Registration
					</label>
					<input
						id="vehicle_reg"
						name="vehicle_reg"
						type="text"
						placeholder="CA 123 456"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="vehicle_vin">
						VIN
					</label>
					<input
						id="vehicle_vin"
						name="vehicle_vin"
						type="text"
						placeholder="Vehicle Identification Number"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					/>
				</div>
			</div>
		</div>

		<!-- Job Details (conditional) -->
		<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Job Details</h3>

			{#if job_type === 'autobody'}
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="damage_description">
						Damage Description
					</label>
					<textarea
						id="damage_description"
						name="damage_description"
						rows="4"
						placeholder="Describe the damage to be repaired..."
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
					></textarea>
				</div>
			{:else}
				<div class="space-y-4">
					<div>
						<label class="mb-1.5 block text-sm font-medium text-gray-700" for="complaint">
							Customer Complaint
						</label>
						<textarea
							id="complaint"
							name="complaint"
							rows="3"
							placeholder="What is the customer complaining about?"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						></textarea>
					</div>
					<div>
						<label class="mb-1.5 block text-sm font-medium text-gray-700" for="diagnosis">
							Diagnosis
						</label>
						<textarea
							id="diagnosis"
							name="diagnosis"
							rows="3"
							placeholder="Technician's diagnosis..."
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
						></textarea>
					</div>
				</div>
			{/if}
		</div>

		<!-- Form Actions -->
		<div class="flex items-center justify-end gap-3 pb-6">
			<a
				href="/shop/estimates"
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={submitting || !data.settings}
				class="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-50"
			>
				{#if submitting}
					<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
					Creating...
				{:else}
					Create Estimate
				{/if}
			</button>
		</div>
	</form>
</div>
