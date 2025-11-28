<script lang="ts">
	import FormField from './FormField.svelte';
	import { Card } from '$lib/components/ui/card';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import { parseDate, type DateValue } from '@internationalized/date';

	type Props = {
		date_of_loss: string;
		insured_value: number | undefined;
		excess_amount: number | undefined;
		incident_type: string;
		incident_description: string;
		incident_location: string;
	};

	let {
		date_of_loss = $bindable(),
		insured_value = $bindable(),
		excess_amount = $bindable(),
		incident_type = $bindable(),
		incident_description = $bindable(),
		incident_location = $bindable()
	}: Props = $props();

	// Convert string date to DateValue for DatePicker
	let dateValue = $state<DateValue | undefined>(
		date_of_loss ? parseDate(date_of_loss) : undefined
	);

	// Sync changes back to string
	$effect(() => {
		if (dateValue) {
			date_of_loss = dateValue.toString();
		}
	});

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
			<div class="space-y-2">
			<label
				id="incident-date-of-loss-label"
				for="incident-date-of-loss-trigger"
				class="text-sm font-medium leading-none text-gray-700"
			>
				Date of Loss
			</label>
			<DatePicker
				name="date_of_loss"
				placeholder="Select date"
				bind:value={dateValue}
			/>
			</div>

			<FormField
				label="Insured Value (R)"
				name="insured_value"
				type="number"
				bind:value={insured_value}
				placeholder="350000"
			/>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Excess Amount (R)"
				name="excess_amount"
				type="number"
				bind:value={excess_amount}
				placeholder="5000"
			/>

			<FormField
				label="Incident Type"
				name="incident_type"
				type="select"
				bind:value={incident_type}
				options={incidentTypes}
			/>
		</div>

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
