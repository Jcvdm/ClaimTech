<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Camera, Upload, X } from 'lucide-svelte';
	import { storageService } from '$lib/services/storage.service';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';
	import { FileUploadProgress } from '$lib/components/ui/progress';

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

	// Make props reactive using $derived instead of destructuring
	// This ensures component reacts to parent prop updates without re-mount
	let props: Props = $props();

	// Reactive derived props
	const value = $derived(props.value ?? null);
	const label = $derived(props.label);
	const required = $derived(props.required ?? false);
	const assessmentId = $derived(props.assessmentId);
	const category = $derived(props.category);
	const subcategory = $derived(props.subcategory);
	const onUpload = $derived(props.onUpload);
	const onRemove = $derived(props.onRemove);
	const disabled = $derived(props.disabled ?? false);
	const height = $derived(props.height ?? 'h-32');

	let uploading = $state(false);
	let compressing = $state(false);
	let uploadProgress = $state(0);
	let compressionProgress = $state(0);
	let error = $state<string | null>(null);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let cameraInput: HTMLInputElement;

	// Optimistic UI: display uploaded photo immediately while waiting for parent to update props
	let displayUrl = $state<string | null>(null);

	// Clear optimistic display when parent prop matches
	$effect(() => {
		if (displayUrl && value && displayUrl === value) {
			displayUrl = null;
		}
	});

	// Use displayUrl if available (optimistic), otherwise use prop value
	// Convert to proxy URL format for display
	// Use $derived.by() to create a derived VALUE (not a function)
	const currentPhotoUrl = $derived.by(() => {
		const url = displayUrl ?? value;
		if (!url) return null;
		// Convert any URL format to proxy URL
		return storageService.toPhotoProxyUrl(url);
	});

	// Photo viewer state
	let selectedPhotoIndex = $state<number | null>(null);

	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		await uploadFile(file);
	}

	async function handleCameraCapture(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		await uploadFile(file);
	}

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

		const file = event.dataTransfer?.files?.[0];
		if (file) {
			await uploadFile(file);
		}
	}

	// Upload file with compression
	async function uploadFile(file: File) {
		uploading = false;
		compressing = true;
		uploadProgress = 0;
		compressionProgress = 0;
		error = null;

		try {
			// Upload with compression and upload progress tracking
			const result = await storageService.uploadAssessmentPhoto(
				file,
				assessmentId,
				category,
				subcategory,
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

			// Set optimistic display
			displayUrl = result.url;

			// Notify parent
			onUpload(result.url);
		} catch (err) {
			console.error('Upload error:', err);
			error = err instanceof Error ? err.message : 'Failed to upload photo';
		} finally {
			uploading = false;
			compressing = false;
			uploadProgress = 0;
			compressionProgress = 0;
		}
	}

	// Helper functions
	function triggerFileInput() {
		fileInput?.click();
	}

	function triggerCameraInput() {
		cameraInput?.click();
	}

	function handleRemove() {
		if (onRemove) {
			onRemove();
		}
		displayUrl = null;
		error = null;
	}

	// Photo viewer functions
	function openPhotoViewer() {
		selectedPhotoIndex = 0;
	}

	function closePhotoViewer() {
		selectedPhotoIndex = null;
	}
</script>

<div class="space-y-2">
	{#if label}
		<div class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</div>
	{/if}

	{#if currentPhotoUrl}
		<!-- Photo Preview - Clickable -->
		<div class="group relative flex items-center justify-center rounded-lg bg-gray-100">
			<button
				type="button"
				onclick={openPhotoViewer}
				class="w-full {height} cursor-pointer overflow-hidden rounded-lg"
			>
				<img
					src={currentPhotoUrl}
					alt={label || 'Photo'}
					class="h-full w-full object-contain transition-opacity hover:opacity-90"
				/>
			</button>
			{#if !disabled}
				<div class="absolute top-2 right-2 z-10 flex gap-2">
					<Button
						size="sm"
						variant="outline"
						class="bg-white"
						onclick={triggerFileInput}
						disabled={uploading}
					>
						Change
					</Button>
					{#if onRemove}
						<Button
							size="sm"
							variant="outline"
							class="bg-white"
							onclick={handleRemove}
							disabled={uploading}
						>
							<X class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<!-- Upload Area with Drag & Drop -->
		<div
			role="button"
			tabindex="0"
			class="relative rounded-lg border-2 border-dashed transition-colors {isDragging
				? 'border-rose-500 bg-rose-50'
				: 'border-gray-300 bg-gray-50 hover:bg-gray-100'} {uploading || compressing ? 'opacity-50' : ''} {height}"
			aria-label="Photo upload area"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onkeydown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					triggerFileInput();
				}
			}}
		>
			<div class="flex h-full min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
				{#if compressing || uploading}
					<FileUploadProgress
						isCompressing={compressing}
						isUploading={uploading}
						compressionProgress={compressionProgress}
						uploadProgress={uploadProgress}
						fileName=""
					/>
				{:else if isDragging}
					<div class="flex flex-col items-center gap-2">
						<Upload class="h-8 w-8 text-rose-500" />
						<p class="text-sm font-medium text-rose-600">Drop photo here</p>
					</div>
				{:else}
					<Upload class="h-8 w-8 text-gray-400" />
					<p class="text-sm text-gray-600">
						Drag and drop photo here, or
						<button
							type="button"
							class="ml-1 text-rose-600 font-medium hover:text-rose-700 disabled:cursor-not-allowed disabled:text-rose-300"
							onclick={triggerFileInput}
							disabled={disabled || uploading || compressing}
						>
							browse
						</button>
					</p>
					<p class="text-xs text-gray-500">Supports: JPG, PNG, GIF</p>
					<div class="mt-2 flex gap-2 justify-center">
						<Button
							size="sm"
							variant="outline"
							onclick={triggerCameraInput}
							disabled={disabled || uploading || compressing}
						>
							<Camera class="mr-2 h-4 w-4" />
							Camera
						</Button>
						<Button
							size="sm"
							onclick={triggerFileInput}
							disabled={disabled || uploading || compressing}
						>
							<Upload class="mr-2 h-4 w-4" />
							Upload
						</Button>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}

	<!-- Hidden file inputs -->
	<input
		type="file"
		bind:this={fileInput}
		onchange={handleFileSelect}
		accept="image/*"
		class="hidden"
	/>
	<input
		type="file"
		bind:this={cameraInput}
		onchange={handleCameraCapture}
		accept="image/*"
		capture="environment"
		class="hidden"
	/>
</div>

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
					handleRemove();
					closePhotoViewer();
				}
			: async () => {}}
	/>
{/if}
