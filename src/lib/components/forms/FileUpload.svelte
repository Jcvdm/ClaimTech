<script lang="ts">
	import { cn } from '$lib/utils';
	import { Upload } from 'lucide-svelte';

	type Props = {
		name?: string;
		label?: string;
		acceptedFileTypes?: string[];
		maxFiles?: number;
		maxFileSize?: string;
		allowMultiple?: boolean;
		class?: string;
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
		onupdatefiles
	}: Props = $props();

	let fileInput: HTMLInputElement;
	let files = $state<File[]>([]);

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			files = Array.from(target.files);
			onupdatefiles?.(files);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer?.files) {
			files = Array.from(event.dataTransfer.files);
			onupdatefiles?.(files);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
		onupdatefiles?.(files);
	}
</script>

<div class={cn('space-y-2', className)}>
	{#if label}
		<label for={name} class="text-sm font-medium text-gray-700">{label}</label>
	{/if}

	<div
		class="rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 text-center hover:border-gray-400 transition-colors"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		role="button"
		tabindex="0"
		onclick={() => fileInput.click()}
		onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
	>
		<Upload class="mx-auto h-12 w-12 text-gray-400" />
		<p class="mt-2 text-sm text-gray-600">
			Drag & Drop your files or <span class="font-medium text-blue-600">Browse</span>
		</p>
		<input
			bind:this={fileInput}
			type="file"
			id={name}
			{name}
			accept={acceptedFileTypes.join(',')}
			multiple={allowMultiple}
			onchange={handleFileChange}
			class="hidden"
		/>
	</div>

	{#if files.length > 0}
		<div class="space-y-2">
			{#each files as file, i}
				<div class="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
					<span class="text-sm text-gray-700">{file.name}</span>
					<button
						type="button"
						onclick={() => removeFile(i)}
						class="text-sm text-red-600 hover:text-red-700"
					>
						Remove
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<p class="text-xs text-gray-500">
		Max file size: {maxFileSize}. Accepted formats: {acceptedFileTypes.join(', ')}
	</p>
</div>

