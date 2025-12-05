<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Upload, Camera } from 'lucide-svelte';
	import type { TyrePhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { tyrePhotosService } from '$lib/services/tyre-photos.service';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';
	import { FileUploadProgress } from '$lib/components/ui/progress';
	import { shouldResetDragState } from '$lib/utils/drag-helpers';

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
	let compressing = $state(false);
	let uploadProgress = $state(0);
	let compressionProgress = $state(0);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let cameraInput: HTMLInputElement;
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
		// Only reset if cursor is actually outside the container boundary
		if (shouldResetDragState(event)) {
			isDragging = false;
		}
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

	function triggerCameraInput() {
		cameraInput?.click();
	}

	async function uploadFiles(files: File[]) {
		uploading = true;
		compressing = true;
		uploadProgress = 0;
		compressionProgress = 0;

		try {
			const totalFiles = files.length;
			let completedFiles = 0;

			for (const file of files) {
				// Upload to storage with compression and progress tracking
				const { url, path } = await storageService.uploadAssessmentPhoto(
					file,
					assessmentId,
					'tyres',
					tyrePosition, // Use tyre position as subcategory
					{
						onCompressionProgress: (progress: number) => {
							compressing = true;
							uploading = false;
							compressionProgress = progress;
						},
						onUploadProgress: (progress: number) => {
							compressing = false;
							uploading = true;
							uploadProgress = progress;
						}
					}
				);

				// Create photo record
				const newPhoto = await tyrePhotosService.createPhoto({
					tyre_id: tyreId,
					assessment_id: assessmentId,
					photo_url: url,
					photo_path: path,
					label: undefined
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
			compressing = false;
			uploadProgress = 0;
			compressionProgress = 0;
			// Reset file inputs to allow re-capture
			if (fileInput) fileInput.value = '';
			if (cameraInput) cameraInput.value = '';
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
			role="button"
			tabindex="0"
			class="relative rounded-lg border-2 border-dashed transition-colors {isDragging
				? 'border-rose-500 bg-rose-50'
				: 'border-slate-300 bg-slate-50'} {uploading || compressing ? 'opacity-50' : ''}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					triggerFileInput();
				}
			}}
			aria-label="Upload photos - drag and drop or click to select"
		>
			<div class="flex flex-col items-center justify-center p-6">
				{#if uploading || compressing}
					<FileUploadProgress
						isCompressing={compressing}
						isUploading={uploading}
						compressionProgress={compressionProgress}
						uploadProgress={uploadProgress}
						fileName=""
					/>
				{:else if isDragging}
					<Upload class="h-8 w-8 text-rose-500" />
					<p class="mt-2 text-sm font-medium text-rose-600">Drop photos here</p>
				{:else}
					<Upload class="h-8 w-8 text-slate-400" />
					<p class="mt-2 text-sm text-slate-600">
						Drag and drop photos here, or
						<button
							type="button"
							onclick={triggerFileInput}
							class="text-rose-600 hover:text-rose-700 font-medium"
						>
							browse
						</button>
					</p>
					<p class="mt-1 text-xs text-slate-500">Supports multiple files</p>
					<div class="flex gap-2 justify-center mt-3">
						<Button onclick={triggerCameraInput} variant="outline" size="sm">
							<Camera class="mr-2 h-4 w-4" />
							Camera
						</Button>
						<Button onclick={triggerFileInput} size="sm">
							<Upload class="mr-2 h-4 w-4" />
							Upload
						</Button>
					</div>
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
							class="relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden group block"
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

<!-- Hidden camera input -->
<input
	bind:this={cameraInput}
	type="file"
	accept="image/*"
	capture="environment"
	multiple
	onchange={handleFileSelect}
	class="hidden"
/>

<!-- Photo Viewer -->
{#if selectedPhotoIndex !== null}
	<PhotoViewer
		photos={photos.value as any}
		startIndex={selectedPhotoIndex}
		onClose={closePhotoViewer}
		onDelete={handlePhotoDelete}
		onLabelUpdate={handleLabelUpdate}
	/>
{/if}

