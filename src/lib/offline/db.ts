/**
 * ClaimTech Offline Database
 * Uses Dexie.js for IndexedDB management
 */

import Dexie, { type Table } from 'dexie';
import type {
	AssessmentTabData,
	OfflineAssessmentStatus,
	OfflinePhotoStatus,
	SyncQueueStatus,
	SyncQueueType,
	SyncQueueAction
} from './schema';

/**
 * Offline Assessment Record
 * Stores cached assessment data for offline access
 */
export interface OfflineAssessment {
	id: string; // Assessment UUID
	appointment_id?: string;
	request_id?: string;
	status: OfflineAssessmentStatus;
	last_modified: Date;
	last_synced?: Date;
	data: AssessmentTabData;
}

/**
 * Offline Photo Record
 * Stores photos locally before upload
 */
export interface OfflinePhoto {
	id: string; // Local UUID
	assessment_id: string;
	category: string; // 'exterior' | 'damage' | 'tyres' | 'interior' | etc
	label?: string;
	blob: Blob; // Actual photo data (compressed)
	thumbnail: Blob; // Small preview thumbnail
	status: OfflinePhotoStatus;
	remote_path?: string; // Supabase storage path after upload
	remote_url?: string; // Public URL after upload
	created_at: Date;
	uploaded_at?: Date;
	file_size: number; // Bytes
}

/**
 * Sync Queue Item
 * Tracks pending sync operations
 */
export interface SyncQueueItem {
	id: string;
	type: SyncQueueType;
	entity_id: string;
	action: SyncQueueAction;
	payload: Record<string, unknown>;
	status: SyncQueueStatus;
	attempts: number;
	max_attempts: number;
	last_attempt?: Date;
	error?: string;
	created_at: Date;
	priority: number; // Lower = higher priority
}

/**
 * Cached Appointment (read-only)
 * Pre-cached appointments for offline viewing
 */
export interface CachedAppointment {
	id: string;
	assessment_id?: string;
	request_id: string;
	scheduled_date: string;
	scheduled_time?: string;
	status: string;
	vehicle_info: {
		make?: string;
		model?: string;
		registration?: string;
		year?: number;
	};
	location?: {
		address?: string;
		latitude?: number;
		longitude?: number;
	};
	cached_at: Date;
}

/**
 * ClaimTech Offline Database Class
 */
class ClaimTechOfflineDB extends Dexie {
	// Table declarations
	assessments!: Table<OfflineAssessment, string>;
	photos!: Table<OfflinePhoto, string>;
	syncQueue!: Table<SyncQueueItem, string>;
	appointments!: Table<CachedAppointment, string>;

	constructor() {
		super('ClaimTechOffline');

		// Database schema versioning
		this.version(1).stores({
			// Primary key first, then indexed fields
			assessments: 'id, appointment_id, request_id, status, last_modified',
			photos: 'id, assessment_id, category, status, created_at',
			syncQueue: 'id, type, entity_id, status, priority, created_at',
			appointments: 'id, assessment_id, request_id, scheduled_date, status, cached_at'
		});
	}

	/**
	 * Clear all offline data (useful for logout)
	 */
	async clearAll(): Promise<void> {
		await Promise.all([
			this.assessments.clear(),
			this.photos.clear(),
			this.syncQueue.clear(),
			this.appointments.clear()
		]);
	}

	/**
	 * Get total storage used (approximate)
	 */
	async getStorageUsed(): Promise<{ photos: number; total: number }> {
		const photos = await this.photos.toArray();
		const photoSize = photos.reduce((acc, p) => acc + p.file_size, 0);

		// Estimate total (photos are the majority)
		const total = photoSize * 1.1; // Add 10% for metadata

		return {
			photos: photoSize,
			total: Math.round(total)
		};
	}

	/**
	 * Clean up old synced data to free space
	 */
	async cleanup(olderThanDays: number = 7): Promise<number> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - olderThanDays);

		// Delete old synced photos
		const oldPhotos = await this.photos
			.where('status')
			.equals('uploaded')
			.and((p) => p.uploaded_at !== undefined && p.uploaded_at < cutoff)
			.toArray();

		await this.photos.bulkDelete(oldPhotos.map((p) => p.id));

		// Delete completed sync queue items
		const oldSyncItems = await this.syncQueue
			.where('status')
			.equals('completed')
			.and((s) => s.created_at < cutoff)
			.toArray();

		await this.syncQueue.bulkDelete(oldSyncItems.map((s) => s.id));

		return oldPhotos.length + oldSyncItems.length;
	}
}

// Singleton instance
export const db = new ClaimTechOfflineDB();

// Export types
export type { AssessmentTabData };
