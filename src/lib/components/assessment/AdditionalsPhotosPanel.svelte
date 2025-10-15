<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Upload, Trash2, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-svelte';
	import type { AdditionalsPhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { additionalsPhotosService } from '$lib/services/additionals-photos.service';

	interface Props {
		additionalsId: string;
		assessmentId: string;
		photos: AdditionalsPhoto[];
		onUpdate: () => void;
	}

	let { additionalsId, assessmentId, photos, onUpdate }: Props = $props();

	let uploading = $state(false);
	let uploadProgress = $state(0);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let selectedPhotoIndex = $state<number | null>(null);
	let tempLabel = $state<string>('');
	let modalSize = $state<'small' | 'medium' | 'large' | 'fullscreen'>('medium');
	let photoZoom = $state<number>(1);

	// Derived modal size class for reactivity with important modifiers to override Dialog defaults
	let modalSizeClass = $derived(
		modalSize === 'fullscreen'
			? '!max-w-full !max-h-full !w-screen !h-screen !inset-0 !translate-x-0 !translate-y-0 !rounded-none'
			: modalSize === 'large'
				? 'sm:!max-w-5xl md:!max-w-5xl lg:!max-w-5xl !max-h-[90vh]'
				: modalSize === 'medium'
					? 'sm:!max-w-3xl md:!max-w-3xl lg:!max-w-3xl !max-h-[80vh]'
					: 'sm:!max-w-2xl md:!max-w-2xl lg:!max-w-2xl !max-h-[70vh]'
	);

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

				// Upload to storage (additionals subfolder)
				const result = await storageService.uploadAssessmentPhoto(
					file,
					assessmentId,
					'estimate',
					'additionals'
				);

				// Get next display order
				const displayOrder = await additionalsPhotosService.getNextDisplayOrder(additionalsId);

				// Create photo record
				await additionalsPhotosService.createPhoto({
					additionals_id: additionalsId,
					photo_url: result.url,
					photo_path: result.path,
					display_order: displayOrder
				});

				// Update progress
				uploadProgress = Math.round(((i + 1) / totalFiles) * 100);
			}

			// Refresh photos
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
			// Delete from storage
			await storageService.deletePhoto(photoPath);
			
			// Delete from database
			await additionalsPhotosService.deletePhoto(photoId);
			
			// Refresh photos
			await onUpdate();
		} catch (error) {
			console.error('Error deleting photo:', error);
			alert('Failed to delete photo. Please try again.');
		}
	}

	// Modal functions
	function openPhotoModal(index: number) {
		selectedPhotoIndex = index;
		tempLabel = photos[index].label || '';
		photoZoom = 1;
		modalSize = 'medium';
	}

	function closePhotoModal() {
		selectedPhotoIndex = null;
		tempLabel = '';
		photoZoom = 1;
		modalSize = 'medium';
	}

	function zoomIn() {
		photoZoom = Math.min(3, photoZoom + 0.25);
	}

	function zoomOut() {
		photoZoom = Math.max(0.5, photoZoom - 0.25);
	}

	function resetZoom() {
		photoZoom = 1;
	}

	function previousPhoto() {
		if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
			selectedPhotoIndex--;
			tempLabel = photos[selectedPhotoIndex].label || '';
		}
	}

	function nextPhoto() {
		if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
			selectedPhotoIndex++;
			tempLabel = photos[selectedPhotoIndex].label || '';
		}
	}

	async function handleLabelSaveInModal() {
		if (selectedPhotoIndex === null) return;

		try {
			const photo = photos[selectedPhotoIndex];
			await additionalsPhotosService.updatePhotoLabel(photo.id, tempLabel);
			await onUpdate();
		} catch (error) {
			console.error('Error updating label:', error);
		}
	}

	async function handleDeleteInModal() {
		if (selectedPhotoIndex === null) return;

		const photo = photos[selectedPhotoIndex];
		if (!confirm('Are you sure you want to delete this photo?')) return;

		try {
			// Delete from storage
			await storageService.deletePhoto(photo.photo_path);

			// Delete from database
			await additionalsPhotosService.deletePhoto(photo.id);

			// Close modal and refresh
			closePhotoModal();
			await onUpdate();
		} catch (error) {
			console.error('Error deleting photo:', error);
			alert('Failed to delete photo. Please try again.');
		}
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (selectedPhotoIndex === null) return;

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			previousPhoto();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			nextPhoto();
		} else if (event.key === 'Escape') {
			closePhotoModal();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="space-y-6">
	<!-- Upload Zone -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Upload Additional Photos</h3>
		
		<div
			class="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors {isDragging
				? 'border-blue-500 bg-blue-50'
				: 'border-gray-300 hover:border-gray-400'}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<input
				type="file"
				bind:this={fileInput}
				onchange={handleFileSelect}
				accept="image/*"
				multiple
				class="hidden"
			/>

			{#if uploading}
				<div class="space-y-3">
					<Loader2 class="mx-auto h-12 w-12 animate-spin text-blue-600" />
					<p class="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div
							class="bg-blue-600 h-2 rounded-full transition-all"
							style="width: {uploadProgress}%"
						></div>
					</div>
				</div>
			{:else}
				<Upload class="mx-auto h-12 w-12 text-gray-400" />
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
				<p class="mt-1 text-xs text-gray-500">Supports: JPG, PNG, GIF (multiple files)</p>
			{/if}
		</div>
	</Card>

	<!-- Photos Grid -->
	{#if photos.length > 0}
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold text-gray-900">
				Additional Photos ({photos.length})
			</h3>
			
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
				{#each photos as photo, index (photo.id)}
					<div class="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-colors">
						<button
							type="button"
							onclick={() => openPhotoModal(index)}
							class="w-full h-full"
						>
							<img
								src={photo.photo_url}
								alt={photo.label || 'Additional photo'}
								class="w-full h-full object-cover"
							/>
						</button>
						
						<!-- Overlay with label and delete -->
						<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-end">
							<div class="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
								{#if photo.label}
									<p class="text-xs text-white font-medium truncate mb-1">{photo.label}</p>
								{/if}
								<Button
									size="sm"
									variant="destructive"
									onclick={(e) => {
										e.stopPropagation();
										handleDeletePhoto(photo.id, photo.photo_path);
									}}
									class="w-full"
								>
									<Trash2 class="h-3 w-3 mr-1" />
									Delete
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}
</div>

<!-- Photo Modal -->
{#if selectedPhotoIndex !== null}
	{@const photo = photos[selectedPhotoIndex]}
	<Dialog.Root open={selectedPhotoIndex !== null} onOpenChange={closePhotoModal}>
		<Dialog.Content class={modalSizeClass}>
			<Dialog.Header>
				<Dialog.Title>
					Photo {selectedPhotoIndex + 1} of {photos.length}
				</Dialog.Title>
			</Dialog.Header>

			<div class="space-y-4">
				<!-- Photo viewer with zoom -->
				<div class="relative bg-gray-100 rounded-lg overflow-hidden" style="min-height: 400px;">
					<div class="overflow-auto max-h-[60vh]">
						<img
							src={photo.photo_url}
							alt={photo.label || 'Additional photo'}
							class="w-full h-auto transition-transform"
							style="transform: scale({photoZoom}); transform-origin: center;"
						/>
					</div>
				</div>

				<!-- Controls -->
				<div class="flex items-center justify-between gap-2">
					<!-- Navigation -->
					<div class="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							onclick={previousPhoto}
							disabled={selectedPhotoIndex === 0}
						>
							<ChevronLeft class="h-4 w-4" />
						</Button>
						<Button
							size="sm"
							variant="outline"
							onclick={nextPhoto}
							disabled={selectedPhotoIndex === photos.length - 1}
						>
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>

					<!-- Zoom controls -->
					<div class="flex gap-2">
						<Button size="sm" variant="outline" onclick={zoomOut}>
							<ZoomOut class="h-4 w-4" />
						</Button>
						<Button size="sm" variant="outline" onclick={resetZoom}>
							{Math.round(photoZoom * 100)}%
						</Button>
						<Button size="sm" variant="outline" onclick={zoomIn}>
							<ZoomIn class="h-4 w-4" />
						</Button>
					</div>

					<!-- Size toggle -->
					<Button
						size="sm"
						variant="outline"
						onclick={() => {
							modalSize = modalSize === 'fullscreen' ? 'medium' : 'fullscreen';
						}}
					>
						{#if modalSize === 'fullscreen'}
							<Minimize2 class="h-4 w-4" />
						{:else}
							<Maximize2 class="h-4 w-4" />
						{/if}
					</Button>
				</div>

				<!-- Label input -->
				<div class="space-y-2">
					<label for="photo-label" class="text-sm font-medium text-gray-700">
						Photo Label
					</label>
					<div class="flex gap-2">
						<Input
							id="photo-label"
							type="text"
							bind:value={tempLabel}
							placeholder="Enter photo label..."
							class="flex-1"
						/>
						<Button onclick={handleLabelSaveInModal}>Save Label</Button>
					</div>
				</div>

				<!-- Delete button -->
				<div class="flex justify-end">
					<Button variant="destructive" onclick={handleDeleteInModal}>
						<Trash2 class="h-4 w-4 mr-2" />
						Delete Photo
					</Button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

