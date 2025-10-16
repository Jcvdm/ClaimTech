/**
 * Unsaved changes guard utility using Svelte 5 runes
 * 
 * Provides beforeunload warning when user tries to navigate away with unsaved changes.
 * Also integrates with SvelteKit navigation to show confirmation dialogs.
 * 
 * Usage:
 * ```svelte
 * <script>
 * import { useUnsavedChanges } from '$lib/utils/useUnsavedChanges.svelte';
 * 
 * let hasUnsavedChanges = $state(false);
 * 
 * // Enable guard when there are unsaved changes
 * useUnsavedChanges(() => hasUnsavedChanges);
 * 
 * // Or with custom message
 * useUnsavedChanges(() => hasUnsavedChanges, {
 *   message: 'You have unsaved assessment data. Are you sure you want to leave?'
 * });
 * </script>
 * ```
 */

import { browser } from '$app/environment';
import { beforeNavigate } from '$app/navigation';
import { onMount } from 'svelte';

export interface UnsavedChangesOptions {
	/** Custom warning message (default: generic message) */
	message?: string;
	/** Whether to show confirmation dialog on SvelteKit navigation (default: true) */
	confirmNavigation?: boolean;
}

const DEFAULT_MESSAGE = 'You have unsaved changes. Are you sure you want to leave?';

/**
 * Set up unsaved changes guard
 * 
 * @param hasChanges - Function that returns whether there are unsaved changes
 * @param options - Configuration options
 */
export function useUnsavedChanges(
	hasChanges: () => boolean,
	options: UnsavedChangesOptions = {}
): void {
	const { message = DEFAULT_MESSAGE, confirmNavigation = true } = options;

	if (!browser) return;

	// Browser beforeunload handler (for page refresh, close, external navigation)
	function handleBeforeUnload(event: BeforeUnloadEvent): string | undefined {
		if (hasChanges()) {
			// Modern browsers ignore custom messages and show their own
			// But we still need to set returnValue for the dialog to appear
			event.preventDefault();
			event.returnValue = message;
			return message;
		}
		return undefined;
	}

	// SvelteKit navigation handler (for internal navigation)
	if (confirmNavigation) {
		beforeNavigate(({ cancel }) => {
			if (hasChanges()) {
				if (!confirm(message)) {
					cancel();
				}
			}
		});
	}

	// Set up and clean up event listener
	onMount(() => {
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});
}

/**
 * Create a reactive unsaved changes tracker using Svelte 5 runes
 * 
 * This version provides a simple API to mark changes as saved/unsaved
 * and automatically sets up the guard.
 * 
 * Usage:
 * ```svelte
 * <script>
 * const unsavedChanges = useUnsavedChangesTracker();
 * 
 * function handleInput() {
 *   unsavedChanges.markUnsaved();
 * }
 * 
 * async function handleSave() {
 *   await saveData();
 *   unsavedChanges.markSaved();
 * }
 * </script>
 * ```
 */
export function useUnsavedChangesTracker(options: UnsavedChangesOptions = {}): {
	hasUnsavedChanges: boolean;
	markUnsaved: () => void;
	markSaved: () => void;
} {
	let hasUnsavedChanges = $state(false);

	// Set up guard
	useUnsavedChanges(() => hasUnsavedChanges, options);

	return {
		get hasUnsavedChanges() {
			return hasUnsavedChanges;
		},
		markUnsaved: () => {
			hasUnsavedChanges = true;
		},
		markSaved: () => {
			hasUnsavedChanges = false;
		}
	};
}

/**
 * Debounce function for input handlers
 * 
 * Useful for marking changes as unsaved only after user stops typing
 * 
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number = 300
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => {
			fn(...args);
		}, delay);
	};
}

/**
 * Throttle function for frequent updates
 * 
 * Useful for limiting how often a function can be called
 * 
 * @param fn - Function to throttle
 * @param delay - Delay in milliseconds (default: 1000)
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
	fn: T,
	delay: number = 1000
): (...args: Parameters<T>) => void {
	let lastCall = 0;
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		const now = Date.now();

		if (now - lastCall >= delay) {
			lastCall = now;
			fn(...args);
		} else {
			// Schedule for later if within throttle window
			if (timeout) {
				clearTimeout(timeout);
			}
			timeout = setTimeout(
				() => {
					lastCall = Date.now();
					fn(...args);
				},
				delay - (now - lastCall)
			);
		}
	};
}

