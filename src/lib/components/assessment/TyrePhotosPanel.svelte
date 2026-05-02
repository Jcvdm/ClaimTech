<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Upload, Camera, Plus, Loader2 } from 'lucide-svelte';
	import type { TyrePhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { tyrePhotosService } from '$lib/services/tyre-photos.service';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';
	import { FileUploadProgress } from '$lib/components/ui/progress';
	import { usePhotoUpload } from '$lib/hooks/use-photo-upload.svelte';

	interface Props {
		tyreId: string;
		assessmentId: string;
		tyrePosition: string; // For storage subcategory
		photos: TyrePhoto[];
		onPhotosUpdate: (updatedPhotos: TyrePhoto[]) => void;
		compact?: boolean;
	}

	// Make props reactive using $derived instead of destructuring
	let props: Props = $props();

	// Reactive derived props
	const tyreId = $derived(props.tyreId);
	const assessmentId = $derived(props.assessmentId);
	const tyrePosition = $derived(props.tyrePosition);
	const onPhotosUpdate = $derived(props.onPhotosUpdate);
	const compact = $derived(props.compact ?? false);

	// Use optimistic array with getter function for reactivity
	const photos = useOptimisticArray(() => props.photos);

	const upload = usePhotoUpload({ onFilesSelected: uploadFiles });
	let selectedPhotoIndex = $state<number | null>(null);

	async function uploadFiles(files: File[]) {
		// NOTE: uploading = true init preserved intentionally (pre-existing behavior, flag for follow-up)
		upload.uploading = true;
		upload.compressing = true;
		upload.uploadProgress = 0;
		upload.compressionProgress = 0;

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
							upload.compressing = true;
							upload.uploading = false;
							upload.compressionProgress = progress;
						},
						onUploadProgress: (progress: number) => {
							upload.compressing = false;
							upload.uploading = true;
							upload.uploadProgress = progress;
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
				upload.uploadProgress = Math.round((completedFiles / totalFiles) * 100);
			}

			// Notify parent with updated photos (direct state update pattern)
			onPhotosUpdate(photos.value);
		} catch (error) {
			console.error('Error uploading photos:', error);
		} finally {
			upload.uploading = false;
			upload.compressing = false;
			upload.uploadProgress = 0;
			upload.compressionProgress = 0;
			// Reset file inputs to allow re-capture
			if (upload.fileInput) upload.fileInput.value = '';
			if (upload.cameraInput) upload.cameraInput.value = '';
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

{#if compact}
	<!-- Compact branch: inline 4-col grid with photos + "+" add tile, no outer Card or dropzone -->
	<div
		class="space-y-2"
		role="region"
		aria-label="Photo upload area"
		ondragenter={upload.handleDragEnter}
		ondragover={upload.handleDragOver}
		ondragleave={upload.handleDragLeave}
		ondrop={upload.handleDrop}
	>
		<div class="grid grid-cols-4 gap-1.5">
			{#each photos.value as photo, index (photo.id)}
				<button
					onclick={() => openPhotoViewer(index)}
					class="relative w-full aspect-square bg-slate-100 rounded-md overflow-hidden group block"
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
			{/each}

			<!-- Add tile / upload progress tile -->
			{#if upload.uploading || upload.compressing}
				<div class="aspect-square rounded-md border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center">
					<Loader2 class="w-5 h-5 animate-spin text-primary" />
				</div>
			{:else}
				<button
					type="button"
					onclick={upload.triggerFileInput}
					class="aspect-square rounded-md border-2 border-dashed border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
				>
					<Plus class="w-5 h-5" />
				</button>
			{/if}
		</div>
	</div>
{:else}
	<!-- Default branch: full Card with dashed dropzone + gallery (byte-for-byte equivalent to before) -->
	<Card class="p-4">
		<div class="space-y-4">
			<!-- Upload Zone -->
			<div
				role="button"
				tabindex="0"
				class="relative rounded-lg border-2 border-dashed transition-colors {upload.isDragging
					? 'border-primary bg-primary/5'
					: 'border-slate-300 bg-slate-50'} {upload.uploading || upload.compressing ? 'opacity-50' : ''}"
				ondragenter={upload.handleDragEnter}
				ondragover={upload.handleDragOver}
				ondragleave={upload.handleDragLeave}
				ondrop={upload.handleDrop}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						upload.triggerFileInput();
					}
				}}
				aria-label="Upload photos - drag and drop or click to select"
			>
				<div class="flex flex-col items-center justify-center p-6">
					{#if upload.uploading || upload.compressing}
						<FileUploadProgress
							isCompressing={upload.compressing}
							isUploading={upload.uploading}
							compressionProgress={upload.compressionProgress}
							uploadProgress={upload.uploadProgress}
							fileName=""
						/>
					{:else if upload.isDragging}
						<Upload class="h-8 w-8 text-primary" />
						<p class="mt-2 text-sm font-medium text-primary">Drop photos here</p>
					{:else}
						<Upload class="h-8 w-8 text-slate-400" />
						<p class="mt-2 text-sm text-slate-600">
							Drag and drop photos here, or
							<button
								type="button"
								onclick={upload.triggerFileInput}
								class="text-primary hover:text-primary/80 font-medium"
							>
								browse
							</button>
						</p>
						<p class="mt-1 text-xs text-slate-500">Supports multiple files</p>
						<div class="flex gap-2 justify-center mt-3">
							<Button onclick={upload.triggerCameraInput} variant="outline" size="sm">
								<Camera class="mr-2 h-4 w-4" />
								Camera
							</Button>
							<Button onclick={upload.triggerFileInput} size="sm">
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
{/if}

<!-- Hidden file input -->
<input
	bind:this={upload.fileInput}
	type="file"
	accept="image/*"
	multiple
	onchange={upload.handleFileSelect}
	class="hidden"
/>

<!-- Hidden camera input -->
<input
	bind:this={upload.cameraInput}
	type="file"
	accept="image/*"
	capture="environment"
	multiple
	onchange={upload.handleFileSelect}
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
