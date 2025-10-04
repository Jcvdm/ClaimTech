<script lang="ts">
	import FormField from './FormField.svelte';
	import { Card } from '$lib/components/ui/card';

	type Props = {
		vehicle_make: string;
		vehicle_model: string;
		vehicle_year: number | undefined;
		vehicle_vin: string;
		vehicle_registration: string;
		vehicle_color: string;
		vehicle_mileage: number | undefined;
	};

	let {
		vehicle_make = $bindable(),
		vehicle_model = $bindable(),
		vehicle_year = $bindable(),
		vehicle_vin = $bindable(),
		vehicle_registration = $bindable(),
		vehicle_color = $bindable(),
		vehicle_mileage = $bindable()
	}: Props = $props();
</script>

<Card class="p-6">
	<h3 class="mb-4 text-lg font-semibold text-gray-900">Vehicle Information</h3>
	<div class="grid gap-6">
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Make"
				name="vehicle_make"
				type="text"
				bind:value={vehicle_make}
				placeholder="e.g., BMW, Toyota, Mercedes-Benz"
			/>

			<FormField
				label="Model"
				name="vehicle_model"
				type="text"
				bind:value={vehicle_model}
				placeholder="e.g., 320i, Corolla, C-Class"
			/>
		</div>

		<div class="grid gap-6 md:grid-cols-3">
			<FormField
				label="Year"
				name="vehicle_year"
				type="number"
				bind:value={vehicle_year}
				placeholder="2023"
			/>

			<FormField
				label="Color"
				name="vehicle_color"
				type="text"
				bind:value={vehicle_color}
				placeholder="White, Black, Silver"
			/>

			<FormField
				label="Mileage (km)"
				name="vehicle_mileage"
				type="number"
				bind:value={vehicle_mileage}
				placeholder="50000"
			/>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="VIN"
				name="vehicle_vin"
				type="text"
				bind:value={vehicle_vin}
				placeholder="Vehicle Identification Number"
			/>

			<FormField
				label="Registration"
				name="vehicle_registration"
				type="text"
				bind:value={vehicle_registration}
				placeholder="CA 123 456"
			/>
		</div>
	</div>
</Card>

