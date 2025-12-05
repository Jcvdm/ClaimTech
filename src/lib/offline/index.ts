/**
 * Offline Module Public Exports
 * Central export point for all offline-related functionality
 */

// Database
export { db } from './db';
export type {
	OfflineAssessment,
	OfflinePhoto,
	SyncQueueItem,
	CachedAppointment,
	AssessmentTabData
} from './db';

// Schema types
export type {
	VehicleIdData,
	Exterior360Data,
	DamageData,
	TyresData,
	TyreCondition,
	MileageData,
	NotesData,
	EstimateData,
	EstimateLineItem,
	InteriorData,
	WindowsData,
	WindowCondition,
	AccessoriesData,
	OfflineAssessmentStatus,
	OfflinePhotoStatus,
	SyncQueueStatus,
	SyncQueueType,
	SyncQueueAction
} from './schema';

// Network status
export { networkStatus } from './network-status.svelte';
export type { ConnectionQuality } from './network-status.svelte';

// Services
export { assessmentCache } from './services/assessment-cache';
export type { AssessmentTab } from './services/assessment-cache';

export { photoStorage } from './services/photo-storage';
export type { PhotoCategory } from './services/photo-storage';

export { syncManager } from './services/sync-manager';

export {
	compressPhoto,
	createThumbnail,
	getImageDimensions,
	isImageFile,
	DEFAULT_PHOTO_OPTIONS,
	DEFAULT_THUMBNAIL_OPTIONS
} from './services/photo-compressor';
export type { CompressionOptions } from './services/photo-compressor';

// Hooks
export { useOfflineAssessment, wrapSaveWithOffline } from './hooks/useOfflineAssessment';
export type { UseOfflineAssessmentOptions } from './hooks/useOfflineAssessment';

// Components (for lazy loading)
// Note: Components should be imported directly from their files
// to enable proper code splitting
