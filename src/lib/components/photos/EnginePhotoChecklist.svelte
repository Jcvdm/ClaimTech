<script lang="ts">
	import type { InteriorPhoto } from '$lib/types/assessment';
	import { ENGINE_BAY_POSITIONS, type RequiredPhotoPosition } from '$lib/constants/requiredPhotoPositions';
	import { usePhotoUpload } from '$lib/hooks/use-photo-upload.svelte';
	import PhotoTile from './PhotoTile.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';

	interface Props {
		assessmentId: string;
		photos: InteriorPhoto[];
		/** Callback invoked when user captures for a specific position. Caller does the actual upload using position.subcategory. */
		onUpload: (file: File, position: RequiredPhotoPosition) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
		class?: string;
	}

	let { assessmentId, photos, onUpload, onDelete, class: className }: Props = $props();

	// Track which position is currently being captured so the shared onFilesSelected
	// callback can forward the file to the correct position. Set before triggerCameraInput()
	// is called; cleared after files are processed. Mobile camera is modal so no concurrent
	// tap risk, but guard is cheap.
	let currentPosition = $state<RequiredPhotoPosition | null>(null);

	const upload = usePhotoUpload({
		onFilesSelected: async (files) => {
			if (!currentPosition) return;
			const pos = currentPosition;
			for (const file of files) {
				await onUpload(file, pos);
			}
			currentPosition = null;
		}
	});

	function triggerCaptureFor(position: RequiredPhotoPosition) {
		currentPosition = position;
		upload.triggerCameraInput();
	}

	let capturedCount = $derived(
		ENGINE_BAY_POSITIONS.filter((pos) =>
			// TODO(Phase-4b): match by photo.subcategory column once added to DB
			photos.some((p) => p.photo_path?.includes(pos.subcategory))
		).length
	);

	let allCaptured = $derived(capturedCount === ENGINE_BAY_POSITIONS.length);
</script>

<!-- Hidden inputs wired to the shared usePhotoUpload instance -->
<input
	bind:this={upload.cameraInput}
	type="file"
	accept="image/*"
	capture="environment"
	class="sr-only"
	onchange={upload.handleFileSelect}
	aria-hidden="true"
/>
<input
	bind:this={upload.fileInput}
	type="file"
	accept="image/*"
	multiple
	class="sr-only"
	onchange={upload.handleFileSelect}
	aria-hidden="true"
/>

<Card class={cn('p-3 sm:p-4', className)}>
	<!-- Header row -->
	<div class="mb-3 flex items-center justify-between gap-2">
		<span class="text-sm font-semibold text-foreground">Engine Bay</span>
		<Badge variant={allCaptured ? 'success' : 'warning'}>
			{capturedCount} of {ENGINE_BAY_POSITIONS.length} captured
		</Badge>
	</div>

	<!-- 2-col grid of position tiles -->
	<div class="grid grid-cols-2 gap-2 sm:gap-3">
		{#each ENGINE_BAY_POSITIONS as position, i}
			{@const matchingPhoto =
				// TODO(Phase-4b): match by photo.subcategory column once added to DB
				photos.find((p) => p.photo_path?.includes(position.subcategory))}
			<div class="flex flex-col gap-1">
				<PhotoTile
					photo={matchingPhoto}
					index={i}
					onCapture={() => triggerCaptureFor(position)}
					{onDelete}
					onView={(_) => {}}
				/>
				<span class="text-[10px] font-semibold text-foreground">{position.label}</span>
			</div>
		{/each}
	</div>
</Card>
