<script lang="ts">
	import PhotoCaptureGrid from '$lib/components/photos/PhotoCaptureGrid.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';
	import type { DamagePhoto, InteriorPhoto } from '$lib/types/assessment';

	interface Props {
		assessmentId: string; // accepted for callsite compatibility; unused internally now
		photos: DamagePhoto[];
		onUpload: (file: File) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
		/** Minimum number of tiles to show (for "required" UX). Defaults to 0. */
		minTiles?: number;
		class?: string;
	}

	let { assessmentId, photos, onUpload, onDelete, minTiles = 0, class: className }: Props =
		$props();

	// Silence unused-variable warning — kept in Props for callsite compat
	void assessmentId;

	let viewerIndex = $state<number | null>(null);

	// Adapt single-file DamageTab callback to PhotoCaptureGrid's multi-file signature
	async function handleUpload(files: File[]) {
		for (const file of files) {
			await onUpload(file);
		}
	}
</script>

<PhotoCaptureGrid
	{photos}
	onUpload={handleUpload}
	{onDelete}
	{minTiles}
	columns={2}
	onTap={(i) => (viewerIndex = i)}
	class={className}
/>

{#if viewerIndex !== null}
	<PhotoViewer
		photos={photos as unknown as InteriorPhoto[]}
		startIndex={viewerIndex}
		onClose={() => (viewerIndex = null)}
		onDelete={async (photoId) => {
			// TODO: PhotoViewer should accept generic photo shape
			await onDelete(photoId);
			viewerIndex = null;
		}}
	/>
{/if}
