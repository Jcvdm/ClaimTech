<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import FormField from '$lib/components/forms/FormField.svelte';
	import CompactCard from './compact/CompactCard.svelte';
	import CompactCardHeader from './compact/CompactCardHeader.svelte';
	import CompactField from './compact/CompactField.svelte';
	import CompactInput from './compact/CompactInput.svelte';
	import CompactSelect from './compact/CompactSelect.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import InteriorPhotosPanel from './InteriorPhotosPanel.svelte';
	import TabFormSplit from './layout/TabFormSplit.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import FormFieldPhotoViewer, { type FieldConfig } from '$lib/components/photo-viewer/FormFieldPhotoViewer.svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import { onMount, onDestroy } from 'svelte';
	import type { InteriorMechanical, InteriorPhoto } from '$lib/types/assessment';
	import { validateInteriorMechanical, type TabValidation } from '$lib/utils/validation';
	import { interiorPhotosService } from '$lib/services/interior-photos.service';

	interface Props {
		data: InteriorMechanical | null;
		assessmentId: string;
		interiorPhotos: InteriorPhoto[];
		onUpdate: (data: Partial<InteriorMechanical>) => void;
		onPhotosUpdate: () => void;
		onValidationUpdate?: (validation: TabValidation) => void;
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const data = $derived(props.data);
	const assessmentId = $derived(props.assessmentId);
	const interiorPhotos = $derived(props.interiorPhotos);
	const onUpdate = $derived(props.onUpdate);
	const onPhotosUpdate = $derived(props.onPhotosUpdate);

	// Initialize localStorage draft for critical fields
	let mileageDraft = useDraft('');
	let transmissionDraft = useDraft('');
	let interiorConditionDraft = useDraft('');

	// Update draft keys when assessmentId changes
	$effect(() => {
		mileageDraft = useDraft(`assessment-${assessmentId}-mileage`);
		transmissionDraft = useDraft(`assessment-${assessmentId}-transmission`);
		interiorConditionDraft = useDraft(`assessment-${assessmentId}-interior-condition`);
	});

	// Photos
	let engineBayPhotoUrl = $state('');
	let batteryPhotoUrl = $state('');
	let oilLevelPhotoUrl = $state('');
	let coolantPhotoUrl = $state('');
	let mileagePhotoUrl = $state('');
	let gearLeverPhotoUrl = $state('');

	// Mileage photo viewer state
	let viewingMileagePhoto = $state(false);

	// Mileage field configuration for photo viewer
	const mileageFieldConfig: FieldConfig = {
		label: 'Mileage Reading (km)',
		type: 'number',
		placeholder: 'e.g., 125000'
	};

	// Handle saving mileage from photo viewer
	async function handleMileagePhotoSave(value: string) {
		mileageReading = value;
		mileageDraft.save(value);
		handleSave();
	}

	// Data
	let mileageReading = $state('');
	let interiorCondition = $state('');
	let transmissionType = $state('');
	let vehicleHasPower = $state('');
	let srsSystem = $state('');
	let steering = $state('');
	let brakes = $state('');
	let handbrake = $state('');

	// Sync local state with data prop when it changes (after save)
	$effect(() => {
		if (data) {
			// Only update if there's no draft (draft takes precedence)
			if (!mileageDraft.hasDraft() && data.mileage_reading) {
				mileageReading = data.mileage_reading.toString();
			}
			if (!transmissionDraft.hasDraft() && data.transmission_type) {
				transmissionType = data.transmission_type;
			}
			if (!interiorConditionDraft.hasDraft() && data.interior_condition) {
				interiorCondition = data.interior_condition;
			}

			// Always update photo URLs and other fields from data
			if (data.engine_bay_photo_url) engineBayPhotoUrl = data.engine_bay_photo_url;
			if (data.battery_photo_url) batteryPhotoUrl = data.battery_photo_url;
			if (data.oil_level_photo_url) oilLevelPhotoUrl = data.oil_level_photo_url;
			if (data.coolant_photo_url) coolantPhotoUrl = data.coolant_photo_url;
			if (data.mileage_photo_url) mileagePhotoUrl = data.mileage_photo_url;
			if (data.gear_lever_photo_url) gearLeverPhotoUrl = data.gear_lever_photo_url;

			// Update other fields
			if (data.vehicle_has_power !== null && data.vehicle_has_power !== undefined) vehicleHasPower = data.vehicle_has_power.toString();
			if (data.srs_system) srsSystem = data.srs_system;
			if (data.steering) steering = data.steering;
			if (data.brakes) brakes = data.brakes;
			if (data.handbrake) handbrake = data.handbrake;
		}
	});

	// Load draft values on mount if available
	onMount(() => {
		const mileageDraftVal = mileageDraft.get();
		const transmissionDraftVal = transmissionDraft.get();
		const interiorConditionDraftVal = interiorConditionDraft.get();

		if (mileageDraftVal && !data?.mileage_reading) mileageReading = mileageDraftVal;
		if (transmissionDraftVal && !data?.transmission_type) transmissionType = transmissionDraftVal;
		if (interiorConditionDraftVal && !data?.interior_condition) interiorCondition = interiorConditionDraftVal;
	});

	// Save any pending changes when component unmounts (user navigates away)
	onDestroy(() => {
		// Force save any pending changes
		handleSave();
	});

	function handleSave() {
		onUpdate({
			engine_bay_photo_url: engineBayPhotoUrl || undefined,
			battery_photo_url: batteryPhotoUrl || undefined,
			oil_level_photo_url: oilLevelPhotoUrl || undefined,
			coolant_photo_url: coolantPhotoUrl || undefined,
			mileage_photo_url: mileagePhotoUrl || undefined,
			gear_lever_photo_url: gearLeverPhotoUrl || undefined,
			mileage_reading: mileageReading ? parseInt(mileageReading) : undefined,
			interior_condition: (interiorCondition || undefined) as any,
			transmission_type: (transmissionType || undefined) as any,
			vehicle_has_power: vehicleHasPower ? vehicleHasPower === 'true' : undefined,
			srs_system: (srsSystem || undefined) as any,
			steering: (steering || undefined) as any,
			brakes: (brakes || undefined) as any,
			handbrake: (handbrake || undefined) as any
		});

		// Clear drafts after successful save
		mileageDraft.clear();
		transmissionDraft.clear();
		interiorConditionDraft.clear();
	}

	// Save drafts on input (throttled)
	function saveDrafts() {
		mileageDraft.save(mileageReading);
		transmissionDraft.save(transmissionType);
		interiorConditionDraft.save(interiorCondition);
	}

	// Create debounced save function (saves 2 seconds after user stops typing)
	const debouncedSave = debounce(() => {
		saveDrafts(); // Save to localStorage
		handleSave(); // Save to database
	}, 2000);

	// Validation for warning banner
	const validation = $derived.by(() => {
		return validateInteriorMechanical({
			mileage_reading: mileageReading ? parseInt(mileageReading) : undefined,
			interior_condition: interiorCondition,
			srs_system: srsSystem,
			steering: steering,
			brakes: brakes,
			handbrake: handbrake
		}, interiorPhotos);
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

	<TabFormSplit photosWidth="380px">
		{#snippet form()}
			<div class="space-y-6">
				<!-- Engine Bay -->
				<CompactCard>
					<CompactCardHeader title="Engine Bay" />
					<div class="grid gap-3.5 md:grid-cols-4">
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
				</CompactCard>

				<!-- Mileage -->
				<CompactCard>
					<CompactCardHeader title="Mileage" required />
					<div class="grid gap-3.5 md:grid-cols-2">
						<CompactField label="Mileage Reading (km)" required htmlFor="mileage_reading">
							<CompactInput
								id="mileage_reading"
								type="number"
								bind:value={mileageReading}
								placeholder="e.g., 125000"
								mono
								oninput={debouncedSave}
							/>
						</CompactField>
						<PhotoUpload
							value={mileagePhotoUrl}
							label="Mileage Photo"
							{assessmentId}
							category="interior"
							subcategory="mileage"
							onUpload={(url) => { mileagePhotoUrl = url; handleSave(); }}
							onRemove={() => { mileagePhotoUrl = ''; handleSave(); }}
							onView={() => { viewingMileagePhoto = true; }}
						/>
					</div>
				</CompactCard>

				<!-- Transmission & Power -->
				<CompactCard>
					<CompactCardHeader title="Transmission & Power" />
					<div class="grid gap-3.5 md:grid-cols-3">
						<CompactField label="Transmission Type" htmlFor="transmission_type">
							<CompactSelect
								id="transmission_type"
								bind:value={transmissionType}
								options={[
									{ value: 'automatic', label: 'Automatic' },
									{ value: 'manual', label: 'Manual' }
								]}
								onchange={(value) => {
									transmissionType = value;
									transmissionDraft.save(value);
									handleSave(); // Save immediately for select fields
								}}
							/>
						</CompactField>
						<CompactField label="Battery Charged?" htmlFor="vehicle_has_power">
							<CompactSelect
								id="vehicle_has_power"
								bind:value={vehicleHasPower}
								options={[
									{ value: 'true', label: 'Yes' },
									{ value: 'false', label: 'No' }
								]}
								onchange={() => handleSave()}
							/>
						</CompactField>
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
				</CompactCard>

				<!-- Interior Condition -->
				<CompactCard>
					<CompactCardHeader title="Interior Condition" required />
					<CompactField label="Overall Interior Condition" required htmlFor="interior_condition">
						<CompactSelect
							id="interior_condition"
							bind:value={interiorCondition}
							options={[
								{ value: 'excellent', label: 'Excellent' },
								{ value: 'very_good', label: 'Very Good' },
								{ value: 'good', label: 'Good' },
								{ value: 'fair', label: 'Fair' },
								{ value: 'poor', label: 'Poor' },
								{ value: 'very_poor', label: 'Very Poor' }
							]}
							onchange={(value) => {
								interiorCondition = value;
								interiorConditionDraft.save(value);
								handleSave(); // Save immediately for select fields
							}}
						/>
					</CompactField>
				</CompactCard>

				<!-- Systems Check -->
				<CompactCard>
					<CompactCardHeader title="Systems Check" required />
					<div class="grid gap-3.5 md:grid-cols-2">
						<CompactField label="SRS System (Airbags/Seatbelts)" required htmlFor="srs_system">
							<CompactSelect
								id="srs_system"
								bind:value={srsSystem}
								options={[
									{ value: 'operational', label: 'Operational' },
									{ value: 'warning_light', label: 'Warning Light On' },
									{ value: 'not_working', label: 'Not Working' },
									{ value: 'deployed', label: 'Deployed' }
								]}
								onchange={() => handleSave()}
							/>
						</CompactField>
						<CompactField label="Steering" required htmlFor="steering">
							<CompactSelect
								id="steering"
								bind:value={steering}
								options={[
									{ value: 'working', label: 'Working' },
									{ value: 'not_working', label: 'Not Working' },
									{ value: 'issues', label: 'Has Issues' }
								]}
								onchange={() => handleSave()}
							/>
						</CompactField>
						<CompactField label="Brakes" required htmlFor="brakes">
							<CompactSelect
								id="brakes"
								bind:value={brakes}
								options={[
									{ value: 'working', label: 'Working' },
									{ value: 'not_working', label: 'Not Working' },
									{ value: 'issues', label: 'Has Issues' }
								]}
								onchange={() => handleSave()}
							/>
						</CompactField>
						<CompactField label="Handbrake" required htmlFor="handbrake">
							<CompactSelect
								id="handbrake"
								bind:value={handbrake}
								options={[
									{ value: 'working', label: 'Working' },
									{ value: 'not_working', label: 'Not Working' },
									{ value: 'issues', label: 'Has Issues' }
								]}
								onchange={() => handleSave()}
							/>
						</CompactField>
					</div>
				</CompactCard>
			</div>
		{/snippet}

		{#snippet photos()}
			<InteriorPhotosPanel
				{assessmentId}
				photos={interiorPhotos}
				onUpdate={onPhotosUpdate}
				inSidebar
			/>
		{/snippet}
	</TabFormSplit>
</div>

<!-- Mileage Photo Field Viewer -->
{#if viewingMileagePhoto && mileagePhotoUrl}
	<FormFieldPhotoViewer
		photoUrl={mileagePhotoUrl}
		field={mileageFieldConfig}
		value={mileageReading}
		onSave={handleMileagePhotoSave}
		onClose={() => { viewingMileagePhoto = false; }}
	/>
{/if}
