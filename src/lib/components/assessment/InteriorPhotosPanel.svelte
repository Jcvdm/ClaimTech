<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import type { InteriorPhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { interiorPhotosService } from '$lib/services/interior-photos.service';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';
	import PhotoCaptureGrid from '$lib/components/photos/PhotoCaptureGrid.svelte';

	interface Props {
		assessmentId: string;
		photos: InteriorPhoto[];
		onUpdate: () => void;
	}

	// Make props reactive using $derived instead of destructuring
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	// Reactive derived props
	const assessmentId = $derived(props.assessmentId);
	const onUpdate = $derived(props.onUpdate);

	// Use optimistic array for immediate UI updates
	// Pass getter function to ensure reactivity when props.photos changes
	const photos = useOptimisticArray(() => props.photos);

	let selectedPhotoIndex = $state<number | null>(null);

	async function uploadFiles(files: File[]) {
		try {
			const totalFiles = files.length;

			for (let i = 0; i < totalFiles; i++) {
				const file = files[i];

				// Validate file type
				if (!file.type.startsWith('image/')) {
					console.warn(`Skipping non-image file: ${file.name}`);
					continue;
				}

				// Upload to storage with compression and progress tracking
				const result = await storageService.uploadAssessmentPhoto(
					file,
					assessmentId,
					'interior',
					'additional'
				);

				// Get next display order
				const displayOrder = await interiorPhotosService.getNextDisplayOrder(assessmentId);

				// Create photo record
				const newPhoto = await interiorPhotosService.createPhoto({
					assessment_id: assessmentId,
					photo_url: result.url,
					photo_path: result.path,
					display_order: displayOrder
				});

				// Add to optimistic array immediately for instant UI feedback
				photos.add(newPhoto);
			}

			// Refresh photos from parent (will sync via $effect)
			await onUpdate();
		} catch (error) {
			console.error('Error uploading photos:', error);
			alert('Failed to upload photos. Please try again.');
		}
	}

	async function handleDeletePhoto(photoId: string, photoPath: string) {
		if (!confirm('Are you sure you want to delete this photo?')) return;

		try {
			// Remove from optimistic array immediately for instant UI feedback
			photos.remove(photoId);

			// Delete from storage
			await storageService.deletePhoto(photoPath);

			// Delete from database
			await interiorPhotosService.deletePhoto(photoId);

			// Refresh photos from parent (will sync via $effect)
			await onUpdate();
		} catch (error) {
			console.error('Error deleting photo:', error);
			alert('Failed to delete photo. Please try again.');
			// Revert optimistic update on error
			await onUpdate();
		}
	}

	// Photo viewer functions
	function openPhotoViewer(index: number) {
		selectedPhotoIndex = index;
	}

	function closePhotoViewer() {
		selectedPhotoIndex = null;
	}

	async function handlePhotoDelete(photoId: string, photoPath: string) {
		try {
			// Remove from optimistic array immediately for instant UI feedback
			photos.remove(photoId);

			// Delete from storage
			await storageService.deletePhoto(photoPath);

			// Delete from database
			await interiorPhotosService.deletePhoto(photoId);

			// Refresh photos from parent (will sync via $effect)
			await onUpdate();
		} catch (error) {
			console.error('Error deleting photo:', error);
			alert('Failed to delete photo. Please try again.');
			// Revert optimistic update on error
			await onUpdate();
		}
	}

	async function handleLabelUpdate(photoId: string, label: string) {
		try {
			// IMMEDIATE optimistic update for instant UI feedback
			photos.update(photoId, { label });

			// Update label in database
			await interiorPhotosService.updatePhotoLabel(photoId, label);

			// Refresh photos to get updated data (will sync via $effect)
			await onUpdate();
		} catch (error) {
			console.error('[InteriorPhotosPanel] Error updating label:', error);

			// Revert optimistic update on error
			await onUpdate();

			throw error; // Re-throw to let PhotoViewer handle error display
		}
	}
</script>

<!-- Unified Photo Panel -->
<Card class="p-6">
	<h3 class="mb-4 text-lg font-semibold text-gray-900">
		{photos.value.length === 0 ? 'Interior Photos' : `Interior Photos · ${photos.value.length}`}
	</h3>

	<PhotoCaptureGrid
		photos={photos.value}
		onUpload={async (files) => await uploadFiles(files)}
		onDelete={async (id) => {
			const photo = photos.value.find((p) => p.id === id);
			if (photo) await handleDeletePhoto(id, photo.photo_path);
		}}
		onTap={openPhotoViewer}
		columns={2}
	/>
</Card>

<!-- Photo Viewer -->
{#if selectedPhotoIndex !== null}
	<PhotoViewer
		photos={photos.value}
		startIndex={selectedPhotoIndex}
		onClose={closePhotoViewer}
		onDelete={handlePhotoDelete}
		onLabelUpdate={handleLabelUpdate}
	/>
{/if}
