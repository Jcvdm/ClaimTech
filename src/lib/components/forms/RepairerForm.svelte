<script lang="ts">
	import FormField from './FormField.svelte';
	import FormActions from './FormActions.svelte';
	import { Card } from '$lib/components/ui/card';
	import type { Repairer } from '$lib/types/repairer';

	type Props = {
		repairer?: Repairer | null;
		onsubmit: (data: FormData) => void | Promise<void>;
		oncancel?: () => void;
		loading?: boolean;
	};

	let { repairer = null, onsubmit, oncancel, loading = false }: Props = $props();

	let name = $state(repairer?.name || '');
	let contact_name = $state(repairer?.contact_name || '');
	let email = $state(repairer?.email || '');
	let phone = $state(repairer?.phone || '');
	let address = $state(repairer?.address || '');
	let city = $state(repairer?.city || '');
	let province = $state(repairer?.province || '');
	let postal_code = $state(repairer?.postal_code || '');
	let notes = $state(repairer?.notes || '');
	let default_labour_rate = $state(repairer?.default_labour_rate || 500);
	let default_paint_rate = $state(repairer?.default_paint_rate || 2000);
	let default_vat_percentage = $state(repairer?.default_vat_percentage || 15);
	let default_oem_markup_percentage = $state(repairer?.default_oem_markup_percentage || 25);
	let default_alt_markup_percentage = $state(repairer?.default_alt_markup_percentage || 25);
	let default_second_hand_markup_percentage = $state(
		repairer?.default_second_hand_markup_percentage || 25
	);
	let default_outwork_markup_percentage = $state(repairer?.default_outwork_markup_percentage || 25);

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
				label="Repairer Name"
				name="name"
				type="text"
				bind:value={name}
				required
				placeholder="e.g., ABC Body Shop"
			/>

			<FormField
				label="Contact Name"
				name="contact_name"
				type="text"
				bind:value={contact_name}
				placeholder="Primary contact person"
			/>
		</div>
	</Card>

	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Contact Information</h3>
		<div class="grid gap-6 md:grid-cols-2">
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

			<div class="grid gap-6 md:grid-cols-3">
				<FormField label="City" name="city" type="text" bind:value={city} placeholder="Johannesburg" />

				<FormField
					label="Province"
					name="province"
					type="select"
					bind:value={province}
					options={[
						{ value: '', label: 'Select Province' },
						{ value: 'Gauteng', label: 'Gauteng' },
						{ value: 'Western Cape', label: 'Western Cape' },
						{ value: 'KwaZulu-Natal', label: 'KwaZulu-Natal' },
						{ value: 'Eastern Cape', label: 'Eastern Cape' },
						{ value: 'Free State', label: 'Free State' },
						{ value: 'Limpopo', label: 'Limpopo' },
						{ value: 'Mpumalanga', label: 'Mpumalanga' },
						{ value: 'Northern Cape', label: 'Northern Cape' },
						{ value: 'North West', label: 'North West' }
					]}
				/>

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
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Default Rates</h3>
		<p class="mb-4 text-sm text-gray-600">
			These rates will be used as defaults when this repairer is selected for an estimate.
		</p>
		<div class="grid gap-6 md:grid-cols-3">
			<FormField
				label="Labour Rate (per hour)"
				name="default_labour_rate"
				type="number"
				bind:value={default_labour_rate}
				placeholder="500.00"
				step="0.01"
				min="0"
			/>

			<FormField
				label="Paint Rate (per panel)"
				name="default_paint_rate"
				type="number"
				bind:value={default_paint_rate}
				placeholder="2000.00"
				step="0.01"
				min="0"
			/>

			<FormField
				label="VAT %"
				name="default_vat_percentage"
				type="number"
				bind:value={default_vat_percentage}
				placeholder="15.00"
				step="0.01"
				min="0"
				max="100"
			/>
		</div>
	</Card>

	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Default Markup Percentages</h3>
		<p class="mb-4 text-sm text-gray-600">
			These markup percentages will be applied to parts and outwork charges.
		</p>
		<div class="grid gap-6 md:grid-cols-4">
			<FormField
				label="OEM Markup %"
				name="default_oem_markup_percentage"
				type="number"
				bind:value={default_oem_markup_percentage}
				placeholder="25.00"
				step="0.01"
				min="0"
				max="100"
			/>

			<FormField
				label="Aftermarket Markup %"
				name="default_alt_markup_percentage"
				type="number"
				bind:value={default_alt_markup_percentage}
				placeholder="25.00"
				step="0.01"
				min="0"
				max="100"
			/>

			<FormField
				label="Second Hand Markup %"
				name="default_second_hand_markup_percentage"
				type="number"
				bind:value={default_second_hand_markup_percentage}
				placeholder="25.00"
				step="0.01"
				min="0"
				max="100"
			/>

			<FormField
				label="Outwork Markup %"
				name="default_outwork_markup_percentage"
				type="number"
				bind:value={default_outwork_markup_percentage}
				placeholder="25.00"
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
			placeholder="Any additional notes about this repairer..."
			rows={4}
		/>
	</Card>

	<FormActions
		primaryLabel={repairer ? 'Update Repairer' : 'Create Repairer'}
		{loading}
		onCancel={oncancel}
	/>
</form>

