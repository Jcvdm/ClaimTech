<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import VehicleInfoSection from '$lib/components/forms/VehicleInfoSection.svelte';
	import type { Province } from '$lib/types/engineer';

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

	// Vehicle fields
	let vehicle_make = $state('');
	let vehicle_model = $state('');
	let vehicle_year = $state<number | undefined>(undefined);
	let vehicle_vin = $state('');
	let vehicle_registration = $state('');
	let vehicle_color = $state('');
	let vehicle_mileage = $state<number | undefined>(undefined);
	let vehicle_province = $state<Province | ''>('');

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
		<Button variant="ghost" size="sm" href="/shop/estimates" class="gap-1">
			<ArrowLeft class="h-4 w-4" />
			Back to Estimates
		</Button>
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
		<Card.Root>
			<Card.Header>
				<Card.Title>Job Type</Card.Title>
			</Card.Header>
			<Card.Content>
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
			</Card.Content>
		</Card.Root>

		<!-- Customer Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Customer Information</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if customers.length > 0}
					<div>
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
						<div>
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
						<Input
							id="customer_name"
							name="customer_name"
							type="text"
							bind:value={customer_name}
							required
							placeholder="Full name"
						/>
					</div>
					<div>
						<label class="mb-1.5 block text-sm font-medium text-gray-700" for="customer_phone">
							Phone
						</label>
						<Input
							id="customer_phone"
							name="customer_phone"
							type="tel"
							bind:value={customer_phone}
							placeholder="+27 82 123 4567"
						/>
					</div>
				</div>
				<div>
					<label class="mb-1.5 block text-sm font-medium text-gray-700" for="customer_email">
						Email
					</label>
					<Input
						id="customer_email"
						name="customer_email"
						type="email"
						bind:value={customer_email}
						placeholder="customer@example.com"
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Vehicle Info -->
		<!-- Hidden input to map vehicle_registration -> vehicle_reg for server action -->
		<input type="hidden" name="vehicle_reg" value={vehicle_registration} />
		<VehicleInfoSection
			bind:vehicle_make
			bind:vehicle_model
			bind:vehicle_year
			bind:vehicle_vin
			bind:vehicle_registration
			bind:vehicle_color
			bind:vehicle_mileage
			bind:vehicle_province
		/>

		<!-- Job Details (conditional) -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Job Details</Card.Title>
			</Card.Header>
			<Card.Content>
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
			</Card.Content>
		</Card.Root>

		<!-- Form Actions -->
		<div class="flex items-center justify-end gap-3 pb-6">
			<Button variant="outline" href="/shop/estimates">
				Cancel
			</Button>
			<Button
				type="submit"
				disabled={submitting || !data.settings}
			>
				{#if submitting}
					<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
					Creating...
				{:else}
					Create Estimate
				{/if}
			</Button>
		</div>
	</form>
</div>
