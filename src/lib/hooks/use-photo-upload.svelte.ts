import { shouldResetDragState } from '$lib/utils/drag-helpers';

export interface UsePhotoUploadConfig {
	/** Called when files are picked via drag/drop or file input. Panel owns the full upload flow. */
	onFilesSelected: (files: File[]) => Promise<void>;
	/** Optional — panel-level flag to disable drag target (e.g. during save). Default false. */
	disabled?: boolean;
}

export function usePhotoUpload(config: UsePhotoUploadConfig) {
	let uploading = $state(false);
	let compressing = $state(false);
	let uploadProgress = $state(0);
	let compressionProgress = $state(0);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();
	let cameraInput: HTMLInputElement | undefined = $state();

	function handleDragEnter(event: DragEvent) {
		if (config.disabled) return;
		event.preventDefault();
		event.stopPropagation();
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		if (config.disabled) return;
		event.preventDefault();
		event.stopPropagation();
	}

	function handleDragLeave(event: DragEvent) {
		if (config.disabled) return;
		event.preventDefault();
		event.stopPropagation();
		if (shouldResetDragState(event)) {
			isDragging = false;
		}
	}

	async function handleDrop(event: DragEvent) {
		if (config.disabled) return;
		event.preventDefault();
		event.stopPropagation();
		isDragging = false;
		const files = Array.from(event.dataTransfer?.files || []);
		if (files.length > 0) {
			await config.onFilesSelected(files);
		}
	}

	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = Array.from(target.files || []);
		if (files.length > 0) {
			await config.onFilesSelected(files);
		}
		// Reset so the same file can be re-selected
		target.value = '';
	}

	function triggerFileInput() {
		fileInput?.click();
	}

	function triggerCameraInput() {
		cameraInput?.click();
	}

	return {
		// Reactive state — expose as getters/setters so panels can mutate via upload.uploading = true
		get uploading() { return uploading; },
		set uploading(v: boolean) { uploading = v; },
		get compressing() { return compressing; },
		set compressing(v: boolean) { compressing = v; },
		get uploadProgress() { return uploadProgress; },
		set uploadProgress(v: number) { uploadProgress = v; },
		get compressionProgress() { return compressionProgress; },
		set compressionProgress(v: number) { compressionProgress = v; },
		get isDragging() { return isDragging; },

		// DOM refs — panel binds these via bind:this={upload.fileInput}
		get fileInput() { return fileInput; },
		set fileInput(v: HTMLInputElement | undefined) { fileInput = v; },
		get cameraInput() { return cameraInput; },
		set cameraInput(v: HTMLInputElement | undefined) { cameraInput = v; },

		// Event handlers
		handleDragEnter,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleFileSelect,
		triggerFileInput,
		triggerCameraInput,
	};
}
