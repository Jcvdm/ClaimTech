<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Camera, Upload, X, Loader2, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-svelte';
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
	const currentPhotoUrl = $derived(displayUrl ?? value);

	// Modal state
	let showModal = $state(false);
	let photoZoom = $state<number>(1);
	let modalSize = $state<'small' | 'medium' | 'large' | 'fullscreen'>('medium');

	// Derived modal size class for reactivity
	let modalSizeClass = $derived(
		modalSize === 'fullscreen'
			? '!max-w-full !max-h-full !w-screen !h-screen !inset-0 !translate-x-0 !translate-y-0 !rounded-none'
			: modalSize === 'large'
				? 'sm:!max-w-5xl md:!max-w-5xl lg:!max-w-5xl !max-h-[90vh]'
				: modalSize === 'medium'
					? 'sm:!max-w-3xl md:!max-w-3xl lg:!max-w-3xl !max-h-[80vh]'
					: 'sm:!max-w-2xl md:!max-w-2xl lg:!max-w-2xl !max-h-[70vh]'
	);

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
		isDragging = true;
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

	// Modal functions
	function openPhotoModal() {
		showModal = true;
		photoZoom = 1;
		modalSize = 'medium';
	}

	function closePhotoModal() {
		showModal = false;
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
				onclick={openPhotoModal}
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
				<div class="text-center">
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
				<div class="text-center">
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

<!-- Photo Preview Modal -->
{#if showModal && currentPhotoUrl}
	<Dialog.Root open={showModal} onOpenChange={closePhotoModal}>
		<Dialog.Content class={modalSizeClass}>
			<Dialog.Header>
				<div class="flex items-center justify-between">
					<Dialog.Title>{label || 'Photo Preview'}</Dialog.Title>

					<div class="flex items-center gap-2">
						<!-- Zoom Controls -->
						<div class="flex gap-1">
							<Button variant="ghost" size="sm" onclick={zoomOut} disabled={photoZoom <= 0.5}>
								<ZoomOut class="h-4 w-4" />
							</Button>
							<Button variant="ghost" size="sm" onclick={resetZoom}>
								<RotateCcw class="h-4 w-4" />
							</Button>
							<Button variant="ghost" size="sm" onclick={zoomIn} disabled={photoZoom >= 3}>
								<ZoomIn class="h-4 w-4" />
							</Button>
						</div>

						<!-- Size Controls -->
						<div class="flex gap-1">
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (modalSize = 'small')}
								class={modalSize === 'small' ? 'bg-gray-100' : ''}
							>
								S
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (modalSize = 'medium')}
								class={modalSize === 'medium' ? 'bg-gray-100' : ''}
							>
								M
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (modalSize = 'large')}
								class={modalSize === 'large' ? 'bg-gray-100' : ''}
							>
								L
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() =>
									(modalSize = modalSize === 'fullscreen' ? 'large' : 'fullscreen')}
							>
								{#if modalSize === 'fullscreen'}
									<Minimize2 class="h-4 w-4" />
								{:else}
									<Maximize2 class="h-4 w-4" />
								{/if}
							</Button>
						</div>
					</div>
				</div>
			</Dialog.Header>

			<!-- Large Photo with Zoom -->
			<div class="bg-gray-100 rounded-lg flex items-center justify-center p-4 overflow-auto">
				<img
					src={currentPhotoUrl}
					alt={label || 'Full size photo'}
					class="w-full h-auto max-h-[60vh] object-contain transition-transform duration-200"
					style="transform: scale({photoZoom})"
				/>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-between gap-2 pt-4">
				<div class="flex gap-2">
					{#if !disabled}
						<Button variant="outline" onclick={triggerFileInput}>
							Change Photo
						</Button>
						{#if onRemove}
							<Button
								variant="outline"
								onclick={() => {
									handleRemove();
									closePhotoModal();
								}}
							>
								<X class="mr-2 h-4 w-4" />
								Remove Photo
							</Button>
						{/if}
					{/if}
				</div>
				<Button onclick={closePhotoModal}>Close</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
