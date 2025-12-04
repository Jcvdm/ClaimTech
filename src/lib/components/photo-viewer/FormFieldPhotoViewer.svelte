<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { storageService } from '$lib/services/storage.service';
	import { X, AlertTriangle } from 'lucide-svelte';

	// Dynamic import for browser-only library
	let BiggerPicture: any;

	/**
	 * Field configuration for the input
	 */
	export interface FieldConfig {
		label: string;
		type: 'text' | 'number' | 'date';
		placeholder?: string;
		maxLength?: number;
		validation?: {
			pattern?: RegExp;
			message?: string;
			expectedLength?: number;
		};
	}

	interface Props {
		photoUrl: string;
		field: FieldConfig;
		value: string;
		onSave: (value: string) => Promise<void>;
		onClose: () => void;
	}

	let props: Props = $props();

	// State
	let bp: any = null;
	let isOpen = $state(false);
	let error = $state<string | null>(null);

	// Field state
	let inputValue = $state(props.value || '');
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let hasUnsavedChanges = $state(false);

	// Validation warning (non-blocking)
	const validationWarning = $derived.by(() => {
		if (!props.field.validation) return null;

		const { pattern, message, expectedLength } = props.field.validation;

		// Check pattern
		if (pattern && inputValue && !pattern.test(inputValue)) {
			return message || 'Invalid format';
		}

		// Check expected length
		if (expectedLength && inputValue && inputValue.length !== expectedLength) {
			return `Expected ${expectedLength} characters (${inputValue.length} entered)`;
		}

		return null;
	});

	// Track changes
	$effect(() => {
		hasUnsavedChanges = inputValue !== (props.value || '');
	});

	// Initialize bigger-picture on mount
	onMount(async () => {
		if (!browser) return;

		try {
			const biggerPictureModule = await import('bigger-picture');
			BiggerPicture = biggerPictureModule.default;

			bp = BiggerPicture({
				target: document.body
			});

			openViewer();
		} catch (err) {
			console.error('[FormFieldPhotoViewer] Initialization failed:', err);
			error = 'Failed to initialize photo viewer';
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (bp) {
			try {
				bp.close();
			} catch (err) {
				console.error('[FormFieldPhotoViewer] Error closing viewer:', err);
			}
		}
	});

	// Open the viewer
	function openViewer() {
		if (!bp || !browser) return;

		if (!props.photoUrl) {
			error = 'No photo to display';
			return;
		}

		isOpen = true;
		error = null;

		try {
			bp.open({
				items: [{
					img: storageService.toPhotoProxyUrl(props.photoUrl),
					thumb: storageService.toPhotoProxyUrl(props.photoUrl),
					alt: props.field.label,
					width: 2000,
					height: 1500
				}],
				position: 0,
				intro: 'fadeup',
				onClose: handleClose
			});

			// Focus input after viewer opens
			setTimeout(() => {
				const input = document.querySelector('.field-input') as HTMLInputElement;
				if (input) {
					input.focus();
					input.select();
				}
			}, 100);
		} catch (err) {
			console.error('[FormFieldPhotoViewer] Failed to open:', err);
			error = 'Failed to open photo viewer';
			isOpen = false;
		}
	}

	// Handle close
	function handleClose() {
		isOpen = false;
		props.onClose();
	}

	// Close viewer programmatically
	function closeViewer() {
		if (bp) {
			bp.close();
		}
		props.onClose();
	}

	// Save value (called on blur)
	async function saveValue() {
		if (saving) return;

		// No changes, nothing to save
		if (!hasUnsavedChanges) return;

		saving = true;
		saveError = null;

		try {
			await props.onSave(inputValue.trim());
			hasUnsavedChanges = false;
			console.log('[FormFieldPhotoViewer] Value saved:', inputValue);
		} catch (err) {
			console.error('[FormFieldPhotoViewer] Error saving value:', err);
			saveError = 'Failed to save. Please try again.';
		} finally {
			saving = false;
		}
	}

	// Handle input blur - auto-save
	function handleBlur() {
		if (hasUnsavedChanges) {
			saveValue();
		}
	}

	// Handle keyboard
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			// Save any changes before closing
			if (hasUnsavedChanges) {
				saveValue().then(() => closeViewer());
			} else {
				closeViewer();
			}
		} else if (e.key === 'Enter' && props.field.type !== 'text') {
			// For number/date fields, Enter saves and closes
			e.preventDefault();
			saveValue().then(() => closeViewer());
		}
	}

	// Global keyboard listener
	function handleGlobalKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		// Only handle Escape if not in input
		if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) {
			e.preventDefault();
			if (hasUnsavedChanges) {
				saveValue().then(() => closeViewer());
			} else {
				closeViewer();
			}
		}
	}

	// Setup keyboard listener
	onMount(() => {
		if (browser) {
			document.addEventListener('keydown', handleGlobalKeydown);
		}

		return () => {
			if (browser) {
				document.removeEventListener('keydown', handleGlobalKeydown);
			}
		};
	});
</script>

<!-- Field input overlay -->
{#if isOpen}
	<div class="field-viewer-overlay">
		<!-- Field Label -->
		<div class="field-label">
			{props.field.label}
			{#if saving}
				<span class="saving-indicator">Saving...</span>
			{/if}
		</div>

		<!-- Input Field -->
		<div class="field-input-container">
			{#if props.field.type === 'date'}
				<input
					type="date"
					class="field-input"
					bind:value={inputValue}
					onblur={handleBlur}
					onkeydown={handleKeydown}
					disabled={saving}
				/>
			{:else if props.field.type === 'number'}
				<input
					type="number"
					class="field-input"
					bind:value={inputValue}
					onblur={handleBlur}
					onkeydown={handleKeydown}
					placeholder={props.field.placeholder}
					disabled={saving}
				/>
			{:else}
				<input
					type="text"
					class="field-input"
					bind:value={inputValue}
					onblur={handleBlur}
					onkeydown={handleKeydown}
					placeholder={props.field.placeholder}
					maxlength={props.field.maxLength}
					disabled={saving}
				/>
			{/if}
		</div>

		<!-- Validation Warning (non-blocking) -->
		{#if validationWarning}
			<div class="validation-warning">
				<AlertTriangle class="h-3.5 w-3.5" />
				<span>{validationWarning}</span>
			</div>
		{/if}

		<!-- Save Error -->
		{#if saveError}
			<div class="save-error">{saveError}</div>
		{/if}

		<!-- Close Button -->
		<button
			onclick={closeViewer}
			class="close-button"
			title="Close (Escape)"
			type="button"
			disabled={saving}
		>
			<X class="h-4 w-4" />
			Close
		</button>
	</div>
{/if}

<!-- Error message -->
{#if error}
	<div class="viewer-error">
		<div class="error-content">
			<p>{error}</p>
			<button onclick={() => { error = null; props.onClose(); }}>Dismiss</button>
		</div>
	</div>
{/if}

<style>
	/* Field overlay at bottom - Fixed Bottom Bar */
	.field-viewer-overlay {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.92);
		color: white;
		padding: 16px 24px;
		backdrop-filter: blur(12px);
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}

	/* Field Label */
	.field-label {
		font-size: 14px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.saving-indicator {
		font-size: 12px;
		font-weight: 400;
		color: rgba(59, 130, 246, 0.9);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Input Container */
	.field-input-container {
		width: 100%;
		max-width: 500px;
	}

	.field-input {
		width: 100%;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: white;
		font-size: 16px;
		font-family: inherit;
		transition: all 0.2s ease;
		text-align: center;
	}

	.field-input:focus {
		outline: none;
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(59, 130, 246, 0.8);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.field-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.field-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	/* Date input styling */
	.field-input[type="date"] {
		color-scheme: dark;
	}

	/* Number input - remove spinners */
	.field-input[type="number"]::-webkit-outer-spin-button,
	.field-input[type="number"]::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.field-input[type="number"] {
		appearance: textfield;
		-moz-appearance: textfield;
	}

	/* Validation Warning */
	.validation-warning {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #fbbf24;
		background: rgba(251, 191, 36, 0.1);
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid rgba(251, 191, 36, 0.3);
	}

	/* Save Error */
	.save-error {
		color: #fca5a5;
		font-size: 12px;
		text-align: center;
	}

	/* Close Button */
	.close-button {
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(107, 114, 128, 0.9);
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.close-button:hover:not(:disabled) {
		background: rgba(107, 114, 128, 1);
		transform: translateY(-1px);
	}

	.close-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Error overlay */
	.viewer-error {
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
		.field-viewer-overlay {
			padding: 12px 16px;
		}

		.field-input-container {
			max-width: 100%;
		}

		.field-input {
			font-size: 16px; /* Prevent zoom on iOS */
			padding: 10px 14px;
		}

		.field-label {
			font-size: 13px;
		}

		.close-button {
			width: 100%;
			justify-content: center;
			padding: 12px 20px;
		}
	}

	/* Ensure bigger-picture styles work */
	:global(.bp-wrap) {
		z-index: 999;
	}
</style>
