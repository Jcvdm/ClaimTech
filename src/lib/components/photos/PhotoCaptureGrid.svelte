<script lang="ts">
	import { usePhotoUpload } from '$lib/hooks/use-photo-upload.svelte';
	import PhotoTile from './PhotoTile.svelte';
	import { cn } from '$lib/utils';

	interface Photo {
		id: string;
		photo_url: string;
		label?: string | null;
	}

	interface Props {
		photos: Photo[];
		onUpload: (files: File[]) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
		/** Minimum number of empty tiles to display when photos.length < minTiles */
		minTiles?: number;
		/** Grid column count */
		columns?: 2 | 3 | 4;
		/** Tap handler for filled tiles. Caller wires their own PhotoViewer. */
		onTap?: (index: number) => void;
		class?: string;
	}

	let {
		photos,
		onUpload,
		onDelete,
		minTiles = 0,
		columns = 2,
		onTap,
		class: className
	}: Props = $props();

	const gridColsMap: Record<2 | 3 | 4, string> = {
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4'
	};

	const upload = usePhotoUpload({
		onFilesSelected: async (files: File[]) => {
			upload.uploading = true;
			upload.uploadProgress = 0;
			try {
				await onUpload(files);
			} catch (err) {
				console.error('[PhotoCaptureGrid] upload error:', err);
			} finally {
				upload.uploading = false;
				upload.uploadProgress = 0;
				if (upload.fileInput) upload.fileInput.value = '';
				if (upload.cameraInput) upload.cameraInput.value = '';
			}
		}
	});

	// Number of empty placeholder tiles to show (at least minTiles worth, minus filled photos)
	const emptyTileCount = $derived(Math.max(0, minTiles - photos.length));

	// Whether the "add more" tile should appear (always one extra beyond the filled photos)
	// This tile is either:
	// - in the empty placeholder range (if photos.length < minTiles), or
	// - the single extra tile after all photos when photos.length >= minTiles
	// Total rendered: photos.length filled + emptyTileCount empty + 1 "add more" = consistent.
	// When uploading, the first empty tile shows the spinner via PhotoTile's uploading state.
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

<div class={cn('grid gap-2', gridColsMap[columns], className)}>
	<!-- Filled photo tiles -->
	{#each photos as photo, i (photo.id)}
		<PhotoTile
			{photo}
			index={i}
			onCapture={upload.triggerCameraInput}
			onDelete={async (id) => await onDelete(id)}
			onView={(idx) => onTap?.(idx)}
		/>
	{/each}

	<!-- Empty placeholder tiles (up to minTiles) — first one shows upload spinner -->
	{#each { length: emptyTileCount } as _, j (j)}
		<PhotoTile
			index={photos.length + j}
			uploading={j === 0 && (upload.uploading || upload.compressing)}
			uploadProgress={upload.compressing ? upload.compressionProgress : upload.uploadProgress}
			onCapture={upload.triggerCameraInput}
			onDelete={() => {}}
			onView={() => {}}
		/>
	{/each}

	<!-- Extra "add more" tile — always present beyond the filled photos -->
	<!-- When there are no empty placeholder tiles, this is the only empty tile -->
	<!-- When uploading and emptyTileCount is 0, this tile shows the spinner -->
	<PhotoTile
		index={photos.length + emptyTileCount}
		uploading={emptyTileCount === 0 && (upload.uploading || upload.compressing)}
		uploadProgress={upload.compressing ? upload.compressionProgress : upload.uploadProgress}
		onCapture={upload.triggerCameraInput}
		onDelete={() => {}}
		onView={() => {}}
	/>
</div>

<!-- File picker fallback (alternative to camera capture) -->
<div class="mt-1 flex justify-end">
	<button
		type="button"
		onclick={upload.triggerFileInput}
		class="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
	>
		Choose from files
	</button>
</div>
