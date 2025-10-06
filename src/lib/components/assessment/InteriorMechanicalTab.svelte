<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { Camera, CheckCircle } from 'lucide-svelte';
	import type { InteriorMechanical } from '$lib/types/assessment';

	interface Props {
		data: InteriorMechanical | null;
		onUpdate: (data: Partial<InteriorMechanical>) => void;
		onComplete: () => void;
	}

	let { data, onUpdate, onComplete }: Props = $props();

	// Photos
	let engineBayPhotoUrl = $state(data?.engine_bay_photo_url || '');
	let batteryPhotoUrl = $state(data?.battery_photo_url || '');
	let oilLevelPhotoUrl = $state(data?.oil_level_photo_url || '');
	let coolantPhotoUrl = $state(data?.coolant_photo_url || '');
	let mileagePhotoUrl = $state(data?.mileage_photo_url || '');
	let interiorFrontPhotoUrl = $state(data?.interior_front_photo_url || '');
	let interiorRearPhotoUrl = $state(data?.interior_rear_photo_url || '');
	let dashboardPhotoUrl = $state(data?.dashboard_photo_url || '');

	// Data
	let mileageReading = $state(data?.mileage_reading?.toString() || '');
	let interiorCondition = $state(data?.interior_condition || '');
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
			mileage_reading: mileageReading ? parseInt(mileageReading) : undefined,
			interior_condition: interiorCondition as any,
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

	function PhotoUpload(props: { label: string; value: string; onChange: (val: string) => void }) {
		return {
			label: props.label,
			value: props.value,
			onChange: props.onChange
		};
	}
</script>

<div class="space-y-6">
	<!-- Engine Bay -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Engine Bay</h3>
		<div class="grid gap-4 md:grid-cols-4">
			{#each [
				{ label: 'Engine Bay', value: engineBayPhotoUrl, setter: (v: string) => (engineBayPhotoUrl = v) },
				{ label: 'Battery', value: batteryPhotoUrl, setter: (v: string) => (batteryPhotoUrl = v) },
				{ label: 'Oil Level', value: oilLevelPhotoUrl, setter: (v: string) => (oilLevelPhotoUrl = v) },
				{ label: 'Coolant', value: coolantPhotoUrl, setter: (v: string) => (coolantPhotoUrl = v) }
			] as photo}
				<div>
					<label class="mb-2 block text-sm font-medium text-gray-700">{photo.label}</label>
					{#if photo.value}
						<div class="relative">
							<img
								src={photo.value}
								alt={photo.label}
								class="h-32 w-full rounded-lg object-cover"
							/>
							<Button
								size="sm"
								variant="outline"
								class="absolute right-2 top-2"
								onclick={() => photo.setter('')}
							>
								Change
							</Button>
						</div>
					{:else}
						<button
							class="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
						>
							<div class="text-center">
								<Camera class="mx-auto h-6 w-6 text-gray-400" />
								<p class="mt-1 text-xs text-gray-600">Take Photo</p>
							</div>
						</button>
					{/if}
				</div>
			{/each}
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
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">Mileage Photo</label>
				{#if mileagePhotoUrl}
					<div class="relative">
						<img
							src={mileagePhotoUrl}
							alt="Mileage"
							class="h-32 w-full rounded-lg object-cover"
						/>
						<Button
							size="sm"
							variant="outline"
							class="absolute right-2 top-2"
							onclick={() => (mileagePhotoUrl = '')}
						>
							Change
						</Button>
					</div>
				{:else}
					<button
						class="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
					>
						<div class="text-center">
							<Camera class="mx-auto h-6 w-6 text-gray-400" />
							<p class="mt-1 text-xs text-gray-600">Take Photo</p>
						</div>
					</button>
				{/if}
			</div>
		</div>
	</Card>

	<!-- Interior Photos -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Interior Photos</h3>
		<div class="grid gap-4 md:grid-cols-3">
			{#each [
				{ label: 'Front Interior', value: interiorFrontPhotoUrl, setter: (v: string) => (interiorFrontPhotoUrl = v) },
				{ label: 'Rear Interior', value: interiorRearPhotoUrl, setter: (v: string) => (interiorRearPhotoUrl = v) },
				{ label: 'Dashboard', value: dashboardPhotoUrl, setter: (v: string) => (dashboardPhotoUrl = v) }
			] as photo}
				<div>
					<label class="mb-2 block text-sm font-medium text-gray-700">{photo.label}</label>
					{#if photo.value}
						<div class="relative">
							<img
								src={photo.value}
								alt={photo.label}
								class="h-32 w-full rounded-lg object-cover"
							/>
							<Button
								size="sm"
								variant="outline"
								class="absolute right-2 top-2"
								onclick={() => photo.setter('')}
							>
								Change
							</Button>
						</div>
					{:else}
						<button
							class="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
						>
							<div class="text-center">
								<Camera class="mx-auto h-6 w-6 text-gray-400" />
								<p class="mt-1 text-xs text-gray-600">Take Photo</p>
							</div>
						</button>
					{/if}
				</div>
			{/each}
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
				label="SRS System (Airbags)"
				type="select"
				bind:value={srsSystem}
				options={[
					{ value: 'working', label: 'Working' },
					{ value: 'not_working', label: 'Not Working' },
					{ value: 'warning_light', label: 'Warning Light On' },
					{ value: 'not_applicable', label: 'Not Applicable' }
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

