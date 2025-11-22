<script lang="ts">
	import { Camera, Upload, X, Loader2, FileIcon } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	interface Props {
		/** Accepted MIME types (e.g., ['image/jpeg', 'image/png']) */
		accept?: string[];
		/** Maximum file size in bytes (default: 5MB) */
		maxSize?: number;
		/** Maximum number of files (default: 1) */
		maxFiles?: number;
		/** Current file(s) */
		value?: File | File[] | null;
		/** Disabled state */
		disabled?: boolean;
		/** Show camera button for mobile capture */
		showCamera?: boolean;
		/** Custom height class (default: h-32) */
		height?: string;
		/** Upload handler */
		onUpload: (files: File[]) => Promise<void>;
		/** Remove handler */
		onRemove?: (file: File) => void;
		/** Custom validator function */
		validator?: (file: File) => string | null;
		/** Upload progress (0-100) */
		progress?: number;
		/** Show preview */
		showPreview?: boolean;
		/** Preview URL (for existing files) */
		previewUrl?: string | null;
		/** Label for accessibility */
		label?: string;
	}

	let {
		accept = ['image/*'],
		maxSize = 5 * 1024 * 1024, // 5MB
		maxFiles = 1,
		value = $bindable(null),
		disabled = false,
		showCamera = false,
		height = 'h-32',
		onUpload,
		onRemove,
		validator,
		progress = 0,
		showPreview = true,
		previewUrl = null,
		label = 'File upload'
	}: Props = $props();

	// State
	let isDragging = $state(false);
	let uploading = $state(false);
	let error = $state<string | null>(null);
	let localPreview = $state<string | null>(null);
	// DOM references - use $state for Svelte 5 compatibility with bind:this
	let fileInput = $state<HTMLInputElement>();
	let cameraInput = $state<HTMLInputElement>();

	// Computed
	const files = $derived(Array.isArray(value) ? value : value ? [value] : []);
	const hasFiles = $derived(files.length > 0);
	const currentPreview = $derived(localPreview || previewUrl);
	const isImage = $derived(
		accept.some((type) => type.startsWith('image/')) ||
			(hasFiles && files[0].type.startsWith('image/'))
	);

	// Validation
	function validateFile(file: File): string | null {
		// Check file count
		if (maxFiles === 1 && hasFiles) {
			return 'Only one file allowed';
		}
		if (files.length >= maxFiles) {
			return `Maximum ${maxFiles} files allowed`;
		}

		// Check file size
		if (file.size > maxSize) {
			const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
			return `File size must be less than ${sizeMB}MB`;
		}

		// Check MIME type
		if (accept.length > 0 && !accept.includes('*/*')) {
			const fileType = file.type;
			const isAccepted = accept.some((type) => {
				if (type.endsWith('/*')) {
					const category = type.split('/')[0];
					return fileType.startsWith(category + '/');
				}
				return fileType === type;
			});

			if (!isAccepted) {
				return `File type not accepted. Allowed: ${accept.join(', ')}`;
			}
		}

		// Custom validation
		if (validator) {
			return validator(file);
		}

		return null;
	}

	function validateFiles(fileList: File[]): string | null {
		for (const file of fileList) {
			const err = validateFile(file);
			if (err) return err;
		}
		return null;
	}

	// Preview generation
	async function generatePreview(file: File) {
		if (!isImage || !showPreview) {
			localPreview = null;
			return;
		}

		return new Promise<void>((resolve) => {
			const reader = new FileReader();
			reader.onload = () => {
				localPreview = reader.result as string;
				resolve();
			};
			reader.onerror = () => {
				localPreview = null;
				resolve();
			};
			reader.readAsDataURL(file);
		});
	}

	// File handling
	async function handleFiles(fileList: FileList | File[]) {
		const newFiles = Array.from(fileList);
		error = null;

		// Validate
		const validationError = validateFiles(newFiles);
		if (validationError) {
			error = validationError;
			return;
		}

		// Update value
		if (maxFiles === 1) {
			value = newFiles[0];
			await generatePreview(newFiles[0]);
		} else {
			value = [...files, ...newFiles].slice(0, maxFiles);
		}

		// Upload
		try {
			uploading = true;
			await onUpload(newFiles);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
			value = null;
			localPreview = null;
		} finally {
			uploading = false;
		}
	}

	// Drag handlers (single parent only - no child handlers)
	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!disabled && !uploading) {
			isDragging = true;
		}
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

		if (disabled || uploading) return;

		const droppedFiles = event.dataTransfer?.files;
		if (droppedFiles && droppedFiles.length > 0) {
			await handleFiles(droppedFiles);
		}
	}

	// Input handlers
	async function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			await handleFiles(target.files);
		}
	}

	function triggerFileInput() {
		fileInput?.click();
	}

	function triggerCameraInput() {
		cameraInput?.click();
	}

	function handleRemove() {
		if (onRemove && value) {
			const fileToRemove = Array.isArray(value) ? value[0] : value;
			onRemove(fileToRemove);
		}
		value = null;
		localPreview = null;
		error = null;
	}
</script>

<!-- Hidden file inputs -->
<input
	bind:this={fileInput}
	type="file"
	accept={accept.join(',')}
	multiple={maxFiles > 1}
	onchange={handleFileInput}
	class="hidden"
	aria-label={label}
/>

{#if showCamera}
	<input
		bind:this={cameraInput}
		type="file"
		accept="image/*"
		capture="environment"
		onchange={handleFileInput}
		class="hidden"
		aria-label="{label} (camera)"
	/>
{/if}

<!-- Dropzone -->
<div class="space-y-2">
	{#if hasFiles && currentPreview && showPreview}
		<!-- Preview State -->
		<div class="relative">
			<button
				type="button"
				onclick={triggerFileInput}
				disabled={disabled || uploading}
				class="group relative block w-full overflow-hidden rounded-lg border-2 border-gray-200 transition-all hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<img
					src={currentPreview}
					alt="Preview"
					class="h-48 w-full object-cover transition-transform group-hover:scale-105"
				/>
				<div
					class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<Upload class="h-8 w-8 text-white" />
				</div>
			</button>

			{#if !disabled && onRemove}
				<Button
					variant="destructive"
					size="icon"
					class="absolute right-2 top-2"
					onclick={handleRemove}
					disabled={uploading}
				>
					<X class="h-4 w-4" />
				</Button>
			{/if}
		</div>
	{:else}
		<!-- Upload State -->
		<div
			class="flex gap-2"
			role="region"
			aria-label={label}
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			{#if showCamera}
				<button
					type="button"
					class="flex {height} flex-1 items-center justify-center rounded-lg border-2 border-dashed transition-all {isDragging
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-300 bg-gray-50 hover:bg-gray-100'} disabled:cursor-not-allowed disabled:opacity-50"
					onclick={triggerCameraInput}
					disabled={disabled || uploading}
				>
					<div class="pointer-events-none text-center">
						{#if uploading}
							<Loader2 class="mx-auto h-8 w-8 animate-spin text-blue-500" />
							<p class="mt-2 text-sm font-medium text-gray-700">Uploading...</p>
							{#if progress > 0}
								<div class="mx-auto mt-2 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
									<div
										class="h-full bg-blue-500 transition-all duration-300"
										style="width: {progress}%"
									></div>
								</div>
							{/if}
						{:else}
							<Camera class="mx-auto h-8 w-8 text-gray-400" />
							<p class="mt-2 text-sm text-gray-600">Take Photo</p>
						{/if}
					</div>
				</button>
			{/if}

			<button
				type="button"
				class="flex {height} flex-1 items-center justify-center rounded-lg border-2 border-dashed transition-all {isDragging
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-300 bg-gray-50 hover:bg-gray-100'} disabled:cursor-not-allowed disabled:opacity-50"
				onclick={triggerFileInput}
				disabled={disabled || uploading}
			>
				<div class="pointer-events-none text-center">
					{#if uploading}
						<Loader2 class="mx-auto h-8 w-8 animate-spin text-blue-500" />
						<p class="mt-2 text-sm font-medium text-gray-700">Uploading...</p>
						{#if progress > 0}
							<div class="mx-auto mt-2 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
								<div
									class="h-full bg-blue-500 transition-all duration-300"
									style="width: {progress}%"
								></div>
							</div>
						{/if}
					{:else if isDragging}
						<Upload class="mx-auto h-8 w-8 text-blue-500" />
						<p class="mt-2 text-sm font-medium text-blue-600">Drop file here</p>
					{:else}
						<Upload class="mx-auto h-8 w-8 text-gray-400" />
						<p class="mt-2 text-sm text-gray-600">
							{showCamera ? 'Upload File' : 'Click to upload or drag and drop'}
						</p>
					{/if}
				</div>
			</button>
		</div>
	{/if}

	<!-- Error Display -->
	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>

