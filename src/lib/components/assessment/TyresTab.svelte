<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import TyrePhotosPanel from './TyrePhotosPanel.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { Plus, Trash2, Send, Calculator } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { Tyre, TyrePhoto } from '$lib/types/assessment';
	import { validateTyres, type TabValidation } from '$lib/utils/validation';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';
	import CompactCard from './compact/CompactCard.svelte';
	import CompactCardHeader from './compact/CompactCardHeader.svelte';
	import CompactField from './compact/CompactField.svelte';
	import CompactInput from './compact/CompactInput.svelte';
	import CompactSelect from './compact/CompactSelect.svelte';
	import CompactTextarea from './compact/CompactTextarea.svelte';

	interface Props {
		tyres: Tyre[];
		tyrePhotos: TyrePhoto[];
		assessmentId: string;
		onUpdateTyre: (id: string, data: Partial<Tyre>) => void;
		onAddTyre: () => void;
		onDeleteTyre: (id: string) => void;
		onNotesUpdate?: () => Promise<void>;
		onRegisterSave?: (saveFn: () => Promise<void>) => void; // Expose save function to parent for auto-save on tab change
		onPhotosUpdate?: () => Promise<void>; // Refresh photos from database after upload/delete/label update
		onValidationUpdate?: (validation: TabValidation) => void;
	}

	let { tyres: tyresProp, tyrePhotos: tyrePhotosProp, assessmentId, onUpdateTyre, onAddTyre, onDeleteTyre, onNotesUpdate, onRegisterSave, onPhotosUpdate, onValidationUpdate }: Props = $props();

	// Make tyres reactive to prop changes
	const tyres = $derived(tyresProp);

	// Local state for tyre photos (Map of tyre ID to photos array)
	let tyrePhotosMap = $state<Map<string, TyrePhoto[]>>(new Map());

	// Initialize photos from props
	$effect(() => {
		const newMap = new Map<string, TyrePhoto[]>();
		tyres.forEach(tyre => {
			const photos = tyrePhotosProp.filter(p => p.tyre_id === tyre.id);
			newMap.set(tyre.id, photos);
		});
		tyrePhotosMap = newMap;
	});

	// Handle photo updates for a specific tyre
	async function handleTyrePhotosUpdate(tyreId: string, updatedPhotos: TyrePhoto[]) {
		// Update local state immediately (optimistic update)
		tyrePhotosMap.set(tyreId, updatedPhotos);
		tyrePhotosMap = new Map(tyrePhotosMap);

		// Notify parent to refresh photos from database
		// This ensures data.tyrePhotos is updated for future tab switches
		if (onPhotosUpdate) {
			await onPhotosUpdate();
		}
	}

	// Validation for warning banner - pass tyrePhotosMap for photo requirement check
	const validation = $derived.by(() => {
		return validateTyres(tyres, tyrePhotosMap);
	});

	// Report validation to parent for immediate badge updates
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

	// Track dirty state for auto-save on tab change
	let dirty = $state(false);
	let saving = $state(false);

	// Update handler that marks dirty and saves
	function handleUpdateTyreWithDirty(id: string, data: Partial<Tyre>) {
		dirty = true;
		onUpdateTyre(id, data);
	}

	// Save all pending changes (for auto-save on tab change)
	async function saveAll() {
		if (!dirty) return;
		saving = true;
		try {
			// All changes have already been saved via onUpdateTyre calls
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

	// Betterment calculator modal state
	let showBettermentModal = $state(false);
	let selectedTyreForBetterment = $state<Tyre | null>(null);
	let newTreadDepth = $state<number>(8); // Default for passenger cars
	let submittingNote = $state(false);
	let calculatorError = $state<string>('');

	// Calculate betterment based on current and new tread depth
	const calculatedBetterment = $derived.by(() => {
		if (!selectedTyreForBetterment || !selectedTyreForBetterment.tread_depth_mm || newTreadDepth <= 0) {
			return null;
		}
		const current = selectedTyreForBetterment.tread_depth_mm;
		const newDepth = newTreadDepth;

		// Validate that new tread is greater than current
		if (newDepth <= current) {
			return null;
		}

		const remainingLife = (current / newDepth) * 100;
		const betterment = 100 - remainingLife;
		return { remainingLife, betterment };
	});

	// Submit tyre note to assessment notes
	async function handleSubmitTyreNote(tyre: Tyre) {
		if (!tyre.notes || tyre.notes.trim() === '') {
			console.warn('No note to submit');
			return;
		}

		submittingNote = true;
		try {
			await assessmentNotesService.createNote({
				assessment_id: assessmentId,
				note_text: tyre.notes,
				note_type: 'manual',
				note_title: `Tyre Note: ${tyre.position_label || tyre.position}`,
				source_tab: 'tyres'
			});
			console.log('Tyre note submitted to assessment notes');

			// Reload notes to update UI immediately
			if (onNotesUpdate) {
				await onNotesUpdate();
			}

			// TODO: Show success toast
		} catch (error) {
			console.error('Error submitting tyre note:', error);
			// TODO: Show error toast
		} finally {
			submittingNote = false;
		}
	}

	// Open betterment calculator modal
	function handleOpenBettermentCalculator(tyre: Tyre) {
		selectedTyreForBetterment = tyre;
		newTreadDepth = 8; // Reset to default
		calculatorError = '';
		showBettermentModal = true;
	}

	// Save betterment calculation to assessment notes
	async function handleSaveBettermentNote() {
		if (!selectedTyreForBetterment || !calculatedBetterment) {
			calculatorError = 'Invalid calculation';
			return;
		}

		// Validate new tread depth
		if (newTreadDepth <= (selectedTyreForBetterment.tread_depth_mm || 0)) {
			calculatorError = 'New tyre tread depth must be greater than current tread depth';
			return;
		}

		submittingNote = true;
		calculatorError = '';

		try {
			const noteText = `Tyre Betterment Calculation - ${selectedTyreForBetterment.position_label || selectedTyreForBetterment.position}
Current Tread: ${selectedTyreForBetterment.tread_depth_mm}mm
New Tyre Tread: ${newTreadDepth}mm
Remaining Life: ${calculatedBetterment.remainingLife.toFixed(1)}%
Betterment to Charge: ${calculatedBetterment.betterment.toFixed(1)}%`;

			await assessmentNotesService.createNote({
				assessment_id: assessmentId,
				note_text: noteText,
				note_type: 'betterment',
				note_title: `Tyre Betterment: ${selectedTyreForBetterment.position_label || selectedTyreForBetterment.position}`,
				source_tab: 'tyres'
			});

			// Reload notes to update UI immediately
			if (onNotesUpdate) {
				await onNotesUpdate();
			}

			showBettermentModal = false;
			console.log('Betterment calculation saved to assessment notes');
			// TODO: Show success toast
		} catch (error) {
			console.error('Error saving betterment note:', error);
			calculatorError = 'Failed to save betterment calculation';
			// TODO: Show error toast
		} finally {
			submittingNote = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Warning Banner -->
	<RequiredFieldsWarning missingFields={validation.missingFields} />
	<CompactCard class="bg-blue-50">
		<CompactCardHeader title="Tyre Inspection" />
		<p class="text-[12px] text-slate-600">
			Inspect all tyres including the spare. For larger vehicles (trucks, 6-wheelers), use "Add
			Tyre" to add additional positions.
		</p>
	</CompactCard>

	<!-- Tyres List -->
	<div class="grid gap-3.5 md:grid-cols-2">
		{#each tyres as tyre, index (tyre.id)}
			<CompactCard>
				<CompactCardHeader title={tyre.position_label || tyre.position}>
					{#snippet right()}
						{#if index >= 5}
							<Button size="sm" variant="outline" onclick={() => onDeleteTyre(tyre.id)}>
								<Trash2 class="h-4 w-4 text-red-600" />
							</Button>
						{/if}
					{/snippet}
				</CompactCardHeader>

				<!-- Make + Size in 2-col -->
				<div class="grid gap-2.5 grid-cols-2 mb-2.5">
					<CompactField label="Make" htmlFor={`tyre_make_${tyre.id}`}>
						<CompactInput
							id={`tyre_make_${tyre.id}`}
							value={tyre.tyre_make || ''}
							placeholder="Michelin"
							oninput={(e) => {
								const v = (e.target as HTMLInputElement).value;
								handleUpdateTyreWithDirty(tyre.id, { tyre_make: v || undefined });
							}}
						/>
					</CompactField>
					<CompactField label="Size" htmlFor={`tyre_size_${tyre.id}`}>
						<CompactInput
							id={`tyre_size_${tyre.id}`}
							value={tyre.tyre_size || ''}
							placeholder="205/55R16"
							oninput={(e) => {
								const v = (e.target as HTMLInputElement).value;
								handleUpdateTyreWithDirty(tyre.id, { tyre_size: v || undefined });
							}}
						/>
					</CompactField>
				</div>

				<!-- Load + Speed + Tread (3-col, calc button alongside tread) -->
				<div class="grid gap-2.5 grid-cols-[1fr_1fr_1.4fr] mb-2.5">
					<CompactField label="Load" htmlFor={`load_index_${tyre.id}`}>
						<CompactInput
							id={`load_index_${tyre.id}`}
							value={tyre.load_index || ''}
							placeholder="91"
							oninput={(e) => {
								const v = (e.target as HTMLInputElement).value;
								handleUpdateTyreWithDirty(tyre.id, { load_index: v || undefined });
							}}
						/>
					</CompactField>
					<CompactField label="Speed" htmlFor={`speed_rating_${tyre.id}`}>
						<CompactInput
							id={`speed_rating_${tyre.id}`}
							value={tyre.speed_rating || ''}
							placeholder="V"
							oninput={(e) => {
								const v = (e.target as HTMLInputElement).value;
								handleUpdateTyreWithDirty(tyre.id, { speed_rating: v || undefined });
							}}
						/>
					</CompactField>
					<CompactField label="Tread (mm)" htmlFor={`tread_depth_${tyre.id}`}>
						<div class="flex gap-1.5">
							<CompactInput
								id={`tread_depth_${tyre.id}`}
								type="number"
								mono
								step="0.1"
								placeholder="5.5"
								value={tyre.tread_depth_mm?.toString() || ''}
								oninput={(e) => {
									const v = parseFloat((e.target as HTMLInputElement).value);
									handleUpdateTyreWithDirty(tyre.id, { tread_depth_mm: isNaN(v) ? 0 : v });
								}}
							/>
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleOpenBettermentCalculator(tyre)}
								disabled={!tyre.tread_depth_mm || tyre.tread_depth_mm <= 0}
								title="Calculate Betterment"
								class="shrink-0"
							>
								<Calculator class="h-4 w-4" />
							</Button>
						</div>
					</CompactField>
				</div>

				<!-- Condition -->
				<CompactField label="Condition" htmlFor={`condition_${tyre.id}`} class="mb-2.5">
					<CompactSelect
						id={`condition_${tyre.id}`}
						value={tyre.condition || ''}
						options={[
							{ value: '', label: 'Select condition' },
							{ value: 'excellent', label: 'Excellent' },
							{ value: 'good', label: 'Good' },
							{ value: 'fair', label: 'Fair' },
							{ value: 'poor', label: 'Poor' },
							{ value: 'replace', label: 'Needs Replacement' }
						]}
						onchange={(value) => handleUpdateTyreWithDirty(tyre.id, { condition: (value || undefined) as any })}
					/>
				</CompactField>

				<!-- Photos (compact) -->
				<div class="mb-2.5">
					<div class="mb-1 text-[10px] font-bold uppercase tracking-[0.04em] text-slate-600">Photos</div>
					<TyrePhotosPanel
						compact
						tyreId={tyre.id}
						{assessmentId}
						tyrePosition={tyre.position}
						photos={tyrePhotosMap.get(tyre.id) || []}
						onPhotosUpdate={(updatedPhotos) => handleTyrePhotosUpdate(tyre.id, updatedPhotos)}
					/>
				</div>

				<!-- Notes + Send -->
				<CompactField label="Notes" htmlFor={`notes_${tyre.id}`} class="mb-1.5">
					<CompactTextarea
						id={`notes_${tyre.id}`}
						value={tyre.notes || ''}
						rows={2}
						placeholder="Damage, wear patterns, observations..."
						oninput={(e) => {
							const v = (e.target as HTMLTextAreaElement).value;
							handleUpdateTyreWithDirty(tyre.id, { notes: v || undefined });
						}}
					/>
				</CompactField>
				<div class="flex justify-end">
					<Button
						size="sm"
						variant="outline"
						onclick={() => handleSubmitTyreNote(tyre)}
						disabled={!tyre.notes || tyre.notes.trim() === '' || submittingNote}
					>
						<Send class="mr-1.5 h-3.5 w-3.5" />
						{submittingNote ? 'Submitting...' : 'Submit to Notes'}
					</Button>
				</div>
			</CompactCard>
		{/each}
	</div>

	<!-- Add Tyre Button -->
	<div class="flex justify-center">
		<Button variant="outline" onclick={onAddTyre}>
			<Plus class="mr-2 h-4 w-4" />
			Add Additional Tyre
		</Button>
	</div>

	<!-- Betterment Calculator Modal -->
	<Dialog.Root bind:open={showBettermentModal}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>
					Tyre Betterment Calculator - {selectedTyreForBetterment?.position_label || selectedTyreForBetterment?.position}
				</Dialog.Title>
				<Dialog.Description>
					Calculate the betterment percentage based on remaining tyre life
				</Dialog.Description>
			</Dialog.Header>

			{#if selectedTyreForBetterment}
				<div class="space-y-4">
					<!-- Current Tread (Read-only) -->
					<div>
						<p class="block text-sm font-medium text-gray-700 mb-1">
							Current Tread Depth
						</p>
						<div class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
							{selectedTyreForBetterment.tread_depth_mm}mm
						</div>
					</div>

					<!-- New Tyre Tread Input -->
					<div>
						<FormField
							label="New Tyre Tread Depth (mm)"
							name="new_tread_depth"
							type="number"
							value={newTreadDepth.toString()}
							onchange={(value) => {
								newTreadDepth = parseFloat(value) || 8;
								calculatorError = '';
							}}
							placeholder="e.g., 8 for cars, 20 for trucks"
							step="0.1"
						/>
						<p class="mt-1 text-xs text-gray-500">
							Enter the tread depth of a brand new tyre of this type
						</p>
					</div>

					<!-- Error Message -->
					{#if calculatorError}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{calculatorError}
						</div>
					{/if}

					<!-- Calculation Results -->
					{#if calculatedBetterment && newTreadDepth > 0}
						<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
							<div class="flex justify-between items-center">
								<span class="text-sm font-medium text-gray-700">Remaining Life:</span>
								<span class="text-lg font-bold text-blue-600">
									{calculatedBetterment.remainingLife.toFixed(1)}%
								</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-sm font-medium text-gray-700">Betterment to Charge:</span>
								<span class="text-lg font-bold text-green-600">
									{calculatedBetterment.betterment.toFixed(1)}%
								</span>
							</div>
						</div>

						<!-- Explanation -->
						<p class="text-xs text-gray-500">
							If this tyre is replaced, charge {calculatedBetterment.betterment.toFixed(1)}%
							betterment as the old tyre had {calculatedBetterment.remainingLife.toFixed(1)}%
							of its life remaining.
						</p>
					{:else if newTreadDepth > 0 && newTreadDepth <= (selectedTyreForBetterment.tread_depth_mm || 0)}
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
							New tyre tread depth must be greater than current tread depth ({selectedTyreForBetterment.tread_depth_mm}mm)
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex justify-end gap-2 pt-4">
						<Button
							variant="outline"
							onclick={() => {
								showBettermentModal = false;
								calculatorError = '';
							}}
							disabled={submittingNote}
						>
							Close
						</Button>
						<Button
							onclick={handleSaveBettermentNote}
							disabled={!calculatedBetterment || newTreadDepth <= 0 || submittingNote}
						>
							{submittingNote ? 'Saving...' : 'Save to Notes'}
						</Button>
					</div>
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</div>

