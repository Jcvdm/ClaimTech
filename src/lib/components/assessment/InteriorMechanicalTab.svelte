<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import { onMount, onDestroy } from 'svelte';
	import type { InteriorMechanical } from '$lib/types/assessment';
	import { validateInteriorMechanical } from '$lib/utils/validation';

	interface Props {
		data: InteriorMechanical | null;
		assessmentId: string;
		onUpdate: (data: Partial<InteriorMechanical>) => void;
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const data = $derived(props.data);
	const assessmentId = $derived(props.assessmentId);
	const onUpdate = $derived(props.onUpdate);

	// Initialize localStorage draft for critical fields
	const mileageDraft = useDraft(`assessment-${assessmentId}-mileage`);
	const transmissionDraft = useDraft(`assessment-${assessmentId}-transmission`);
	const interiorConditionDraft = useDraft(`assessment-${assessmentId}-interior-condition`);

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
			if (data.interior_front_photo_url) interiorFrontPhotoUrl = data.interior_front_photo_url;
			if (data.interior_rear_photo_url) interiorRearPhotoUrl = data.interior_rear_photo_url;
			if (data.dashboard_photo_url) dashboardPhotoUrl = data.dashboard_photo_url;
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
			interior_front_photo_url: interiorFrontPhotoUrl || undefined,
			interior_rear_photo_url: interiorRearPhotoUrl || undefined,
			dashboard_photo_url: dashboardPhotoUrl || undefined,
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
		});
	});
</script>

<div class="space-y-6">
	<!-- Warning Banner -->
	<RequiredFieldsWarning missingFields={validation.missingFields} />
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
				name="mileage_reading"
				label="Mileage Reading (km)"
				type="number"
				bind:value={mileageReading}
				placeholder="e.g., 125000"
				required
				oninput={debouncedSave}
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
				name="transmission_type"
				label="Transmission Type"
				type="select"
				bind:value={transmissionType}
				options={[
					{ value: 'automatic', label: 'Automatic' },
					{ value: 'manual', label: 'Manual' }
				]}
				onchange={(value: string) => {
					transmissionType = value;
					transmissionDraft.save(value);
					handleSave(); // Save immediately for select fields
				}}
			/>
			<FormField
				name="vehicle_has_power"
				label="Battery Charged?"
				type="select"
				bind:value={vehicleHasPower}
				options={[
					{ value: 'true', label: 'Yes' },
					{ value: 'false', label: 'No' }
				]}
				onchange={() => handleSave()}
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
			name="interior_condition"
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
			onchange={(value: string) => {
				interiorCondition = value;
				interiorConditionDraft.save(value);
				handleSave(); // Save immediately for select fields
			}}
		/>
	</Card>

	<!-- Systems Check -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Systems Check <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				name="srs_system"
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
				onchange={() => handleSave()}
			/>
			<FormField
				name="steering"
				label="Steering"
				type="select"
				bind:value={steering}
				options={[
					{ value: 'working', label: 'Working' },
					{ value: 'not_working', label: 'Not Working' },
					{ value: 'issues', label: 'Has Issues' }
				]}
				required
				onchange={() => handleSave()}
			/>
			<FormField
				name="brakes"
				label="Brakes"
				type="select"
				bind:value={brakes}
				options={[
					{ value: 'working', label: 'Working' },
					{ value: 'not_working', label: 'Not Working' },
					{ value: 'issues', label: 'Has Issues' }
				]}
				required
				onchange={() => handleSave()}
			/>
			<FormField
				name="handbrake"
				label="Handbrake"
				type="select"
				bind:value={handbrake}
				options={[
					{ value: 'working', label: 'Working' },
					{ value: 'not_working', label: 'Not Working' },
					{ value: 'issues', label: 'Has Issues' }
				]}
				required
				onchange={() => handleSave()}
			/>
		</div>
	</Card>
</div>

