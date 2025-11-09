<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Camera, Upload, X, Loader2 } from 'lucide-svelte';
	import { storageService } from '$lib/services/storage.service';
	import PhotoViewer from '$lib/components/photo-viewer/PhotoViewer.svelte';

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
	let uploadProgress = $state(0);
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
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			error = 'Please drop an image file';
			return;
		}

		await uploadFile(file);
	}

	async function uploadFile(file: File) {
		uploading = true;
		uploadProgress = 0;
		error = null;

		try {
			// Simulate progress for better UX
			const progressInterval = setInterval(() => {
				if (uploadProgress < 90) {
					uploadProgress += 10;
				}
			}, 100);

			const result = await storageService.uploadAssessmentPhoto(
				file,
				assessmentId,
				category,
				subcategory
			);

			clearInterval(progressInterval);
			uploadProgress = 100;

			// Small delay to show 100% before completing
			await new Promise(resolve => setTimeout(resolve, 300));

			// Set optimistic display URL immediately for instant UI feedback
			displayUrl = result.url;

			// Notify parent to persist and update props
			onUpload(result.url);
		} catch (err) {
			console.error('Upload error:', err);
			error = err instanceof Error ? err.message : 'Failed to upload photo';
		} finally {
			uploading = false;
			uploadProgress = 0;
		}
	}

	function handleRemove() {
		// Clear optimistic display
		displayUrl = null;

		if (onRemove) {
			onRemove();
		}
		error = null;
	}

	function triggerFileInput() {
		fileInput?.click();
	}

	function triggerCameraInput() {
		cameraInput?.click();
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
		<label class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	{#if currentPhotoUrl}
		<!-- Photo Preview - Clickable -->
		<div class="relative bg-gray-100 rounded-lg flex items-center justify-center group">
			<button
				type="button"
				onclick={openPhotoViewer}
				class="w-full {height} rounded-lg overflow-hidden cursor-pointer"
			>
				<img
					src={currentPhotoUrl}
					alt={label || 'Photo'}
					class="w-full h-full object-contain hover:opacity-90 transition-opacity"
				/>
			</button>
			{#if !disabled}
				<div class="absolute right-2 top-2 flex gap-2 z-10">
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
			class="flex gap-2"
			role="region"
			aria-label="Photo upload area"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<button
				type="button"
				class="flex {height} flex-1 items-center justify-center rounded-lg border-2 border-dashed transition-all {isDragging
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-300 bg-gray-50 hover:bg-gray-100'} disabled:cursor-not-allowed disabled:opacity-50"
				onclick={triggerCameraInput}
				disabled={disabled || uploading}
			>
				<div class="text-center pointer-events-none">
					{#if uploading}
						<div class="space-y-2">
							<Loader2 class="mx-auto h-8 w-8 animate-spin text-blue-500" />
							<p class="text-sm font-medium text-gray-700">Uploading...</p>
							<div class="mx-auto h-2 w-32 overflow-hidden rounded-full bg-gray-200">
								<div
									class="h-full bg-blue-500 transition-all duration-300"
									style="width: {uploadProgress}%"
								></div>
							</div>
							<p class="text-xs text-gray-500">{uploadProgress}%</p>
						</div>
					{:else if isDragging}
						<div>
							<Upload class="mx-auto h-8 w-8 text-blue-500" />
							<p class="mt-2 text-sm font-medium text-blue-600">Drop photo here</p>
						</div>
					{:else}
						<Camera class="mx-auto h-8 w-8 text-gray-400" />
						<p class="mt-2 text-sm text-gray-600">Take Photo</p>
					{/if}
				</div>
			</button>

			<button
				type="button"
				class="flex {height} flex-1 items-center justify-center rounded-lg border-2 border-dashed transition-all {isDragging
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-300 bg-gray-50 hover:bg-gray-100'} disabled:cursor-not-allowed disabled:opacity-50"
				onclick={triggerFileInput}
				disabled={disabled || uploading}
			>
				<div class="text-center pointer-events-none">
					{#if uploading}
						<div class="space-y-2">
							<Loader2 class="mx-auto h-8 w-8 animate-spin text-blue-500" />
							<p class="text-sm font-medium text-gray-700">Uploading...</p>
							<div class="mx-auto h-2 w-32 overflow-hidden rounded-full bg-gray-200">
								<div
									class="h-full bg-blue-500 transition-all duration-300"
									style="width: {uploadProgress}%"
								></div>
							</div>
							<p class="text-xs text-gray-500">{uploadProgress}%</p>
						</div>
					{:else if isDragging}
						<div>
							<Upload class="mx-auto h-8 w-8 text-blue-500" />
							<p class="mt-2 text-sm font-medium text-blue-600">Drop photo here</p>
						</div>
					{:else}
						<Upload class="mx-auto h-8 w-8 text-gray-400" />
						<p class="mt-2 text-sm text-gray-600">Upload File</p>
						<p class="mt-1 text-xs text-gray-500">or drag & drop</p>
					{/if}
				</div>
			</button>
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
			? async (photoId: string, photoPath: string) => {
					handleRemove();
					closePhotoViewer();
				}
			: async () => {}}
	/>
{/if}
