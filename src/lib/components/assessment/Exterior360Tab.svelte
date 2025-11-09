<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import Exterior360PhotosPanel from './Exterior360PhotosPanel.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import { useOptimisticQueue } from '$lib/utils/useOptimisticQueue.svelte';
	import { onMount, onDestroy } from 'svelte';
	import type { Exterior360, VehicleAccessory, AccessoryType, Exterior360Photo } from '$lib/types/assessment';
	import { validateExterior360 } from '$lib/utils/validation';

	interface Props {
		data: Exterior360 | null;
		assessmentId: string;
		accessories: VehicleAccessory[];
		exterior360Photos: Exterior360Photo[];
		onUpdate: (data: Partial<Exterior360>) => void;
		onAddAccessory: (accessory: { accessory_type: AccessoryType; custom_name?: string }) => Promise<VehicleAccessory>;
		onDeleteAccessory: (id: string) => Promise<void>;
		onPhotosUpdate: () => void;
	}

	// Make props reactive using $derived pattern
	let props: Props = $props();

	const data = $derived(props.data);
	const assessmentId = $derived(props.assessmentId);
	const onUpdate = $derived(props.onUpdate);
	const onAddAccessory = $derived(props.onAddAccessory);
	const onDeleteAccessory = $derived(props.onDeleteAccessory);
	const onPhotosUpdate = $derived(props.onPhotosUpdate);

	// Use optimistic queue for immediate UI updates with status tracking
	const accessories = useOptimisticQueue(props.accessories, {
		onCreate: async (draft) => {
			// Call parent handler which creates in DB and returns the created accessory
			return await onAddAccessory({
				accessory_type: draft.accessory_type!,
				custom_name: draft.custom_name
			});
		},
		onDelete: async (id) => {
			// Call parent handler which handles temp ID guard and DB delete
			await onDeleteAccessory(id);
		}
	});

	// Initialize localStorage draft for critical fields
	const conditionDraft = useDraft(`assessment-${assessmentId}-condition`);
	const colorDraft = useDraft(`assessment-${assessmentId}-color`);

	let overallCondition = $state(data?.overall_condition || '');
	let vehicleColor = $state(data?.vehicle_color || '');

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
			vehicle_color: vehicleColor || undefined
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

	// Helper functions for queue status
	function isSaving(id: string | undefined): boolean {
		return accessories.getStatus(id) === 'saving';
	}

	function hasError(id: string | undefined): boolean {
		return accessories.getStatus(id) === 'error';
	}

	async function handleAddAccessory() {
		if (selectedAccessoryType === 'custom' && !customAccessoryName.trim()) {
			alert('Please enter a custom accessory name');
			return;
		}

		// Save values before resetting form
		const accessoryType = selectedAccessoryType;
		const accessoryName = customAccessoryName;

		// Close modal and reset form first
		showAccessoryModal = false;
		customAccessoryName = '';
		selectedAccessoryType = 'mags';

		// Add to optimistic queue (handles temp ID, status tracking, and DB create)
		await accessories.add({
			assessment_id: assessmentId,
			accessory_type: accessoryType,
			custom_name: accessoryType === 'custom' ? accessoryName : undefined,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		} as VehicleAccessory);
	}

	async function handleDeleteAccessory(id: string) {
		// Queue handles temp ID check and DB delete
		await accessories.remove(id);
	}

	// Validation for warning banner
	const validation = $derived.by(() => {
		return validateExterior360(
			{
				overall_condition: overallCondition,
				vehicle_color: vehicleColor
			},
			props.exterior360Photos
		);
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

	<!-- Exterior Photos -->
	<Exterior360PhotosPanel
		{assessmentId}
		photos={props.exterior360Photos}
		onUpdate={onPhotosUpdate}
	/>

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
						<div class="flex items-center gap-2">
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

							<!-- Status indicators -->
							{#if isSaving(accessory.id)}
								<Loader2 class="h-4 w-4 animate-spin text-blue-500" />
							{:else if hasError(accessory.id)}
								<div class="flex items-center gap-1">
									<AlertCircle class="h-4 w-4 text-red-500" />
									<Button
										size="sm"
										variant="ghost"
										onclick={() => accessories.retry(accessory.id!)}
										class="text-xs text-red-600 hover:text-red-700"
									>
										Retry
									</Button>
								</div>
							{/if}
						</div>

						<Button
							size="sm"
							variant="outline"
							onclick={() => handleDeleteAccessory(accessory.id!)}
							disabled={isSaving(accessory.id)}
						>
							<Trash2 class="h-4 w-4 text-red-600" />
						</Button>
					</div>
				{/each}
			</div>
		{/if}
	</Card>
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

