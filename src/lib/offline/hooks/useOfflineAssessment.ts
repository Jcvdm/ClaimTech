/**
 * useOfflineAssessment Hook
 * Seamlessly adds offline support to existing assessment flow
 *
 * Usage:
 * - Call cacheAssessment() after loading data
 * - Call saveLocal() alongside existing save logic
 * - Check isOffline to show offline indicator if needed
 */

import { browser } from '$app/environment';
import { assessmentCache, type AssessmentTab } from '$lib/offline';
import { networkStatus } from '$lib/offline/network-status.svelte';
import type { AssessmentTabData } from '$lib/offline/db';

export interface UseOfflineAssessmentOptions {
	assessmentId: string;
	appointmentId?: string;
	requestId?: string;
}

/**
 * Create offline assessment helper
 */
export function useOfflineAssessment(options: UseOfflineAssessmentOptions) {
	const { assessmentId, appointmentId, requestId } = options;

	/**
	 * Cache all assessment data for offline use
	 * Call this after loading data from server
	 */
	async function cacheAssessment(data: Partial<AssessmentTabData>): Promise<void> {
		if (!browser) return;

		try {
			await assessmentCache.preloadAssessment(
				assessmentId,
				data as AssessmentTabData,
				appointmentId,
				requestId
			);
		} catch (error) {
			console.error('PWA: Failed to cache assessment', error);
		}
	}

	/**
	 * Save tab data locally (in addition to server save)
	 * Call this alongside your existing save logic
	 */
	async function saveLocal(tab: AssessmentTab, data: unknown): Promise<void> {
		if (!browser) return;

		try {
			await assessmentCache.saveLocal(assessmentId, tab, data);
		} catch (error) {
			console.error('PWA: Failed to save locally', error);
		}
	}

	/**
	 * Get cached data for a tab (when offline)
	 */
	async function getCachedData<T>(tab: AssessmentTab): Promise<T | undefined> {
		if (!browser) return undefined;

		try {
			return await assessmentCache.getTabData<T>(assessmentId, tab);
		} catch (error) {
			console.error('PWA: Failed to get cached data', error);
			return undefined;
		}
	}

	/**
	 * Check if we have cached data for this assessment
	 */
	async function hasCachedData(): Promise<boolean> {
		if (!browser) return false;

		try {
			return await assessmentCache.isCached(assessmentId);
		} catch {
			return false;
		}
	}

	/**
	 * Get sync status for this assessment
	 */
	async function getSyncStatus(): Promise<{ pending: number; failed: number }> {
		if (!browser) return { pending: 0, failed: 0 };

		try {
			return await assessmentCache.getSyncStatus(assessmentId);
		} catch {
			return { pending: 0, failed: 0 };
		}
	}

	return {
		// Methods
		cacheAssessment,
		saveLocal,
		getCachedData,
		hasCachedData,
		getSyncStatus,

		// Reactive state (from networkStatus)
		get isOffline() {
			return !networkStatus.isOnline;
		},
		get isOnline() {
			return networkStatus.isOnline;
		}
	};
}

/**
 * Helper to wrap existing save function with offline support
 *
 * Usage:
 * const wrappedSave = wrapSaveWithOffline(originalSave, 'vehicle_id', assessmentId);
 */
export function wrapSaveWithOffline<T extends (...args: unknown[]) => Promise<unknown>>(
	saveFn: T,
	tab: AssessmentTab,
	assessmentId: string
): T {
	return (async (...args: unknown[]) => {
		// Get the data being saved (assume first arg or extract from context)
		const data = args[0];

		// Save locally first (fast, always works)
		try {
			await assessmentCache.saveLocal(assessmentId, tab, data);
		} catch (error) {
			console.error('PWA: Local save failed', error);
		}

		// If online, also save to server
		if (networkStatus.isOnline) {
			return saveFn(...args);
		} else {
			console.log('PWA: Offline - saved locally, will sync when online');
			return data; // Return the data as if save succeeded
		}
	}) as T;
}
