<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Upload, Camera } from 'lucide-svelte';
	import { storageService } from '$lib/services/storage.service';
	import { createShopJobPhotosService } from '$lib/services/shop-job-photos.service';
	import { supabase } from '$lib/supabase';
	import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';
	import { FileUploadProgress } from '$lib/components/ui/progress';
	import { shouldResetDragState } from '$lib/utils/drag-helpers';

	interface ShopPhoto {
		id: string;
		job_id: string;
		storage_path: string;
		label: string | null;
		category: string;
		sort_order: number;
		created_at: string;
		// PhotoViewer compat field (mapped from storage_path)
		photo_url?: string;
		photo_path?: string;
	}

	interface Props {
		jobId: string;
		category: string; // 'before', 'damage', 'during', 'after'
		labelPrefix?: string; // Optional: 'ID', '360', etc. - prepended to label when creating
		photos: ShopPhoto[];
		title: string;
		description?: string;
		onUpdate: () => void;
	}

	// Make props reactive using $derived instead of destructuring
	let props: Props = $props();

	// Reactive derived props
	const jobId = $derived(props.jobId);
	const category = $derived(props.category);
	const onUpdate = $derived(props.onUpdate);

	// Use optimistic array for immediate UI updates
	// Pass getter function to ensure reactivity when props.photos changes
	const photos = useOptimisticArray(() => props.photos);

	// Photos mapped for PhotoViewer (which requires photo_url field)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const photosForViewer = $derived(
		photos.value.map((p) => ({
			...p,
			photo_url: p.storage_path,
			photo_path: p.storage_path
		})) as any[]
	);

	let uploading = $state(false);
	let uploadProgress = $state(0);
	let compressing = $state(false);
	let compressionProgress = $state(0);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let cameraInput: HTMLInputElement;
	let selectedPhotoIndex = $state<number | null>(null);

	// Browser-side service (uses browser supabase client)
	const shopPhotosService = createShopJobPhotosService(supabase);

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

	function handleUploadZoneKeydown(event: KeyboardEvent) {
		// Trigger file input on Enter or Space
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			triggerFileInput();
		}
	}

	async function uploadFiles(files: File[]) {
		uploading = false;
		compressing = true;
		uploadProgress = 0;
		compressionProgress = 0;

		try {
			const totalFiles = files.length;

			for (let i = 0; i < totalFiles; i++) {
				const file = files[i];

				// Validate file type
				if (!file.type.startsWith('image/')) {
					console.warn(`Skipping non-image file: ${file.name}`);
					continue;
				}

				// Upload to storage with compression
				const result = await storageService.uploadPhoto(file, {
					folder: `shop-jobs/${jobId}/${category}`,
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
				});

				// Get next sort order
				const nextSortOrder = await shopPhotosService.getNextSortOrder(jobId, category);

				// Build label
				const label = props.labelPrefix ? `${props.labelPrefix}: Photo ${nextSortOrder}` : null;

				// Create photo record
				const { data: newPhoto, error: createError } = await shopPhotosService.createPhoto({
					job_id: jobId,
					storage_path: result.path,
					label: label ?? '',
					category,
					sort_order: nextSortOrder
				});

				if (createError) {
					console.error('Error creating photo record:', createError);
					// Clean up storage on DB failure
					await storageService.deletePhoto(result.path);
					throw new Error('Failed to save photo record');
				}

				if (newPhoto) {
					// Add to optimistic array immediately for instant UI feedback
					photos.add(newPhoto as ShopPhoto);
				}

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
			compressing = false;
			uploadProgress = 0;
			// Reset file inputs to allow re-capture
			if (fileInput) fileInput.value = '';
			if (cameraInput) cameraInput.value = '';
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
			await shopPhotosService.deletePhoto(photoId);

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
			await shopPhotosService.deletePhoto(photoId);

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
			const { error: updateError } = await shopPhotosService.updateLabel(photoId, label);
			if (updateError) throw updateError;

			// Refresh photos to get updated data (will sync via $effect)
			await onUpdate();
		} catch (error) {
			console.error('Error updating label:', error);

			// Revert optimistic update on error
			await onUpdate();

			throw error; // Re-throw to let PhotoViewer handle error display
		}
	}
</script>

<!-- Unified Photo Panel -->
<Card class="p-6">
	<h3 class="mb-1 text-lg font-semibold text-slate-900">
		{photos.value.length === 0 ? props.title : `${props.title} (${photos.value.length})`}
	</h3>
	{#if props.description}
		<p class="mb-4 text-sm text-slate-500">{props.description}</p>
	{/if}

	{#if photos.value.length === 0}
		<!-- Empty state: Large centered upload zone -->
		<div
			class="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors {isDragging
				? 'border-rose-500 bg-rose-50'
				: 'border-slate-300 hover:border-slate-400'}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			role="button"
			tabindex={0}
			aria-label="Upload photos - drag and drop or click to select"
		>
			{#if compressing || uploading}
				<FileUploadProgress
					isCompressing={compressing}
					isUploading={uploading}
					compressionProgress={compressionProgress}
					uploadProgress={uploadProgress}
					fileName=""
				/>
			{:else if isDragging}
				<div>
					<Upload class="mx-auto h-12 w-12 text-rose-500" />
					<p class="mt-2 text-sm font-medium text-rose-600">Drop photos here to upload</p>
				</div>
			{:else}
				<Upload class="mx-auto h-12 w-12 text-slate-400" />
				<p class="mt-2 text-sm text-slate-600">
					Drag & drop photos or <button
						type="button"
						onclick={triggerFileInput}
						class="font-medium text-rose-600 hover:text-rose-800"
					>
						browse
					</button>
				</p>
				<p class="mt-1 text-xs text-slate-500">
					Supports: JPG, PNG, GIF • Multiple files supported
				</p>
				<div class="mt-4 flex gap-2 justify-center">
					<Button onclick={triggerFileInput}>
						<Upload class="mr-2 h-4 w-4" />
						Upload Photos
					</Button>
					<Button onclick={triggerCameraInput} variant="outline">
						<Camera class="mr-2 h-4 w-4" />
						Camera
					</Button>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Grid with upload zone as first item -->
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto p-1">
			<!-- Upload zone as first grid cell -->
			<div
				class="relative w-full aspect-square border-2 border-dashed rounded-lg transition-colors cursor-pointer {isDragging
					? 'border-rose-500 bg-rose-50'
					: 'border-slate-300 hover:border-slate-400 bg-slate-50'}"
				ondragenter={handleDragEnter}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				onclick={triggerFileInput}
				onkeydown={handleUploadZoneKeydown}
				role="button"
				tabindex={0}
				aria-label="Upload photos - drag and drop or click to select"
			>
				{#if compressing || uploading}
					<div class="absolute inset-0 flex flex-col items-center justify-center p-4">
						<FileUploadProgress
							isCompressing={compressing}
							isUploading={uploading}
							compressionProgress={compressionProgress}
							uploadProgress={uploadProgress}
							fileName=""
							class="w-full"
						/>
					</div>
				{:else if isDragging}
					<div class="absolute inset-0 flex flex-col items-center justify-center p-4">
						<Upload class="h-8 w-8 text-rose-500" />
						<p class="mt-2 text-xs font-medium text-rose-600 text-center">Drop here</p>
					</div>
				{:else}
					<div class="absolute inset-0 flex flex-col items-center justify-center p-4">
						<Upload class="h-8 w-8 text-slate-400" />
						<p class="mt-2 text-xs text-slate-600 text-center font-medium">Add Photos</p>
					</div>
				{/if}
			</div>

			<!-- Photo thumbnails -->
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
								src={storageService.toPhotoProxyUrl(photo.storage_path)}
								alt={photo.label || 'Shop job photo'}
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
</Card>

<!-- Photo Viewer -->
{#if selectedPhotoIndex !== null}
	<PhotoViewer
		photos={photosForViewer}
		startIndex={selectedPhotoIndex}
		onClose={closePhotoViewer}
		onDelete={handlePhotoDelete}
		onLabelUpdate={handleLabelUpdate}
	/>
{/if}
