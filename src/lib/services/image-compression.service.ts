import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
	maxWidthOrHeight?: number;
	maxSizeMB?: number;
	quality?: number;
	onProgress?: (progress: number) => void;
}

export interface CompressionResult {
	compressedFile: File;
	originalSize: number;
	compressedSize: number;
	compressionRatio: number;
}

class ImageCompressionService {
	private readonly DEFAULT_MAX_WIDTH_OR_HEIGHT = 1920;
	private readonly DEFAULT_MAX_SIZE_MB = 2;
	private readonly DEFAULT_QUALITY = 0.85;

	/**
	 * Compress an image file
	 * @param file - The image file to compress
	 * @param options - Compression options
	 * @returns Compression result with compressed file and statistics
	 */
	async compressImage(
		file: File,
		options: CompressionOptions = {}
	): Promise<CompressionResult> {
		const {
			maxWidthOrHeight = this.DEFAULT_MAX_WIDTH_OR_HEIGHT,
			maxSizeMB = this.DEFAULT_MAX_SIZE_MB,
			quality = this.DEFAULT_QUALITY,
			onProgress
		} = options;

		const originalSize = file.size;

		try {
			// Configure compression options
			const compressionOptions = {
				maxWidthOrHeight,
				maxSizeMB,
				useWebWorker: true,
				fileType: file.type === 'image/heic' ? 'image/jpeg' : undefined, // Convert HEIC to JPEG
				initialQuality: quality,
				onProgress: (progress: number) => {
					// browser-image-compression returns progress as 0-100
					if (onProgress) {
						onProgress(progress);
					}
				}
			};

			// Compress the image
			const compressedFile = await imageCompression(file, compressionOptions);

			const compressedSize = compressedFile.size;
			const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

			return {
				compressedFile,
				originalSize,
				compressedSize,
				compressionRatio
			};
		} catch (error) {
			console.error('Image compression error:', error);
			throw new Error(
				`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Check if a file needs compression
	 * @param file - The file to check
	 * @param maxSizeMB - Maximum size in MB before compression is needed
	 * @returns True if file should be compressed
	 */
	shouldCompress(file: File, maxSizeMB: number = this.DEFAULT_MAX_SIZE_MB): boolean {
		const fileSizeMB = file.size / (1024 * 1024);
		return fileSizeMB > maxSizeMB;
	}

	/**
	 * Format file size for display
	 * @param bytes - File size in bytes
	 * @returns Formatted string (e.g., "2.5 MB")
	 */
	formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';

		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	/**
	 * Get compression statistics message
	 * @param result - Compression result
	 * @returns Human-readable message
	 */
	getCompressionMessage(result: CompressionResult): string {
		const originalSizeStr = this.formatFileSize(result.originalSize);
		const compressedSizeStr = this.formatFileSize(result.compressedSize);
		const ratio = Math.round(result.compressionRatio);

		return `Compressed from ${originalSizeStr} to ${compressedSizeStr} (${ratio}% reduction)`;
	}
}

export const imageCompressionService = new ImageCompressionService();
