<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Upload, FileText, X, Download } from 'lucide-svelte';
	import { storageService } from '$lib/services/storage.service';

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
	let fileInput: HTMLInputElement;

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
</script>

<div class="space-y-2">
	{#if label}
		<label class="block text-sm font-medium text-gray-700">{label}</label>
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
						onclick={() => window.open(value, '_blank')}
						disabled={disabled}
					>
						<Download class="h-4 w-4" />
					</Button>
					{#if onRemove}
						<Button variant="ghost" size="sm" onclick={handleRemove} disabled={disabled}>
							<X class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			</div>
		</Card>
	{:else}
		<!-- Upload area -->
		<div
			class="relative rounded-lg border-2 border-dashed transition-colors {isDragging
				? 'border-blue-500 bg-blue-50'
				: 'border-gray-300 bg-white'} {disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-400'}"
			ondragenter={handleDragEnter}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={triggerFileInput}
			role="button"
			tabindex="0"
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
							<div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
							<div
								class="h-full bg-blue-500 transition-all duration-300"
								style="width: {uploadProgress}%"
							></div>
						</div>
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

