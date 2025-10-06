<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import { CheckCircle } from 'lucide-svelte';
	import type { InteriorMechanical } from '$lib/types/assessment';

	interface Props {
		data: InteriorMechanical | null;
		assessmentId: string;
		onUpdate: (data: Partial<InteriorMechanical>) => void;
		onComplete: () => void;
	}

	let { data, assessmentId, onUpdate, onComplete }: Props = $props();

	// Photos
	let engineBayPhotoUrl = $state(data?.engine_bay_photo_url || '');
	let batteryPhotoUrl = $state(data?.battery_photo_url || '');
	let oilLevelPhotoUrl = $state(data?.oil_level_photo_url || '');
	let coolantPhotoUrl = $state(data?.coolant_photo_url || '');
	let mileagePhotoUrl = $state(data?.mileage_photo_url || '');
	let interiorFrontPhotoUrl = $state(data?.interior_front_photo_url || '');
	let interiorRearPhotoUrl = $state(data?.interior_rear_photo_url || '');
	let dashboardPhotoUrl = $state(data?.dashboard_photo_url || '');
	let gearLeverPhotoUrl = $state(data?.gear_lever_photo_url || '');

	// Data
	let mileageReading = $state(data?.mileage_reading?.toString() || '');
	let interiorCondition = $state(data?.interior_condition || '');
	let transmissionType = $state(data?.transmission_type || '');
	let vehicleHasPower = $state(data?.vehicle_has_power !== null ? data?.vehicle_has_power?.toString() : '');
	let srsSystem = $state(data?.srs_system || '');
	let steering = $state(data?.steering || '');
	let brakes = $state(data?.brakes || '');
	let handbrake = $state(data?.handbrake || '');
	let mechanicalNotes = $state(data?.mechanical_notes || '');
	let interiorNotes = $state(data?.interior_notes || '');

	function handleSave() {
		onUpdate({
			engine_bay_photo_url: engineBayPhotoUrl || undefined,
			battery_photo_url: batteryPhotoUrl || undefined,
			oil_level_photo_url: oilLevelPhotoUrl || undefined,
			coolant_photo_url: coolantPhotoUrl || undefined,
			mileage_photo_url: mileagePhotoUrl || undefined,
			interior_front_photo_url: interiorFrontPhotoUrl || undefined,
			interior_rear_photo_url: interiorRearPhotoUrl || undefined,
			dashboard_photo_url: dashboardPhotoUrl || undefined,
			gear_lever_photo_url: gearLeverPhotoUrl || undefined,
			mileage_reading: mileageReading ? parseInt(mileageReading) : undefined,
			interior_condition: interiorCondition as any,
			transmission_type: transmissionType as any,
			vehicle_has_power: vehicleHasPower ? vehicleHasPower === 'true' : undefined,
			srs_system: srsSystem as any,
			steering: steering as any,
			brakes: brakes as any,
			handbrake: handbrake as any,
			mechanical_notes: mechanicalNotes || undefined,
			interior_notes: interiorNotes || undefined
		});
	}

	function handleComplete() {
		handleSave();
		onComplete();
	}

	const isComplete = $derived(
		mileageReading && interiorCondition && srsSystem && steering && brakes && handbrake
	);
</script>

<div class="space-y-6">
	<!-- Engine Bay -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Engine Bay</h3>
		<div class="grid gap-4 md:grid-cols-4">
			<PhotoUpload
				value={engineBayPhotoUrl}
				label="Engine Bay"
				{assessmentId}
				category="interior"
				subcategory="engine_bay"
				onUpload={(url) => { engineBayPhotoUrl = url; handleSave(); }}
				onRemove={() => { engineBayPhotoUrl = ''; handleSave(); }}
				height="h-32"
			/>
			<PhotoUpload
				value={batteryPhotoUrl}
				label="Battery"
				{assessmentId}
				category="interior"
				subcategory="battery"
				onUpload={(url) => { batteryPhotoUrl = url; handleSave(); }}
				onRemove={() => { batteryPhotoUrl = ''; handleSave(); }}
				height="h-32"
			/>
			<PhotoUpload
				value={oilLevelPhotoUrl}
				label="Oil Level"
				{assessmentId}
				category="interior"
				subcategory="oil"
				onUpload={(url) => { oilLevelPhotoUrl = url; handleSave(); }}
				onRemove={() => { oilLevelPhotoUrl = ''; handleSave(); }}
				height="h-32"
			/>
			<PhotoUpload
				value={coolantPhotoUrl}
				label="Coolant"
				{assessmentId}
				category="interior"
				subcategory="coolant"
				onUpload={(url) => { coolantPhotoUrl = url; handleSave(); }}
				onRemove={() => { coolantPhotoUrl = ''; handleSave(); }}
				height="h-32"
			/>
		</div>
	</Card>

	<!-- Mileage -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Mileage <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Mileage Reading (km)"
				type="number"
				bind:value={mileageReading}
				placeholder="e.g., 125000"
				required
			/>
			<PhotoUpload
				value={mileagePhotoUrl}
				label="Mileage Photo"
				{assessmentId}
				category="interior"
				subcategory="mileage"
				onUpload={(url) => { mileagePhotoUrl = url; handleSave(); }}
				onRemove={() => { mileagePhotoUrl = ''; handleSave(); }}
			/>
		</div>
	</Card>

	<!-- Transmission & Power -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Transmission & Power</h3>
		<div class="grid gap-6 md:grid-cols-3">
			<FormField
				label="Transmission Type"
				type="select"
				bind:value={transmissionType}
				options={[
					{ value: 'automatic', label: 'Automatic' },
					{ value: 'manual', label: 'Manual' }
				]}
			/>
			<FormField
				label="Vehicle Has Power?"
				type="select"
				bind:value={vehicleHasPower}
				options={[
					{ value: 'true', label: 'Yes' },
					{ value: 'false', label: 'No' }
				]}
			/>
			<PhotoUpload
				value={gearLeverPhotoUrl}
				label="Gear Lever Photo"
				{assessmentId}
				category="interior"
				subcategory="gear_lever"
				onUpload={(url) => { gearLeverPhotoUrl = url; handleSave(); }}
				onRemove={() => { gearLeverPhotoUrl = ''; handleSave(); }}
			/>
		</div>
	</Card>

	<!-- Interior Photos -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Interior Photos</h3>
		<div class="grid gap-4 md:grid-cols-3">
			<PhotoUpload
				value={interiorFrontPhotoUrl}
				label="Front Interior"
				{assessmentId}
				category="interior"
				subcategory="front"
				onUpload={(url) => { interiorFrontPhotoUrl = url; handleSave(); }}
				onRemove={() => { interiorFrontPhotoUrl = ''; handleSave(); }}
				height="h-32"
			/>
			<PhotoUpload
				value={interiorRearPhotoUrl}
				label="Rear Interior"
				{assessmentId}
				category="interior"
				subcategory="rear"
				onUpload={(url) => { interiorRearPhotoUrl = url; handleSave(); }}
				onRemove={() => { interiorRearPhotoUrl = ''; handleSave(); }}
				height="h-32"
			/>
			<PhotoUpload
				value={dashboardPhotoUrl}
				label="Dashboard"
				{assessmentId}
				category="interior"
				subcategory="dashboard"
				onUpload={(url) => { dashboardPhotoUrl = url; handleSave(); }}
				onRemove={() => { dashboardPhotoUrl = ''; handleSave(); }}
				height="h-32"
			/>
		</div>
	</Card>

	<!-- Interior Condition -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Interior Condition <span class="text-red-500">*</span>
		</h3>
		<FormField
			label="Overall Interior Condition"
			type="select"
			bind:value={interiorCondition}
			options={[
				{ value: 'excellent', label: 'Excellent' },
				{ value: 'very_good', label: 'Very Good' },
				{ value: 'good', label: 'Good' },
				{ value: 'fair', label: 'Fair' },
				{ value: 'poor', label: 'Poor' },
				{ value: 'very_poor', label: 'Very Poor' }
			]}
			required
		/>
	</Card>

	<!-- Systems Check -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Systems Check <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="SRS System (Airbags/Seatbelts)"
				type="select"
				bind:value={srsSystem}
				options={[
					{ value: 'operational', label: 'Operational' },
					{ value: 'warning_light', label: 'Warning Light On' },
					{ value: 'not_working', label: 'Not Working' },
					{ value: 'deployed', label: 'Deployed' }
				]}
				required
			/>
			<FormField
				label="Steering"
				type="select"
				bind:value={steering}
				options={[
					{ value: 'working', label: 'Working' },
					{ value: 'not_working', label: 'Not Working' },
					{ value: 'issues', label: 'Has Issues' }
				]}
				required
			/>
			<FormField
				label="Brakes"
				type="select"
				bind:value={brakes}
				options={[
					{ value: 'working', label: 'Working' },
					{ value: 'not_working', label: 'Not Working' },
					{ value: 'issues', label: 'Has Issues' }
				]}
				required
			/>
			<FormField
				label="Handbrake"
				type="select"
				bind:value={handbrake}
				options={[
					{ value: 'working', label: 'Working' },
					{ value: 'not_working', label: 'Not Working' },
					{ value: 'issues', label: 'Has Issues' }
				]}
				required
			/>
		</div>
	</Card>

	<!-- Notes -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Additional Notes</h3>
		<div class="space-y-4">
			<FormField
				label="Mechanical Notes"
				type="textarea"
				bind:value={mechanicalNotes}
				placeholder="Any mechanical issues, concerns, or observations..."
				rows={3}
			/>
			<FormField
				label="Interior Notes"
				type="textarea"
				bind:value={interiorNotes}
				placeholder="Any interior damage, wear, or observations..."
				rows={3}
			/>
		</div>
	</Card>

	<!-- Actions -->
	<div class="flex justify-between">
		<Button variant="outline" onclick={handleSave}>Save Progress</Button>
		<Button onclick={handleComplete} disabled={!isComplete}>
			<CheckCircle class="mr-2 h-4 w-4" />
			Complete & Continue
		</Button>
	</div>
</div>

