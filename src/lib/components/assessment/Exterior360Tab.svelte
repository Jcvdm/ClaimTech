<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { Camera, Plus, CheckCircle, Trash2 } from 'lucide-svelte';
	import type { Exterior360, VehicleAccessory, AccessoryType } from '$lib/types/assessment';

	interface Props {
		data: Exterior360 | null;
		accessories: VehicleAccessory[];
		onUpdate: (data: Partial<Exterior360>) => void;
		onAddAccessory: (accessory: { accessory_type: AccessoryType; custom_name?: string }) => void;
		onDeleteAccessory: (id: string) => void;
		onComplete: () => void;
	}

	let { data, accessories, onUpdate, onAddAccessory, onDeleteAccessory, onComplete }: Props =
		$props();

	let overallCondition = $state(data?.overall_condition || '');
	let vehicleColor = $state(data?.vehicle_color || '');

	// Photo positions
	const photoPositions = [
		{ key: 'front_photo_url', label: 'Front', value: $state(data?.front_photo_url || '') },
		{
			key: 'front_left_photo_url',
			label: 'Front Left',
			value: $state(data?.front_left_photo_url || '')
		},
		{ key: 'left_photo_url', label: 'Left', value: $state(data?.left_photo_url || '') },
		{
			key: 'rear_left_photo_url',
			label: 'Rear Left',
			value: $state(data?.rear_left_photo_url || '')
		},
		{ key: 'rear_photo_url', label: 'Rear', value: $state(data?.rear_photo_url || '') },
		{
			key: 'rear_right_photo_url',
			label: 'Rear Right',
			value: $state(data?.rear_right_photo_url || '')
		},
		{ key: 'right_photo_url', label: 'Right', value: $state(data?.right_photo_url || '') },
		{
			key: 'front_right_photo_url',
			label: 'Front Right',
			value: $state(data?.front_right_photo_url || '')
		}
	];

	let showAccessoryModal = $state(false);
	let selectedAccessoryType = $state<AccessoryType>('mags');
	let customAccessoryName = $state('');

	const accessoryOptions: { value: AccessoryType; label: string }[] = [
		{ value: 'mags', label: 'Mags / Alloy Wheels' },
		{ value: 'spotlights', label: 'Spotlights' },
		{ value: 'park_sensors', label: 'Park Sensors' },
		{ value: 'tow_bar', label: 'Tow Bar' },
		{ value: 'bull_bar', label: 'Bull Bar' },
		{ value: 'roof_rack', label: 'Roof Rack' },
		{ value: 'side_steps', label: 'Side Steps' },
		{ value: 'canopy', label: 'Canopy / Bakkie Cover' },
		{ value: 'tonneau_cover', label: 'Tonneau Cover' },
		{ value: 'nudge_bar', label: 'Nudge Bar' },
		{ value: 'winch', label: 'Winch' },
		{ value: 'snorkel', label: 'Snorkel' },
		{ value: 'custom', label: 'Custom / Other' }
	];

	function handleSave() {
		const updateData: Partial<Exterior360> = {
			overall_condition: overallCondition as any,
			vehicle_color: vehicleColor,
			front_photo_url: photoPositions[0].value || undefined,
			front_left_photo_url: photoPositions[1].value || undefined,
			left_photo_url: photoPositions[2].value || undefined,
			rear_left_photo_url: photoPositions[3].value || undefined,
			rear_photo_url: photoPositions[4].value || undefined,
			rear_right_photo_url: photoPositions[5].value || undefined,
			right_photo_url: photoPositions[6].value || undefined,
			front_right_photo_url: photoPositions[7].value || undefined
		};
		onUpdate(updateData);
	}

	function handleComplete() {
		handleSave();
		onComplete();
	}

	function handleAddAccessory() {
		if (selectedAccessoryType === 'custom' && !customAccessoryName.trim()) {
			alert('Please enter a custom accessory name');
			return;
		}

		onAddAccessory({
			accessory_type: selectedAccessoryType,
			custom_name: selectedAccessoryType === 'custom' ? customAccessoryName : undefined
		});

		showAccessoryModal = false;
		customAccessoryName = '';
		selectedAccessoryType = 'mags';
	}

	const isComplete = $derived(
		overallCondition &&
			vehicleColor &&
			photoPositions.every((pos) => pos.value) // All 8 photos required
	);
</script>

<div class="space-y-6">
	<!-- Vehicle Condition -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Vehicle Condition <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				label="Overall Condition"
				type="select"
				bind:value={overallCondition}
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
			<FormField
				label="Vehicle Color"
				type="text"
				bind:value={vehicleColor}
				placeholder="e.g., White, Black, Silver"
				required
			/>
		</div>
	</Card>

	<!-- 360° Photos -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			360° Photos <span class="text-red-500">*</span>
		</h3>
		<p class="mb-6 text-sm text-gray-600">
			Take photos from all 8 positions around the vehicle for a complete exterior assessment
		</p>
		<div class="grid gap-4 md:grid-cols-4">
			{#each photoPositions as position}
				<div>
					<label class="mb-2 block text-sm font-medium text-gray-700">{position.label}</label>
					{#if position.value}
						<div class="relative">
							<img
								src={position.value}
								alt={position.label}
								class="h-32 w-full rounded-lg object-cover"
							/>
							<Button
								size="sm"
								variant="outline"
								class="absolute right-2 top-2"
								onclick={() => (position.value = '')}
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

	<!-- Accessories -->
	<Card class="p-6">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900">Vehicle Accessories</h3>
			<Button size="sm" onclick={() => (showAccessoryModal = true)}>
				<Plus class="mr-2 h-4 w-4" />
				Add Accessory
			</Button>
		</div>

		{#if accessories.length === 0}
			<p class="text-center text-sm text-gray-500">
				No accessories added yet. Click "Add Accessory" to add aftermarket additions.
			</p>
		{:else}
			<div class="space-y-2">
				{#each accessories as accessory}
					<div class="flex items-center justify-between rounded-lg border p-3">
						<div>
							<p class="font-medium text-gray-900">
								{accessory.accessory_type === 'custom'
									? accessory.custom_name
									: accessoryOptions.find((opt) => opt.value === accessory.accessory_type)?.label}
							</p>
							{#if accessory.condition}
								<p class="text-sm text-gray-600">Condition: {accessory.condition}</p>
							{/if}
						</div>
						<Button
							size="sm"
							variant="outline"
							onclick={() => onDeleteAccessory(accessory.id)}
						>
							<Trash2 class="h-4 w-4 text-red-600" />
						</Button>
					</div>
				{/each}
			</div>
		{/if}
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

<!-- Add Accessory Modal -->
{#if showAccessoryModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<Card class="w-full max-w-md p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Add Vehicle Accessory</h3>

			<div class="space-y-4">
				<FormField
					label="Accessory Type"
					type="select"
					bind:value={selectedAccessoryType}
					options={accessoryOptions}
				/>

				{#if selectedAccessoryType === 'custom'}
					<FormField
						label="Custom Accessory Name"
						type="text"
						bind:value={customAccessoryName}
						placeholder="Enter accessory name"
						required
					/>
				{/if}
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<Button variant="outline" onclick={() => (showAccessoryModal = false)}>Cancel</Button>
				<Button onclick={handleAddAccessory}>Add Accessory</Button>
			</div>
		</Card>
	</div>
{/if}

