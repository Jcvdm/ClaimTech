<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
	import VehicleInfoSection from '$lib/components/forms/VehicleInfoSection.svelte';
	import IncidentInfoSection from '$lib/components/forms/IncidentInfoSection.svelte';
	import OwnerInfoSection from '$lib/components/forms/OwnerInfoSection.svelte';
	import FormActions from '$lib/components/forms/FormActions.svelte';
	import { Card } from '$lib/components/ui/card';
	import { requestService } from '$lib/services/request.service';
	import type { UpdateRequestInput, RequestType } from '$lib/types/request';
	import type { Province } from '$lib/types/engineer';
	import type { PageData } from './$types';
	import { useUnsavedChanges } from '$lib/utils/useUnsavedChanges.svelte';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let hasUnsavedChanges = $state(false);

	// Pre-populate form with existing request data
	let client_id = $state(data.request.client_id);
	let type = $state<RequestType>(data.request.type);
	let claim_number = $state(data.request.claim_number || '');
	let description = $state(data.request.description || '');

	// Incident Details
	let date_of_loss = $state(data.request.date_of_loss || '');
	let insured_value = $state<number | undefined>(data.request.insured_value || undefined);
	let incident_type = $state(data.request.incident_type || '');
	let incident_description = $state(data.request.incident_description || '');
	let incident_location = $state(data.request.incident_location || '');

	// Vehicle Information
	let vehicle_make = $state(data.request.vehicle_make || '');
	let vehicle_model = $state(data.request.vehicle_model || '');
	let vehicle_year = $state<number | undefined>(data.request.vehicle_year || undefined);
	let vehicle_vin = $state(data.request.vehicle_vin || '');
	let vehicle_registration = $state(data.request.vehicle_registration || '');
	let vehicle_color = $state(data.request.vehicle_color || '');
	let vehicle_mileage = $state<number | undefined>(data.request.vehicle_mileage || undefined);
	let vehicle_province = $state<Province | ''>(
		(data.request.vehicle_province as Province) || ''
	);

	// Owner Details
	let owner_name = $state(data.request.owner_name || '');
	let owner_phone = $state(data.request.owner_phone || '');
	let owner_email = $state(data.request.owner_email || '');
	let owner_address = $state(data.request.owner_address || '');

	// Third Party Details
	let third_party_name = $state(data.request.third_party_name || '');
	let third_party_phone = $state(data.request.third_party_phone || '');
	let third_party_email = $state(data.request.third_party_email || '');
	let third_party_insurance = $state(data.request.third_party_insurance || '');

	// Set up unsaved changes guard
	useUnsavedChanges(() => hasUnsavedChanges, {
		message: 'You have unsaved changes to this request. Are you sure you want to leave?'
	});

	// Mark as having unsaved changes on any input
	$effect(() => {
		// Track all form fields - if any change from initial values, mark as unsaved
		const hasChanges =
			client_id !== data.request.client_id ||
			type !== data.request.type ||
			claim_number !== (data.request.claim_number || '') ||
			description !== (data.request.description || '') ||
			date_of_loss !== (data.request.date_of_loss || '') ||
			insured_value !== (data.request.insured_value || undefined) ||
			incident_type !== (data.request.incident_type || '') ||
			incident_description !== (data.request.incident_description || '') ||
			incident_location !== (data.request.incident_location || '') ||
			vehicle_make !== (data.request.vehicle_make || '') ||
			vehicle_model !== (data.request.vehicle_model || '') ||
			vehicle_year !== (data.request.vehicle_year || undefined) ||
			vehicle_vin !== (data.request.vehicle_vin || '') ||
			vehicle_registration !== (data.request.vehicle_registration || '') ||
			vehicle_color !== (data.request.vehicle_color || '') ||
			vehicle_mileage !== (data.request.vehicle_mileage || undefined) ||
			vehicle_province !== ((data.request.vehicle_province as Province) || '') ||
			owner_name !== (data.request.owner_name || '') ||
			owner_phone !== (data.request.owner_phone || '') ||
			owner_email !== (data.request.owner_email || '') ||
			owner_address !== (data.request.owner_address || '') ||
			third_party_name !== (data.request.third_party_name || '') ||
			third_party_phone !== (data.request.third_party_phone || '') ||
			third_party_email !== (data.request.third_party_email || '') ||
			third_party_insurance !== (data.request.third_party_insurance || '');

		hasUnsavedChanges = hasChanges;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!client_id) {
			error = 'Please select a client';
			return;
		}

		loading = true;
		error = null;

		try {
			const requestData: UpdateRequestInput = {
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

			await requestService.updateRequest(data.request.id, requestData);
			// Clear unsaved changes flag before navigation
			hasUnsavedChanges = false;
			goto(`/requests/${data.request.id}`);
		} catch (err) {
			console.error('Error updating request:', err);
			error = err instanceof Error ? err.message : 'Failed to update request';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		goto(`/requests/${data.request.id}`);
	}

	// Client options for dropdown
	const clientOptions = [
		{ value: '', label: 'Select a client...' },
		...data.clients.map((client) => ({
			value: client.id,
			label: client.name
		}))
	];
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Edit Request"
		description="Update request {data.request.request_number}"
	/>

	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Basic Information -->
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
			<div class="grid gap-6 md:grid-cols-2">
				<FormField
					label="Client"
					name="client_id"
					type="select"
					bind:value={client_id}
					required
					options={clientOptions}
				/>

				<FormField
					label="Type"
					name="type"
					type="select"
					bind:value={type}
					required
					options={[
						{ value: 'insurance', label: 'Insurance Claim' },
						{ value: 'private', label: 'Private Request' }
					]}
				/>

				{#if type === 'insurance'}
					<FormField
						label="Claim Number"
						name="claim_number"
						type="text"
						bind:value={claim_number}
						placeholder="e.g., CLM-2025-001"
					/>
				{/if}

				<FormField
					label="Description"
					name="description"
					type="textarea"
					bind:value={description}
					placeholder="Brief description of the request"
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

		<FormActions primaryLabel="Update Request" {loading} onCancel={handleCancel} />
	</form>
</div>

