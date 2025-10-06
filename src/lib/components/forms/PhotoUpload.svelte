<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Camera, Upload, X, Loader2 } from 'lucide-svelte';
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
		value = null,
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

	let uploading = $state(false);
	let error = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let cameraInput: HTMLInputElement;

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

	async function uploadFile(file: File) {
		uploading = true;
		error = null;

		try {
			const result = await storageService.uploadAssessmentPhoto(
				file,
				assessmentId,
				category,
				subcategory
			);
			onUpload(result.url);
		} catch (err) {
			console.error('Upload error:', err);
			error = err instanceof Error ? err.message : 'Failed to upload photo';
		} finally {
			uploading = false;
		}
	}

	function handleRemove() {
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

	{#if value}
		<!-- Photo Preview -->
		<div class="relative">
			<img src={value} alt={label || 'Photo'} class="{height} w-full rounded-lg object-cover" />
			{#if !disabled}
				<div class="absolute right-2 top-2 flex gap-2">
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
		<!-- Upload Buttons -->
		<div class="flex gap-2">
			<button
				type="button"
				class="flex {height} flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={triggerCameraInput}
				disabled={disabled || uploading}
			>
				<div class="text-center">
					{#if uploading}
						<Loader2 class="mx-auto h-8 w-8 animate-spin text-gray-400" />
						<p class="mt-2 text-sm text-gray-600">Uploading...</p>
					{:else}
						<Camera class="mx-auto h-8 w-8 text-gray-400" />
						<p class="mt-2 text-sm text-gray-600">Take Photo</p>
					{/if}
				</div>
			</button>

			<button
				type="button"
				class="flex {height} flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={triggerFileInput}
				disabled={disabled || uploading}
			>
				<div class="text-center">
					{#if uploading}
						<Loader2 class="mx-auto h-8 w-8 animate-spin text-gray-400" />
						<p class="mt-2 text-sm text-gray-600">Uploading...</p>
					{:else}
						<Upload class="mx-auto h-8 w-8 text-gray-400" />
						<p class="mt-2 text-sm text-gray-600">Upload File</p>
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

