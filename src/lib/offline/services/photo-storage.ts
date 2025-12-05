/**
 * Photo Storage Service
 * Manages offline photo storage in IndexedDB
 */

import { db, type OfflinePhoto } from '../db';
import { compressPhoto, createThumbnail, DEFAULT_PHOTO_OPTIONS, DEFAULT_THUMBNAIL_OPTIONS } from './photo-compressor';

/**
 * Photo category types
 */
export type PhotoCategory =
	| 'exterior_front'
	| 'exterior_rear'
	| 'exterior_left'
	| 'exterior_right'
	| 'exterior_front_left'
	| 'exterior_front_right'
	| 'exterior_rear_left'
	| 'exterior_rear_right'
	| 'interior'
	| 'damage'
	| 'tyres'
	| 'mileage'
	| 'vin'
	| 'registration'
	| 'engine'
	| 'license_disc'
	| 'other';

/**
 * Photo Storage Class
 */
class PhotoStorageService {
	/**
	 * Store a photo locally
	 * @param assessmentId - Assessment UUID
	 * @param category - Photo category
	 * @param file - The photo file
	 * @param label - Optional label for the photo
	 * @returns The stored offline photo record
	 */
	async storePhoto(
		assessmentId: string,
		category: PhotoCategory | string,
		file: File | Blob,
		label?: string
	): Promise<OfflinePhoto> {
		// Compress the photo
		const compressed = await compressPhoto(file, DEFAULT_PHOTO_OPTIONS);

		// Create thumbnail
		const thumbnail = await createThumbnail(compressed, DEFAULT_THUMBNAIL_OPTIONS);

		// Create photo record
		const photo: OfflinePhoto = {
			id: crypto.randomUUID(),
			assessment_id: assessmentId,
			category,
			label,
			blob: compressed,
			thumbnail,
			status: 'pending',
			created_at: new Date(),
			file_size: compressed.size
		};

		// Store in IndexedDB
		await db.photos.add(photo);

		// Add to sync queue
		await db.syncQueue.add({
			id: crypto.randomUUID(),
			type: 'photo',
			entity_id: photo.id,
			action: 'create',
			payload: {
				assessment_id: assessmentId,
				category,
				label
			},
			status: 'pending',
			attempts: 0,
			max_attempts: 3,
			created_at: new Date(),
			priority: 10 // Lower priority than assessment data
		});

		console.log(`PWA: Photo stored locally (${(compressed.size / 1024).toFixed(1)} KB)`);

		return photo;
	}

	/**
	 * Get photos for an assessment
	 * @param assessmentId - Assessment UUID
	 * @param category - Optional category filter
	 * @returns Array of offline photos
	 */
	async getPhotos(assessmentId: string, category?: string): Promise<OfflinePhoto[]> {
		let collection = db.photos.where('assessment_id').equals(assessmentId);

		if (category) {
			collection = collection.and((p) => p.category === category);
		}

		return collection.sortBy('created_at');
	}

	/**
	 * Get a single photo by ID
	 * @param photoId - Photo UUID
	 * @returns The photo or undefined
	 */
	async getPhoto(photoId: string): Promise<OfflinePhoto | undefined> {
		return db.photos.get(photoId);
	}

	/**
	 * Get a blob URL for a photo (for display)
	 * @param photo - The photo record
	 * @param useThumbnail - Whether to use thumbnail
	 * @returns Object URL (must be revoked when done)
	 */
	getPhotoUrl(photo: OfflinePhoto, useThumbnail = false): string {
		const blob = useThumbnail ? photo.thumbnail : photo.blob;
		return URL.createObjectURL(blob);
	}

	/**
	 * Get a blob URL by photo ID
	 * @param photoId - Photo UUID
	 * @param useThumbnail - Whether to use thumbnail
	 * @returns Object URL or null if not found
	 */
	async getPhotoUrlById(photoId: string, useThumbnail = false): Promise<string | null> {
		const photo = await this.getPhoto(photoId);
		if (!photo) return null;
		return this.getPhotoUrl(photo, useThumbnail);
	}

	/**
	 * Delete a photo
	 * @param photoId - Photo UUID
	 */
	async deletePhoto(photoId: string): Promise<void> {
		// Remove from photos table
		await db.photos.delete(photoId);

		// Remove from sync queue if pending
		await db.syncQueue.where('entity_id').equals(photoId).delete();

		console.log('PWA: Photo deleted');
	}

	/**
	 * Update photo label
	 * @param photoId - Photo UUID
	 * @param label - New label
	 */
	async updateLabel(photoId: string, label: string): Promise<void> {
		await db.photos.update(photoId, { label });

		// Add update to sync queue
		await db.syncQueue.add({
			id: crypto.randomUUID(),
			type: 'photo',
			entity_id: photoId,
			action: 'update',
			payload: { label },
			status: 'pending',
			attempts: 0,
			max_attempts: 3,
			created_at: new Date(),
			priority: 5
		});
	}

	/**
	 * Mark a photo as uploaded
	 * @param photoId - Photo UUID
	 * @param remotePath - Storage path on server
	 * @param remoteUrl - Public URL
	 */
	async markUploaded(photoId: string, remotePath: string, remoteUrl?: string): Promise<void> {
		await db.photos.update(photoId, {
			status: 'uploaded',
			remote_path: remotePath,
			remote_url: remoteUrl,
			uploaded_at: new Date()
		});
	}

	/**
	 * Mark a photo as failed
	 * @param photoId - Photo UUID
	 */
	async markFailed(photoId: string): Promise<void> {
		await db.photos.update(photoId, { status: 'failed' });
	}

	/**
	 * Get pending photos (not yet uploaded)
	 * @param assessmentId - Optional assessment filter
	 * @returns Array of pending photos
	 */
	async getPendingPhotos(assessmentId?: string): Promise<OfflinePhoto[]> {
		let collection = db.photos.where('status').equals('pending');

		if (assessmentId) {
			collection = collection.and((p) => p.assessment_id === assessmentId);
		}

		return collection.toArray();
	}

	/**
	 * Get failed photos
	 * @returns Array of failed photos
	 */
	async getFailedPhotos(): Promise<OfflinePhoto[]> {
		return db.photos.where('status').equals('failed').toArray();
	}

	/**
	 * Get total storage used by photos
	 * @returns Total bytes used
	 */
	async getTotalStorageUsed(): Promise<number> {
		const photos = await db.photos.toArray();
		return photos.reduce((acc, p) => acc + p.file_size, 0);
	}

	/**
	 * Get photo count by status
	 * @returns Object with counts by status
	 */
	async getStatusCounts(): Promise<{ pending: number; uploading: number; uploaded: number; failed: number }> {
		const [pending, uploading, uploaded, failed] = await Promise.all([
			db.photos.where('status').equals('pending').count(),
			db.photos.where('status').equals('uploading').count(),
			db.photos.where('status').equals('uploaded').count(),
			db.photos.where('status').equals('failed').count()
		]);

		return { pending, uploading, uploaded, failed };
	}

	/**
	 * Clean up old uploaded photos to free space
	 * @param olderThanDays - Delete photos older than this many days
	 * @returns Number of photos deleted
	 */
	async cleanup(olderThanDays: number = 7): Promise<number> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - olderThanDays);

		const oldPhotos = await db.photos
			.where('status')
			.equals('uploaded')
			.and((p) => p.uploaded_at !== undefined && p.uploaded_at < cutoff)
			.toArray();

		await db.photos.bulkDelete(oldPhotos.map((p) => p.id));

		console.log(`PWA: Cleaned up ${oldPhotos.length} old photos`);
		return oldPhotos.length;
	}
}

// Singleton instance
export const photoStorage = new PhotoStorageService();
