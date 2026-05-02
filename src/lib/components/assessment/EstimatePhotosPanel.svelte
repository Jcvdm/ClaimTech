<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import type { EstimatePhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { estimatePhotosService } from '$lib/services/estimate-photos.service';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';
	import PhotoCaptureGrid from '$lib/components/photos/PhotoCaptureGrid.svelte';

	interface Props {
		estimateId: string;
		assessmentId: string;
		photos: EstimatePhoto[];
		onUpdate: () => void;
	}

	// Make props reactive using $derived instead of destructuring
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	// Reactive derived props
	const estimateId = $derived(props.estimateId);
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

				// Upload to storage
				const result = await storageService.uploadAssessmentPhoto(
					file,
					assessmentId,
					'estimate',
					'incident'
				);

				// Get next display order
				const displayOrder = await estimatePhotosService.getNextDisplayOrder(estimateId);

				// Create photo record
				const newPhoto = await estimatePhotosService.createPhoto({
					estimate_id: estimateId,
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
			await estimatePhotosService.deletePhoto(photoId);

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
			await estimatePhotosService.deletePhoto(photoId);

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
		console.log('[EstimatePhotosPanel] Label update requested:', {
			photoId,
			newLabel: label,
			currentPhotos: photos.value.map((p) => ({ id: p.id, label: p.label }))
		});

		try {
			// IMMEDIATE optimistic update for instant UI feedback
			photos.update(photoId, { label });
			console.log('[EstimatePhotosPanel] Optimistic update applied');

			// Update label in database
			await estimatePhotosService.updatePhotoLabel(photoId, label);
			console.log('[EstimatePhotosPanel] Database updated');

			// Refresh photos to get updated data (will sync via $effect)
			await onUpdate();
			console.log('[EstimatePhotosPanel] Photos refreshed from parent');

			console.log('[EstimatePhotosPanel] Label update complete:', photoId);
		} catch (error) {
			console.error('[EstimatePhotosPanel] Error updating label:', error);

			// Revert optimistic update on error
			await onUpdate();

			throw error; // Re-throw to let PhotoViewer handle error display
		}
	}
</script>

<!-- Unified Photo Panel -->
<Card class="p-6">
	<h3 class="mb-4 text-lg font-semibold text-slate-900">
		{photos.value.length === 0 ? 'Incident Photos' : `Incident Photos (${photos.value.length})`}
	</h3>

	<PhotoCaptureGrid
		photos={photos.value}
		onUpload={async (files) => await uploadFiles(files)}
		onDelete={async (id) => {
			const photo = photos.value.find(p => p.id === id);
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
