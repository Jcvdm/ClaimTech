<script lang="ts">
	import { cn } from '$lib/utils';
	import { Upload, X, FileText, Loader2 } from 'lucide-svelte';

	type Props = {
		name?: string;
		label?: string;
		acceptedFileTypes?: string[];
		maxFiles?: number;
		maxFileSize?: string;
		allowMultiple?: boolean;
		class?: string;
		uploading?: boolean;
		uploadProgress?: number;
		onupdatefiles?: (files: File[]) => void;
	};

	let {
		name = 'files',
		label = 'Upload Files',
		acceptedFileTypes = ['image/*', 'application/pdf'],
		maxFiles = 10,
		maxFileSize = '10MB',
		allowMultiple = true,
		class: className = '',
		uploading = false,
		uploadProgress = 0,
		onupdatefiles
	}: Props = $props();

	let fileInput: HTMLInputElement;
	let files = $state<File[]>([]);
	let isDragging = $state(false);

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			files = Array.from(target.files);
			onupdatefiles?.(files);
		}
	}

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
		// Only set to false if leaving the drop zone entirely
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		if (
			event.clientX <= rect.left ||
			event.clientX >= rect.right ||
			event.clientY <= rect.top ||
			event.clientY >= rect.bottom
		) {
			isDragging = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDragging = false;

		if (event.dataTransfer?.files) {
			files = Array.from(event.dataTransfer.files);
			onupdatefiles?.(files);
		}
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
		onupdatefiles?.(files);
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
	}
</script>

<div class={cn('space-y-2', className)}>
	{#if label}
		<label for={name} class="text-sm font-medium text-gray-700">{label}</label>
	{/if}

	<div
		class="rounded-lg border-2 border-dashed p-8 text-center transition-all {isDragging
			? 'border-blue-500 bg-blue-50'
			: 'border-gray-300 bg-white hover:border-gray-400'} {uploading
			? 'cursor-not-allowed opacity-60'
			: 'cursor-pointer'}"
		ondrop={handleDrop}
		ondragenter={handleDragEnter}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		role="button"
		tabindex="0"
		onclick={() => !uploading && fileInput.click()}
		onkeydown={(e) => e.key === 'Enter' && !uploading && fileInput.click()}
	>
		{#if uploading}
			<div class="space-y-3">
				<Loader2 class="mx-auto h-12 w-12 animate-spin text-blue-500" />
				<p class="text-sm font-medium text-gray-700">Uploading files...</p>
				<div class="mx-auto h-2 w-64 overflow-hidden rounded-full bg-gray-200">
					<div
						class="h-full bg-blue-500 transition-all duration-300"
						style="width: {uploadProgress}%"
					></div>
				</div>
				<p class="text-xs text-gray-500">{uploadProgress}%</p>
			</div>
		{:else if isDragging}
			<div>
				<Upload class="mx-auto h-12 w-12 text-blue-500" />
				<p class="mt-2 text-sm font-medium text-blue-600">Drop files here to upload</p>
			</div>
		{:else}
			<Upload class="mx-auto h-12 w-12 text-gray-400" />
			<p class="mt-2 text-sm text-gray-600">
				Drag & Drop your files or <span class="font-medium text-blue-600">Browse</span>
			</p>
			<p class="mt-1 text-xs text-gray-500">
				Supports: {acceptedFileTypes.join(', ')} • Max: {maxFileSize}
			</p>
		{/if}
		<input
			bind:this={fileInput}
			type="file"
			id={name}
			{name}
			accept={acceptedFileTypes.join(',')}
			multiple={allowMultiple}
			onchange={handleFileChange}
			disabled={uploading}
			class="hidden"
		/>
	</div>

	{#if files.length > 0}
		<div class="space-y-2">
			{#each files as file, i}
				<div
					class="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100"
				>
					<div class="flex items-center gap-2">
						<FileText class="h-4 w-4 text-gray-400" />
						<div>
							<p class="text-sm font-medium text-gray-700">{file.name}</p>
							<p class="text-xs text-gray-500">{formatFileSize(file.size)}</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => removeFile(i)}
						class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
						disabled={uploading}
					>
						<X class="h-4 w-4" />
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

