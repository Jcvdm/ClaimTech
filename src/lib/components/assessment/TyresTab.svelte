<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import { Plus, CheckCircle, Trash2 } from 'lucide-svelte';
	import type { Tyre } from '$lib/types/assessment';

	interface Props {
		tyres: Tyre[];
		assessmentId: string;
		onUpdateTyre: (id: string, data: Partial<Tyre>) => void;
		onAddTyre: () => void;
		onDeleteTyre: (id: string) => void;
		onComplete: () => void;
	}

	let { tyres, assessmentId, onUpdateTyre, onAddTyre, onDeleteTyre, onComplete }: Props = $props();

	function handleComplete() {
		onComplete();
	}

	const isComplete = $derived(tyres.length >= 5); // At least 5 tyres (standard positions)
</script>

<div class="space-y-6">
	<Card class="bg-blue-50 p-6">
		<h3 class="mb-2 text-lg font-semibold text-gray-900">Tyre Inspection</h3>
		<p class="text-sm text-gray-600">
			Inspect all tyres including the spare. For larger vehicles (trucks, 6-wheelers), use "Add
			Tyre" to add additional positions.
		</p>
	</Card>

	<!-- Tyres List -->
	<div class="space-y-4">
		{#each tyres as tyre, index}
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
							onchange={(value) => onUpdateTyre(tyre.id, { tyre_make: value })}
							placeholder="e.g., Michelin, Bridgestone"
						/>
						<FormField
							label="Tyre Size"
							name={`tyre_size_${tyre.id}`}
							type="text"
							value={tyre.tyre_size || ''}
							onchange={(value) => onUpdateTyre(tyre.id, { tyre_size: value })}
							placeholder="e.g., 205/55R16"
						/>
						<div class="grid grid-cols-2 gap-4">
							<FormField
								label="Load Index"
								name={`load_index_${tyre.id}`}
								type="text"
								value={tyre.load_index || ''}
								onchange={(value) => onUpdateTyre(tyre.id, { load_index: value })}
								placeholder="e.g., 91"
							/>
							<FormField
								label="Speed Rating"
								name={`speed_rating_${tyre.id}`}
								type="text"
								value={tyre.speed_rating || ''}
								onchange={(value) => onUpdateTyre(tyre.id, { speed_rating: value })}
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
							onchange={(value) => onUpdateTyre(tyre.id, { condition: value as any })}
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
							<label class="mb-2 block text-sm font-medium text-gray-700">Tyre Photos</label>
							<div class="grid gap-3 md:grid-cols-3">
								<!-- Face Photo -->
								<PhotoUpload
									value={tyre.face_photo_url || ''}
									label="Face/Sidewall"
									{assessmentId}
									category="tyres"
									subcategory={`${tyre.position}_face`}
									onUpload={(url) => onUpdateTyre(tyre.id, { face_photo_url: url })}
									onRemove={() => onUpdateTyre(tyre.id, { face_photo_url: '' })}
									height="h-32"
								/>

								<!-- Tread Photo -->
								<PhotoUpload
									value={tyre.tread_photo_url || ''}
									label="Tread Pattern"
									{assessmentId}
									category="tyres"
									subcategory={`${tyre.position}_tread`}
									onUpload={(url) => onUpdateTyre(tyre.id, { tread_photo_url: url })}
									onRemove={() => onUpdateTyre(tyre.id, { tread_photo_url: '' })}
									height="h-32"
								/>

								<!-- Measurement Photo -->
								<PhotoUpload
									value={tyre.measurement_photo_url || ''}
									label="Measurement"
									{assessmentId}
									category="tyres"
									subcategory={`${tyre.position}_measurement`}
									onUpload={(url) => onUpdateTyre(tyre.id, { measurement_photo_url: url })}
									onRemove={() => onUpdateTyre(tyre.id, { measurement_photo_url: '' })}
									height="h-32"
								/>
							</div>
						</div>

						<FormField
							label="Notes"
							name={`notes_${tyre.id}`}
							type="textarea"
							value={tyre.notes || ''}
							onchange={(value) => onUpdateTyre(tyre.id, { notes: value })}
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
			<CheckCircle class="mr-2 h-4 w-4" />
			Complete & Continue
		</Button>
	</div>
</div>

