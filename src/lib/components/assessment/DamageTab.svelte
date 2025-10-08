<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormField from '$lib/components/forms/FormField.svelte';
	import PhotoUpload from '$lib/components/forms/PhotoUpload.svelte';
	import { CheckCircle2 } from 'lucide-svelte';
	import type { DamageRecord, DamageType, DamageArea, DamageSeverity } from '$lib/types/assessment';

	interface Props {
		damageRecord: DamageRecord | null;
		assessmentId: string;
		onUpdateDamage: (data: Partial<DamageRecord>) => void;
		onComplete: () => void;
	}

	let {
		damageRecord,
		assessmentId,
		onUpdateDamage,
		onComplete
	}: Props = $props();

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

	// Check if all required fields are filled
	const isComplete = $derived(
		damageRecord !== null &&
		damageRecord.matches_description !== null &&
		damageRecord.damage_area !== null &&
		damageRecord.damage_type !== null
	);
</script>

<div class="space-y-6">
	{#if !damageRecord}
		<Card class="p-6 border-2 border-dashed border-gray-300">
			<p class="text-center text-gray-600">Loading damage record...</p>
		</Card>
	{:else}
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
					variant={damageRecord.matches_description === true ? 'default' : 'outline'}
					onclick={() => onUpdateDamage({ matches_description: true })}
				>
					Yes, Matches
				</Button>
				<Button
					variant={damageRecord.matches_description === false ? 'default' : 'outline'}
					onclick={() => onUpdateDamage({ matches_description: false })}
				>
					No, Does Not Match
				</Button>
			</div>

			{#if damageRecord.matches_description === false}
				<div class="mt-4">
					<FormField
						label="Explain Mismatch"
						type="textarea"
						value={damageRecord.mismatch_notes || ''}
						onInput={(e) =>
							onUpdateDamage({ mismatch_notes: (e.target as HTMLTextAreaElement).value })}
						placeholder="Describe how the actual damage differs from the reported description..."
						rows={3}
						required
					/>
				</div>
			{/if}
		</Card>

		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">Damage Details</h3>

			<div class="space-y-6">
				<div class="grid gap-6 md:grid-cols-2">
					<FormField
						label="Damage Area"
						type="select"
						value={damageRecord.damage_area}
						onChange={(e) =>
							onUpdateDamage({
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
						value={damageRecord.damage_type}
						onChange={(e) =>
							onUpdateDamage({
								damage_type: (e.target as HTMLSelectElement).value as DamageType
							})}
						options={damageTypeOptions}
						required
					/>
				</div>

				<FormField
					label="Severity"
					type="select"
					value={damageRecord.severity || ''}
					onChange={(e) =>
						onUpdateDamage({
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
					label="Estimated Repair Duration (days)"
					type="number"
					value={damageRecord.estimated_repair_duration_days?.toString() || ''}
					onInput={(e) =>
						onUpdateDamage({
							estimated_repair_duration_days: parseFloat((e.target as HTMLInputElement).value)
						})}
					placeholder="e.g., 1, 3, 7"
					step="0.5"
				/>

				<FormField
					label="Location Description"
					type="textarea"
					value={damageRecord.location_description || ''}
					onInput={(e) =>
						onUpdateDamage({
							location_description: (e.target as HTMLTextAreaElement).value
						})}
					placeholder="Describe the location of the damage on the vehicle..."
					rows={2}
				/>

				<FormField
					label="Damage Description"
					type="textarea"
					value={damageRecord.damage_description || ''}
					onInput={(e) =>
						onUpdateDamage({
							damage_description: (e.target as HTMLTextAreaElement).value
						})}
					placeholder="Detailed description of the damage..."
					rows={3}
				/>

				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-700">Damage Photos</h4>
					<div class="grid gap-4 md:grid-cols-4">
						{#each damageRecord.photos || [] as photo, photoIndex}
							<div class="relative bg-gray-100 rounded-lg flex items-center justify-center">
								<img
									src={photo.url}
									alt={photo.description || 'Damage photo'}
									class="h-32 w-full rounded-lg object-contain"
								/>
								<Button
									size="sm"
									variant="outline"
									class="absolute right-2 top-2 bg-white"
									onclick={() => {
										const newPhotos = [...(damageRecord.photos || [])];
										newPhotos.splice(photoIndex, 1);
										onUpdateDamage({ photos: newPhotos });
									}}
								>
									Remove
								</Button>
							</div>
						{/each}

						<PhotoUpload
							value=""
							label=""
							{assessmentId}
							category="damage"
							subcategory="damage_record"
							onUpload={(url) => {
								const newPhotos = [...(damageRecord.photos || []), { url, description: '' }];
								onUpdateDamage({ photos: newPhotos });
							}}
							height="h-32"
						/>
					</div>
				</div>
			</div>
		</Card>

		<div class="flex justify-between">
			<Button variant="outline" onclick={() => {}}>Save Progress</Button>
			<Button onclick={onComplete} disabled={!isComplete}>
				Complete Assessment
			</Button>
		</div>
	{/if}
</div>

