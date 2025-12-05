/**
 * Assessment Cache Service
 * Manages offline caching of assessment data
 */

import { db, type OfflineAssessment, type AssessmentTabData } from '../db';
import { networkStatus } from '../network-status.svelte';

/**
 * Tab names for assessment data
 */
export type AssessmentTab =
	| 'vehicle_id'
	| 'exterior_360'
	| 'damage'
	| 'tyres'
	| 'mileage'
	| 'notes'
	| 'estimate'
	| 'interior'
	| 'windows'
	| 'accessories';

/**
 * Assessment Cache Service Class
 */
class AssessmentCacheService {
	/**
	 * Preload/cache assessment data when opened online
	 * @param assessmentId - Assessment UUID
	 * @param data - Full assessment data
	 * @param appointmentId - Optional appointment ID
	 * @param requestId - Optional request ID
	 */
	async preloadAssessment(
		assessmentId: string,
		data: AssessmentTabData,
		appointmentId?: string,
		requestId?: string
	): Promise<void> {
		const existing = await db.assessments.get(assessmentId);

		// Don't overwrite local modifications
		if (existing?.status === 'modified' || existing?.status === 'pending_sync') {
			console.log('PWA: Skipping preload - local changes exist');
			return;
		}

		const assessment: OfflineAssessment = {
			id: assessmentId,
			appointment_id: appointmentId,
			request_id: requestId,
			status: 'cached',
			last_modified: new Date(),
			last_synced: new Date(),
			data
		};

		await db.assessments.put(assessment);
		console.log('PWA: Assessment cached for offline use');
	}

	/**
	 * Save form data locally (and queue for sync if online)
	 * @param assessmentId - Assessment UUID
	 * @param tab - Tab name
	 * @param data - Tab data
	 */
	async saveLocal(assessmentId: string, tab: AssessmentTab, data: unknown): Promise<void> {
		let assessment = await db.assessments.get(assessmentId);

		if (!assessment) {
			// Create new assessment record if doesn't exist
			assessment = {
				id: assessmentId,
				status: 'modified',
				last_modified: new Date(),
				data: {} as AssessmentTabData
			};
		}

		// Update the specific tab data
		(assessment.data as Record<string, unknown>)[tab] = data;
		assessment.status = 'modified';
		assessment.last_modified = new Date();

		await db.assessments.put(assessment);

		// Queue for sync if online
		if (networkStatus.isOnline) {
			await this.queueSync(assessmentId, tab, data);
		}

		console.log(`PWA: Saved ${tab} locally`);
	}

	/**
	 * Get cached assessment data
	 * @param assessmentId - Assessment UUID
	 * @returns Full cached assessment or undefined
	 */
	async getAssessment(assessmentId: string): Promise<OfflineAssessment | undefined> {
		return db.assessments.get(assessmentId);
	}

	/**
	 * Get specific tab data from cache
	 * @param assessmentId - Assessment UUID
	 * @param tab - Tab name
	 * @returns Tab data or undefined
	 */
	async getTabData<T = unknown>(assessmentId: string, tab: AssessmentTab): Promise<T | undefined> {
		const assessment = await db.assessments.get(assessmentId);
		if (!assessment) return undefined;
		return (assessment.data as Record<string, unknown>)[tab] as T | undefined;
	}

	/**
	 * Check if assessment has local modifications
	 * @param assessmentId - Assessment UUID
	 * @returns Whether there are unsaved changes
	 */
	async hasLocalChanges(assessmentId: string): Promise<boolean> {
		const assessment = await db.assessments.get(assessmentId);
		return assessment?.status === 'modified' || assessment?.status === 'pending_sync';
	}

	/**
	 * Get all modified assessments
	 * @returns Array of modified assessments
	 */
	async getModifiedAssessments(): Promise<OfflineAssessment[]> {
		return db.assessments.where('status').anyOf(['modified', 'pending_sync']).toArray();
	}

	/**
	 * Mark assessment as synced
	 * @param assessmentId - Assessment UUID
	 */
	async markSynced(assessmentId: string): Promise<void> {
		await db.assessments.update(assessmentId, {
			status: 'synced',
			last_synced: new Date()
		});
	}

	/**
	 * Mark assessment as pending sync
	 * @param assessmentId - Assessment UUID
	 */
	async markPendingSync(assessmentId: string): Promise<void> {
		await db.assessments.update(assessmentId, {
			status: 'pending_sync'
		});
	}

	/**
	 * Delete cached assessment
	 * @param assessmentId - Assessment UUID
	 */
	async deleteAssessment(assessmentId: string): Promise<void> {
		await db.assessments.delete(assessmentId);

		// Also remove related sync queue items
		await db.syncQueue
			.where('entity_id')
			.equals(assessmentId)
			.and((item) => item.type === 'assessment')
			.delete();

		console.log('PWA: Deleted cached assessment');
	}

	/**
	 * Add tab update to sync queue
	 */
	private async queueSync(assessmentId: string, tab: AssessmentTab, data: unknown): Promise<void> {
		// Check for existing pending sync for same tab
		const existing = await db.syncQueue
			.where('entity_id')
			.equals(assessmentId)
			.and((item) => item.type === 'assessment' && item.payload?.tab === tab && item.status === 'pending')
			.first();

		if (existing) {
			// Update existing queue item
			await db.syncQueue.update(existing.id, {
				payload: { tab, data },
				created_at: new Date()
			});
		} else {
			// Add new queue item
			await db.syncQueue.add({
				id: crypto.randomUUID(),
				type: 'assessment',
				entity_id: assessmentId,
				action: 'update',
				payload: { tab, data },
				status: 'pending',
				attempts: 0,
				max_attempts: 3,
				created_at: new Date(),
				priority: 1 // High priority
			});
		}
	}

	/**
	 * Get sync status for an assessment
	 * @param assessmentId - Assessment UUID
	 * @returns Object with pending and failed counts
	 */
	async getSyncStatus(assessmentId: string): Promise<{ pending: number; failed: number }> {
		const [pending, failed] = await Promise.all([
			db.syncQueue
				.where('entity_id')
				.equals(assessmentId)
				.and((item) => item.status === 'pending')
				.count(),
			db.syncQueue
				.where('entity_id')
				.equals(assessmentId)
				.and((item) => item.status === 'failed')
				.count()
		]);

		return { pending, failed };
	}

	/**
	 * Get all cached assessment IDs
	 * @returns Array of assessment IDs
	 */
	async getCachedAssessmentIds(): Promise<string[]> {
		const assessments = await db.assessments.toArray();
		return assessments.map((a) => a.id);
	}

	/**
	 * Check if an assessment is cached
	 * @param assessmentId - Assessment UUID
	 * @returns Whether the assessment is cached
	 */
	async isCached(assessmentId: string): Promise<boolean> {
		const assessment = await db.assessments.get(assessmentId);
		return assessment !== undefined;
	}
}

// Singleton instance
export const assessmentCache = new AssessmentCacheService();
