<script lang="ts">
	import { FileDropzone } from '$lib/components/ui/file-dropzone';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';
	import { storageService } from '$lib/services/storage.service';

	interface Props {
		value?: string | null;
		label?: string;
		required?: boolean;
		assessmentId: string;
		category: 'identification' | '360' | 'interior' | 'tyres' | 'damage';
		subcategory?: string;
		onUpload: (url: string) => void;
		onRemove?: () => void;
		disabled?: boolean;
		height?: string;
	}

	let {
		value = $bindable(null),
		label,
		required = false,
		assessmentId,
		category,
		subcategory,
		onUpload,
		onRemove,
		disabled = false,
		height = 'h-32'
	}: Props = $props();

	// State
	let uploadProgress = $state(0);
	let selectedPhotoIndex = $state<number | null>(null);
	let displayUrl = $state<string | null>(null);

	// Clear optimistic display when parent prop matches
	$effect(() => {
		if (displayUrl && value && displayUrl === value) {
			displayUrl = null;
		}
	});

	// Current photo URL (optimistic or actual)
	const currentPhotoUrl = $derived.by(() => {
		const url = displayUrl ?? value;
		if (!url) return null;
		return storageService.toPhotoProxyUrl(url);
	});

	// Upload handler
	async function handleUpload(files: File[]): Promise<void> {
		const file = files[0];
		if (!file) return;

		try {
			uploadProgress = 0;

			// Upload to storage
			const result = await storageService.uploadAssessmentPhoto(
				file,
				assessmentId,
				category,
				subcategory
			);

			// Set optimistic display
			displayUrl = result.url;

			// Notify parent
			onUpload(result.url);

			uploadProgress = 0;
		} catch (error) {
			uploadProgress = 0;
			throw error;
		}
	}

	// Remove handler
	function handleRemove() {
		if (onRemove) {
			onRemove();
		}
		displayUrl = null;
	}

	// Photo viewer handlers
	function openPhotoViewer() {
		selectedPhotoIndex = 0;
	}

	function closePhotoViewer() {
		selectedPhotoIndex = null;
	}

	async function handlePhotoDelete() {
		handleRemove();
		closePhotoViewer();
	}
</script>

<!-- Label -->
{#if label}
	<label for="photo-upload" class="mb-2 block text-sm font-medium text-gray-700">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</label>
{/if}

<!-- File Dropzone -->
{#if currentPhotoUrl}
	<!-- Preview with click to view -->
	<button
		id="photo-upload"
		type="button"
		onclick={openPhotoViewer}
		disabled={disabled}
		class="group relative block w-full overflow-hidden rounded-lg border-2 border-gray-200 transition-all hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
	>
		<img
			src={currentPhotoUrl}
			alt={label || 'Photo'}
			class="h-48 w-full object-cover transition-transform group-hover:scale-105"
		/>
		<div
			class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
		>
			<span class="text-sm font-medium text-white">Click to view</span>
		</div>
	</button>

	<!-- Remove button -->
	{#if !disabled && onRemove}
		<button
			type="button"
			onclick={handleRemove}
			class="mt-2 text-sm text-red-600 hover:text-red-700"
		>
			Remove Photo
		</button>
	{/if}
{:else}
	<!-- Upload dropzone -->
	<FileDropzone
		accept={['image/jpeg', 'image/png', 'image/webp', 'image/heic']}
		maxSize={10 * 1024 * 1024}
		{disabled}
		showCamera={true}
		{height}
		{label}
		progress={uploadProgress}
		onUpload={handleUpload}
	/>
{/if}

<!-- Photo Viewer -->
{#if selectedPhotoIndex !== null && currentPhotoUrl}
	<PhotoViewer
		photos={[
			{
				id: 'current-photo',
				photo_url: value || '',
				photo_path: value || '',
				label: label || 'Photo',
				display_order: 0,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			} as any
		]}
		startIndex={0}
		onClose={closePhotoViewer}
		onDelete={onRemove
			? async () => {
					await handlePhotoDelete();
				}
			: async () => {}}
	/>
{/if}

