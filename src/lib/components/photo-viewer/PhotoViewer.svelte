<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { EstimatePhoto } from '$lib/types/assessment';
	import { storageService } from '$lib/services/storage.service';

	// Dynamic import for browser-only library
	let BiggerPicture: any;

	interface Props {
		photos: EstimatePhoto[];
		startIndex: number;
		onClose: () => void;
		onDelete: (photoId: string, photoPath: string) => Promise<void>;
		onLabelUpdate?: (photoId: string, label: string) => Promise<void>;
	}

	let props: Props = $props();

	// State
	let bp: any = null;
	let currentIndex = $state(props.startIndex);
	let isDeleting = $state(false);
	let isOpen = $state(false);
	let error = $state<string | null>(null);

	// Label editing state
	let isEditingLabel = $state(false);
	let tempLabel = $state('');
	let savingLabel = $state(false);
	let labelError = $state<string | null>(null);

	// Computed values
	const currentPhoto = $derived(props.photos[currentIndex]);
	// Fix Svelte 5 reactivity: separate derived for label
	const currentLabel = $derived(currentPhoto?.label || 'No description (click to add)');

	// Initialize bigger-picture on mount
	onMount(async () => {
		// Only run in browser
		if (!browser) return;

		try {
			// Dynamically import browser-only library
			const biggerPictureModule = await import('bigger-picture');
			BiggerPicture = biggerPictureModule.default;

			// Initialize bigger-picture
			bp = BiggerPicture({
				target: document.body
			});

			console.log('[PhotoViewer] Initialized successfully');

			// Open with photos
			openViewer();
		} catch (err) {
			console.error('[PhotoViewer] Initialization failed:', err);
			error = 'Failed to initialize photo viewer';
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (bp) {
			try {
				bp.close();
			} catch (err) {
				console.error('[PhotoViewer] Error closing viewer:', err);
			}
		}
	});

	// Open the viewer
	function openViewer() {
		if (!bp || !browser) {
			console.warn('[PhotoViewer] Cannot open: not ready');
			return;
		}

		// Validate photos
		if (!props.photos || props.photos.length === 0) {
			error = 'No photos to display';
			return;
		}

		// Validate start index
		if (props.startIndex < 0 || props.startIndex >= props.photos.length) {
			console.warn('[PhotoViewer] Invalid start index:', props.startIndex);
			currentIndex = 0;
		}

		isOpen = true;
		error = null;

		try {
			bp.open({
				items: props.photos.map((photo) => ({
					img: storageService.toPhotoProxyUrl(photo.photo_url),
					thumb: storageService.toPhotoProxyUrl(photo.photo_url),
					alt: photo.label || 'Photo',
					caption: photo.label || '',
					width: 2000,
					height: 1500
				})),
				position: currentIndex,
				intro: 'fadeup',
				onClose: handleClose,
				onUpdate: handlePositionUpdate
			});

			console.log('[PhotoViewer] Opened at position:', currentIndex);
		} catch (err) {
			console.error('[PhotoViewer] Failed to open:', err);
			error = 'Failed to open photo viewer';
			isOpen = false;
		}
	}

	// Handle position updates from bigger-picture navigation
	function handlePositionUpdate(container: any, activeItem: any) {
		try {
			// ✅ CORRECT: Use activeItem.i which contains the current index
			const newPosition = activeItem?.i;

			if (newPosition !== undefined && newPosition !== currentIndex) {
				currentIndex = newPosition;
				console.log(
					'[PhotoViewer] Navigated to position:',
					currentIndex,
					'Photo ID:',
					props.photos[currentIndex]?.id,
					'Label:',
					props.photos[currentIndex]?.label
				);
			}
		} catch (err) {
			console.error('[PhotoViewer] Error updating position:', err);
		}
	}

	// Handle close
	function handleClose() {
		isOpen = false;
		props.onClose();
		console.log('[PhotoViewer] Closed');
	}

	// Label editing: Start editing
	function startEditingLabel() {
		if (!currentPhoto || !props.onLabelUpdate) return;

		tempLabel = currentPhoto.label || '';
		isEditingLabel = true;
		labelError = null;

		console.log('[PhotoViewer] Started editing label for photo:', currentPhoto.id);

		// Focus and select input for easy editing
		setTimeout(() => {
			const input = document.querySelector('.label-input') as HTMLInputElement;
			if (input) {
				input.focus();
				input.select();
			}
		}, 50);
	}

	// Label editing: Save
	async function saveLabel() {
		if (!currentPhoto || !props.onLabelUpdate || savingLabel) return;

		const newLabel = tempLabel.trim();

		// No changes, just exit edit mode
		if (newLabel === (currentPhoto.label || '')) {
			cancelEditingLabel();
			return;
		}

		savingLabel = true;
		labelError = null;

		try {
			console.log('[PhotoViewer] Saving label for photo:', {
				currentIndex,
				photoId: currentPhoto.id,
				currentLabel: currentPhoto.label,
				newLabel
			});

			await props.onLabelUpdate(currentPhoto.id, newLabel);
			isEditingLabel = false;
			console.log('[PhotoViewer] Label updated successfully:', currentPhoto.id);
		} catch (err) {
			console.error('[PhotoViewer] Error saving label:', err);
			labelError = 'Failed to save label. Please try again.';
		} finally {
			savingLabel = false;
		}
	}

	// Label editing: Cancel
	function cancelEditingLabel() {
		isEditingLabel = false;
		tempLabel = '';
		labelError = null;
		console.log('[PhotoViewer] Cancelled label editing');
	}

	// Label editing: Keyboard shortcuts
	function handleLabelKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveLabel();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEditingLabel();
		}
	}

	// Delete current photo
	async function handleDelete() {
		if (isDeleting || !currentPhoto) return;

		if (!confirm('Are you sure you want to delete this photo?')) {
			return;
		}

		isDeleting = true;

		try {
			const photo = props.photos[currentIndex];
			await props.onDelete(photo.id, photo.photo_path);

			console.log('[PhotoViewer] Photo deleted:', photo.id);

			// Close viewer after delete
			if (bp) {
				bp.close();
			}
			props.onClose();
		} catch (err) {
			console.error('[PhotoViewer] Error deleting photo:', err);
			error = 'Failed to delete photo. Please try again.';
			alert('Failed to delete photo. Please try again.');
		} finally {
			isDeleting = false;
		}
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		// Ignore if typing in an input (except for Escape)
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			if (e.key !== 'Escape') {
				return;
			}
		}

		// Handle Escape key
		if (e.key === 'Escape') {
			if (isEditingLabel) {
				e.preventDefault();
				cancelEditingLabel();
			}
			// Let bigger-picture handle Escape to close viewer
			return;
		}

		// Handle Delete key
		if (e.key === 'Delete' && !isEditingLabel) {
			e.preventDefault();
			handleDelete();
		}

		// Handle E key to start editing label
		if ((e.key === 'e' || e.key === 'E') && !isEditingLabel && props.onLabelUpdate) {
			e.preventDefault();
			startEditingLabel();
		}
	}

	// Setup keyboard listener
	onMount(() => {
		if (browser) {
			document.addEventListener('keydown', handleKeydown);
		}

		return () => {
			if (browser) {
				document.removeEventListener('keydown', handleKeydown);
			}
		};
	});
</script>

<!-- Photo info overlay -->
{#if isOpen && currentPhoto}
	<div class="photo-viewer-info">
		<!-- Label Editor Section -->
		{#if isEditingLabel}
			<!-- Edit Mode -->
			<div class="label-edit-container">
				<input
					type="text"
					class="label-input"
					bind:value={tempLabel}
					onkeydown={handleLabelKeydown}
					onblur={saveLabel}
					placeholder="Enter photo description..."
					disabled={savingLabel}
					maxlength="200"
				/>
				<div class="edit-actions">
					<button
						onclick={saveLabel}
						disabled={savingLabel}
						class="save-button"
						type="button"
					>
						{savingLabel ? 'Saving...' : '✓ Save'}
					</button>
					<button
						onclick={cancelEditingLabel}
						disabled={savingLabel}
						class="cancel-button"
						type="button"
					>
						✕ Cancel
					</button>
				</div>
				{#if labelError}
					<div class="label-error">{labelError}</div>
				{/if}
			</div>
		{:else}
			<!-- View Mode - clickable to edit -->
			<button
				onclick={startEditingLabel}
				class="photo-description"
				class:has-label={currentPhoto.label}
				disabled={!props.onLabelUpdate}
				type="button"
			>
				{currentLabel}
				{#if props.onLabelUpdate}
					<span class="edit-hint">✎ Press E to edit</span>
				{/if}
			</button>
		{/if}

		<!-- Bottom row: Counter and Delete button -->
		<div class="bottom-actions">
			<div class="photo-counter">
				{currentIndex + 1} / {props.photos.length}
			</div>
			<button
				onclick={handleDelete}
				disabled={isDeleting}
				class="delete-button"
				title="Delete Photo (Delete key)"
				type="button"
			>
				{isDeleting ? 'Deleting...' : '🗑️ Delete'}
			</button>
		</div>
	</div>
{/if}

<!-- Error message -->
{#if error}
	<div class="photo-viewer-error">
		<div class="error-content">
			<p>{error}</p>
			<button onclick={() => (error = null)}>Dismiss</button>
		</div>
	</div>
{/if}

<style>
	/* Photo info overlay at bottom - Fixed Bottom Bar */
	.photo-viewer-info {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.92);
		color: white;
		padding: 16px 24px;
		backdrop-filter: blur(12px);
		text-align: center;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* Label Edit Container */
	.label-edit-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	.label-input {
		width: 100%;
		padding: 10px 14px;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: white;
		font-size: 14px;
		font-family: inherit;
		transition: all 0.2s ease;
	}

	.label-input:focus {
		outline: none;
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(59, 130, 246, 0.8);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.label-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.label-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.edit-actions {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.save-button,
	.cancel-button {
		padding: 8px 20px;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.save-button {
		background: rgba(34, 197, 94, 0.9);
		color: white;
	}

	.save-button:hover:not(:disabled) {
		background: rgba(34, 197, 94, 1);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-button {
		background: rgba(107, 114, 128, 0.9);
		color: white;
	}

	.cancel-button:hover:not(:disabled) {
		background: rgba(107, 114, 128, 1);
		transform: translateY(-1px);
	}

	.cancel-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.label-error {
		color: #fca5a5;
		font-size: 12px;
		text-align: center;
	}

	/* Photo Description (View Mode) */
	.photo-description {
		background: transparent;
		border: 2px solid transparent;
		color: white;
		padding: 10px 14px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		line-height: 1.4;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
		position: relative;
	}

	.photo-description:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.photo-description:disabled {
		cursor: default;
		opacity: 0.7;
	}

	.photo-description.has-label {
		font-weight: 600;
	}

	.edit-hint {
		display: block;
		font-size: 11px;
		opacity: 0.6;
		margin-top: 4px;
		font-weight: 400;
	}

	/* Bottom Actions Row */
	.bottom-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}

	.photo-counter {
		font-size: 12px;
		opacity: 0.7;
	}

	.delete-button {
		pointer-events: auto;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.delete-button:hover:not(:disabled) {
		background: rgba(239, 68, 68, 1);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
	}

	.delete-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Error overlay */
	.photo-viewer-error {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10000;
		background: rgba(220, 38, 38, 0.95);
		color: white;
		padding: 24px;
		border-radius: 12px;
		max-width: 400px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.error-content {
		text-align: center;
	}

	.error-content p {
		margin: 0 0 16px 0;
		font-size: 15px;
		line-height: 1.5;
	}

	.error-content button {
		padding: 8px 20px;
		background: white;
		color: #dc2626;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.error-content button:hover {
		background: #f3f4f6;
		transform: translateY(-1px);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.photo-viewer-info {
			padding: 12px 16px;
		}

		.label-edit-container {
			max-width: 100%;
		}

		.label-input {
			font-size: 13px;
			padding: 8px 12px;
		}

		.photo-description {
			font-size: 12px;
			padding: 8px 12px;
			max-width: 100%;
		}

		.edit-hint {
			font-size: 10px;
		}

		.bottom-actions {
			flex-direction: column;
			gap: 8px;
		}

		.photo-counter {
			font-size: 11px;
		}

		.delete-button {
			padding: 6px 12px;
			font-size: 12px;
			width: 100%;
		}

		.save-button,
		.cancel-button {
			flex: 1;
			padding: 8px 16px;
			font-size: 12px;
		}
	}

	/* Ensure bigger-picture styles work */
	:global(.bp-wrap) {
		z-index: 999;
	}
</style>
