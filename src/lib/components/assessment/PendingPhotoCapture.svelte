<script lang="ts">
	import { Camera, Upload, X, Loader2, ImageIcon } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { imageCompressionService } from '$lib/services/image-compression.service';
	import { cn } from '$lib/utils';

	/**
	 * Represents a photo that is pending upload (held locally until form submit)
	 */
	export interface PendingPhoto {
		/** Unique temp ID for tracking */
		id: string;
		/** Original file (for reference) */
		originalFile: File;
		/** Compressed file ready for upload */
		compressedFile: File;
		/** Object URL for preview display */
		previewUrl: string;
		/** Original size in bytes */
		originalSize: number;
		/** Compressed size in bytes */
		compressedSize: number;
		/** Compression ratio (0-1, e.g., 0.3 = 70% reduction) */
		compressionRatio: number;
		/** Current status */
		status: 'compressing' | 'ready' | 'error';
		/** Error message if status is 'error' */
		error?: string;
	}

	interface Props {
		/** Max number of photos allowed (default: 5) */
		maxPhotos?: number;
		/** Callback when photos change */
		onPhotosChange: (photos: PendingPhoto[]) => void;
		/** Whether to show camera capture button (default: true) */
		showCamera?: boolean;
		/** Compact mode for inline use (default: false) */
		compact?: boolean;
		/** Disabled state */
		disabled?: boolean;
	}

	let {
		maxPhotos = 5,
		onPhotosChange,
		showCamera = true,
		compact = false,
		disabled = false
	}: Props = $props();

	// Local state for pending photos
	let pendingPhotos = $state<PendingPhoto[]>([]);

	// DOM references
	let fileInput = $state<HTMLInputElement>();
	let cameraInput = $state<HTMLInputElement>();

	// Computed values
	const canAddMore = $derived(pendingPhotos.length < maxPhotos);
	const readyPhotos = $derived(pendingPhotos.filter(p => p.status === 'ready'));
	const compressingCount = $derived(pendingPhotos.filter(p => p.status === 'compressing').length);
	const totalSize = $derived(
		readyPhotos.reduce((sum, p) => sum + p.compressedSize, 0)
	);

	// Generate unique ID
	function generateId(): string {
		return `pending-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	// Format file size for display
	function formatSize(bytes: number): string {
		return imageCompressionService.formatFileSize(bytes);
	}

	// Handle file selection (from either input)
	async function handleFiles(fileList: FileList | null) {
		if (!fileList || fileList.length === 0) return;

		const files = Array.from(fileList);
		const availableSlots = maxPhotos - pendingPhotos.length;
		const filesToProcess = files.slice(0, availableSlots);

		// Add placeholder entries for each file
		const newPhotos: PendingPhoto[] = filesToProcess.map(file => ({
			id: generateId(),
			originalFile: file,
			compressedFile: file, // Placeholder until compressed
			previewUrl: URL.createObjectURL(file),
			originalSize: file.size,
			compressedSize: file.size,
			compressionRatio: 0,
			status: 'compressing' as const
		}));

		// Add to state immediately for UI feedback
		pendingPhotos = [...pendingPhotos, ...newPhotos];
		onPhotosChange(pendingPhotos);

		// Compress each file
		for (const photo of newPhotos) {
			try {
				const result = await imageCompressionService.compressImage(photo.originalFile, {
					maxWidthOrHeight: 1920,
					maxSizeMB: 2,
					quality: 0.85
				});

				// Update the photo with compression result
				pendingPhotos = pendingPhotos.map(p => {
					if (p.id === photo.id) {
						// Revoke old preview URL and create new one for compressed file
						URL.revokeObjectURL(p.previewUrl);
						return {
							...p,
							compressedFile: result.compressedFile,
							previewUrl: URL.createObjectURL(result.compressedFile),
							compressedSize: result.compressedSize,
							compressionRatio: result.compressionRatio / 100, // Convert to 0-1 range
							status: 'ready' as const
						};
					}
					return p;
				});
				onPhotosChange(pendingPhotos);
			} catch (error) {
				// Update photo with error status
				pendingPhotos = pendingPhotos.map(p => {
					if (p.id === photo.id) {
						return {
							...p,
							status: 'error' as const,
							error: error instanceof Error ? error.message : 'Compression failed'
						};
					}
					return p;
				});
				onPhotosChange(pendingPhotos);
			}
		}

		// Reset file inputs
		if (fileInput) fileInput.value = '';
		if (cameraInput) cameraInput.value = '';
	}

	// Remove a pending photo
	function removePhoto(id: string) {
		const photo = pendingPhotos.find(p => p.id === id);
		if (photo) {
			URL.revokeObjectURL(photo.previewUrl);
		}
		pendingPhotos = pendingPhotos.filter(p => p.id !== id);
		onPhotosChange(pendingPhotos);
	}

	// Clear all pending photos (called by parent on form reset)
	export function clear() {
		pendingPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
		pendingPhotos = [];
		onPhotosChange(pendingPhotos);
	}

	// Get all ready photos (for parent to upload)
	export function getReadyPhotos(): PendingPhoto[] {
		return readyPhotos;
	}

	// Input handlers
	function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		handleFiles(target.files);
	}

	function triggerFileInput() {
		fileInput?.click();
	}

	function triggerCameraInput() {
		cameraInput?.click();
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			pendingPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
		};
	});
</script>

<!-- Hidden file inputs -->
<input
	bind:this={fileInput}
	type="file"
	accept="image/jpeg,image/png,image/webp,image/heic"
	multiple
	onchange={handleFileInput}
	class="hidden"
	aria-label="Select photos"
/>

{#if showCamera}
	<input
		bind:this={cameraInput}
		type="file"
		accept="image/*"
		capture="environment"
		onchange={handleFileInput}
		class="hidden"
		aria-label="Take photo"
	/>
{/if}

<!-- Main container -->
<div class={cn('space-y-2', compact ? 'text-sm' : '')}>
	<!-- Label row -->
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium text-gray-700">
			Photos (optional)
		</span>
		{#if pendingPhotos.length > 0}
			<span class="text-xs text-gray-500">
				{readyPhotos.length} of {maxPhotos} · {formatSize(totalSize)}
			</span>
		{/if}
	</div>

	<!-- Photo grid with add buttons -->
	<div class="flex flex-wrap gap-2">
		<!-- Existing photo previews -->
		{#each pendingPhotos as photo (photo.id)}
			<div class="relative">
				<div
					class={cn(
						'relative h-16 w-16 overflow-hidden rounded-lg border-2',
						photo.status === 'compressing' && 'border-blue-300 bg-blue-50',
						photo.status === 'ready' && 'border-gray-200',
						photo.status === 'error' && 'border-red-300 bg-red-50'
					)}
				>
					<img
						src={photo.previewUrl}
						alt="Preview"
						class={cn(
							'h-full w-full object-cover',
							photo.status === 'compressing' && 'opacity-50'
						)}
					/>

					<!-- Compression overlay -->
					{#if photo.status === 'compressing'}
						<div class="absolute inset-0 flex items-center justify-center bg-black/30">
							<Loader2 class="h-5 w-5 animate-spin text-white" />
						</div>
					{/if}

					<!-- Error overlay -->
					{#if photo.status === 'error'}
						<div class="absolute inset-0 flex items-center justify-center bg-red-500/50">
							<X class="h-5 w-5 text-white" />
						</div>
					{/if}

					<!-- Remove button -->
					<button
						type="button"
						onclick={() => removePhoto(photo.id)}
						disabled={disabled}
						class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
						aria-label="Remove photo"
					>
						<X class="h-3 w-3" />
					</button>
				</div>

				<!-- Compression stats (tiny) -->
				{#if photo.status === 'ready' && photo.compressionRatio > 0.1}
					<div class="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-[10px] text-white">
						-{Math.round(photo.compressionRatio * 100)}%
					</div>
				{/if}
			</div>
		{/each}

		<!-- Add buttons (only if can add more) -->
		{#if canAddMore && !disabled}
			{#if showCamera}
				<button
					type="button"
					onclick={triggerCameraInput}
					class="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
					aria-label="Take photo with camera"
				>
					<Camera class="h-5 w-5" />
					<span class="mt-0.5 text-[10px]">Camera</span>
				</button>
			{/if}

			<button
				type="button"
				onclick={triggerFileInput}
				class="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
				aria-label="Select photos from device"
			>
				<Upload class="h-5 w-5" />
				<span class="mt-0.5 text-[10px]">Upload</span>
			</button>
		{/if}

		<!-- Empty state -->
		{#if pendingPhotos.length === 0 && !canAddMore}
			<div class="flex h-16 items-center justify-center text-sm text-gray-400">
				<ImageIcon class="mr-2 h-4 w-4" />
				No photos
			</div>
		{/if}
	</div>

	<!-- Status messages -->
	{#if compressingCount > 0}
		<p class="flex items-center gap-1 text-xs text-blue-600">
			<Loader2 class="h-3 w-3 animate-spin" />
			Compressing {compressingCount} photo{compressingCount > 1 ? 's' : ''}...
		</p>
	{/if}

	{#if pendingPhotos.some(p => p.status === 'error')}
		<p class="text-xs text-red-600">
			Some photos failed to compress. They will not be uploaded.
		</p>
	{/if}

	<!-- Max photos reached message -->
	{#if !canAddMore && pendingPhotos.length === maxPhotos}
		<p class="text-xs text-gray-500">
			Maximum {maxPhotos} photos reached
		</p>
	{/if}
</div>
