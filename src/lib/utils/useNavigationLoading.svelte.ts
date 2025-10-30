/**
 * useNavigationLoading - Svelte 5 runes-based utility for tracking table row loading states
 *
 * Provides a simple way to track which row is currently navigating and prevent double-clicks.
 * Automatically resets loading state when navigation completes.
 *
 * Usage:
 * ```svelte
 * <script lang="ts">
 *   import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
 *   import { goto } from '$app/navigation';
 *
 *   const { loadingId, startNavigation, isLoading } = useNavigationLoading();
 *
 *   function handleRowClick(row) {
 *     startNavigation(row.id, `/path/${row.id}`);
 *   }
 * </script>
 *
 * <ModernDataTable
 *   data={items}
 *   columns={columns}
 *   onRowClick={handleRowClick}
 *   loadingRowId={loadingId}
 * />
 * ```
 */

import { goto } from '$app/navigation';
import { navigating } from '$app/stores';
import { get } from 'svelte/store';

export interface NavigationLoadingState {
	/** ID of the row currently loading (null if none) */
	loadingId: string | null;
	/** Start navigation for a specific row */
	startNavigation: (id: string, path: string) => void;
	/** Check if a specific row is loading */
	isLoading: (id: string) => boolean;
}

/**
 * Create a navigation loading state tracker
 *
 * @returns Object with loadingId, startNavigation, and isLoading
 */
export function useNavigationLoading(): NavigationLoadingState {
	let loadingId: string | null = null;
	let unsubscribe: (() => void) | null = null;
	let resetTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Start navigation for a specific row
	 * Prevents double-clicks by checking if already navigating
	 */
	function startNavigation(id: string, path: string): void {
		// Prevent double-click
		if (loadingId) {
			return;
		}

		loadingId = id;

		// Subscribe to navigation changes if not already subscribed
		if (!unsubscribe) {
			unsubscribe = navigating.subscribe((nav) => {
				// When navigation completes (nav becomes null) and we have a loading ID
				if (nav === null && loadingId) {
					// Small delay to ensure page transition is smooth
					resetTimeout = setTimeout(() => {
						loadingId = null;
					}, 300);
				}
			});
		}

		try {
			goto(path);
		} catch (error) {
			console.error('Navigation error:', error);
			// Reset loading state on error
			loadingId = null;
			// Cleanup subscription on error
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
		}
	}

	/**
	 * Check if a specific row is loading
	 */
	function isLoading(id: string): boolean {
		return loadingId === id;
	}

	return {
		get loadingId() {
			return loadingId;
		},
		startNavigation,
		isLoading
	};
}

