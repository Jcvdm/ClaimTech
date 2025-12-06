<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import Exterior360PhotosPanel from './Exterior360PhotosPanel.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useOptimisticQueue } from '$lib/utils/useOptimisticQueue.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import type { Exterior360, VehicleAccessory, AccessoryType, Exterior360Photo } from '$lib/types/assessment';
	import { validateExterior360, type TabValidation } from '$lib/utils/validation';

	interface Props {
		data: Exterior360 | null;
		assessmentId: string;
		accessories: VehicleAccessory[];
		exterior360Photos: Exterior360Photo[];
		onUpdate: (data: Partial<Exterior360>) => void;
		onAddAccessory: (accessory: { accessory_type: AccessoryType; custom_name?: string; value?: number }) => Promise<VehicleAccessory>;
		onDeleteAccessory: (id: string) => Promise<void>;
		onUpdateAccessoryValue: (accessoryId: string, value: number | null) => void;
		onPhotosUpdate: () => void;
		onValidationUpdate?: (validation: TabValidation) => void;
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
			if (!draft.accessory_type) throw new Error('Accessory type is required');
			return await onAddAccessory({
				accessory_type: draft.accessory_type,
				custom_name: draft.custom_name || undefined,
				value: draft.value ?? undefined
			});
		},
		onDelete: async (id) => {
			// Call parent handler which handles temp ID guard and DB delete
			await onDeleteAccessory(id);
		}
	});

	// Initialize draft stores
	let overallConditionDraft = useDraft('');
	let vehicleColorDraft = useDraft('');

	// Update draft keys when assessmentId changes
	$effect(() => {
		overallConditionDraft = useDraft(`assessment-${assessmentId}-overall-condition`);
		vehicleColorDraft = useDraft(`assessment-${assessmentId}-vehicle-color`);
	});

	// Use $state for mutable values (needed for bind:value and mutations)
	// Initialize from props to prevent empty state issues
	let overallCondition = $state(data?.overall_condition || '');
	let vehicleColor = $state(data?.vehicle_color || '');

	let showAccessoryModal = $state(false);
	let selectedAccessoryType = $state<AccessoryType>('mags');
	let customAccessoryName = $state('');
	let accessoryValue = $state<number | null>(null);

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
	// Only sync from props if NO draft exists (user changes take precedence)
	$effect(() => {
		if (data) {
			// Only sync from props if NO draft exists (user changes take precedence)
			if (!overallConditionDraft.hasDraft() && data.overall_condition) {
				overallCondition = data.overall_condition;
			}
			if (!vehicleColorDraft.hasDraft() && data.vehicle_color) {
				vehicleColor = data.vehicle_color;
			}
		}
	});

	onMount(() => {
		// Load drafts on mount (restores unsaved changes after component remount)
		const conditionDraft = overallConditionDraft.get();
		if (conditionDraft && !data?.overall_condition) {
			overallCondition = conditionDraft;
		}

		const colorDraft = vehicleColorDraft.get();
		if (colorDraft && !data?.vehicle_color) {
			vehicleColor = colorDraft;
		}
	});

	onDestroy(() => {
		// Force save before unmount (catches unsaved changes when debounce hasn't fired)
		handleSave();
	});

	// Helper function to save drafts to localStorage
	function saveDrafts() {
		overallConditionDraft.save(overallCondition);
		vehicleColorDraft.save(vehicleColor);
	}

	function handleSave() {
		// Always save - even if empty (so parent knows state changed)
		const updateData: Partial<Exterior360> = {
			overall_condition: (overallCondition || undefined) as any,
			vehicle_color: vehicleColor || undefined
		};

		onUpdate(updateData);

		// Clear drafts after successful DB save
		overallConditionDraft.clear();
		vehicleColorDraft.clear();
	}

	// Create debounced save function (saves 2 seconds after user stops typing)
	// Used for TEXT fields - select fields use immediate save
	const debouncedSave = debounce(() => {
		saveDrafts();
		handleSave();
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
		const value = accessoryValue;

		// Close modal and reset form first
		showAccessoryModal = false;
		customAccessoryName = '';
		selectedAccessoryType = 'mags';
		accessoryValue = null;

		// Add to optimistic queue (handles temp ID, status tracking, and DB create)
		await accessories.add({
			assessment_id: assessmentId,
			accessory_type: accessoryType,
			custom_name: accessoryType === 'custom' ? accessoryName : undefined,
			value: value,
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

	// Report validation to parent for immediate badge updates
	let lastValidationKey = '';

	$effect(() => {
		// Create stable key for semantic comparison
		const key = `${validation.isComplete}|${validation.missingFields.join(',')}`;

		// Only report if validation actually changed
		if (props.onValidationUpdate && key !== lastValidationKey) {
			lastValidationKey = key;
			props.onValidationUpdate(validation);
		}
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
					overallConditionDraft.save(value);
					handleSave();
				}}
			/>
			<FormField
				name="vehicle_color"
				label="Vehicle Color"
				type="text"
				value={vehicleColor}
				placeholder="e.g., White, Black, Silver"
				required
				oninput={(e: Event) => {
					const value = (e.target as HTMLInputElement).value;
					vehicleColor = value;
					vehicleColorDraft.save(value);
					debouncedSave();
				}}
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
						<div class="flex items-center gap-3 flex-1">
							<div class="flex-1">
								<p class="font-medium text-gray-900">
									{accessory.accessory_type === 'custom'
										? accessory.custom_name
										: accessoryOptions.find((opt) => opt.value === accessory.accessory_type)?.label}
								</p>
								{#if accessory.condition}
									<p class="text-sm text-gray-600">Condition: {accessory.condition}</p>
								{/if}
							</div>

							<!-- Value input -->
							<div class="w-32">
								<input
									type="number"
									value={accessory.value || 0}
									oninput={(e) => {
										const value = parseFloat((e.target as HTMLInputElement).value) || 0;
										props.onUpdateAccessoryValue(accessory.id!, value);
									}}
									placeholder="Value"
									class="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
									step="0.01"
									min="0"
									disabled={isSaving(accessory.id)}
								/>
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
					name="accessory_type"
					label="Accessory Type"
					type="select"
					bind:value={selectedAccessoryType}
					options={accessoryOptions}
				/>

				{#if selectedAccessoryType === 'custom'}
					<FormField
						name="custom_accessory_name"
						label="Custom Accessory Name"
						type="text"
						bind:value={customAccessoryName}
						placeholder="Enter accessory name"
						required
					/>
				{/if}

				<div class="space-y-2">
					<label class="block text-sm font-medium text-gray-700">Value (optional)</label>
					<input
						type="number"
						value={accessoryValue ?? ''}
						oninput={(e: Event) => {
							const val = (e.target as HTMLInputElement).value;
							accessoryValue = val ? parseFloat(val) : null;
						}}
						placeholder="0.00"
						step="0.01"
						min="0"
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					/>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<Button variant="outline" onclick={() => (showAccessoryModal = false)}>Cancel</Button>
				<Button onclick={handleAddAccessory}>Add Accessory</Button>
			</div>
		</Card>
	</div>
{/if}

