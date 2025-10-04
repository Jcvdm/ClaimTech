<script lang="ts">
	import FormField from './FormField.svelte';
	import { Card } from '$lib/components/ui/card';

	type Props = {
		date_of_loss: string;
		insured_value: number | undefined;
		incident_type: string;
		incident_description: string;
		incident_location: string;
	};

	let {
		date_of_loss = $bindable(),
		insured_value = $bindable(),
		incident_type = $bindable(),
		incident_description = $bindable(),
		incident_location = $bindable()
	}: Props = $props();

	const incidentTypes = [
		{ value: '', label: 'Select incident type' },
		{ value: 'collision', label: 'Collision' },
		{ value: 'weather', label: 'Weather Damage (Hail, Storm)' },
		{ value: 'theft', label: 'Theft' },
		{ value: 'vandalism', label: 'Vandalism' },
		{ value: 'fire', label: 'Fire' },
		{ value: 'other', label: 'Other' }
	];
</script>

<Card class="p-6">
	<h3 class="mb-4 text-lg font-semibold text-gray-900">Incident Details</h3>
	<div class="grid gap-6">
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Date of Loss"
				name="date_of_loss"
				type="date"
				bind:value={date_of_loss}
			/>

			<FormField
				label="Insured Value (R)"
				name="insured_value"
				type="number"
				bind:value={insured_value}
				placeholder="350000"
			/>
		</div>

		<FormField
			label="Incident Type"
			name="incident_type"
			type="select"
			bind:value={incident_type}
			options={incidentTypes}
		/>

		<FormField
			label="Incident Location"
			name="incident_location"
			type="text"
			bind:value={incident_location}
			placeholder="e.g., Corner of Main Rd and 5th Ave, Sandton"
		/>

		<FormField
			label="Incident Description"
			name="incident_description"
			type="textarea"
			bind:value={incident_description}
			placeholder="Describe what happened..."
			rows={4}
		/>
	</div>
</Card>

