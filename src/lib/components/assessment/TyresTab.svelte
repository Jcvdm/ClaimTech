<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import RequiredFieldsWarning from './RequiredFieldsWarning.svelte';
	import { Plus, CircleCheck, Trash2 } from 'lucide-svelte';
	import type { Tyre } from '$lib/types/assessment';
	import { validateTyres } from '$lib/utils/validation';

	interface Props {
		tyres: Tyre[];
		assessmentId: string;
		onUpdateTyre: (id: string, data: Partial<Tyre>) => void;
		onAddTyre: () => void;
		onDeleteTyre: (id: string) => void;
		onComplete: () => void;
	}

	let { tyres: tyresProp, assessmentId, onUpdateTyre, onAddTyre, onDeleteTyre, onComplete }: Props = $props();

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

	function handleComplete() {
		onComplete();
	}

	const isComplete = $derived(tyres.length >= 5); // At least 5 tyres (standard positions)

	// Validation for warning banner
	const validation = $derived.by(() => {
		return validateTyres(tyres);
	});
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
						<FormField
							label="Tread Depth (mm)"
							name={`tread_depth_${tyre.id}`}
							type="number"
							value={tyre.tread_depth_mm?.toString() || ''}
							onchange={(value) => onUpdateTyre(tyre.id, { tread_depth_mm: parseFloat(value) || 0 })}
							placeholder="e.g., 5.5"
							step="0.1"
						/>
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

						<FormField
							label="Notes"
							name={`notes_${tyre.id}`}
							type="textarea"
							value={tyre.notes || ''}
							onchange={(value) => onUpdateTyre(tyre.id, { notes: value || undefined })}
							placeholder="Any damage, wear patterns, or observations..."
							rows={3}
						/>
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

	<!-- Actions -->
	<div class="flex justify-between">
		<Button variant="outline" onclick={() => {}}>Save Progress</Button>
		<Button onclick={handleComplete} disabled={!isComplete}>
			<CircleCheck class="mr-2 h-4 w-4" />
			Complete & Continue
		</Button>
	</div>
</div>

