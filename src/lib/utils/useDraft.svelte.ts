/**
 * Draft autosave utility using Svelte 5 runes
 * 
 * Provides localStorage-based draft persistence with throttling to prevent
 * excessive writes. Automatically restores drafts on mount and clears them
 * after successful save.
 * 
 * Usage:
 * ```ts
 * const draft = useDraft('assessment-notes', { throttleMs: 2000 });
 * 
 * // Save draft (throttled)
 * draft.save({ notes: 'My notes...' });
 * 
 * // Get current draft
 * const currentDraft = draft.get();
 * 
 * // Clear draft after successful save
 * draft.clear();
 * 
 * // Check if draft exists
 * if (draft.hasDraft()) { ... }
 * ```
 */

import { browser } from '$app/environment';

export interface DraftOptions {
	/** Throttle interval in milliseconds (default: 2000) */
	throttleMs?: number;
	/** Optional callback when draft is saved */
	onSave?: (data: any) => void;
	/** Optional callback when draft is restored */
	onRestore?: (data: any) => void;
}

export interface Draft<T = any> {
	/** Save data to draft (throttled) */
	save: (data: T) => void;
	/** Get current draft data */
	get: () => T | null;
	/** Clear draft from storage */
	clear: () => void;
	/** Check if draft exists */
	hasDraft: () => boolean;
	/** Get timestamp of last save */
	getTimestamp: () => number | null;
}

/**
 * Create a draft autosave utility
 * 
 * @param key - Unique key for localStorage (e.g., 'assessment-notes-123')
 * @param options - Configuration options
 * @returns Draft utility object
 */
export function useDraft<T = any>(key: string, options: DraftOptions = {}): Draft<T> {
	const { throttleMs = 2000, onSave, onRestore } = options;

	let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
	let pendingData: T | null = null;

	const storageKey = `draft:${key}`;

	/**
	 * Save data to localStorage (throttled)
	 */
	function save(data: T): void {
		if (!browser) return;

		// Store pending data
		pendingData = data;

		// Clear existing timeout
		if (throttleTimeout) {
			clearTimeout(throttleTimeout);
		}

		// Set new timeout
		throttleTimeout = setTimeout(() => {
			if (pendingData !== null) {
				try {
					const draftData = {
						data: pendingData,
						timestamp: Date.now()
					};
					localStorage.setItem(storageKey, JSON.stringify(draftData));
					onSave?.(pendingData);
				} catch (error) {
					console.error('Failed to save draft:', error);
				}
				pendingData = null;
			}
		}, throttleMs);
	}

	/**
	 * Get current draft data from localStorage
	 */
	function get(): T | null {
		if (!browser) return null;

		try {
			const stored = localStorage.getItem(storageKey);
			if (!stored) return null;

			const parsed = JSON.parse(stored);
			onRestore?.(parsed.data);
			return parsed.data;
		} catch (error) {
			console.error('Failed to get draft:', error);
			return null;
		}
	}

	/**
	 * Clear draft from localStorage
	 */
	function clear(): void {
		if (!browser) return;

		try {
			localStorage.removeItem(storageKey);
			pendingData = null;
			if (throttleTimeout) {
				clearTimeout(throttleTimeout);
				throttleTimeout = null;
			}
		} catch (error) {
			console.error('Failed to clear draft:', error);
		}
	}

	/**
	 * Check if draft exists
	 */
	function hasDraft(): boolean {
		if (!browser) return false;
		return localStorage.getItem(storageKey) !== null;
	}

	/**
	 * Get timestamp of last save
	 */
	function getTimestamp(): number | null {
		if (!browser) return null;

		try {
			const stored = localStorage.getItem(storageKey);
			if (!stored) return null;

			const parsed = JSON.parse(stored);
			return parsed.timestamp || null;
		} catch (error) {
			return null;
		}
	}

	return {
		save,
		get,
		clear,
		hasDraft,
		getTimestamp
	};
}

/**
 * Create a reactive draft state using Svelte 5 runes
 * 
 * This version integrates with Svelte's reactivity system and automatically
 * saves drafts when the state changes.
 * 
 * Usage:
 * ```svelte
 * <script>
 * const notes = useDraftState('assessment-notes', '');
 * 
 * // Use like normal state
 * notes.value = 'New notes...';
 * 
 * // Clear after save
 * notes.clearDraft();
 * </script>
 * ```
 */
export function useDraftState<T>(
	key: string,
	initialValue: T,
	options: DraftOptions = {}
): {
	value: T;
	clearDraft: () => void;
	hasDraft: () => boolean;
} {
	const draft = useDraft<T>(key, options);

	// Try to restore from draft
	const restored = draft.get();
	let value = $state<T>(restored !== null ? restored : initialValue);

	// Auto-save on change using $effect
	$effect(() => {
		// Read the value to track it as a dependency
		const currentValue = value;
		// Save draft (throttled)
		draft.save(currentValue);
	});

	return {
		get value() {
			return value;
		},
		set value(newValue: T) {
			value = newValue;
		},
		clearDraft: () => draft.clear(),
		hasDraft: () => draft.hasDraft()
	};
}

