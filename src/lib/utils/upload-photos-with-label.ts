/**
 * Upload Photos With Label Utility
 *
 * Uploads pending photos with automatic labeling for line item integration.
 * Supports estimate, pre-incident, and additionals photo categories.
 */

import { storageService } from '$lib/services/storage.service';
import { estimatePhotosService } from '$lib/services/estimate-photos.service';
import { preIncidentEstimatePhotosService } from '$lib/services/pre-incident-estimate-photos.service';
import { additionalsPhotosService } from '$lib/services/additionals-photos.service';
import type { PendingPhoto } from '$lib/components/assessment/PendingPhotoCapture.svelte';

/**
 * Photo category for upload routing
 */
export type PhotoCategory = 'estimate' | 'pre-incident' | 'additionals';

/**
 * Options for uploading photos with labels
 */
export interface UploadPhotosWithLabelOptions {
	/** Array of pending photos to upload */
	photos: PendingPhoto[];
	/** Label to apply to all photos (e.g., line item description) */
	label: string;
	/** Assessment ID for storage path */
	assessmentId: string;
	/** Parent ID - estimateId for estimate/pre-incident, additionalsId for additionals */
	parentId: string;
	/** Photo category determines storage location and service */
	category: PhotoCategory;
	/** Optional progress callback */
	onProgress?: (uploaded: number, total: number) => void;
}

/**
 * Result of photo upload operation
 */
export interface UploadPhotosResult {
	/** Number of successfully uploaded photos */
	successCount: number;
	/** Number of failed uploads */
	errorCount: number;
	/** Error messages for failed uploads */
	errors: string[];
}

/**
 * Upload pending photos with automatic labeling
 *
 * This utility:
 * 1. Uploads compressed photos to correct storage location
 * 2. Creates photo records with the provided label
 * 3. Handles display order automatically
 *
 * @example
 * // Upload photos for an estimate line item
 * await uploadPhotosWithLabel({
 *   photos: pendingPhotos,
 *   label: 'Front Bumper',
 *   assessmentId: 'ASM-2025-001',
 *   parentId: estimateId,
 *   category: 'estimate'
 * });
 */
export async function uploadPhotosWithLabel(
	options: UploadPhotosWithLabelOptions
): Promise<UploadPhotosResult> {
	const { photos, label, assessmentId, parentId, category, onProgress } = options;

	// Filter to only ready photos
	const readyPhotos = photos.filter((p) => p.status === 'ready');

	if (readyPhotos.length === 0) {
		return { successCount: 0, errorCount: 0, errors: [] };
	}

	// Configuration per category
	const categoryConfig = {
		estimate: {
			storageCategory: 'estimate' as const,
			storageSubcategory: 'incident',
			getNextDisplayOrder: () => estimatePhotosService.getNextDisplayOrder(parentId),
			createPhoto: (data: {
				parentId: string;
				photoUrl: string;
				photoPath: string;
				label: string;
				displayOrder: number;
			}) =>
				estimatePhotosService.createPhoto({
					estimate_id: data.parentId,
					photo_url: data.photoUrl,
					photo_path: data.photoPath,
					label: data.label,
					display_order: data.displayOrder
				})
		},
		'pre-incident': {
			storageCategory: 'pre-incident' as const,
			storageSubcategory: 'incident',
			getNextDisplayOrder: () => preIncidentEstimatePhotosService.getNextDisplayOrder(parentId),
			createPhoto: (data: {
				parentId: string;
				photoUrl: string;
				photoPath: string;
				label: string;
				displayOrder: number;
			}) =>
				preIncidentEstimatePhotosService.createPhoto({
					estimate_id: data.parentId,
					photo_url: data.photoUrl,
					photo_path: data.photoPath,
					label: data.label,
					display_order: data.displayOrder
				})
		},
		additionals: {
			storageCategory: 'estimate' as const, // Additionals photos stored in estimate folder
			storageSubcategory: 'additionals',
			getNextDisplayOrder: () => additionalsPhotosService.getNextDisplayOrder(parentId),
			createPhoto: (data: {
				parentId: string;
				photoUrl: string;
				photoPath: string;
				label: string;
				displayOrder: number;
			}) =>
				additionalsPhotosService.createPhoto({
					additionals_id: data.parentId,
					photo_url: data.photoUrl,
					photo_path: data.photoPath,
					label: data.label,
					display_order: data.displayOrder
				})
		}
	};

	const config = categoryConfig[category];
	const result: UploadPhotosResult = {
		successCount: 0,
		errorCount: 0,
		errors: []
	};

	// Get starting display order
	let displayOrder = await config.getNextDisplayOrder();

	// Upload each photo sequentially
	for (let i = 0; i < readyPhotos.length; i++) {
		const photo = readyPhotos[i];

		try {
			// 1. Upload compressed file to storage (skip compression since already compressed)
			const uploadResult = await storageService.uploadAssessmentPhoto(
				photo.compressedFile,
				assessmentId,
				config.storageCategory,
				config.storageSubcategory,
				{ skipCompression: true }
			);

			// 2. Create photo record with label
			await config.createPhoto({
				parentId,
				photoUrl: uploadResult.url,
				photoPath: uploadResult.path,
				label: label || '', // Use empty string if no label provided
				displayOrder: displayOrder++
			});

			result.successCount++;
			onProgress?.(result.successCount, readyPhotos.length);
		} catch (error) {
			result.errorCount++;
			result.errors.push(
				`Photo ${i + 1}: ${error instanceof Error ? error.message : 'Upload failed'}`
			);
			console.error(`Failed to upload photo ${i + 1}:`, error);
		}
	}

	return result;
}

/**
 * Check if any photos are ready for upload
 */
export function hasReadyPhotos(photos: PendingPhoto[]): boolean {
	return photos.some((p) => p.status === 'ready');
}

/**
 * Get count of ready photos
 */
export function getReadyPhotoCount(photos: PendingPhoto[]): number {
	return photos.filter((p) => p.status === 'ready').length;
}
