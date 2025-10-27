<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Upload, Trash2, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-svelte';
	import type { PreIncidentEstimatePhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { preIncidentEstimatePhotosService } from '$lib/services/pre-incident-estimate-photos.service';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';

	interface Props {
		estimateId: string;
		assessmentId: string;
		photos: PreIncidentEstimatePhoto[];
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
	const photos = useOptimisticArray(props.photos);

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

				// Upload to storage with pre-incident category
				const result = await storageService.uploadAssessmentPhoto(
					file,
					assessmentId,
					'pre-incident',
					'damage'
				);

				// Get next display order
				const displayOrder = await preIncidentEstimatePhotosService.getNextDisplayOrder(estimateId);

				// Create photo record in pre_incident_estimate_photos table
				const newPhoto = await preIncidentEstimatePhotosService.createPhoto({
					estimate_id: estimateId,
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
			await preIncidentEstimatePhotosService.deletePhoto(photoId);

			// Refresh photos from parent (will sync via $effect)
			await onUpdate();
		} catch (error) {
			console.error('Error deleting photo:', error);
			alert('Failed to delete photo. Please try again.');
			// Revert optimistic update on error
			await onUpdate();
		}
	}

	// Modal functions
	function openPhotoModal(index: number) {
		selectedPhotoIndex = index;
		tempLabel = photos.value[index].label || '';
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
			tempLabel = photos.value[selectedPhotoIndex].label || '';
		}
	}

	function nextPhoto() {
		if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.value.length - 1) {
			selectedPhotoIndex++;
			tempLabel = photos.value[selectedPhotoIndex].label || '';
		}
	}

	async function handleLabelSaveInModal() {
		if (selectedPhotoIndex === null) return;

		try {
			const photo = photos.value[selectedPhotoIndex];
			await preIncidentEstimatePhotosService.updatePhotoLabel(photo.id, tempLabel);
			await onUpdate();
		} catch (error) {
			console.error('Error updating label:', error);
		}
	}

	async function handleDeleteInModal() {
		if (selectedPhotoIndex === null) return;

		const photo = photos.value[selectedPhotoIndex];
		if (!confirm('Are you sure you want to delete this photo?')) return;

		try {
			// Delete from storage
			await storageService.deletePhoto(photo.photo_path);

			// Delete from database
			await preIncidentEstimatePhotosService.deletePhoto(photo.id);

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

<div class="space-y-6">
	<!-- Upload Zone -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Upload Pre-Incident Damage Photos</h3>
		
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

	<!-- Preview Gallery -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">
			Pre-Incident Damage Photos ({photos.value.length})
		</h3>

		{#if photos.value.length === 0}
			<div class="text-center py-12 text-gray-500">
				<ImageIcon class="mx-auto h-12 w-12 text-gray-400 mb-3" />
				<p class="text-sm">No pre-incident damage photos uploaded yet</p>
				<p class="text-xs mt-1">Upload photos using the area above</p>
			</div>
		{:else}
			<!-- Thumbnail Grid -->
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto p-1">
				{#each photos.value as photo, index (photo.id)}
					<div class="w-full">
						<button
							onclick={() => openPhotoModal(index)}
							class="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden group block"
							type="button"
						>
							<!-- Photo Image -->
							<div class="absolute inset-0">
								<img
									src={storageService.toPhotoProxyUrl(photo.photo_url)}
									alt={photo.label || 'Pre-incident damage photo'}
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
	</Card>
</div>

<!-- Photo Modal -->
{#if selectedPhotoIndex !== null}
	<Dialog.Root open={true} onOpenChange={closePhotoModal}>
		<Dialog.Content
			class="{modalSizeClass} overflow-y-auto"
			onkeydown={handleKeydown}
		>
			<Dialog.Header>
				<div class="flex items-center justify-between">
					<Dialog.Title>
						Photo {selectedPhotoIndex + 1} of {photos.value.length}
					</Dialog.Title>

					<!-- Size Controls -->
					<div class="flex gap-1">
						<Button
							variant="ghost"
							size="sm"
							onclick={() => modalSize = 'small'}
							class={modalSize === 'small' ? 'bg-gray-100' : ''}
						>
							S
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => modalSize = 'medium'}
							class={modalSize === 'medium' ? 'bg-gray-100' : ''}
						>
							M
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => modalSize = 'large'}
							class={modalSize === 'large' ? 'bg-gray-100' : ''}
						>
							L
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => modalSize = modalSize === 'fullscreen' ? 'large' : 'fullscreen'}
						>
							{#if modalSize === 'fullscreen'}
								<Minimize2 class="h-4 w-4" />
							{:else}
								<Maximize2 class="h-4 w-4" />
							{/if}
						</Button>
					</div>
				</div>
			</Dialog.Header>

			<!-- Zoom Controls -->
			<div class="flex items-center justify-center gap-2 mb-2">
				<Button variant="outline" size="sm" onclick={zoomOut} disabled={photoZoom <= 0.5}>
					<ZoomOut class="h-4 w-4 mr-1" />
					Zoom Out
				</Button>
				<span class="text-sm text-gray-600 min-w-16 text-center">{Math.round(photoZoom * 100)}%</span>
				<Button variant="outline" size="sm" onclick={resetZoom} disabled={photoZoom === 1}>
					Reset
				</Button>
				<Button variant="outline" size="sm" onclick={zoomIn} disabled={photoZoom >= 3}>
					<ZoomIn class="h-4 w-4 mr-1" />
					Zoom In
				</Button>
			</div>

			<!-- Large Photo with Zoom -->
			<div class="bg-gray-100 rounded-lg flex items-center justify-center p-4 overflow-auto">
				<img
					src={storageService.toPhotoProxyUrl(photos.value[selectedPhotoIndex].photo_url)}
					alt={photos.value[selectedPhotoIndex].label || 'Pre-incident damage photo'}
					class="w-full h-auto max-h-[60vh] object-contain transition-transform duration-200"
					style="transform: scale({photoZoom})"
				/>
			</div>

			<!-- Label Input -->
			<div class="space-y-2">
				<label for="photo-label" class="block text-sm font-medium text-gray-700">
					Photo Label
				</label>
				<Input
					id="photo-label"
					type="text"
					bind:value={tempLabel}
					placeholder="Add a label or description for this photo..."
					onkeydown={(e) => {
						if (e.key === 'Enter') handleLabelSaveInModal();
					}}
					onblur={handleLabelSaveInModal}
					class="w-full"
				/>
				<p class="text-xs text-gray-500">Press Enter or click outside to save</p>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-between pt-4 border-t">
				<!-- Navigation -->
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={previousPhoto}
						disabled={selectedPhotoIndex === 0}
					>
						<ChevronLeft class="h-4 w-4 mr-1" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={nextPhoto}
						disabled={selectedPhotoIndex === photos.value.length - 1}
					>
						Next
						<ChevronRight class="h-4 w-4 ml-1" />
					</Button>
				</div>

				<!-- Delete -->
				<Button
					variant="outline"
					size="sm"
					onclick={handleDeleteInModal}
					class="text-red-600 hover:bg-red-50 hover:text-red-700"
				>
					<Trash2 class="h-4 w-4 mr-1" />
					Delete Photo
				</Button>
			</div>

			<div class="text-xs text-gray-500 text-center pt-2">
				Use arrow keys to navigate • Press Escape to close
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

