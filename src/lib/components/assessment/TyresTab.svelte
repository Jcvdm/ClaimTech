<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { Plus, Trash2, Send, Calculator } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { Tyre } from '$lib/types/assessment';
	import { validateTyres } from '$lib/utils/validation';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';

	interface Props {
		tyres: Tyre[];
		assessmentId: string;
		onUpdateTyre: (id: string, data: Partial<Tyre>) => void;
		onAddTyre: () => void;
		onDeleteTyre: (id: string) => void;
	}

	let { tyres: tyresProp, assessmentId, onUpdateTyre, onAddTyre, onDeleteTyre }: Props = $props();

	// Make tyres reactive to prop changes
	const tyres = $derived(tyresProp);

	// Local state for tyre photos (for immediate UI updates)
	// Map of tyre ID to photo URLs
	let tyrePhotos = $state<Map<string, { face?: string; tread?: string; measurement?: string }>>(new Map());

	// Initialize photo state from tyres prop
	$effect(() => {
		const newPhotos = new Map<string, { face?: string; tread?: string; measurement?: string }>();
		tyres.forEach(tyre => {
			newPhotos.set(tyre.id, {
				face: tyre.face_photo_url || undefined,
				tread: tyre.tread_photo_url || undefined,
				measurement: tyre.measurement_photo_url || undefined
			});
		});
		tyrePhotos = newPhotos;
	});

	// Get photo URL for a tyre
	function getPhotoUrl(tyreId: string, type: 'face' | 'tread' | 'measurement'): string {
		return tyrePhotos.get(tyreId)?.[type] || '';
	}

	// Update photo URL locally and persist to database
	function updatePhotoUrl(tyreId: string, type: 'face' | 'tread' | 'measurement', url: string | null) {
		// Update local state immediately for instant UI feedback
		const current = tyrePhotos.get(tyreId) || {};
		tyrePhotos.set(tyreId, {
			...current,
			[type]: url || undefined
		});
		// Force reactivity
		tyrePhotos = new Map(tyrePhotos);

		// Persist to database
		const updateData: Partial<Tyre> = {};
		if (type === 'face') updateData.face_photo_url = url;
		else if (type === 'tread') updateData.tread_photo_url = url;
		else if (type === 'measurement') updateData.measurement_photo_url = url;

		onUpdateTyre(tyreId, updateData);
	}

	// Validation for warning banner
	const validation = $derived.by(() => {
		return validateTyres(tyres);
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
	<Card class="bg-blue-50 p-6">
		<h3 class="mb-2 text-lg font-semibold text-gray-900">Tyre Inspection</h3>
		<p class="text-sm text-gray-600">
			Inspect all tyres including the spare. For larger vehicles (trucks, 6-wheelers), use "Add
			Tyre" to add additional positions.
		</p>
	</Card>

	<!-- Tyres List -->
	<div class="space-y-4">
		{#each tyres as tyre, index (tyre.id)}
			<Card class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">
						{tyre.position_label || tyre.position}
					</h3>
					{#if index >= 5}
						<!-- Allow deletion of additional tyres only -->
						<Button size="sm" variant="outline" onclick={() => onDeleteTyre(tyre.id)}>
							<Trash2 class="h-4 w-4 text-red-600" />
						</Button>
					{/if}
				</div>

				<div class="grid gap-6 md:grid-cols-2">
					<!-- Left Column: Tyre Details -->
					<div class="space-y-4">
						<FormField
							label="Tyre Make"
							name={`tyre_make_${tyre.id}`}
							type="text"
							value={tyre.tyre_make || ''}
							onchange={(value) => onUpdateTyre(tyre.id, { tyre_make: value || undefined })}
							placeholder="e.g., Michelin, Bridgestone"
						/>
						<FormField
							label="Tyre Size"
							name={`tyre_size_${tyre.id}`}
							type="text"
							value={tyre.tyre_size || ''}
							onchange={(value) => onUpdateTyre(tyre.id, { tyre_size: value || undefined })}
							placeholder="e.g., 205/55R16"
						/>
						<div class="grid grid-cols-2 gap-4">
							<FormField
								label="Load Index"
								name={`load_index_${tyre.id}`}
								type="text"
								value={tyre.load_index || ''}
								onchange={(value) => onUpdateTyre(tyre.id, { load_index: value || undefined })}
								placeholder="e.g., 91"
							/>
							<FormField
								label="Speed Rating"
								name={`speed_rating_${tyre.id}`}
								type="text"
								value={tyre.speed_rating || ''}
								onchange={(value) => onUpdateTyre(tyre.id, { speed_rating: value || undefined })}
								placeholder="e.g., V"
							/>
						</div>
						<div class="flex gap-2 items-end">
							<div class="flex-1">
								<FormField
									label="Tread Depth (mm)"
									name={`tread_depth_${tyre.id}`}
									type="number"
									value={tyre.tread_depth_mm?.toString() || ''}
									onchange={(value) => onUpdateTyre(tyre.id, { tread_depth_mm: parseFloat(value) || 0 })}
									placeholder="e.g., 5.5"
									step="0.1"
								/>
							</div>
							<Button
								size="sm"
								variant="outline"
								onclick={() => handleOpenBettermentCalculator(tyre)}
								disabled={!tyre.tread_depth_mm || tyre.tread_depth_mm <= 0}
								title="Calculate Betterment"
								class="mb-0.5"
							>
								<Calculator class="h-4 w-4" />
							</Button>
						</div>
						<FormField
							label="Condition"
							name={`condition_${tyre.id}`}
							type="select"
							value={tyre.condition || ''}
							onchange={(value) => onUpdateTyre(tyre.id, { condition: (value || undefined) as any })}
							options={[
								{ value: '', label: 'Select condition' },
								{ value: 'excellent', label: 'Excellent' },
								{ value: 'good', label: 'Good' },
								{ value: 'fair', label: 'Fair' },
								{ value: 'poor', label: 'Poor' },
								{ value: 'replace', label: 'Needs Replacement' }
							]}
						/>
					</div>

					<!-- Right Column: Photos & Notes -->
					<div class="space-y-4">
						<!-- Tyre Photos Grid -->
						<div>
							<p class="mb-2 block text-sm font-medium text-gray-700">Tyre Photos</p>
							<div class="grid gap-3 md:grid-cols-3">
								<!-- Face Photo -->
								<PhotoUpload
									value={getPhotoUrl(tyre.id, 'face')}
									label="Face/Sidewall"
									{assessmentId}
									category="tyres"
									subcategory={`${tyre.position}_face`}
									onUpload={(url) => updatePhotoUrl(tyre.id, 'face', url)}
									onRemove={() => updatePhotoUrl(tyre.id, 'face', null)}
									height="h-32"
								/>

								<!-- Tread Photo -->
								<PhotoUpload
									value={getPhotoUrl(tyre.id, 'tread')}
									label="Tread Pattern"
									{assessmentId}
									category="tyres"
									subcategory={`${tyre.position}_tread`}
									onUpload={(url) => updatePhotoUrl(tyre.id, 'tread', url)}
									onRemove={() => updatePhotoUrl(tyre.id, 'tread', null)}
									height="h-32"
								/>

								<!-- Measurement Photo -->
								<PhotoUpload
									value={getPhotoUrl(tyre.id, 'measurement')}
									label="Measurement"
									{assessmentId}
									category="tyres"
									subcategory={`${tyre.position}_measurement`}
									onUpload={(url) => updatePhotoUrl(tyre.id, 'measurement', url)}
									onRemove={() => updatePhotoUrl(tyre.id, 'measurement', null)}
									height="h-32"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<FormField
								label="Notes"
								name={`notes_${tyre.id}`}
								type="textarea"
								value={tyre.notes || ''}
								onchange={(value) => onUpdateTyre(tyre.id, { notes: value || undefined })}
								placeholder="Any damage, wear patterns, or observations..."
								rows={3}
							/>
							<div class="flex justify-end">
								<Button
									size="sm"
									variant="outline"
									onclick={() => handleSubmitTyreNote(tyre)}
									disabled={!tyre.notes || tyre.notes.trim() === '' || submittingNote}
								>
									<Send class="mr-2 h-4 w-4" />
									{submittingNote ? 'Submitting...' : 'Submit to Assessment Notes'}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</Card>
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

