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
							type="text"
							value={tyre.tyre_make || ''}
							onInput={(e) =>
								onUpdateTyre(tyre.id, { tyre_make: (e.target as HTMLInputElement).value })}
							placeholder="e.g., Michelin, Bridgestone"
						/>
						<FormField
							label="Tyre Size"
							type="text"
							value={tyre.tyre_size || ''}
							onInput={(e) =>
								onUpdateTyre(tyre.id, { tyre_size: (e.target as HTMLInputElement).value })}
							placeholder="e.g., 205/55R16"
						/>
						<div class="grid grid-cols-2 gap-4">
							<FormField
								label="Load Index"
								type="text"
								value={tyre.load_index || ''}
								onInput={(e) =>
									onUpdateTyre(tyre.id, { load_index: (e.target as HTMLInputElement).value })}
								placeholder="e.g., 91"
							/>
							<FormField
								label="Speed Rating"
								type="text"
								value={tyre.speed_rating || ''}
								onInput={(e) =>
									onUpdateTyre(tyre.id, { speed_rating: (e.target as HTMLInputElement).value })}
								placeholder="e.g., V"
							/>
						</div>
						<FormField
							label="Tread Depth (mm)"
							type="number"
							value={tyre.tread_depth_mm?.toString() || ''}
							onInput={(e) =>
								onUpdateTyre(tyre.id, {
									tread_depth_mm: parseFloat((e.target as HTMLInputElement).value)
								})}
							placeholder="e.g., 5.5"
							step="0.1"
						/>
						<FormField
							label="Condition"
							type="select"
							value={tyre.condition || ''}
							onChange={(e) =>
								onUpdateTyre(tyre.id, { condition: (e.target as HTMLSelectElement).value as any })}
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

					<!-- Right Column: Photo & Notes -->
					<div class="space-y-4">
						<PhotoUpload
							value={tyre.photo_url || ''}
							label="Tyre Photo"
							{assessmentId}
							category="tyres"
							subcategory={tyre.position}
							onUpload={(url) => onUpdateTyre(tyre.id, { photo_url: url })}
							onRemove={() => onUpdateTyre(tyre.id, { photo_url: '' })}
							height="h-48"
						/>

						<FormField
							label="Notes"
							type="textarea"
							value={tyre.notes || ''}
							onInput={(e) =>
								onUpdateTyre(tyre.id, { notes: (e.target as HTMLTextAreaElement).value })}
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

