<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Upload, Loader2 } from 'lucide-svelte';
	import type { Exterior360Photo } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { exterior360PhotosService } from '$lib/services/exterior-360-photos.service';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';

	interface Props {
		assessmentId: string;
		photos: Exterior360Photo[];
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

	let uploading = $state(false);
	let uploadProgress = $state(0);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let selectedPhotoIndex = $state<number | null>(null);

	// Drag and drop handlers
	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = false;
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = false;

		const files = Array.from(event.dataTransfer?.files || []);
		if (files.length > 0) {
			await uploadFiles(files);
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = Array.from(target.files || []);
		if (files.length > 0) {
			uploadFiles(files);
		}
	}

	function triggerFileInput() {
		fileInput?.click();
	}

	async function uploadFiles(files: File[]) {
		uploading = true;
		uploadProgress = 0;

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
					'360',
					'additional'
				);

				// Get next display order
				const displayOrder = await exterior360PhotosService.getNextDisplayOrder(assessmentId);

				// Create photo record
				const newPhoto = await exterior360PhotosService.createPhoto({
					assessment_id: assessmentId,
					photo_url: result.url,
					photo_path: result.path,
					display_order: displayOrder
				});

				// Add to optimistic array immediately for instant UI feedback
				photos.add(newPhoto);

				// Update progress
				uploadProgress = Math.round(((i + 1) / totalFiles) * 100);
			}

			// Refresh photos from parent (will sync via $effect)
			await onUpdate();
		} catch (error) {
			console.error('Error uploading photos:', error);
			alert('Failed to upload photos. Please try again.');
		} finally {
			uploading = false;
			uploadProgress = 0;
			// Reset file input
			if (fileInput) fileInput.value = '';
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
			await exterior360PhotosService.deletePhoto(photoId);

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
			await exterior360PhotosService.deletePhoto(photoId);

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
		console.log('[Exterior360PhotosPanel] Label update requested:', {
			photoId,
			newLabel: label,
			currentPhotos: photos.value.map((p) => ({ id: p.id, label: p.label }))
		});

		try {
			// IMMEDIATE optimistic update for instant UI feedback
			photos.update(photoId, { label });
			console.log('[Exterior360PhotosPanel] Optimistic update applied');

			// Update label in database
			await exterior360PhotosService.updatePhotoLabel(photoId, label);
			console.log('[Exterior360PhotosPanel] Database updated');

			// Refresh photos to get updated data (will sync via $effect)
			await onUpdate();
			console.log('[Exterior360PhotosPanel] Photos refreshed from parent');

			console.log('[Exterior360PhotosPanel] Label update complete:', photoId);
		} catch (error) {
			console.error('[Exterior360PhotosPanel] Error updating label:', error);

			// Revert optimistic update on error
			await onUpdate();

			throw error; // Re-throw to let PhotoViewer handle error display
		}
	}
</script>

<!-- Unified Photo Panel -->
<Card class="p-6">
	<h3 class="mb-4 text-lg font-semibold text-gray-900">
		{photos.value.length === 0 ? 'Exterior Photos' : `Exterior Photos (${photos.value.length})`}
	</h3>

	{#if photos.value.length === 0}
		<!-- Empty state: Large centered upload zone -->
		<div
			class="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors {isDragging
				? 'border-blue-500 bg-blue-50'
				: 'border-gray-300 hover:border-gray-400'}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			{#if uploading}
				<div class="space-y-3">
					<Loader2 class="mx-auto h-12 w-12 text-blue-600 animate-spin" />
					<p class="text-sm font-medium text-gray-700">Uploading photos...</p>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div
							class="h-full bg-blue-500 transition-all duration-300 rounded-full"
							style="width: {uploadProgress}%"
						></div>
					</div>
					<p class="text-xs text-gray-500">{uploadProgress}%</p>
				</div>
			{:else if isDragging}
				<div>
					<Upload class="mx-auto h-12 w-12 text-blue-500" />
					<p class="mt-2 text-sm font-medium text-blue-600">Drop photos here to upload</p>
				</div>
			{:else}
				<Upload class="mx-auto h-12 w-12 text-gray-400" />
				<p class="mt-2 text-sm text-gray-600">
					Drag & drop photos or <button
						type="button"
						onclick={triggerFileInput}
						class="font-medium text-blue-600 hover:text-blue-800"
					>
						browse
					</button>
				</p>
				<p class="mt-1 text-xs text-gray-500">
					Supports: JPG, PNG, GIF • Multiple files supported
				</p>
				<Button onclick={triggerFileInput} class="mt-4">
					<Upload class="mr-2 h-4 w-4" />
					Upload Photos
				</Button>
			{/if}
		</div>
	{:else}
		<!-- Grid with upload zone as first item -->
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto p-1">
			<!-- Upload zone as first grid cell -->
			<div
				class="relative w-full aspect-square border-2 border-dashed rounded-lg transition-colors cursor-pointer {isDragging
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-300 hover:border-gray-400 bg-gray-50'}"
				ondragenter={handleDragEnter}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				onclick={triggerFileInput}
			>
				{#if uploading}
					<div class="absolute inset-0 flex flex-col items-center justify-center p-4">
						<Loader2 class="h-8 w-8 text-blue-600 animate-spin" />
						<p class="mt-2 text-xs font-medium text-gray-700">Uploading...</p>
						<div class="w-full max-w-[80px] bg-gray-200 rounded-full h-1.5 mt-2">
							<div
								class="h-full bg-blue-500 transition-all duration-300 rounded-full"
								style="width: {uploadProgress}%"
							></div>
						</div>
					</div>
				{:else if isDragging}
					<div class="absolute inset-0 flex flex-col items-center justify-center p-4">
						<Upload class="h-8 w-8 text-blue-500" />
						<p class="mt-2 text-xs font-medium text-blue-600 text-center">Drop here</p>
					</div>
				{:else}
					<div class="absolute inset-0 flex flex-col items-center justify-center p-4">
						<Upload class="h-8 w-8 text-gray-400" />
						<p class="mt-2 text-xs text-gray-600 text-center font-medium">Add Photos</p>
					</div>
				{/if}
			</div>

			<!-- Photo thumbnails -->
			{#each photos.value as photo, index (photo.id)}
				<div class="w-full">
					<button
						onclick={() => openPhotoViewer(index)}
						class="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden group block"
						type="button"
					>
						<!-- Photo Image -->
						<div class="absolute inset-0">
							<img
								src={storageService.toPhotoProxyUrl(photo.photo_url)}
								alt={photo.label || 'Additional exterior photo'}
								class="w-full h-full object-cover cursor-pointer"
							/>
						</div>

						<!-- Hover overlay - excludes bottom area where label sits -->
						<div class="absolute inset-x-0 top-0 {photo.label ? 'bottom-10' : 'bottom-0'} bg-black/0 group-hover:bg-black/60 transition-all duration-200 flex items-center justify-center pointer-events-none z-10">
							<span class="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold drop-shadow-lg">
								Click to view
							</span>
						</div>

						<!-- Label overlay - separate from hover overlay -->
						{#if photo.label}
							<div class="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 truncate z-20">
								{photo.label}
							</div>
						{/if}
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		multiple
		onchange={handleFileSelect}
		class="hidden"
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

