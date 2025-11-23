<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import { Loader2 } from 'lucide-svelte';

	interface Props {
		/**
		 * Compression progress (0-100)
		 */
		compressionProgress?: number;
		/**
		 * Upload progress (0-100)
		 */
		uploadProgress?: number;
		/**
		 * Whether currently compressing
		 */
		isCompressing?: boolean;
		/**
		 * Whether currently uploading
		 */
		isUploading?: boolean;
		/**
		 * File name being processed
		 */
		fileName?: string;
		/**
		 * Additional CSS classes
		 */
		class?: string;
	}

	let {
		compressionProgress = 0,
		uploadProgress = 0,
		isCompressing = false,
		isUploading = false,
		fileName = '',
		class: className = ''
	}: Props = $props();
</script>

<div class="space-y-3 {className}">
	<div class="flex items-center gap-2">
		<Loader2 class="size-4 text-rose-500 animate-spin" />
		<span class="text-sm font-medium text-gray-900">
			{#if isCompressing}
				Compressing {fileName}...
			{:else if isUploading}
				Uploading {fileName}...
			{:else}
				Processing...
			{/if}
		</span>
	</div>

	{#if isCompressing}
		<div class="space-y-1">
			<div class="flex justify-between text-xs text-gray-600">
				<span>Compression</span>
				<span>{compressionProgress}%</span>
			</div>
			<Progress value={compressionProgress} class="bg-rose-100" />
		</div>
	{/if}

	{#if isUploading}
		<div class="space-y-1">
			<div class="flex justify-between text-xs text-gray-600">
				<span>Upload</span>
				<span>{uploadProgress}%</span>
			</div>
			<Progress value={uploadProgress} class="bg-rose-100" />
		</div>
	{/if}
</div>

