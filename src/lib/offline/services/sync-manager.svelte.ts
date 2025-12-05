/**
 * Sync Manager Service
 * Orchestrates background sync of offline data to Supabase
 */

import { browser } from '$app/environment';
import { db, type SyncQueueItem, type OfflinePhoto } from '../db';
import { networkStatus } from '../network-status.svelte';
import { assessmentCache } from './assessment-cache';
import { photoStorage } from './photo-storage';

/**
 * Sync Manager Class
 * Uses Svelte 5 runes for reactive state
 */
class SyncManagerService {
	// Reactive state
	isSyncing = $state(false);
	pendingCount = $state(0);
	failedCount = $state(0);
	currentItem = $state<string | null>(null);
	progress = $state(0);
	lastSyncTime = $state<Date | null>(null);
	lastError = $state<string | null>(null);

	// Private state
	private syncInProgress = false;
	private supabaseClient: SupabaseClientType | null = null;

	constructor() {
		if (browser) {
			this.initializeListeners();
			this.updateCounts();
		}
	}

	/**
	 * Set the Supabase client (called from layout/context)
	 */
	setSupabaseClient(client: SupabaseClientType): void {
		this.supabaseClient = client;
	}

	/**
	 * Initialize event listeners
	 */
	private initializeListeners(): void {
		// Start sync when coming online
		window.addEventListener('online', () => {
			console.log('PWA: Network online - starting sync');
			this.startSync();
		});

		// Update counts when visibility changes
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				this.updateCounts();
			}
		});
	}

	/**
	 * Update pending/failed counts
	 */
	async updateCounts(): Promise<void> {
		try {
			this.pendingCount = await db.syncQueue.where('status').equals('pending').count();
			this.failedCount = await db.syncQueue.where('status').equals('failed').count();
		} catch (error) {
			console.error('PWA: Failed to update sync counts', error);
		}
	}

	/**
	 * Start the sync process
	 */
	async startSync(): Promise<void> {
		// Guards
		if (this.syncInProgress) {
			console.log('PWA: Sync already in progress');
			return;
		}

		if (!networkStatus.isOnline) {
			console.log('PWA: Cannot sync - offline');
			return;
		}

		if (!this.supabaseClient) {
			console.log('PWA: Cannot sync - no Supabase client');
			return;
		}

		this.syncInProgress = true;
		this.isSyncing = true;
		this.lastError = null;

		try {
			// Get pending items sorted by priority
			const pending = await db.syncQueue
				.where('status')
				.equals('pending')
				.sortBy('priority');

			if (pending.length === 0) {
				console.log('PWA: No items to sync');
				return;
			}

			console.log(`PWA: Starting sync of ${pending.length} items`);
			this.pendingCount = pending.length;

			for (let i = 0; i < pending.length; i++) {
				const item = pending[i];

				// Check if still online
				if (!networkStatus.isOnline) {
					console.log('PWA: Sync interrupted - went offline');
					break;
				}

				this.currentItem = item.type;
				this.progress = ((i + 1) / pending.length) * 100;

				try {
					await this.processItem(item);

					// Mark as completed
					await db.syncQueue.update(item.id, { status: 'completed' });
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					console.error(`PWA: Failed to sync ${item.type}:`, error);

					// Update item with error
					await db.syncQueue.update(item.id, {
						status: item.attempts + 1 >= item.max_attempts ? 'failed' : 'pending',
						attempts: item.attempts + 1,
						last_attempt: new Date(),
						error: errorMessage
					});

					this.lastError = errorMessage;
				}
			}

			this.lastSyncTime = new Date();
			console.log('PWA: Sync completed');
		} finally {
			this.syncInProgress = false;
			this.isSyncing = false;
			this.currentItem = null;
			this.progress = 100;
			await this.updateCounts();

			// Clean up completed items
			await this.cleanupCompleted();
		}
	}

	/**
	 * Process a single sync queue item
	 */
	private async processItem(item: SyncQueueItem): Promise<void> {
		if (!this.supabaseClient) {
			throw new Error('No Supabase client');
		}

		switch (item.type) {
			case 'photo':
				await this.syncPhoto(item);
				break;
			case 'assessment':
				await this.syncAssessment(item);
				break;
			default:
				console.warn(`PWA: Unknown sync item type: ${item.type}`);
		}
	}

	/**
	 * Sync a photo to Supabase Storage
	 */
	private async syncPhoto(item: SyncQueueItem): Promise<void> {
		if (!this.supabaseClient) throw new Error('No Supabase client');

		const photo = await db.photos.get(item.entity_id);
		if (!photo) {
			console.warn(`PWA: Photo not found: ${item.entity_id}`);
			return;
		}

		// Update status to uploading
		await db.photos.update(photo.id, { status: 'uploading' });

		// Build storage path
		const path = `assessments/${photo.assessment_id}/${photo.category}/${photo.id}.jpg`;

		// Upload to Supabase Storage
		const { error: uploadError } = await this.supabaseClient.storage
			.from('assessment-photos')
			.upload(path, photo.blob, {
				contentType: 'image/jpeg',
				upsert: true
			});

		if (uploadError) {
			await db.photos.update(photo.id, { status: 'failed' });
			throw uploadError;
		}

		// Get public URL
		const { data: urlData } = this.supabaseClient.storage
			.from('assessment-photos')
			.getPublicUrl(path);

		// Mark as uploaded
		await photoStorage.markUploaded(photo.id, path, urlData.publicUrl);

		console.log(`PWA: Photo uploaded: ${path}`);
	}

	/**
	 * Sync assessment data to Supabase
	 */
	private async syncAssessment(item: SyncQueueItem): Promise<void> {
		if (!this.supabaseClient) throw new Error('No Supabase client');

		const { tab, data } = item.payload as { tab: string; data: Record<string, unknown> };
		const assessmentId = item.entity_id;

		// Map tab names to database tables
		const tableMap: Record<string, string> = {
			vehicle_id: 'assessment_vehicle_identification',
			exterior_360: 'assessment_exterior_360',
			damage: 'assessment_damage',
			tyres: 'assessment_tyres',
			mileage: 'assessment_interior_mechanical',
			notes: 'assessment_notes',
			estimate: 'assessment_estimates',
			interior: 'assessment_interior',
			windows: 'assessment_windows',
			accessories: 'assessment_accessories'
		};

		const tableName = tableMap[tab];
		if (!tableName) {
			console.warn(`PWA: Unknown tab: ${tab}`);
			return;
		}

		// Upsert data
		const { error } = await this.supabaseClient
			.from(tableName)
			.upsert({
				assessment_id: assessmentId,
				...data,
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'assessment_id'
			});

		if (error) throw error;

		// Update cache status
		await assessmentCache.markSynced(assessmentId);

		console.log(`PWA: Assessment ${tab} synced`);
	}

	/**
	 * Retry failed sync items
	 */
	async retryFailed(): Promise<void> {
		await db.syncQueue
			.where('status')
			.equals('failed')
			.modify({ status: 'pending', attempts: 0, error: undefined });

		await this.updateCounts();
		await this.startSync();
	}

	/**
	 * Clear failed items without retrying
	 */
	async clearFailed(): Promise<void> {
		await db.syncQueue.where('status').equals('failed').delete();
		await this.updateCounts();
	}

	/**
	 * Clean up completed sync items
	 */
	private async cleanupCompleted(): Promise<void> {
		const oneDayAgo = new Date();
		oneDayAgo.setDate(oneDayAgo.getDate() - 1);

		await db.syncQueue
			.where('status')
			.equals('completed')
			.and((item) => item.created_at < oneDayAgo)
			.delete();
	}

	/**
	 * Get detailed sync status
	 */
	async getStatus(): Promise<{
		pending: number;
		failed: number;
		completed: number;
		inProgress: boolean;
	}> {
		const [pending, failed, completed] = await Promise.all([
			db.syncQueue.where('status').equals('pending').count(),
			db.syncQueue.where('status').equals('failed').count(),
			db.syncQueue.where('status').equals('completed').count()
		]);

		return {
			pending,
			failed,
			completed,
			inProgress: this.isSyncing
		};
	}

	/**
	 * Get failed items for display
	 */
	async getFailedItems(): Promise<SyncQueueItem[]> {
		return db.syncQueue.where('status').equals('failed').toArray();
	}

	/**
	 * Force sync now (manual trigger)
	 */
	async forceSyncNow(): Promise<void> {
		if (!networkStatus.isOnline) {
			throw new Error('Cannot sync while offline');
		}
		await this.startSync();
	}
}

// Type placeholder for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;

// Singleton instance
export const syncManager = new SyncManagerService();
