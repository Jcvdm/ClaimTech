<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import FormFieldPhotoViewer, { type FieldConfig } from '$lib/components/photo-viewer/FormFieldPhotoViewer.svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import { onMount } from 'svelte';
	import type { VehicleIdentification } from '$lib/types/assessment';
	import type { VehicleDetails } from '$lib/utils/report-data-helpers';
	import { validateVehicleIdentification, type TabValidation } from '$lib/utils/validation';

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
	vehicleDetails?: VehicleDetails | null;
	onValidationUpdate?: (validation: TabValidation) => void;
}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const data = $derived(props.data);
	const assessmentId = $derived(props.assessmentId);
	const vehicleInfo = $derived(props.vehicleInfo);
	const onUpdate = $derived(props.onUpdate);
	const vehicleDetails = $derived(props.vehicleDetails);

	// Initialize localStorage draft for critical fields
	let registrationDraft = useDraft('');
	let vinDraft = useDraft('');
	let engineDraft = useDraft('');
	let makeDraft = useDraft('');
	let modelDraft = useDraft('');
	let yearDraft = useDraft('');

	// Update draft keys when assessmentId changes
	$effect(() => {
		registrationDraft = useDraft(`assessment-${assessmentId}-registration`);
		vinDraft = useDraft(`assessment-${assessmentId}-vin`);
		engineDraft = useDraft(`assessment-${assessmentId}-engine`);
		makeDraft = useDraft(`assessment-${assessmentId}-make`);
		modelDraft = useDraft(`assessment-${assessmentId}-model`);
		yearDraft = useDraft(`assessment-${assessmentId}-year`);
	});

	// Vehicle info fields (editable)
	let vehicleMake = $state('');
	let vehicleModel = $state('');
	let vehicleYear = $state<number | undefined>(undefined);

	let registrationNumber = $state('');
	let vinNumber = $state('');
	let engineNumber = $state('');
	let licenseDiscExpiry = $state('');
	let driverLicenseNumber = $state('');

	// Photo URLs
	let registrationPhotoUrl = $state('');
	let vinPhotoUrl = $state('');
	let engineNumberPhotoUrl = $state('');
	let licenseDiscPhotoUrl = $state('');
	let driverLicensePhotoUrl = $state('');

	// Photo-field viewer state
	type PhotoFieldType = 'registration' | 'vin' | 'engine' | 'license_disc' | null;
	let viewingPhotoField = $state<PhotoFieldType>(null);

	// Field configurations for photo viewer
	const fieldConfigs: Record<Exclude<PhotoFieldType, null>, FieldConfig> = {
		registration: {
			label: 'Registration Number',
			type: 'text',
			placeholder: 'e.g., ABC123GP'
		},
		vin: {
			label: 'VIN Number',
			type: 'text',
			placeholder: '17-character VIN',
			maxLength: 17,
			validation: {
				expectedLength: 17,
				message: 'VIN should be 17 characters'
			}
		},
		engine: {
			label: 'Engine Number',
			type: 'text',
			placeholder: 'Enter engine number'
		},
		license_disc: {
			label: 'License Disc Expiry',
			type: 'date'
		}
	};

	// Get current photo URL for viewer
	const viewingPhotoUrl = $derived.by(() => {
		switch (viewingPhotoField) {
			case 'registration': return registrationPhotoUrl;
			case 'vin': return vinPhotoUrl;
			case 'engine': return engineNumberPhotoUrl;
			case 'license_disc': return licenseDiscPhotoUrl;
			default: return '';
		}
	});

	// Get current field value for viewer
	const viewingFieldValue = $derived.by(() => {
		switch (viewingPhotoField) {
			case 'registration': return registrationNumber;
			case 'vin': return vinNumber;
			case 'engine': return engineNumber;
			case 'license_disc': return licenseDiscExpiry;
			default: return '';
		}
	});

	// Handle saving field value from photo viewer
	async function handlePhotoFieldSave(value: string) {
		if (!viewingPhotoField) return;

		switch (viewingPhotoField) {
			case 'registration':
				registrationNumber = value;
				registrationDraft.save(value);
				break;
			case 'vin':
				vinNumber = value;
				vinDraft.save(value);
				break;
			case 'engine':
				engineNumber = value;
				engineDraft.save(value);
				break;
			case 'license_disc':
				licenseDiscExpiry = value;
				break;
		}

		// Save to database
		handleSave();
	}

	// Sync local state with data prop when it changes (after save)
	$effect(() => {
		if (data) {
			// Only update if there's no draft (draft takes precedence)
			// Priority: data > vehicleDetails > vehicleInfo
			if (!registrationDraft.hasDraft() && data.registration_number) {
				registrationNumber = data.registration_number;
			} else if (!registrationDraft.hasDraft() && vehicleDetails?.registration) {
				registrationNumber = vehicleDetails.registration;
			} else if (!registrationDraft.hasDraft() && vehicleInfo?.registration) {
				registrationNumber = vehicleInfo.registration;
			}
			if (!vinDraft.hasDraft() && data.vin_number) {
				vinNumber = data.vin_number;
			} else if (!vinDraft.hasDraft() && vehicleDetails?.vin) {
				vinNumber = vehicleDetails.vin;
			} else if (!vinDraft.hasDraft() && vehicleInfo?.vin) {
				vinNumber = vehicleInfo.vin;
			}
			if (!engineDraft.hasDraft() && data.engine_number) {
				engineNumber = data.engine_number;
			}
			if (!makeDraft.hasDraft() && data.vehicle_make) {
				vehicleMake = data.vehicle_make;
			} else if (!makeDraft.hasDraft() && vehicleDetails?.make) {
				vehicleMake = vehicleDetails.make;
			} else if (!makeDraft.hasDraft() && vehicleInfo?.make) {
				vehicleMake = vehicleInfo.make;
			}
			if (!modelDraft.hasDraft() && data.vehicle_model) {
				vehicleModel = data.vehicle_model;
			} else if (!modelDraft.hasDraft() && vehicleDetails?.model) {
				vehicleModel = vehicleDetails.model;
			} else if (!modelDraft.hasDraft() && vehicleInfo?.model) {
				vehicleModel = vehicleInfo.model;
			}
			if (!yearDraft.hasDraft() && data.vehicle_year) {
				vehicleYear = data.vehicle_year;
			} else if (!yearDraft.hasDraft() && vehicleDetails?.year) {
				vehicleYear = vehicleDetails.year;
			} else if (!yearDraft.hasDraft() && vehicleInfo?.year) {
				vehicleYear = vehicleInfo.year;
			}

			// Always update photo URLs from data
			if (data.registration_photo_url) registrationPhotoUrl = data.registration_photo_url;
			if (data.vin_photo_url) vinPhotoUrl = data.vin_photo_url;
			if (data.engine_number_photo_url) engineNumberPhotoUrl = data.engine_number_photo_url;
			if (data.license_disc_photo_url) licenseDiscPhotoUrl = data.license_disc_photo_url;
			if (data.driver_license_photo_url) driverLicensePhotoUrl = data.driver_license_photo_url;

			// Update other fields
			if (data.license_disc_expiry) licenseDiscExpiry = data.license_disc_expiry;
			if (data.driver_license_number) driverLicenseNumber = data.driver_license_number;
		}
	});

	// Load draft values on mount if available
	onMount(() => {
		const regDraft = registrationDraft.get();
		const vinDraftVal = vinDraft.get();
		const engDraft = engineDraft.get();
		const makeDraftVal = makeDraft.get();
		const modelDraftVal = modelDraft.get();
		const yearDraftVal = yearDraft.get();

		if (regDraft && !data?.registration_number) registrationNumber = regDraft;
		if (vinDraftVal && !data?.vin_number) vinNumber = vinDraftVal;
		if (engDraft && !data?.engine_number) engineNumber = engDraft;
		if (makeDraftVal && !data?.vehicle_make) vehicleMake = makeDraftVal;
		if (modelDraftVal && !data?.vehicle_model) vehicleModel = modelDraftVal;
		if (yearDraftVal && !data?.vehicle_year) vehicleYear = yearDraftVal;
	});

	function handleSave() {
		onUpdate({
			vehicle_make: vehicleMake || undefined,
			vehicle_model: vehicleModel || undefined,
			vehicle_year: vehicleYear || undefined,
			registration_number: registrationNumber || undefined,
			vin_number: vinNumber || undefined,
			engine_number: engineNumber || undefined,
			license_disc_expiry: licenseDiscExpiry || undefined,
			driver_license_number: driverLicenseNumber || undefined,
			registration_photo_url: registrationPhotoUrl || undefined,
			vin_photo_url: vinPhotoUrl || undefined,
			engine_number_photo_url: engineNumberPhotoUrl || undefined,
			license_disc_photo_url: licenseDiscPhotoUrl || undefined,
			driver_license_photo_url: driverLicensePhotoUrl || undefined
		});

		// Clear drafts after successful save
		registrationDraft.clear();
		vinDraft.clear();
		engineDraft.clear();
		makeDraft.clear();
		modelDraft.clear();
		yearDraft.clear();
	}

	// Save drafts on input (throttled)
	function saveDrafts() {
		registrationDraft.save(registrationNumber);
		vinDraft.save(vinNumber);
		engineDraft.save(engineNumber);
		makeDraft.save(vehicleMake);
		modelDraft.save(vehicleModel);
		yearDraft.save(vehicleYear);
	}

	// Create debounced save function (saves 2 seconds after user stops typing)
	const debouncedSave = debounce(() => {
		saveDrafts(); // Save to localStorage
		handleSave(); // Save to database
	}, 2000);

	// Validation for warning banner
	const validation = $derived.by(() => {
		return validateVehicleIdentification({
			registration_number: registrationNumber,
			vin_number: vinNumber,
			engine_number: engineNumber,
			registration_photo_url: registrationPhotoUrl,
			vin_photo_url: vinPhotoUrl
		});
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
	<!-- Vehicle Information (Editable) -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Vehicle Information <span class="text-red-500">*</span>
		</h3>
		<p class="mb-4 text-sm text-gray-600">
			Confirm or update the vehicle details. These may differ from the original request if corrections are needed.
		</p>
		<div class="grid gap-6 md:grid-cols-3">
			<FormField
				name="vehicle_make"
				label="Make"
				type="text"
				bind:value={vehicleMake}
				placeholder={vehicleInfo?.make || 'e.g., Toyota, BMW'}
				required
				oninput={debouncedSave}
			/>
			<FormField
				name="vehicle_model"
				label="Model"
				type="text"
				bind:value={vehicleModel}
				placeholder={vehicleInfo?.model || 'e.g., Corolla, 320i'}
				required
				oninput={debouncedSave}
			/>
			<FormField
				name="vehicle_year"
				label="Year"
				type="number"
				bind:value={vehicleYear}
				placeholder={vehicleInfo?.year?.toString() || '2023'}
				required
				oninput={debouncedSave}
			/>
		</div>
	</Card>

	<!-- Registration Number -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Registration Number <span class="text-red-500">*</span>
		</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<div>
				<FormField
					name="registration_number"
					label="Registration Number"
					type="text"
					bind:value={registrationNumber}
					placeholder="e.g., ABC123GP"
					required
					oninput={debouncedSave}
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
				onView={() => { viewingPhotoField = 'registration'; }}
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
					name="vin_number"
					label="VIN Number"
					type="text"
					bind:value={vinNumber}
					placeholder="17-character VIN"
					required
					oninput={debouncedSave}
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
				onView={() => { viewingPhotoField = 'vin'; }}
			/>
		</div>
	</Card>

	<!-- Engine Number -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Engine Number
		</h3>
		<p class="mb-4 text-sm text-gray-600">
			Optional - only if visible on the vehicle
		</p>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				name="engine_number"
				label="Engine Number"
				type="text"
				bind:value={engineNumber}
				placeholder="Engine number (optional if not visible)"
				oninput={debouncedSave}
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
				onView={() => { viewingPhotoField = 'engine'; }}
			/>
		</div>
	</Card>

	<!-- License Disc -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">License Disc</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				name="license_disc_expiry"
				label="License Disc Expiry Date"
				type="date"
				bind:value={licenseDiscExpiry}
				placeholder="YYYY-MM-DD"
				oninput={debouncedSave}
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
				onView={() => { viewingPhotoField = 'license_disc'; }}
			/>
		</div>
	</Card>

	<!-- Driver License -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Driver License (Optional)</h3>
		<div class="grid gap-6 md:grid-cols-2">
			<FormField
				name="driver_license_number"
				label="Driver License Number"
				type="text"
				bind:value={driverLicenseNumber}
				placeholder="License number"
				oninput={debouncedSave}
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
</div>

<!-- Photo Field Viewer -->
{#if viewingPhotoField && viewingPhotoUrl}
	<FormFieldPhotoViewer
		photoUrl={viewingPhotoUrl}
		field={fieldConfigs[viewingPhotoField]}
		value={viewingFieldValue}
		onSave={handlePhotoFieldSave}
		onClose={() => { viewingPhotoField = null; }}
	/>
{/if}
