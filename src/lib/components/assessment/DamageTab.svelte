<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import FormField from '$lib/components/forms/FormField.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import { onMount } from 'svelte';
	import type { DamageRecord, DamageType, DamageArea, DamageSeverity, DamagePhoto } from '$lib/types/assessment';
	import DamageSummaryCard from './DamageSummaryCard.svelte';
	import DamagePhotoGrid from './mobile/DamagePhotoGrid.svelte';
	import SegmentedControl from '$lib/components/ui/segmented-control/SegmentedControl.svelte';
	import { validateDamage, type TabValidation } from '$lib/utils/validation';
	import { damagePhotosService } from '$lib/services/damage-photos.service';
	import { storageService } from '$lib/services/storage.service';

	interface Props {
		damageRecord: DamageRecord | null;
		assessmentId: string;
		onUpdateDamage: (data: Partial<DamageRecord>) => void;
		onRegisterSave?: (saveFn: () => Promise<void>) => void; // Expose save function to parent for auto-save on tab change
		onValidationUpdate?: (validation: TabValidation) => void; // Report validation to parent for immediate badge updates
	}

	// Make props reactive using $derived pattern
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	const damageRecord = $derived(props.damageRecord);
	const assessmentId = $derived(props.assessmentId);
	const onUpdateDamage = $derived(props.onUpdateDamage);
	const onRegisterSave = $derived(props.onRegisterSave);
	const onValidationUpdate = $derived(props.onValidationUpdate);

	// Initialize localStorage draft for critical fields
	// Use $derived.by to ensure drafts are recreated when assessmentId changes
	const mismatchNotesDraft = $derived.by(() => useDraft(`assessment-${assessmentId}-mismatch-notes`));
	const damageDescriptionDraft = $derived.by(() => useDraft(`assessment-${assessmentId}-damage-description`));

	// Local state variables for all fields
	let matchesDescription = $state<boolean | null>(damageRecord?.matches_description ?? null);
	let mismatchNotes = $state(damageRecord?.mismatch_notes || '');
	let damageArea = $state(damageRecord?.damage_area || '');
	let damageType = $state(damageRecord?.damage_type || '');
	let severity = $state(damageRecord?.severity || '');
	let damageDescription = $state(damageRecord?.damage_description || '');
	let estimatedRepairDurationDays = $state(damageRecord?.estimated_repair_duration_days || null);
	let locationDescription = $state(damageRecord?.location_description || '');
	let affectedPanels = $state<string[]>(damageRecord?.affected_panels || []);

	// Photos state — loaded client-side on mount
	let photosLoaded = $state(false);
	let damagePhotos = $state<DamagePhoto[]>([]);

	// Sync local state with damageRecord prop when it changes (after save)
	$effect(() => {
		if (damageRecord) {
			// Only update if there's no draft (draft takes precedence)
			if (!mismatchNotesDraft.hasDraft() && damageRecord.mismatch_notes) {
				mismatchNotes = damageRecord.mismatch_notes;
			}
			if (!damageDescriptionDraft.hasDraft() && damageRecord.damage_description) {
				damageDescription = damageRecord.damage_description;
			}

			// Always update non-draft fields from data
			if (damageRecord.matches_description !== null && damageRecord.matches_description !== undefined) {
				matchesDescription = damageRecord.matches_description;
			}
			if (damageRecord.damage_area) damageArea = damageRecord.damage_area;
			if (damageRecord.damage_type) damageType = damageRecord.damage_type;
			if (damageRecord.severity) severity = damageRecord.severity;
			if (damageRecord.estimated_repair_duration_days !== null && damageRecord.estimated_repair_duration_days !== undefined) {
				estimatedRepairDurationDays = damageRecord.estimated_repair_duration_days;
			}
			if (damageRecord.location_description) locationDescription = damageRecord.location_description;
			if (damageRecord.affected_panels) affectedPanels = damageRecord.affected_panels;
		}
	});

	// Load draft values on mount if available
	onMount(() => {
		const mismatchNotesDraftVal = mismatchNotesDraft.get();
		const damageDescriptionDraftVal = damageDescriptionDraft.get();

		if (mismatchNotesDraftVal && !damageRecord?.mismatch_notes) {
			mismatchNotes = mismatchNotesDraftVal;
		}
		if (damageDescriptionDraftVal && !damageRecord?.damage_description) {
			damageDescription = damageDescriptionDraftVal;
		}

		// Load photos
		loadPhotos();
	});

	async function loadPhotos() {
		try {
			const loaded = await damagePhotosService.getPhotos(assessmentId);
			damagePhotos = loaded;
		} catch (err) {
			console.error('[DamageTab] failed to load damage photos:', err);
		} finally {
			photosLoaded = true;
		}
	}

	async function handlePhotoUpload(file: File) {
		const result = await storageService.uploadAssessmentPhoto(file, assessmentId, 'damage');
		const displayOrder = await damagePhotosService.getNextDisplayOrder(assessmentId);
		const newPhoto = await damagePhotosService.createPhoto({
			assessment_id: assessmentId,
			photo_url: result.url,
			photo_path: result.path,
			display_order: displayOrder
		});
		// Optimistic add for instant UI feedback
		damagePhotos = [...damagePhotos, newPhoto];
	}

	async function handlePhotoDelete(photoId: string) {
		const photo = damagePhotos.find((p) => p.id === photoId);
		// Optimistic remove for instant UI feedback
		damagePhotos = damagePhotos.filter((p) => p.id !== photoId);
		if (photo) {
			await storageService.deletePhoto(photo.photo_path);
		}
		await damagePhotosService.deletePhoto(photoId);
	}

	// Save drafts on input (throttled)
	function saveMismatchDrafts(notes: string) {
		mismatchNotesDraft.save(notes);
	}

	function saveDamageDescriptionDrafts(description: string) {
		damageDescriptionDraft.save(description);
	}

	// Create debounced save functions (saves 2 seconds after user stops typing)
	const debouncedSaveMismatch = debounce((notes: string) => {
		saveMismatchDrafts(notes); // Save to localStorage
		handleUpdateDamageWithDirty({ mismatch_notes: notes }); // Save to database
		mismatchNotesDraft.clear(); // Clear after successful save
	}, 2000);

	const debouncedSaveDamageDescription = debounce((description: string) => {
		saveDamageDescriptionDrafts(description); // Save to localStorage
		handleUpdateDamageWithDirty({ damage_description: description }); // Save to database
		damageDescriptionDraft.clear(); // Clear after successful save
	}, 2000);

	const damageTypeOptions: { value: DamageType; label: string }[] = [
		{ value: 'collision', label: 'Collision' },
		{ value: 'fire', label: 'Fire' },
		{ value: 'hail', label: 'Hail' },
		{ value: 'theft', label: 'Theft' },
		{ value: 'vandalism', label: 'Vandalism' },
		{ value: 'weather', label: 'Weather' },
		{ value: 'mechanical', label: 'Mechanical' },
		{ value: 'other', label: 'Other' }
	];

	// Validation for warning banner
	// Derive from local state instead of damageRecord prop for immediate reactivity
	// This ensures the badge closes immediately when fields are filled, not after prop updates
	const validation = $derived.by(() => {
		// Create temporary record from local state for validation
		// This reacts immediately to user input without waiting for database save
		const tempRecord = {
			matches_description: matchesDescription,
			severity: severity,
			// Include other fields for completeness (not validated but good practice)
			damage_area: damageArea,
			damage_type: damageType,
			mismatch_notes: mismatchNotes,
			damage_description: damageDescription,
			estimated_repair_duration_days: estimatedRepairDurationDays,
			location_description: locationDescription,
			affected_panels: affectedPanels
		};
		return validateDamage([tempRecord]);
	});

	// Track dirty state for auto-save on tab change
	let dirty = $state(false);
	let saving = $state(false);

	// Update handler that marks dirty and saves
	function handleUpdateDamageWithDirty(updateData: Partial<DamageRecord>) {
		dirty = true;
		onUpdateDamage(updateData);
	}

	// Save all pending changes (for auto-save on tab change)
	async function saveAll() {
		if (!dirty) return;
		saving = true;
		try {
			// All changes have already been saved via onUpdateDamage calls
			// This just marks the dirty flag as clean
			dirty = false;
		} finally {
			saving = false;
		}
	}

	// Register save function with parent on mount
	$effect(() => {
		if (onRegisterSave) {
			onRegisterSave(saveAll);
		}
	});

	// Report validation to parent whenever it changes (for immediate badge updates)
	let lastValidationKey = '';

	$effect(() => {
		// Create stable key for semantic comparison
		const key = `${validation.isComplete}|${validation.missingFields.join(',')}`;

		// Only report if validation actually changed
		if (onValidationUpdate && key !== lastValidationKey) {
			lastValidationKey = key;
			onValidationUpdate(validation);
		}
	});
</script>

<div class="space-y-4">
	<!-- Warning Banner -->
	<RequiredFieldsWarning missingFields={validation.missingFields} />

	{#if !damageRecord}
		<Card class="p-6 border-2 border-dashed border-gray-300">
			<p class="text-center text-gray-600">Loading damage record...</p>
		</Card>
	{:else}
		<!-- Mobile: summary first; desktop: summary in right column (rendered twice, toggled via class) -->
		<div class="lg:hidden">
			<DamageSummaryCard
				{matchesDescription}
				severity={severity as DamageSeverity | ''}
				damageArea={damageArea as DamageArea | ''}
				damageType={damageType as DamageType | ''}
				{estimatedRepairDurationDays}
				{mismatchNotes}
			/>
		</div>

		<div class="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
			<!-- Left: editable form cards -->
			<div class="space-y-4">

				<!-- Card 1: Match Check -->
				<Card class="p-3 sm:p-4">
					<h3 class="mb-3 text-base font-semibold text-foreground">
						Match Check <span class="text-destructive">*</span>
					</h3>
					<p class="mb-3 text-sm text-muted-foreground">
						Does the actual damage match the description in the initial request?
					</p>
					<SegmentedControl
						value={matchesDescription === true ? 'yes' : matchesDescription === false ? 'no' : ''}
						options={[
							{ value: 'yes', label: 'Yes, matches' },
							{ value: 'no', label: "Doesn't match" }
						]}
						onValueChange={(v) => {
							matchesDescription = v === 'yes';
							handleUpdateDamageWithDirty({ matches_description: matchesDescription });
						}}
						fullWidth
					/>

					{#if matchesDescription === false}
						<div class="mt-3">
							<FormField
								name="mismatch_notes"
								label="Explain Mismatch"
								type="textarea"
								value={mismatchNotes}
								oninput={(e: Event) => {
									const value = (e.target as HTMLTextAreaElement).value;
									mismatchNotes = value;
									debouncedSaveMismatch(value);
								}}
								placeholder="Describe how the actual damage differs from the reported description..."
								rows={3}
								required
							/>
						</div>
					{/if}
				</Card>

				<!-- Card 2: Damage Details -->
				<Card class="p-3 sm:p-4">
					<h3 class="mb-3 text-base font-semibold text-foreground">Damage Details</h3>
					<div class="space-y-3">
						<!-- Area + Type side-by-side on sm+ -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<FormField
								name="damage_area"
								label="Damage Area"
								type="select"
								value={damageArea}
								onchange={(value: string) => {
									damageArea = value;
									handleUpdateDamageWithDirty({
										damage_area: (value || undefined) as DamageArea
									});
								}}
								options={[
									{ value: 'structural', label: 'Structural' },
									{ value: 'non_structural', label: 'Non-Structural' }
								]}
								required
							/>
							<FormField
								name="damage_type"
								label="Damage Type"
								type="select"
								value={damageType}
								onchange={(value: string) => {
									damageType = value;
									handleUpdateDamageWithDirty({
										damage_type: (value || undefined) as DamageType
									});
								}}
								options={damageTypeOptions}
								required
							/>
						</div>

						<!-- Severity segmented control -->
						<div>
							<p class="mb-1.5 text-sm font-medium text-foreground">
								Severity <span class="text-destructive">*</span>
							</p>
							<SegmentedControl
								value={severity}
								options={[
									{ value: 'minor', label: 'Light' },
									{ value: 'moderate', label: 'Moderate' },
									{ value: 'severe', label: 'Heavy' },
									{ value: 'total_loss', label: 'Total Loss' }
								]}
								onValueChange={(v) => {
									severity = v;
									handleUpdateDamageWithDirty({ severity: v as DamageSeverity });
								}}
								fullWidth
							/>
						</div>

						<FormField
							name="estimated_repair_duration_days"
							label="Estimated Repair Duration (days)"
							type="number"
							value={estimatedRepairDurationDays?.toString() || ''}
							oninput={(e: Event) => {
								const value = parseFloat((e.target as HTMLInputElement).value);
								estimatedRepairDurationDays = value;
								handleUpdateDamageWithDirty({
									estimated_repair_duration_days: value
								});
							}}
							placeholder="e.g., 1, 3, 7"
							step="0.5"
						/>
					</div>
				</Card>

				<!-- Card 3: Description & Notes -->
				<Card class="p-3 sm:p-4">
					<h3 class="mb-3 text-base font-semibold text-foreground">Description & Notes</h3>
					<div class="space-y-3">
						<FormField
							name="location_description"
							label="Location Description"
							type="textarea"
							value={locationDescription}
							oninput={(e: Event) => {
								const value = (e.target as HTMLTextAreaElement).value;
								locationDescription = value;
								handleUpdateDamageWithDirty({
									location_description: value
								});
							}}
							placeholder="Describe the location of the damage on the vehicle..."
							rows={2}
						/>

						<FormField
							name="damage_description"
							label="Damage Description"
							type="textarea"
							value={damageDescription}
							oninput={(e: Event) => {
								const value = (e.target as HTMLTextAreaElement).value;
								damageDescription = value;
								debouncedSaveDamageDescription(value);
							}}
							placeholder="Detailed description of the damage..."
							rows={3}
						/>
					</div>
				</Card>

				<!-- Card 4: Photos -->
				<Card class="p-3 sm:p-4">
					<h3 class="mb-3 text-base font-semibold text-foreground">
						{damagePhotos.length === 0 ? 'Damage Photos' : `Damage Photos (${damagePhotos.length})`}
					</h3>
					{#if photosLoaded}
						<DamagePhotoGrid
							{assessmentId}
							photos={damagePhotos}
							onUpload={handlePhotoUpload}
							onDelete={handlePhotoDelete}
							minTiles={2}
						/>
					{:else}
						<p class="text-sm text-muted-foreground">Loading photos...</p>
					{/if}
				</Card>

			</div>

			<!-- Right: sticky summary (desktop only) -->
			<div class="hidden lg:block lg:sticky lg:top-24 lg:self-start">
				<DamageSummaryCard
					{matchesDescription}
					severity={severity as DamageSeverity | ''}
					damageArea={damageArea as DamageArea | ''}
					damageType={damageType as DamageType | ''}
					{estimatedRepairDurationDays}
					{mismatchNotes}
				/>
			</div>
		</div>
	{/if}
</div>
