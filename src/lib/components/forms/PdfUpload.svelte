<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Upload, FileText, X, Download, Maximize2, Minimize2, Eye } from 'lucide-svelte';
	import { storageService } from '$lib/services/storage.service';
	import { Progress } from '$lib/components/ui/progress';

	interface Props {
		value?: string | null;
		label?: string;
		assessmentId: string;
		category: 'values' | 'reports' | 'documents';
		onUpload: (url: string, path: string) => void;
		onRemove?: () => void;
		disabled?: boolean;
	}

	let {
		value = null,
		label = 'Upload PDF',
		assessmentId,
		category,
		onUpload,
		onRemove,
		disabled = false
	}: Props = $props();

	let uploading = $state(false);
	let uploadProgress = $state(0);
	let error = $state<string | null>(null);
	let isDragging = $state(false);
	let fileInput = $state<HTMLInputElement | undefined>(undefined);

	// Modal state
	let showModal = $state(false);
	let modalSize = $state<'medium' | 'large' | 'fullscreen'>('large');

	// Derived modal size class for reactivity
	let modalSizeClass = $derived(
		modalSize === 'fullscreen'
			? '!max-w-full !max-h-full !w-screen !h-screen !inset-0 !translate-x-0 !translate-y-0 !rounded-none'
			: modalSize === 'large'
				? 'sm:!max-w-6xl md:!max-w-6xl lg:!max-w-6xl !max-h-[95vh]'
				: 'sm:!max-w-4xl md:!max-w-4xl lg:!max-w-4xl !max-h-[85vh]'
	);

	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		await uploadFile(file);
	}

	// Drag and drop handlers
	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!disabled) {
			isDragging = true;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (!disabled) {
			isDragging = true;
		}
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

		if (disabled) return;

		const file = event.dataTransfer?.files?.[0];
		if (!file) return;

		// Validate file type
		if (file.type !== 'application/pdf') {
			error = 'Please drop a PDF file';
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

			const result = await storageService.uploadAssessmentPdf(file, assessmentId, category);

			clearInterval(progressInterval);
			uploadProgress = 100;

			// Small delay to show 100% before completing
			await new Promise((resolve) => setTimeout(resolve, 300));

			onUpload(result.url, result.path);
		} catch (err) {
			console.error('Upload error:', err);
			error = err instanceof Error ? err.message : 'Failed to upload PDF';
		} finally {
			uploading = false;
			uploadProgress = 0;
		}
	}

	function handleRemove() {
		if (onRemove && !disabled) {
			onRemove();
		}
	}

	function triggerFileInput() {
		if (!disabled) {
			fileInput?.click();
		}
	}

	function getFileName(url: string): string {
		try {
			const urlObj = new URL(url);
			const pathParts = urlObj.pathname.split('/');
			return pathParts[pathParts.length - 1] || 'document.pdf';
		} catch {
			return 'document.pdf';
		}
	}

	// Modal functions
	function openPdfModal() {
		showModal = true;
		modalSize = 'large';
	}

	function closePdfModal() {
		showModal = false;
		modalSize = 'large';
	}
</script>

<div class="space-y-2">
	{#if label}
		<label for="pdf-upload" class="block text-sm font-medium text-gray-700">{label}</label>
	{/if}

	{#if value}
		<!-- Display uploaded PDF -->
		<Card class="p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
						<FileText class="h-5 w-5 text-red-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900">{getFileName(value)}</p>
						<p class="text-xs text-gray-500">PDF Document</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onclick={openPdfModal}
						disabled={disabled}
						title="Preview PDF"
					>
						<Eye class="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => window.open(value, '_blank')}
						disabled={disabled}
						title="Download PDF"
					>
						<Download class="h-4 w-4" />
					</Button>
					{#if onRemove}
						<Button
							variant="ghost"
							size="sm"
							onclick={handleRemove}
							disabled={disabled}
							title="Remove PDF"
						>
							<X class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			</div>
		</Card>
	{:else}
		<!-- Upload area -->
		<div
			id="pdf-upload"
			class="relative rounded-lg border-2 border-dashed transition-colors {isDragging
				? 'border-blue-500 bg-blue-50'
				: 'border-gray-300 bg-white'} {disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-400'}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={triggerFileInput}
			onkeydown={(e) => {
				if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
					e.preventDefault();
					triggerFileInput();
				}
			}}
			role="button"
			tabindex={disabled ? -1 : 0}
		>
			<input
				type="file"
				accept="application/pdf"
				class="hidden"
				bind:this={fileInput}
				onchange={handleFileSelect}
				disabled={disabled}
			/>

			<div class="flex flex-col items-center justify-center p-8">
				{#if uploading}
					<div class="w-full max-w-xs space-y-2">
						<div class="flex items-center justify-center">
							<div class="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
						</div>
						<Progress value={uploadProgress} class="bg-rose-100" />
						<p class="text-center text-sm text-gray-600">Uploading... {uploadProgress}%</p>
					</div>
				{:else}
					<Upload class="mb-3 h-10 w-10 text-gray-400" />
					<p class="mb-1 text-sm font-medium text-gray-700">
						Drop PDF here or click to upload
					</p>
					<p class="text-xs text-gray-500">PDF files only (max 50MB)</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>

<!-- PDF Preview Modal -->
{#if showModal && value}
	<Dialog.Root open={showModal} onOpenChange={closePdfModal}>
		<Dialog.Content class={modalSizeClass}>
			<Dialog.Header>
				<div class="flex items-center justify-between">
					<Dialog.Title>{label || 'PDF Preview'} - {getFileName(value)}</Dialog.Title>

					<div class="flex items-center gap-2">
						<!-- Size Controls -->
						<div class="flex gap-1">
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

			<!-- PDF Viewer with iframe -->
			<div class="bg-gray-100 rounded-lg overflow-hidden" style="height: 70vh;">
				<iframe
					src={value}
					title={label || 'PDF Preview'}
					class="w-full h-full border-0"
					style="min-height: 500px;"
				></iframe>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-between gap-2 pt-4">
				<div class="flex gap-2">
					<Button variant="outline" onclick={() => window.open(value, '_blank')}>
						<Download class="mr-2 h-4 w-4" />
						Download PDF
					</Button>
					{#if !disabled && onRemove}
						<Button
							variant="outline"
							onclick={() => {
								handleRemove();
								closePdfModal();
							}}
						>
							<X class="mr-2 h-4 w-4" />
							Remove PDF
						</Button>
					{/if}
				</div>
				<Button onclick={closePdfModal}>Close</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
