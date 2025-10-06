<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import { Plus, CheckCircle, Trash2 } from 'lucide-svelte';
	import type { DamageRecord, DamageType, DamageArea, DamageSeverity } from '$lib/types/assessment';

	interface Props {
		damageRecords: DamageRecord[];
		assessmentId: string;
		matchesDescription?: boolean | null;
		mismatchNotes?: string | null;
		onUpdateMatch: (matches: boolean, notes?: string) => void;
		onAddDamage: () => void;
		onUpdateDamage: (id: string, data: Partial<DamageRecord>) => void;
		onDeleteDamage: (id: string) => void;
		onComplete: () => void;
	}

	let {
		damageRecords,
		assessmentId,
		matchesDescription = null,
		mismatchNotes = '',
		onUpdateMatch,
		onAddDamage,
		onUpdateDamage,
		onDeleteDamage,
		onComplete
	}: Props = $props();

	let localMatchesDescription = $state(matchesDescription);
	let localMismatchNotes = $state(mismatchNotes || '');

	function handleMatchChange(matches: boolean) {
		localMatchesDescription = matches;
		onUpdateMatch(matches, localMismatchNotes);
	}

	function handleMismatchNotesChange(notes: string) {
		localMismatchNotes = notes;
		if (localMatchesDescription === false) {
			onUpdateMatch(false, notes);
		}
	}

	function handleComplete() {
		onComplete();
	}

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

	const isComplete = $derived(localMatchesDescription !== null && damageRecords.length > 0);
</script>

<div class="space-y-6">
	<!-- Damage Match Check -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Damage Description Match <span class="text-red-500">*</span>
		</h3>
		<p class="mb-4 text-sm text-gray-600">
			Does the actual damage match the description provided in the initial request?
		</p>
		<div class="flex gap-4">
			<Button
				variant={localMatchesDescription === true ? 'default' : 'outline'}
				onclick={() => handleMatchChange(true)}
			>
				Yes, Matches
			</Button>
			<Button
				variant={localMatchesDescription === false ? 'default' : 'outline'}
				onclick={() => handleMatchChange(false)}
			>
				No, Does Not Match
			</Button>
		</div>

		{#if localMatchesDescription === false}
			<div class="mt-4">
				<FormField
					label="Explain Mismatch"
					type="textarea"
					value={localMismatchNotes}
					onInput={(e) => handleMismatchNotesChange((e.target as HTMLTextAreaElement).value)}
					placeholder="Describe how the actual damage differs from the reported description..."
					rows={3}
					required
				/>
			</div>
		{/if}
	</Card>

	<!-- Damage Records -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900">Damage Records</h3>
		<Button onclick={onAddDamage}>
			<Plus class="mr-2 h-4 w-4" />
			Add Damage Record
		</Button>
	</div>

	{#if damageRecords.length === 0}
		<Card class="p-12">
			<div class="text-center">
				<p class="text-gray-500">No damage records added yet.</p>
				<p class="mt-2 text-sm text-gray-400">
					Click "Add Damage Record" to document vehicle damage
				</p>
			</div>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each damageRecords as damage, index}
				<Card class="p-6">
					<div class="mb-4 flex items-center justify-between">
						<h4 class="text-lg font-semibold text-gray-900">Damage Record #{index + 1}</h4>
						<Button size="sm" variant="outline" onclick={() => onDeleteDamage(damage.id)}>
							<Trash2 class="h-4 w-4 text-red-600" />
						</Button>
					</div>

					<div class="space-y-6">
						<!-- Damage Classification -->
						<div class="grid gap-6 md:grid-cols-2">
							<FormField
								label="Damage Area"
								type="select"
								value={damage.damage_area}
								onChange={(e) =>
									onUpdateDamage(damage.id, {
										damage_area: (e.target as HTMLSelectElement).value as DamageArea
									})}
								options={[
									{ value: 'structural', label: 'Structural' },
									{ value: 'non_structural', label: 'Non-Structural' }
								]}
								required
							/>
							<FormField
								label="Damage Type"
								type="select"
								value={damage.damage_type}
								onChange={(e) =>
									onUpdateDamage(damage.id, {
										damage_type: (e.target as HTMLSelectElement).value as DamageType
									})}
								options={damageTypeOptions}
								required
							/>
						</div>

						<div class="grid gap-6 md:grid-cols-2">
							<FormField
								label="Severity"
								type="select"
								value={damage.severity || ''}
								onChange={(e) =>
									onUpdateDamage(damage.id, {
										severity: (e.target as HTMLSelectElement).value as DamageSeverity
									})}
								options={[
									{ value: '', label: 'Select severity' },
									{ value: 'minor', label: 'Minor' },
									{ value: 'moderate', label: 'Moderate' },
									{ value: 'severe', label: 'Severe' },
									{ value: 'total_loss', label: 'Total Loss' }
								]}
							/>
							<FormField
								label="Repair Method"
								type="text"
								value={damage.repair_method || ''}
								onInput={(e) =>
									onUpdateDamage(damage.id, {
										repair_method: (e.target as HTMLInputElement).value
									})}
								placeholder="e.g., Repair, Replace, Paint, PDR"
							/>
						</div>

						<FormField
							label="Repair Duration (hours)"
							type="number"
							value={damage.repair_duration_hours?.toString() || ''}
							onInput={(e) =>
								onUpdateDamage(damage.id, {
									repair_duration_hours: parseFloat((e.target as HTMLInputElement).value)
								})}
							placeholder="Estimated hours"
							step="0.5"
						/>

						<FormField
							label="Location Description"
							type="textarea"
							value={damage.location_description || ''}
							onInput={(e) =>
								onUpdateDamage(damage.id, {
									location_description: (e.target as HTMLTextAreaElement).value
								})}
							placeholder="Describe the location of the damage on the vehicle..."
							rows={2}
						/>

						<FormField
							label="Damage Description"
							type="textarea"
							value={damage.damage_description || ''}
							onInput={(e) =>
								onUpdateDamage(damage.id, {
									damage_description: (e.target as HTMLTextAreaElement).value
								})}
							placeholder="Detailed description of the damage..."
							rows={3}
						/>

						<FormField
							label="Repair Notes"
							type="textarea"
							value={damage.repair_notes || ''}
							onInput={(e) =>
								onUpdateDamage(damage.id, {
									repair_notes: (e.target as HTMLTextAreaElement).value
								})}
							placeholder="Notes about repair process, parts needed, etc..."
							rows={3}
						/>

						<!-- Damage Photos -->
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700">Damage Photos</label>
							<div class="grid gap-4 md:grid-cols-4">
								{#each damage.photos || [] as photo, photoIndex}
									<div class="relative">
										<img
											src={photo.url}
											alt={photo.description || 'Damage photo'}
											class="h-32 w-full rounded-lg object-cover"
										/>
										<Button
											size="sm"
											variant="outline"
											class="absolute right-2 top-2 bg-white"
											onclick={() => {
												const newPhotos = [...(damage.photos || [])];
												newPhotos.splice(photoIndex, 1);
												onUpdateDamage(damage.id, { photos: newPhotos });
											}}
										>
											Remove
										</Button>
									</div>
								{/each}

								<!-- Add Photo Upload -->
								<PhotoUpload
									value=""
									label=""
									{assessmentId}
									category="damage"
									subcategory={`damage_${index + 1}`}
									onUpload={(url) => {
										const newPhotos = [...(damage.photos || []), { url, description: '' }];
										onUpdateDamage(damage.id, { photos: newPhotos });
									}}
									height="h-32"
								/>
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex justify-between">
		<Button variant="outline" onclick={() => {}}>Save Progress</Button>
		<Button onclick={handleComplete} disabled={!isComplete}>
			<CheckCircle class="mr-2 h-4 w-4" />
			Complete Assessment
		</Button>
	</div>
</div>

