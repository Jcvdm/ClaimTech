<script lang="ts">
	import FormField from './FormField.svelte';
	import FormActions from './FormActions.svelte';
	import { Card } from '$lib/components/ui/card';
	import type { Client, ClientType } from '$lib/types/client';

	type Props = {
		client?: Client | null;
		onsubmit: (data: FormData) => void | Promise<void>;
		oncancel?: () => void;
		loading?: boolean;
	};

	let { client = null, onsubmit, oncancel, loading = false }: Props = $props();

	let name = $state(client?.name || '');
	let type = $state<ClientType>(client?.type || 'insurance');
	let contact_name = $state(client?.contact_name || '');
	let email = $state(client?.email || '');
	let phone = $state(client?.phone || '');
	let address = $state(client?.address || '');
	let city = $state(client?.city || '');
	let postal_code = $state(client?.postal_code || '');
	let notes = $state(client?.notes || '');
	let borderline_writeoff_percentage = $state(client?.borderline_writeoff_percentage || 65);
	let total_writeoff_percentage = $state(client?.total_writeoff_percentage || 70);
	let salvage_percentage = $state(client?.salvage_percentage || 28);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const formData = new FormData(e.target as HTMLFormElement);
		await onsubmit(formData);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Client Name"
				name="name"
				type="text"
				bind:value={name}
				required
				placeholder="e.g., Santam Insurance or John Doe"
			/>

			<FormField
				label="Client Type"
				name="type"
				type="select"
				bind:value={type}
				required
				options={[
					{ value: 'insurance', label: 'Insurance' },
					{ value: 'private', label: 'Private' }
				]}
			/>
		</div>
	</Card>

	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Contact Information</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Contact Name"
				name="contact_name"
				type="text"
				bind:value={contact_name}
				placeholder="Primary contact person"
			/>

			<FormField
				label="Email"
				name="email"
				type="email"
				bind:value={email}
				placeholder="contact@example.com"
			/>

			<FormField
				label="Phone"
				name="phone"
				type="text"
				bind:value={phone}
				placeholder="+27 11 123 4567"
			/>
		</div>
	</Card>

	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Address</h3>
		<div class="grid gap-6">
			<FormField
				label="Street Address"
				name="address"
				type="text"
				bind:value={address}
				placeholder="123 Main Street"
			/>

			<div class="grid gap-6 md:grid-cols-2">
				<FormField label="City" name="city" type="text" bind:value={city} placeholder="Johannesburg" />

				<FormField
					label="Postal Code"
					name="postal_code"
					type="text"
					bind:value={postal_code}
					placeholder="2000"
				/>
			</div>
		</div>
	</Card>

	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Vehicle Valuation Settings</h3>
		<p class="mb-4 text-sm text-gray-600">
			These percentages are used to calculate write-off thresholds in vehicle assessments.
		</p>
		<div class="grid gap-6 md:grid-cols-3">
			<FormField
				label="Borderline Write-Off %"
				name="borderline_writeoff_percentage"
				type="number"
				bind:value={borderline_writeoff_percentage}
				placeholder="65.00"
				step="0.01"
				min="0"
				max="100"
			/>

			<FormField
				label="Total Write-Off %"
				name="total_writeoff_percentage"
				type="number"
				bind:value={total_writeoff_percentage}
				placeholder="70.00"
				step="0.01"
				min="0"
				max="100"
			/>

			<FormField
				label="Salvage %"
				name="salvage_percentage"
				type="number"
				bind:value={salvage_percentage}
				placeholder="28.00"
				step="0.01"
				min="0"
				max="100"
			/>
		</div>
	</Card>

	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Additional Information</h3>
		<FormField
			label="Notes"
			name="notes"
			type="textarea"
			bind:value={notes}
			placeholder="Any additional notes about this client..."
			rows={4}
		/>
	</Card>

	<FormActions
		primaryLabel={client ? 'Update Client' : 'Create Client'}
		{loading}
		onCancel={oncancel}
	/>
</form>

