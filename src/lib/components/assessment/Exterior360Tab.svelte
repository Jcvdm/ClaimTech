<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { Plus, CircleCheck, Trash2 } from 'lucide-svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
	import { onMount, onDestroy } from 'svelte';
	import type { Exterior360, VehicleAccessory, AccessoryType } from '$lib/types/assessment';
	import { validateExterior360 } from '$lib/utils/validation';

	interface Props {
		data: Exterior360 | null;
		assessmentId: string;
		accessories: VehicleAccessory[];
		onUpdate: (data: Partial<Exterior360>) => void;
		onAddAccessory: (accessory: { accessory_type: AccessoryType; custom_name?: string }) => void;
		onDeleteAccessory: (id: string) => void;
		onComplete: () => void;
	}

	// Make props reactive using $derived pattern
	let props: Props = $props();

	const data = $derived(props.data);
	const assessmentId = $derived(props.assessmentId);
	const onUpdate = $derived(props.onUpdate);
	const onAddAccessory = $derived(props.onAddAccessory);
	const onDeleteAccessory = $derived(props.onDeleteAccessory);
	const onComplete = $derived(props.onComplete);

	// Use optimistic array for immediate UI updates
	const accessories = useOptimisticArray(props.accessories);

	// Initialize localStorage draft for critical fields
	const conditionDraft = useDraft(`assessment-${assessmentId}-condition`);
	const colorDraft = useDraft(`assessment-${assessmentId}-color`);

	let overallCondition = $state(data?.overall_condition || '');
	let vehicleColor = $state(data?.vehicle_color || '');

	// Photo positions - use individual $state variables
	let frontPhotoUrl = $state(data?.front_photo_url || '');
	let frontLeftPhotoUrl = $state(data?.front_left_photo_url || '');
	let leftPhotoUrl = $state(data?.left_photo_url || '');
	let rearLeftPhotoUrl = $state(data?.rear_left_photo_url || '');
	let rearPhotoUrl = $state(data?.rear_photo_url || '');
	let rearRightPhotoUrl = $state(data?.rear_right_photo_url || '');
	let rightPhotoUrl = $state(data?.right_photo_url || '');
	let frontRightPhotoUrl = $state(data?.front_right_photo_url || '');

	// Photo position configuration
	const photoPositions = [
		{ key: 'front_photo_url', label: 'Front', subcategory: 'front' },
		{ key: 'front_left_photo_url', label: 'Front Left', subcategory: 'front_left' },
		{ key: 'left_photo_url', label: 'Left', subcategory: 'left' },
		{ key: 'rear_left_photo_url', label: 'Rear Left', subcategory: 'rear_left' },
		{ key: 'rear_photo_url', label: 'Rear', subcategory: 'rear' },
		{ key: 'rear_right_photo_url', label: 'Rear Right', subcategory: 'rear_right' },
		{ key: 'right_photo_url', label: 'Right', subcategory: 'right' },
		{ key: 'front_right_photo_url', label: 'Front Right', subcategory: 'front_right' }
	];

	// Get photo URL by key
	function getPhotoUrl(key: string): string {
		switch (key) {
			case 'front_photo_url': return frontPhotoUrl;
			case 'front_left_photo_url': return frontLeftPhotoUrl;
			case 'left_photo_url': return leftPhotoUrl;
			case 'rear_left_photo_url': return rearLeftPhotoUrl;
			case 'rear_photo_url': return rearPhotoUrl;
			case 'rear_right_photo_url': return rearRightPhotoUrl;
			case 'right_photo_url': return rightPhotoUrl;
			case 'front_right_photo_url': return frontRightPhotoUrl;
			default: return '';
		}
	}

	// Set photo URL by key
	function setPhotoUrl(key: string, url: string) {
		switch (key) {
			case 'front_photo_url': frontPhotoUrl = url; break;
			case 'front_left_photo_url': frontLeftPhotoUrl = url; break;
			case 'left_photo_url': leftPhotoUrl = url; break;
			case 'rear_left_photo_url': rearLeftPhotoUrl = url; break;
			case 'rear_photo_url': rearPhotoUrl = url; break;
			case 'rear_right_photo_url': rearRightPhotoUrl = url; break;
			case 'right_photo_url': rightPhotoUrl = url; break;
			case 'front_right_photo_url': frontRightPhotoUrl = url; break;
		}
		handleSave();
	}

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

	// Sync local state with data prop when it changes (after save)
	$effect(() => {
		if (data) {
			// Only update if there's no draft (draft takes precedence)
			if (!conditionDraft.hasDraft() && data.overall_condition) {
				overallCondition = data.overall_condition;
			}
			if (!colorDraft.hasDraft() && data.vehicle_color) {
				vehicleColor = data.vehicle_color;
			}

			// Always update photo URLs from data
			if (data.front_photo_url) frontPhotoUrl = data.front_photo_url;
			if (data.front_left_photo_url) frontLeftPhotoUrl = data.front_left_photo_url;
			if (data.left_photo_url) leftPhotoUrl = data.left_photo_url;
			if (data.rear_left_photo_url) rearLeftPhotoUrl = data.rear_left_photo_url;
			if (data.rear_photo_url) rearPhotoUrl = data.rear_photo_url;
			if (data.rear_right_photo_url) rearRightPhotoUrl = data.rear_right_photo_url;
			if (data.right_photo_url) rightPhotoUrl = data.right_photo_url;
			if (data.front_right_photo_url) frontRightPhotoUrl = data.front_right_photo_url;
		}
	});

	// Load draft values on mount if available
	onMount(() => {
		const conditionDraftVal = conditionDraft.get();
		const colorDraftVal = colorDraft.get();

		if (conditionDraftVal && !data?.overall_condition) overallCondition = conditionDraftVal;
		if (colorDraftVal && !data?.vehicle_color) vehicleColor = colorDraftVal;
	});

	// Save any pending changes when component unmounts (user navigates away)
	onDestroy(() => {
		// Force save any pending changes
		handleSave();
	});

	function handleSave() {
		const updateData: Partial<Exterior360> = {
			overall_condition: (overallCondition || undefined) as any,
			vehicle_color: vehicleColor || undefined,
			front_photo_url: frontPhotoUrl || undefined,
			front_left_photo_url: frontLeftPhotoUrl || undefined,
			left_photo_url: leftPhotoUrl || undefined,
			rear_left_photo_url: rearLeftPhotoUrl || undefined,
			rear_photo_url: rearPhotoUrl || undefined,
			rear_right_photo_url: rearRightPhotoUrl || undefined,
			right_photo_url: rightPhotoUrl || undefined,
			front_right_photo_url: frontRightPhotoUrl || undefined
		};
		onUpdate(updateData);

		// Clear drafts after successful save
		conditionDraft.clear();
		colorDraft.clear();
	}

	// Save drafts on input (throttled)
	function saveDrafts() {
		conditionDraft.save(overallCondition);
		colorDraft.save(vehicleColor);
	}

	// Create debounced save function (saves 2 seconds after user stops typing)
	const debouncedSave = debounce(() => {
		saveDrafts(); // Save to localStorage
		handleSave(); // Save to database
	}, 2000);

	function handleComplete() {
		handleSave();
		onComplete();
	}

	async function handleAddAccessory() {
		if (selectedAccessoryType === 'custom' && !customAccessoryName.trim()) {
			alert('Please enter a custom accessory name');
			return;
		}

		// Save values before resetting form
		const accessoryType = selectedAccessoryType;
		const accessoryName = customAccessoryName;

		// Create temporary accessory for optimistic UI
		const tempAccessory = {
			id: `temp-${Date.now()}`,
			assessment_id: assessmentId,
			accessory_type: accessoryType,
			custom_name: accessoryType === 'custom' ? accessoryName : undefined,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		// Add to optimistic array immediately for instant UI feedback
		accessories.add(tempAccessory);

		// Close modal and reset form
		showAccessoryModal = false;
		customAccessoryName = '';
		selectedAccessoryType = 'mags';

		// Call parent handler (will sync via $effect when complete)
		await onAddAccessory({
			accessory_type: accessoryType,
			custom_name: accessoryType === 'custom' ? accessoryName : undefined
		});
	}

	const isComplete = $derived(
		overallCondition &&
			vehicleColor &&
			frontPhotoUrl &&
			frontLeftPhotoUrl &&
			leftPhotoUrl &&
			rearLeftPhotoUrl &&
			rearPhotoUrl &&
			rearRightPhotoUrl &&
			rightPhotoUrl &&
			frontRightPhotoUrl
	);

	// Validation for warning banner
	const validation = $derived.by(() => {
		return validateExterior360({
			overall_condition: overallCondition,
			vehicle_color: vehicleColor,
			front_photo_url: frontPhotoUrl,
			rear_photo_url: rearPhotoUrl,
			left_photo_url: leftPhotoUrl,
			right_photo_url: rightPhotoUrl
		});
	});
</script>

<div class="space-y-6">
	<!-- Warning Banner -->
	<RequiredFieldsWarning missingFields={validation.missingFields} />
	<!-- Vehicle Condition -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Vehicle Condition <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				name="overall_condition"
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
				onchange={(value: string) => {
					overallCondition = value;
					conditionDraft.save(value);
					handleSave(); // Save immediately for select fields
				}}
			/>
			<FormField
				name="vehicle_color"
				label="Vehicle Color"
				type="text"
				bind:value={vehicleColor}
				placeholder="e.g., White, Black, Silver"
				required
				oninput={debouncedSave}
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
				<PhotoUpload
					value={getPhotoUrl(position.key)}
					label={position.label}
					required
					{assessmentId}
					category="360"
					subcategory={position.subcategory}
					onUpload={(url) => setPhotoUrl(position.key, url)}
					onRemove={() => setPhotoUrl(position.key, '')}
					height="h-32"
				/>
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

		{#if accessories.value.length === 0}
			<p class="text-center text-sm text-gray-500">
				No accessories added yet. Click "Add Accessory" to add aftermarket additions.
			</p>
		{:else}
			<div class="space-y-2">
				{#each accessories.value as accessory}
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
			<CircleCheck class="mr-2 h-4 w-4" />
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

