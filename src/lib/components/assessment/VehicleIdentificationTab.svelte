<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { Camera, Upload, CheckCircle } from 'lucide-svelte';
	import type { VehicleIdentification } from '$lib/types/assessment';

	interface Props {
		data: VehicleIdentification | null;
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

	let { data, vehicleInfo, onUpdate, onComplete }: Props = $props();

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
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">
					Registration Photo <span class="text-red-500">*</span>
				</label>
				{#if registrationPhotoUrl}
					<div class="relative">
						<img
							src={registrationPhotoUrl}
							alt="Registration"
							class="h-32 w-full rounded-lg object-cover"
						/>
						<Button
							size="sm"
							variant="outline"
							class="absolute right-2 top-2"
							onclick={() => (registrationPhotoUrl = '')}
						>
							Change
						</Button>
					</div>
				{:else}
					<button
						class="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
					>
						<div class="text-center">
							<Camera class="mx-auto h-8 w-8 text-gray-400" />
							<p class="mt-2 text-sm text-gray-600">Take Photo</p>
						</div>
					</button>
				{/if}
			</div>
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
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">
					VIN Photo <span class="text-red-500">*</span>
				</label>
				{#if vinPhotoUrl}
					<div class="relative">
						<img src={vinPhotoUrl} alt="VIN" class="h-32 w-full rounded-lg object-cover" />
						<Button
							size="sm"
							variant="outline"
							class="absolute right-2 top-2"
							onclick={() => (vinPhotoUrl = '')}
						>
							Change
						</Button>
					</div>
				{:else}
					<button
						class="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
					>
						<div class="text-center">
							<Camera class="mx-auto h-8 w-8 text-gray-400" />
							<p class="mt-2 text-sm text-gray-600">Take Photo</p>
						</div>
					</button>
				{/if}
			</div>
		</div>
	</Card>

	<!-- Engine Number -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Engine Number <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<FormField
					label="Engine Number"
					type="text"
					bind:value={engineNumber}
					placeholder="Engine number"
					required
				/>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">Engine Number Photo</label>
				{#if engineNumberPhotoUrl}
					<div class="relative">
						<img
							src={engineNumberPhotoUrl}
							alt="Engine Number"
							class="h-32 w-full rounded-lg object-cover"
						/>
						<Button
							size="sm"
							variant="outline"
							class="absolute right-2 top-2"
							onclick={() => (engineNumberPhotoUrl = '')}
						>
							Change
						</Button>
					</div>
				{:else}
					<button
						class="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
					>
						<div class="text-center">
							<Camera class="mx-auto h-8 w-8 text-gray-400" />
							<p class="mt-2 text-sm text-gray-600">Take Photo</p>
						</div>
					</button>
				{/if}
			</div>
		</div>
	</Card>

	<!-- License Disc -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">License Disc</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<FormField
					label="License Disc Expiry Date"
					type="date"
					bind:value={licenseDiscExpiry}
					placeholder="YYYY-MM-DD"
				/>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">License Disc Photo</label>
				{#if licenseDiscPhotoUrl}
					<div class="relative">
						<img
							src={licenseDiscPhotoUrl}
							alt="License Disc"
							class="h-32 w-full rounded-lg object-cover"
						/>
						<Button
							size="sm"
							variant="outline"
							class="absolute right-2 top-2"
							onclick={() => (licenseDiscPhotoUrl = '')}
						>
							Change
						</Button>
					</div>
				{:else}
					<button
						class="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
					>
						<div class="text-center">
							<Camera class="mx-auto h-8 w-8 text-gray-400" />
							<p class="mt-2 text-sm text-gray-600">Take Photo</p>
						</div>
					</button>
				{/if}
			</div>
		</div>
	</Card>

	<!-- Driver License -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Driver License (Optional)</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<FormField
					label="Driver License Number"
					type="text"
					bind:value={driverLicenseNumber}
					placeholder="License number"
				/>
			</div>
			<div>
				<label class="mb-2 block text-sm font-medium text-gray-700">Driver License Photo</label>
				{#if driverLicensePhotoUrl}
					<div class="relative">
						<img
							src={driverLicensePhotoUrl}
							alt="Driver License"
							class="h-32 w-full rounded-lg object-cover"
						/>
						<Button
							size="sm"
							variant="outline"
							class="absolute right-2 top-2"
							onclick={() => (driverLicensePhotoUrl = '')}
						>
							Change
						</Button>
					</div>
				{:else}
					<button
						class="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
					>
						<div class="text-center">
							<Camera class="mx-auto h-8 w-8 text-gray-400" />
							<p class="mt-2 text-sm text-gray-600">Take Photo</p>
						</div>
					</button>
				{/if}
			</div>
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

