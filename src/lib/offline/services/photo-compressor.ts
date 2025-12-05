/**
 * Photo Compression Service
 * Handles client-side image compression for offline storage
 */

export interface CompressionOptions {
	maxWidth: number;
	maxHeight: number;
	quality: number; // 0-1
	format?: 'jpeg' | 'webp';
}

// Default compression settings
export const DEFAULT_PHOTO_OPTIONS: CompressionOptions = {
	maxWidth: 1920,
	maxHeight: 1920,
	quality: 0.8,
	format: 'jpeg'
};

export const DEFAULT_THUMBNAIL_OPTIONS: CompressionOptions = {
	maxWidth: 200,
	maxHeight: 200,
	quality: 0.6,
	format: 'jpeg'
};

/**
 * Compress a photo/image file
 * @param file - The image file or blob to compress
 * @param options - Compression options
 * @returns Compressed image as Blob
 */
export async function compressPhoto(
	file: File | Blob,
	options: Partial<CompressionOptions> = {}
): Promise<Blob> {
	const opts = { ...DEFAULT_PHOTO_OPTIONS, ...options };

	return new Promise((resolve, reject) => {
		const img = new Image();

		img.onload = () => {
			// Revoke the object URL to free memory
			URL.revokeObjectURL(img.src);

			try {
				const canvas = document.createElement('canvas');
				let { width, height } = img;

				// Calculate new dimensions maintaining aspect ratio
				if (width > opts.maxWidth) {
					height = (height * opts.maxWidth) / width;
					width = opts.maxWidth;
				}
				if (height > opts.maxHeight) {
					width = (width * opts.maxHeight) / height;
					height = opts.maxHeight;
				}

				// Round dimensions
				width = Math.round(width);
				height = Math.round(height);

				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
				}

				// Draw image with smoothing
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';
				ctx.drawImage(img, 0, 0, width, height);

				// Convert to blob
				const mimeType = opts.format === 'webp' ? 'image/webp' : 'image/jpeg';

				canvas.toBlob(
					(blob) => {
						if (blob) {
							resolve(blob);
						} else {
							reject(new Error('Failed to create blob from canvas'));
						}
					},
					mimeType,
					opts.quality
				);
			} catch (error) {
				reject(error);
			}
		};

		img.onerror = () => {
			URL.revokeObjectURL(img.src);
			reject(new Error('Failed to load image'));
		};

		// Create object URL and load image
		img.src = URL.createObjectURL(file);
	});
}

/**
 * Create a thumbnail from a photo
 * @param file - The image file or blob
 * @param options - Thumbnail options
 * @returns Thumbnail as Blob
 */
export async function createThumbnail(
	file: File | Blob,
	options: Partial<CompressionOptions> = {}
): Promise<Blob> {
	const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };
	return compressPhoto(file, opts);
}

/**
 * Get image dimensions without loading full image into memory
 * @param file - The image file
 * @returns Image dimensions
 */
export async function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();

		img.onload = () => {
			URL.revokeObjectURL(img.src);
			resolve({ width: img.width, height: img.height });
		};

		img.onerror = () => {
			URL.revokeObjectURL(img.src);
			reject(new Error('Failed to load image'));
		};

		img.src = URL.createObjectURL(file);
	});
}

/**
 * Estimate compressed file size
 * @param originalSize - Original file size in bytes
 * @param quality - Compression quality (0-1)
 * @returns Estimated compressed size in bytes
 */
export function estimateCompressedSize(originalSize: number, quality: number): number {
	// Rough estimation based on quality
	// JPEG compression is complex, this is an approximation
	const compressionRatio = 0.3 + quality * 0.5; // 30-80% of original
	return Math.round(originalSize * compressionRatio);
}

/**
 * Check if a file is an image
 * @param file - File to check
 * @returns Whether the file is an image
 */
export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/');
}

/**
 * Get the file extension for a mime type
 * @param mimeType - MIME type
 * @returns File extension
 */
export function getExtensionForMimeType(mimeType: string): string {
	const extensions: Record<string, string> = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/webp': 'webp',
		'image/gif': 'gif',
		'image/heic': 'heic',
		'image/heif': 'heif'
	};
	return extensions[mimeType] || 'jpg';
}
