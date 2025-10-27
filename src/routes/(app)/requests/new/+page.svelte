<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
	import VehicleInfoSection from '$lib/components/forms/VehicleInfoSection.svelte';
	import IncidentInfoSection from '$lib/components/forms/IncidentInfoSection.svelte';
	import OwnerInfoSection from '$lib/components/forms/OwnerInfoSection.svelte';
	import FormActions from '$lib/components/forms/FormActions.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { requestService } from '$lib/services/request.service';
	import { clientService } from '$lib/services/client.service';
	import { Plus } from 'lucide-svelte';
	import type { CreateRequestInput, RequestType } from '$lib/types/request';
	import type { Province } from '$lib/types/engineer';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let showClientModal = $state(false);

	// Basic Information
	let client_id = $state('');
	let type = $state<RequestType>('insurance');
	let claim_number = $state('');
	let description = $state('');

	// Incident Details
	let date_of_loss = $state('');
	let insured_value = $state<number | undefined>(undefined);
	let incident_type = $state('');
	let incident_description = $state('');
	let incident_location = $state('');

	// Vehicle Information
	let vehicle_make = $state('');
	let vehicle_model = $state('');
	let vehicle_year = $state<number | undefined>(undefined);
	let vehicle_vin = $state('');
	let vehicle_registration = $state('');
	let vehicle_color = $state('');
	let vehicle_mileage = $state<number | undefined>(undefined);
	let vehicle_province = $state<Province | ''>('');

	// Owner Details
	let owner_name = $state('');
	let owner_phone = $state('');
	let owner_email = $state('');
	let owner_address = $state('');

	// Third Party Details
	let third_party_name = $state('');
	let third_party_phone = $state('');
	let third_party_email = $state('');
	let third_party_insurance = $state('');

	// New client form
	let newClientName = $state('');
	let newClientType = $state<'insurance' | 'private'>('insurance');
	let newClientEmail = $state('');
	let newClientPhone = $state('');

	async function handleQuickAddClient() {
		if (!newClientName) {
			error = 'Client name is required';
			return;
		}

		loading = true;
		error = null;

		try {
			const newClient = await clientService.createClient({
				name: newClientName,
				type: newClientType,
				email: newClientEmail,
				phone: newClientPhone
			});

			// Add to clients list and select it
			data.clients = [...data.clients, newClient];
			client_id = newClient.id;

			// Reset form and close modal
			newClientName = '';
			newClientType = 'insurance';
			newClientEmail = '';
			newClientPhone = '';
			showClientModal = false;
		} catch (err) {
			console.error('Error creating client:', err);
			error = err instanceof Error ? err.message : 'Failed to create client';
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!client_id) {
			error = 'Please select a client';
			return;
		}

		loading = true;
		error = null;

		try {
			const requestData: CreateRequestInput = {
				client_id,
				type,
				claim_number: claim_number || undefined,
				description: description || undefined,
				date_of_loss: date_of_loss || undefined,
				insured_value: insured_value || undefined,
				incident_type: incident_type || undefined,
				incident_description: incident_description || undefined,
				incident_location: incident_location || undefined,
				vehicle_make: vehicle_make || undefined,
				vehicle_model: vehicle_model || undefined,
				vehicle_year: vehicle_year || undefined,
				vehicle_vin: vehicle_vin || undefined,
				vehicle_registration: vehicle_registration || undefined,
				vehicle_color: vehicle_color || undefined,
				vehicle_mileage: vehicle_mileage || undefined,
				vehicle_province: vehicle_province || undefined,
				owner_name: owner_name || undefined,
				owner_phone: owner_phone || undefined,
				owner_email: owner_email || undefined,
				owner_address: owner_address || undefined,
				third_party_name: third_party_name || undefined,
				third_party_phone: third_party_phone || undefined,
				third_party_email: third_party_email || undefined,
				third_party_insurance: third_party_insurance || undefined
			};

			const { request: newRequest, assessment } = await requestService.createRequest(requestData);
			console.log('Request and assessment created successfully:', { request: newRequest.id, assessment: assessment.id });
			goto(`/requests/${newRequest.id}`);
		} catch (err) {
			console.error('Error creating request:', err);
			error = err instanceof Error ? err.message : 'Failed to create request';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		goto('/requests');
	}

	// Client options for dropdown
	const clientOptions = [
		{ value: '', label: 'Select a client' },
		...data.clients.map((c) => ({
			value: c.id,
			label: `${c.name} (${c.type === 'insurance' ? 'Insurance' : 'Private'})`
		}))
	];


</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="New Request" description="Create a new vehicle damage assessment request" />

	{#if data.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{data.error}</p>
		</div>
	{/if}

	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Basic Information -->
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
			<div class="grid gap-6">
				<div class="flex gap-2">
					<div class="flex-1">
						<FormField
							label="Client"
							name="client_id"
							type="select"
							bind:value={client_id}
							required
							options={clientOptions}
						/>
					</div>
					<div class="flex items-end">
						<Button type="button" variant="outline" onclick={() => (showClientModal = true)}>
							<Plus class="mr-2 h-4 w-4" />
							Quick Add
						</Button>
					</div>
				</div>

				<div class="grid gap-6 md:grid-cols-2">
					<FormField
						label="Request Type"
						name="type"
						type="select"
						bind:value={type}
						required
						options={[
							{ value: 'insurance', label: 'Insurance' },
							{ value: 'private', label: 'Private' }
						]}
					/>

					{#if type === 'insurance'}
						<FormField
							label="Claim Number"
							name="claim_number"
							type="text"
							bind:value={claim_number}
							placeholder="e.g., SANT-2025-12345"
						/>
					{/if}
				</div>

				<FormField
					label="Description"
					name="description"
					type="textarea"
					bind:value={description}
					placeholder="Brief description of the request..."
					rows={3}
				/>
			</div>
		</Card>

		<!-- Incident Details -->
		<IncidentInfoSection
			bind:date_of_loss
			bind:insured_value
			bind:incident_type
			bind:incident_description
			bind:incident_location
		/>

		<!-- Vehicle Information -->
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

		<!-- Owner & Third Party Details -->
		<OwnerInfoSection
			bind:owner_name
			bind:owner_phone
			bind:owner_email
			bind:owner_address
			bind:third_party_name
			bind:third_party_phone
			bind:third_party_email
			bind:third_party_insurance
		/>

		<FormActions
			primaryLabel="Create Request"
			{loading}
			onCancel={handleCancel}
		/>
	</form>
</div>

<!-- Quick Add Client Modal -->
{#if showClientModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<Card class="w-full max-w-md p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Quick Add Client</h3>
			<div class="space-y-4">
				<FormField
					label="Client Name"
					name="new_client_name"
					type="text"
					bind:value={newClientName}
					required
					placeholder="Client name"
				/>

				<FormField
					label="Type"
					name="new_client_type"
					type="select"
					bind:value={newClientType}
					required
					options={[
						{ value: 'insurance', label: 'Insurance' },
						{ value: 'private', label: 'Private' }
					]}
				/>

				<FormField
					label="Email"
					name="new_client_email"
					type="email"
					bind:value={newClientEmail}
					placeholder="email@example.com"
				/>

				<FormField
					label="Phone"
					name="new_client_phone"
					type="text"
					bind:value={newClientPhone}
					placeholder="+27 11 123 4567"
				/>

				<div class="flex justify-end gap-2 pt-4">
					<Button
						type="button"
						variant="outline"
						onclick={() => {
							showClientModal = false;
							error = null;
						}}
					>
						Cancel
					</Button>
					<Button type="button" onclick={handleQuickAddClient} disabled={loading}>
						Add Client
					</Button>
				</div>
			</div>
		</Card>
	</div>
{/if}


