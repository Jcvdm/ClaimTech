<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Upload, Loader2 } from 'lucide-svelte';
	import type { TyrePhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { tyrePhotosService } from '$lib/services/tyre-photos.service';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';

	interface Props {
		tyreId: string;
		assessmentId: string;
		tyrePosition: string; // For storage subcategory
		photos: TyrePhoto[];
		onPhotosUpdate: (updatedPhotos: TyrePhoto[]) => void;
	}

	// Make props reactive using $derived instead of destructuring
	let props: Props = $props();

	// Reactive derived props
	const tyreId = $derived(props.tyreId);
	const assessmentId = $derived(props.assessmentId);
	const tyrePosition = $derived(props.tyrePosition);
	const onPhotosUpdate = $derived(props.onPhotosUpdate);

	// Use optimistic array with getter function for reactivity
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
			let completedFiles = 0;

			for (const file of files) {
				// Upload to storage
				const { url, path } = await storageService.uploadAssessmentPhoto(
					file,
					assessmentId,
					'tyres',
					tyrePosition // Use tyre position as subcategory
				);

				// Create photo record
				const newPhoto = await tyrePhotosService.createPhoto({
					tyre_id: tyreId,
					assessment_id: assessmentId,
					photo_url: url,
					photo_path: path,
					label: null
				});

				// Add to optimistic array
				photos.add(newPhoto);

				completedFiles++;
				uploadProgress = Math.round((completedFiles / totalFiles) * 100);
			}

			// Notify parent with updated photos (direct state update pattern)
			onPhotosUpdate(photos.value);
		} catch (error) {
			console.error('Error uploading photos:', error);
		} finally {
			uploading = false;
			uploadProgress = 0;
		}
	}

	async function handlePhotoDelete(photoId: string) {
		try {
			await tyrePhotosService.deletePhoto(photoId, assessmentId);
			photos.remove(photoId);

			// Notify parent (direct state update pattern)
			onPhotosUpdate(photos.value);
		} catch (error) {
			console.error('Error deleting photo:', error);
		}
	}

	async function handleLabelUpdate(photoId: string, newLabel: string) {
		try {
			const updatedPhoto = await tyrePhotosService.updatePhoto(
				photoId,
				assessmentId,
				{ label: newLabel }
			);
			photos.update(photoId, updatedPhoto);

			// Notify parent (direct state update pattern)
			onPhotosUpdate(photos.value);
		} catch (error) {
			console.error('Error updating label:', error);
		}
	}

	function openPhotoViewer(index: number) {
		selectedPhotoIndex = index;
	}

	function closePhotoViewer() {
		selectedPhotoIndex = null;
	}
</script>

<Card class="p-4">
	<div class="space-y-4">
		<!-- Upload Zone -->
		<div
			class="relative rounded-lg border-2 border-dashed transition-colors {isDragging
				? 'border-blue-500 bg-blue-50'
				: 'border-gray-300 bg-gray-50'} {uploading ? 'opacity-50' : ''}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<div class="flex flex-col items-center justify-center p-6">
				{#if uploading}
					<Loader2 class="h-8 w-8 animate-spin text-blue-600" />
					<p class="mt-2 text-sm text-gray-600">Uploading... {uploadProgress}%</p>
				{:else}
					<Upload class="h-8 w-8 text-gray-400" />
					<p class="mt-2 text-sm text-gray-600">
						Drag and drop photos here, or
						<button
							type="button"
							onclick={triggerFileInput}
							class="text-blue-600 hover:text-blue-700 font-medium"
						>
							browse
						</button>
					</p>
					<p class="mt-1 text-xs text-gray-500">Supports multiple files</p>
				{/if}
			</div>
		</div>

		<!-- Photo Gallery Grid -->
		{#if photos.value.length > 0}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
									alt={photo.label || 'Tyre photo'}
									class="w-full h-full object-cover cursor-pointer"
								/>
							</div>

							<!-- Label Overlay -->
							{#if photo.label}
								<div
									class="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1.5 truncate"
								>
									{photo.label}
								</div>
							{/if}
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</Card>

<!-- Hidden file input -->
<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	multiple
	onchange={handleFileSelect}
	class="hidden"
/>

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

