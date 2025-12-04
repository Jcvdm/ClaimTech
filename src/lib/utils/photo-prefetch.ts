/**
 * Photo Prefetch Utility
 *
 * Preloads photo images in the background so they're cached
 * when the user navigates to different assessment tabs.
 */

import { storageService } from '$lib/services/storage.service';

interface PrefetchOptions {
	/** Number of images to load concurrently (default: 4) */
	concurrency?: number;
	/** Priority: 'high' for visible content, 'low' for background prefetch */
	priority?: 'high' | 'low';
	/** Callback when all images are prefetched */
	onComplete?: () => void;
	/** Callback for progress updates */
	onProgress?: (loaded: number, total: number) => void;
}

/**
 * Prefetch an array of image URLs in the background
 * Uses native Image() objects to trigger browser caching
 */
export function prefetchPhotos(
	urls: string[],
	options: PrefetchOptions = {}
): () => void {
	const { concurrency = 4, priority = 'low', onComplete, onProgress } = options;

	// Filter out empty/invalid URLs
	const validUrls = urls.filter((url) => url && typeof url === 'string');

	if (validUrls.length === 0) {
		onComplete?.();
		return () => {};
	}

	console.log(`[Photo Prefetch] Starting prefetch of ${validUrls.length} photos`);

	let cancelled = false;
	let loaded = 0;
	let errors = 0;
	const total = validUrls.length;
	const queue = [...validUrls];
	const activeLoads = new Set<HTMLImageElement>();

	const loadNext = () => {
		if (cancelled || queue.length === 0) return;

		const url = queue.shift()!;
		const img = new Image();
		activeLoads.add(img);

		// Set decoding to async for non-blocking decode
		img.decoding = 'async';

		// Use fetchpriority for low priority (NOT loading='lazy' which prevents loading)
		if (priority === 'low' && 'fetchPriority' in img) {
			(img as any).fetchPriority = 'low';
		}

		img.onload = () => {
			activeLoads.delete(img);
			loaded++;
			onProgress?.(loaded, total);

			if (loaded + errors === total) {
				console.log(`[Photo Prefetch] Complete: ${loaded} loaded, ${errors} errors`);
				onComplete?.();
			} else {
				loadNext();
			}
		};

		img.onerror = () => {
			activeLoads.delete(img);
			errors++;

			if (loaded + errors === total) {
				console.log(`[Photo Prefetch] Complete: ${loaded} loaded, ${errors} errors`);
				onComplete?.();
			} else {
				loadNext();
			}
		};

		img.src = url;
	};

	// Start concurrent loads
	const initialBatch = Math.min(concurrency, validUrls.length);
	for (let i = 0; i < initialBatch; i++) {
		loadNext();
	}

	// Return cancel function
	return () => {
		cancelled = true;
		console.log(`[Photo Prefetch] Cancelled with ${loaded} loaded`);
		activeLoads.forEach((img) => {
			img.src = ''; // Cancel pending loads
		});
		activeLoads.clear();
	};
}

/**
 * Extract all photo URLs from assessment data
 * Collects URLs from all photo arrays AND individual photo fields
 *
 * IMPORTANT: Uses storageService.toPhotoProxyUrl() to transform URLs
 * to match exactly what the photo components will request.
 * This ensures browser cache hits when navigating to tabs.
 */
export function collectAssessmentPhotoUrls(data: {
	// Photo arrays
	exterior360Photos?: Array<{ photo_url?: string | null }>;
	interiorPhotos?: Array<{ photo_url?: string | null }>;
	tyrePhotos?: Array<{ photo_url?: string | null }>;
	estimatePhotos?: Array<{ photo_url?: string | null }>;
	preIncidentEstimatePhotos?: Array<{ photo_url?: string | null }>;
	additionalsPhotos?: Array<{ photo_url?: string | null }>;
	// Main 360 photos (8 positions) stored in exterior360 object
	exterior360?: {
		front_photo_url?: string | null;
		front_left_photo_url?: string | null;
		left_photo_url?: string | null;
		rear_left_photo_url?: string | null;
		rear_photo_url?: string | null;
		rear_right_photo_url?: string | null;
		right_photo_url?: string | null;
		front_right_photo_url?: string | null;
	} | null;
	// Vehicle identification photos
	vehicleIdentification?: {
		registration_photo_url?: string | null;
		vin_photo_url?: string | null;
		mileage_photo_url?: string | null;
		license_disc_photo_url?: string | null;
	} | null;
}): string[] {
	const urls: string[] = [];

	// Helper to add a single URL
	const addUrl = (url?: string | null) => {
		if (url) {
			const proxyUrl = storageService.toPhotoProxyUrl(url);
			if (proxyUrl) {
				urls.push(proxyUrl);
			}
		}
	};

	// Helper to extract from photo arrays
	const extractFromArray = (photos?: Array<{ photo_url?: string | null }>) => {
		if (!photos) return;
		photos.forEach((photo) => addUrl(photo.photo_url));
	};

	// Main 8-position 360° photos (these are the ones loading slow!)
	if (data.exterior360) {
		addUrl(data.exterior360.front_photo_url);
		addUrl(data.exterior360.front_left_photo_url);
		addUrl(data.exterior360.left_photo_url);
		addUrl(data.exterior360.rear_left_photo_url);
		addUrl(data.exterior360.rear_photo_url);
		addUrl(data.exterior360.rear_right_photo_url);
		addUrl(data.exterior360.right_photo_url);
		addUrl(data.exterior360.front_right_photo_url);
	}

	// Vehicle ID photos
	if (data.vehicleIdentification) {
		addUrl(data.vehicleIdentification.registration_photo_url);
		addUrl(data.vehicleIdentification.vin_photo_url);
		addUrl(data.vehicleIdentification.mileage_photo_url);
		addUrl(data.vehicleIdentification.license_disc_photo_url);
	}

	// Photo arrays
	extractFromArray(data.exterior360Photos);
	extractFromArray(data.interiorPhotos);
	extractFromArray(data.tyrePhotos);
	extractFromArray(data.estimatePhotos);
	extractFromArray(data.preIncidentEstimatePhotos);
	extractFromArray(data.additionalsPhotos);

	return urls;
}

/**
 * Prefetch all photos for an assessment
 * Call this on assessment page mount for faster tab navigation
 */
export function prefetchAssessmentPhotos(
	data: Parameters<typeof collectAssessmentPhotoUrls>[0],
	options?: PrefetchOptions
): () => void {
	const urls = collectAssessmentPhotoUrls(data);
	return prefetchPhotos(urls, options);
}
