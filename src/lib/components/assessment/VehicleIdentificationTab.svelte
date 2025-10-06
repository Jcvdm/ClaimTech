<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import { CheckCircle } from 'lucide-svelte';
	import type { VehicleIdentification } from '$lib/types/assessment';

	interface Props {
		data: VehicleIdentification | null;
		assessmentId: string;
		vehicleInfo?: {
			registration?: string | null;
			vin?: string | null;
			make?: string | null;
			model?: string | null;
			year?: number | null;
		};
		onUpdate: (data: Partial<VehicleIdentification>) => void;
		onComplete: () => void;
	}

	let { data, assessmentId, vehicleInfo, onUpdate, onComplete }: Props = $props();

	let registrationNumber = $state(data?.registration_number || vehicleInfo?.registration || '');
	let vinNumber = $state(data?.vin_number || vehicleInfo?.vin || '');
	let engineNumber = $state(data?.engine_number || '');
	let licenseDiscExpiry = $state(data?.license_disc_expiry || '');
	let driverLicenseNumber = $state(data?.driver_license_number || '');

	// Photo URLs
	let registrationPhotoUrl = $state(data?.registration_photo_url || '');
	let vinPhotoUrl = $state(data?.vin_photo_url || '');
	let engineNumberPhotoUrl = $state(data?.engine_number_photo_url || '');
	let licenseDiscPhotoUrl = $state(data?.license_disc_photo_url || '');
	let driverLicensePhotoUrl = $state(data?.driver_license_photo_url || '');

	function handleSave() {
		onUpdate({
			registration_number: registrationNumber,
			vin_number: vinNumber,
			engine_number: engineNumber,
			license_disc_expiry: licenseDiscExpiry || undefined,
			driver_license_number: driverLicenseNumber || undefined,
			registration_photo_url: registrationPhotoUrl || undefined,
			vin_photo_url: vinPhotoUrl || undefined,
			engine_number_photo_url: engineNumberPhotoUrl || undefined,
			license_disc_photo_url: licenseDiscPhotoUrl || undefined,
			driver_license_photo_url: driverLicensePhotoUrl || undefined
		});
	}

	function handleComplete() {
		handleSave();
		onComplete();
	}

	const isComplete = $derived(
		registrationNumber && vinNumber && engineNumber && registrationPhotoUrl && vinPhotoUrl
	);
</script>

<div class="space-y-6">
	<!-- Vehicle Information Display -->
	{#if vehicleInfo}
		<Card class="bg-blue-50 p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Vehicle Information from Request</h3>
			<div class="grid gap-4 md:grid-cols-3">
				<div>
					<p class="text-sm text-gray-600">Make</p>
					<p class="font-medium text-gray-900">{vehicleInfo.make || 'N/A'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600">Model</p>
					<p class="font-medium text-gray-900">{vehicleInfo.model || 'N/A'}</p>
				</div>
				<div>
					<p class="text-sm text-gray-600">Year</p>
					<p class="font-medium text-gray-900">{vehicleInfo.year || 'N/A'}</p>
				</div>
			</div>
			<p class="mt-4 text-sm text-gray-600">
				Please confirm or update the vehicle identification details below
			</p>
		</Card>
	{/if}

	<!-- Registration Number -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Registration Number <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<FormField
					label="Registration Number"
					type="text"
					bind:value={registrationNumber}
					placeholder="e.g., ABC123GP"
					required
				/>
			</div>
			<PhotoUpload
				value={registrationPhotoUrl}
				label="Registration Photo"
				required
				{assessmentId}
				category="identification"
				subcategory="registration"
				onUpload={(url) => {
					registrationPhotoUrl = url;
					handleSave();
				}}
				onRemove={() => {
					registrationPhotoUrl = '';
					handleSave();
				}}
			/>
		</div>
	</Card>

	<!-- VIN Number -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			VIN Number <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<FormField
					label="VIN Number"
					type="text"
					bind:value={vinNumber}
					placeholder="17-character VIN"
					required
				/>
			</div>
			<PhotoUpload
				value={vinPhotoUrl}
				label="VIN Photo"
				required
				{assessmentId}
				category="identification"
				subcategory="vin"
				onUpload={(url) => {
					vinPhotoUrl = url;
					handleSave();
				}}
				onRemove={() => {
					vinPhotoUrl = '';
					handleSave();
				}}
			/>
		</div>
	</Card>

	<!-- Engine Number -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Engine Number <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Engine Number"
				type="text"
				bind:value={engineNumber}
				placeholder="Engine number"
				required
			/>
			<PhotoUpload
				value={engineNumberPhotoUrl}
				label="Engine Number Photo"
				{assessmentId}
				category="identification"
				subcategory="engine"
				onUpload={(url) => {
					engineNumberPhotoUrl = url;
					handleSave();
				}}
				onRemove={() => {
					engineNumberPhotoUrl = '';
					handleSave();
				}}
			/>
		</div>
	</Card>

	<!-- License Disc -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">License Disc</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="License Disc Expiry Date"
				type="date"
				bind:value={licenseDiscExpiry}
				placeholder="YYYY-MM-DD"
			/>
			<PhotoUpload
				value={licenseDiscPhotoUrl}
				label="License Disc Photo"
				{assessmentId}
				category="identification"
				subcategory="license_disc"
				onUpload={(url) => {
					licenseDiscPhotoUrl = url;
					handleSave();
				}}
				onRemove={() => {
					licenseDiscPhotoUrl = '';
					handleSave();
				}}
			/>
		</div>
	</Card>

	<!-- Driver License -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Driver License (Optional)</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Driver License Number"
				type="text"
				bind:value={driverLicenseNumber}
				placeholder="License number"
			/>
			<PhotoUpload
				value={driverLicensePhotoUrl}
				label="Driver License Photo"
				{assessmentId}
				category="identification"
				subcategory="driver_license"
				onUpload={(url) => {
					driverLicensePhotoUrl = url;
					handleSave();
				}}
				onRemove={() => {
					driverLicensePhotoUrl = '';
					handleSave();
				}}
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

