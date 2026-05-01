<script lang="ts">
	import { Camera, CheckCircle2, X } from 'lucide-svelte';
	import type { DamagePhoto, InteriorPhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { usePhotoUpload } from '$lib/hooks/use-photo-upload.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';

	interface Props {
		assessmentId: string;
		photos: DamagePhoto[];
		onUpload: (file: File) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
		/** Minimum number of tiles to show (for "required" UX). Defaults to 0. */
		minTiles?: number;
	}

	let { assessmentId, photos, onUpload, onDelete, minTiles = 0 }: Props = $props();

	let selectedPhotoIndex = $state<number | null>(null);

	const upload = usePhotoUpload({
		onFilesSelected: async (files: File[]) => {
			upload.uploading = true;
			upload.uploadProgress = 0;
			try {
				for (let i = 0; i < files.length; i++) {
					const file = files[i];
					if (!file.type.startsWith('image/')) continue;
					await onUpload(file);
					upload.uploadProgress = Math.round(((i + 1) / files.length) * 100);
				}
			} catch (err) {
				console.error('[DamagePhotoGrid] upload error:', err);
			} finally {
				upload.uploading = false;
				upload.uploadProgress = 0;
				if (upload.fileInput) upload.fileInput.value = '';
				if (upload.cameraInput) upload.cameraInput.value = '';
			}
		}
	});

	// Total tiles: at least minTiles, and always one empty "capture" tile beyond existing photos
	const totalTiles = $derived(Math.max(minTiles, photos.length + 1));

	function openViewer(index: number) {
		selectedPhotoIndex = index;
	}

	function closeViewer() {
		selectedPhotoIndex = null;
	}

	async function handleDeleteFromViewer(photoId: string, photoPath: string) {
		try {
			await onDelete(photoId);
		} catch (err) {
			console.error('[DamagePhotoGrid] delete error:', err);
		}
		selectedPhotoIndex = null;
	}
</script>

<!-- Hidden file inputs wired through usePhotoUpload -->
<input
	type="file"
	accept="image/*"
	multiple
	class="sr-only"
	bind:this={upload.fileInput}
	onchange={upload.handleFileSelect}
/>
<input
	type="file"
	accept="image/*"
	capture="environment"
	class="sr-only"
	bind:this={upload.cameraInput}
	onchange={upload.handleFileSelect}
/>

<div class="grid grid-cols-2 gap-2">
	{#each { length: totalTiles } as _, tileIndex (tileIndex)}
		{@const photo = photos[tileIndex]}
		{#if photo}
			<!-- Filled tile -->
			<div class="relative aspect-square rounded-md border-2 border-border overflow-hidden">
				<img
					src={storageService.toPhotoProxyUrl(photo.photo_url)}
					alt="Damage photo {tileIndex + 1}"
					class="h-full w-full object-cover"
				/>
				<!-- Green check overlay -->
				<div class="absolute top-1 right-1 text-success drop-shadow">
					<CheckCircle2 class="size-5" />
				</div>
				<!-- Delete button -->
				<button
					type="button"
					onclick={() => onDelete(photo.id)}
					class="absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground shadow transition-opacity hover:bg-background"
					aria-label="Delete photo"
				>
					<X class="size-3.5" />
				</button>
				<!-- Tap to view -->
				<button
					type="button"
					onclick={() => openViewer(tileIndex)}
					class="absolute inset-0 opacity-0"
					aria-label="View photo {tileIndex + 1}"
				>
				</button>
			</div>
		{:else}
			<!-- Empty capture tile -->
			<button
				type="button"
				onclick={upload.triggerCameraInput}
				disabled={upload.uploading}
				class="relative aspect-square rounded-md border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
				aria-label="Capture damage photo"
			>
				{#if upload.uploading && tileIndex === photos.length}
					<!-- Upload progress overlay on the first empty tile -->
					<div class="flex flex-col items-center gap-1">
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
						<span class="text-xs">{upload.uploadProgress}%</span>
					</div>
				{:else}
					<Camera class="size-6" />
					<span class="text-xs font-medium">Capture</span>
				{/if}
			</button>
		{/if}
	{/each}
</div>

{#if selectedPhotoIndex !== null}
	<PhotoViewer
		photos={photos as unknown as InteriorPhoto[]}
		startIndex={selectedPhotoIndex}
		onClose={closeViewer}
		onDelete={handleDeleteFromViewer}
	/>
{/if}
