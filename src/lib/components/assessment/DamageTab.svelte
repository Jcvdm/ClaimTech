<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import CompactCard from './compact/CompactCard.svelte';
	import CompactCardHeader from './compact/CompactCardHeader.svelte';
	import CompactField from './compact/CompactField.svelte';
	import CompactInput from './compact/CompactInput.svelte';
	import CompactSelect from './compact/CompactSelect.svelte';
	import CompactTextarea from './compact/CompactTextarea.svelte';
	import CompactSegmentedBordered from './compact/CompactSegmentedBordered.svelte';
	import { CheckCircle2 } from 'lucide-svelte';
	import { debounce } from '$lib/utils/useUnsavedChanges.svelte';
	import { useDraft } from '$lib/utils/useDraft.svelte';
	import { onMount } from 'svelte';
	import type { DamageRecord, DamageType, DamageArea, DamageSeverity } from '$lib/types/assessment';
	import DamageSummaryCard from './DamageSummaryCard.svelte';
	import TabFormSplit from './layout/TabFormSplit.svelte';
	import { validateDamage, type TabValidation } from '$lib/utils/validation';

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
	});

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

<div class="space-y-6">
	<!-- Warning Banner -->
	<RequiredFieldsWarning missingFields={validation.missingFields} />
	{#if !damageRecord}
		<Card class="p-6 border-2 border-dashed border-gray-300">
			<p class="text-center text-gray-600">Loading damage record...</p>
		</Card>
	{:else}
		<TabFormSplit photosWidth="340px" stickyTop="top-24">
			{#snippet form()}
				<div class="space-y-6">
					<!-- Damage Match Check -->
					<CompactCard>
						<CompactCardHeader title="Damage Description Match" required />
						<p class="-mt-1 mb-3 text-[12px] text-slate-600">
							Does the actual damage match the description provided in the initial request?
						</p>
						<CompactSegmentedBordered
							value={matchesDescription === true ? 'yes' : matchesDescription === false ? 'no' : ''}
							options={[
								{ value: 'yes', label: 'Yes, Matches', tone: 'green' },
								{ value: 'no',  label: 'No, Does Not Match', tone: 'red' }
							]}
							onChange={(v) => {
								const matches = v === 'yes';
								matchesDescription = matches;
								handleUpdateDamageWithDirty({ matches_description: matches });
							}}
						/>

						{#if matchesDescription === false}
							<div class="mt-3">
								<CompactField label="Explain Mismatch" required htmlFor="mismatch_notes">
									<CompactTextarea
										id="mismatch_notes"
										value={mismatchNotes}
										rows={3}
										placeholder="Describe how the actual damage differs from the reported description..."
										oninput={(e) => {
											const value = (e.target as HTMLTextAreaElement).value;
											mismatchNotes = value;
											debouncedSaveMismatch(value);
										}}
									/>
								</CompactField>
							</div>
						{/if}
					</CompactCard>

					<CompactCard>
						<CompactCardHeader title="Damage Details" />
						<div class="space-y-3">
							<div class="grid gap-3.5 md:grid-cols-2">
								<CompactField label="Damage Area" required htmlFor="damage_area">
									<CompactSelect
										id="damage_area"
										value={damageArea}
										onchange={(value) => {
											damageArea = value;
											handleUpdateDamageWithDirty({ damage_area: (value || undefined) as DamageArea });
										}}
										options={[
											{ value: 'structural', label: 'Structural' },
											{ value: 'non_structural', label: 'Non-Structural' }
										]}
									/>
								</CompactField>
								<CompactField label="Damage Type" required htmlFor="damage_type">
									<CompactSelect
										id="damage_type"
										value={damageType}
										onchange={(value) => {
											damageType = value;
											handleUpdateDamageWithDirty({ damage_type: (value || undefined) as DamageType });
										}}
										options={damageTypeOptions}
									/>
								</CompactField>
							</div>

							<CompactField label="Severity" required htmlFor="severity">
								<CompactSelect
									id="severity"
									value={severity}
									onchange={(value) => {
										severity = value;
										handleUpdateDamageWithDirty({ severity: (value || undefined) as DamageSeverity });
									}}
									options={[
										{ value: '', label: 'Select severity' },
										{ value: 'minor', label: 'Minor' },
										{ value: 'moderate', label: 'Moderate' },
										{ value: 'severe', label: 'Severe' },
										{ value: 'total_loss', label: 'Total Loss' }
									]}
								/>
							</CompactField>

							<CompactField label="Estimated Repair Duration (days)" htmlFor="estimated_repair_duration_days">
								<CompactInput
									id="estimated_repair_duration_days"
									type="number"
									mono
									step="0.5"
									value={estimatedRepairDurationDays?.toString() || ''}
									placeholder="e.g., 1, 3, 7"
									oninput={(e) => {
										const value = parseFloat((e.target as HTMLInputElement).value);
										estimatedRepairDurationDays = value;
										handleUpdateDamageWithDirty({ estimated_repair_duration_days: value });
									}}
								/>
							</CompactField>

							<CompactField label="Location Description" htmlFor="location_description">
								<CompactTextarea
									id="location_description"
									value={locationDescription}
									rows={2}
									placeholder="Describe the location of the damage on the vehicle..."
									oninput={(e) => {
										const value = (e.target as HTMLTextAreaElement).value;
										locationDescription = value;
										handleUpdateDamageWithDirty({ location_description: value });
									}}
								/>
							</CompactField>

							<CompactField label="Damage Description" htmlFor="damage_description">
								<CompactTextarea
									id="damage_description"
									value={damageDescription}
									rows={3}
									placeholder="Detailed description of the damage..."
									oninput={(e) => {
										const value = (e.target as HTMLTextAreaElement).value;
										damageDescription = value;
										debouncedSaveDamageDescription(value);
									}}
								/>
							</CompactField>
						</div>
					</CompactCard>
				</div>
			{/snippet}

			{#snippet photos()}
				<DamageSummaryCard
					{matchesDescription}
					severity={severity as DamageSeverity | ''}
					damageArea={damageArea as DamageArea | ''}
					damageType={damageType as DamageType | ''}
					{estimatedRepairDurationDays}
					{mismatchNotes}
				/>
			{/snippet}
		</TabFormSplit>
	{/if}
</div>

