<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-svelte';
	import type { EstimatePhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';
	import { estimatePhotosService } from '$lib/services/estimate-photos.service';

	interface Props {
		estimateId: string;
		assessmentId: string;
		photos: EstimatePhoto[];
		onUpdate: () => void;
	}

	let { estimateId, assessmentId, photos, onUpdate }: Props = $props();

	let uploading = $state(false);
	let uploadProgress = $state(0);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let editingLabel = $state<string | null>(null);
	let tempLabel = $state<string>('');

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
					'estimate',
					'incident'
				);

				// Get next display order
				const displayOrder = await estimatePhotosService.getNextDisplayOrder(estimateId);

				// Create photo record
				await estimatePhotosService.createPhoto({
					estimate_id: estimateId,
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
			await estimatePhotosService.deletePhoto(photoId);
			
			// Refresh photos
			await onUpdate();
		} catch (error) {
			console.error('Error deleting photo:', error);
			alert('Failed to delete photo. Please try again.');
		}
	}

	function handleLabelClick(photoId: string, currentLabel: string | null) {
		editingLabel = photoId;
		tempLabel = currentLabel || '';
	}

	async function handleLabelSave(photoId: string) {
		try {
			await estimatePhotosService.updatePhotoLabel(photoId, tempLabel);
			editingLabel = null;
			await onUpdate();
		} catch (error) {
			console.error('Error updating label:', error);
		}
	}

	function handleLabelCancel() {
		editingLabel = null;
		tempLabel = '';
	}
</script>

<div class="space-y-6">
	<!-- Upload Zone -->
	<Card class="p-6">
		<h3 class="mb-4 text-lg font-semibold text-gray-900">Upload Incident Photos</h3>
		
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
			Incident Photos ({photos.length})
		</h3>

		{#if photos.length === 0}
			<div class="text-center py-12 text-gray-500">
				<ImageIcon class="mx-auto h-12 w-12 text-gray-400 mb-3" />
				<p class="text-sm">No photos uploaded yet</p>
				<p class="text-xs mt-1">Upload photos using the area above</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
				{#each photos as photo (photo.id)}
					<div class="relative group border border-gray-200 rounded-lg overflow-hidden bg-white">
						<!-- Photo -->
						<div class="aspect-video bg-gray-100">
							<img
								src={photo.photo_url}
								alt={photo.label || 'Incident photo'}
								class="w-full h-full object-cover"
							/>
						</div>

						<!-- Label Input -->
						<div class="p-3 space-y-2">
							{#if editingLabel === photo.id}
								<div class="space-y-2">
									<Input
										type="text"
										bind:value={tempLabel}
										placeholder="Add label..."
										onkeydown={(e) => {
											if (e.key === 'Enter') handleLabelSave(photo.id);
											if (e.key === 'Escape') handleLabelCancel();
										}}
										onblur={() => handleLabelSave(photo.id)}
										autofocus
										class="text-sm"
									/>
								</div>
							{:else}
								<button
									onclick={() => handleLabelClick(photo.id, photo.label)}
									class="w-full text-left text-sm text-gray-600 hover:text-gray-900 truncate"
									title={photo.label || 'Click to add label'}
								>
									{photo.label || 'Click to add label...'}
								</button>
							{/if}

							<!-- Delete Button -->
							<Button
								variant="outline"
								size="sm"
								onclick={() => handleDeletePhoto(photo.id, photo.photo_path)}
								class="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
							>
								<Trash2 class="h-4 w-4 mr-1" />
								Delete
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card>
</div>

