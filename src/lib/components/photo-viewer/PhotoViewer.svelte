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

	// Computed values
	const currentPhoto = $derived(props.photos[currentIndex]);

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
			const items = container.items;
			const activeIndex = items.indexOf(activeItem);

			if (activeIndex !== -1 && activeIndex !== currentIndex) {
				currentIndex = activeIndex;
				console.log('[PhotoViewer] Navigated to position:', currentIndex);
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

		// Only handle Delete key (other keys handled by bigger-picture)
		if (e.key === 'Delete') {
			e.preventDefault();
			handleDelete();
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
		<div class="photo-description">
			{currentPhoto.label || 'No description'}
		</div>
		<div class="photo-counter">
			{currentIndex + 1} / {props.photos.length}
		</div>
		<button
			onclick={handleDelete}
			disabled={isDeleting}
			class="delete-button"
			title="Delete Photo (Delete key)"
		>
			{isDeleting ? 'Deleting...' : '🗑️ Delete'}
		</button>
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
	/* Photo info overlay at bottom */
	.photo-viewer-info {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1000;
		background: rgba(0, 0, 0, 0.85);
		color: white;
		padding: 16px 24px;
		border-radius: 12px;
		backdrop-filter: blur(8px);
		pointer-events: none;
		max-width: 90%;
		text-align: center;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.photo-description {
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 8px;
		line-height: 1.4;
	}

	.photo-counter {
		font-size: 12px;
		opacity: 0.7;
		margin-bottom: 12px;
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
			bottom: 10px;
			padding: 12px 16px;
			max-width: 95%;
		}

		.photo-description {
			font-size: 12px;
		}

		.photo-counter {
			font-size: 11px;
			margin-bottom: 10px;
		}

		.delete-button {
			padding: 6px 12px;
			font-size: 12px;
		}
	}

	/* Ensure bigger-picture styles work */
	:global(.bp-wrap) {
		z-index: 999;
	}
</style>
