/**
 * Photo Prefetch Utility
 *
 * Preloads photo images in the background so they're cached
 * when the user navigates to different assessment tabs.
 */

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

	let cancelled = false;
	let loaded = 0;
	const total = validUrls.length;
	const queue = [...validUrls];
	const activeLoads = new Set<HTMLImageElement>();

	const loadNext = () => {
		if (cancelled || queue.length === 0) return;

		const url = queue.shift()!;
		const img = new Image();
		activeLoads.add(img);

		// Use low priority for background prefetch
		if (priority === 'low') {
			img.loading = 'lazy';
			img.decoding = 'async';
		}

		img.onload = img.onerror = () => {
			activeLoads.delete(img);
			loaded++;
			onProgress?.(loaded, total);

			if (loaded === total) {
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
		activeLoads.forEach((img) => {
			img.src = ''; // Cancel pending loads
		});
		activeLoads.clear();
	};
}

/**
 * Extract all photo URLs from assessment data
 * Collects URLs from all photo arrays in the assessment
 */
export function collectAssessmentPhotoUrls(data: {
	exterior360Photos?: Array<{ photo_url?: string | null }>;
	interiorPhotos?: Array<{ photo_url?: string | null }>;
	tyrePhotos?: Array<{ photo_url?: string | null }>;
	estimatePhotos?: Array<{ photo_url?: string | null }>;
	preIncidentEstimatePhotos?: Array<{ photo_url?: string | null }>;
	additionalsPhotos?: Array<{ photo_url?: string | null }>;
}): string[] {
	const urls: string[] = [];

	const extractUrls = (photos?: Array<{ photo_url?: string | null }>) => {
		if (!photos) return;
		photos.forEach((photo) => {
			if (photo.photo_url) {
				urls.push(photo.photo_url);
			}
		});
	};

	// Collect from all photo sources
	extractUrls(data.exterior360Photos);
	extractUrls(data.interiorPhotos);
	extractUrls(data.tyrePhotos);
	extractUrls(data.estimatePhotos);
	extractUrls(data.preIncidentEstimatePhotos);
	extractUrls(data.additionalsPhotos);

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
