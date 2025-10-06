import { supabase } from '$lib/supabase';

export interface UploadPhotoResult {
	url: string;
	path: string;
}

export interface UploadPhotoOptions {
	bucket?: string;
	folder?: string;
	fileName?: string;
	maxSizeMB?: number;
}

class StorageService {
	private readonly DEFAULT_BUCKET = 'assessment-photos';
	private readonly MAX_FILE_SIZE_MB = 10;

	/**
	 * Initialize storage buckets (call this once during app setup)
	 */
	async initializeBuckets(): Promise<void> {
		try {
			// Check if bucket exists
			const { data: buckets } = await supabase.storage.listBuckets();
			const bucketExists = buckets?.some((b) => b.name === this.DEFAULT_BUCKET);

			if (!bucketExists) {
				// Create bucket
				const { error } = await supabase.storage.createBucket(this.DEFAULT_BUCKET, {
					public: true,
					fileSizeLimit: this.MAX_FILE_SIZE_MB * 1024 * 1024
				});

				if (error) {
					console.error('Error creating bucket:', error);
				}
			}
		} catch (error) {
			console.error('Error initializing buckets:', error);
		}
	}

	/**
	 * Upload a photo file to Supabase Storage
	 */
	async uploadPhoto(
		file: File,
		options: UploadPhotoOptions = {}
	): Promise<UploadPhotoResult> {
		const {
			bucket = this.DEFAULT_BUCKET,
			folder = 'general',
			fileName,
			maxSizeMB = this.MAX_FILE_SIZE_MB
		} = options;

		// Validate file size
		const fileSizeMB = file.size / (1024 * 1024);
		if (fileSizeMB > maxSizeMB) {
			throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			throw new Error('Only image files are allowed');
		}

		// Generate unique file name
		const timestamp = Date.now();
		const randomString = Math.random().toString(36).substring(2, 8);
		const extension = file.name.split('.').pop();
		const uniqueFileName = fileName || `${timestamp}-${randomString}.${extension}`;
		const filePath = `${folder}/${uniqueFileName}`;

		// Upload file
		const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
			cacheControl: '3600',
			upsert: false
		});

		if (error) {
			console.error('Upload error:', error);
			throw new Error(`Failed to upload photo: ${error.message}`);
		}

		// Get public URL
		const {
			data: { publicUrl }
		} = supabase.storage.from(bucket).getPublicUrl(filePath);

		return {
			url: publicUrl,
			path: filePath
		};
	}

	/**
	 * Upload photo from base64 data (for camera captures)
	 */
	async uploadPhotoFromBase64(
		base64Data: string,
		options: UploadPhotoOptions = {}
	): Promise<UploadPhotoResult> {
		// Convert base64 to blob
		const response = await fetch(base64Data);
		const blob = await response.blob();

		// Create file from blob
		const timestamp = Date.now();
		const file = new File([blob], `photo-${timestamp}.jpg`, { type: 'image/jpeg' });

		return this.uploadPhoto(file, options);
	}

	/**
	 * Delete a photo from storage
	 */
	async deletePhoto(path: string, bucket: string = this.DEFAULT_BUCKET): Promise<void> {
		const { error } = await supabase.storage.from(bucket).remove([path]);

		if (error) {
			console.error('Delete error:', error);
			throw new Error(`Failed to delete photo: ${error.message}`);
		}
	}

	/**
	 * Delete multiple photos
	 */
	async deletePhotos(paths: string[], bucket: string = this.DEFAULT_BUCKET): Promise<void> {
		const { error } = await supabase.storage.from(bucket).remove(paths);

		if (error) {
			console.error('Delete error:', error);
			throw new Error(`Failed to delete photos: ${error.message}`);
		}
	}

	/**
	 * Get public URL for a photo
	 */
	getPublicUrl(path: string, bucket: string = this.DEFAULT_BUCKET): string {
		const {
			data: { publicUrl }
		} = supabase.storage.from(bucket).getPublicUrl(path);
		return publicUrl;
	}

	/**
	 * Upload assessment photo with proper folder structure
	 */
	async uploadAssessmentPhoto(
		file: File,
		assessmentId: string,
		category: 'identification' | '360' | 'interior' | 'tyres' | 'damage',
		subcategory?: string
	): Promise<UploadPhotoResult> {
		const folder = subcategory
			? `assessments/${assessmentId}/${category}/${subcategory}`
			: `assessments/${assessmentId}/${category}`;

		return this.uploadPhoto(file, { folder });
	}

	/**
	 * Upload assessment photo from base64
	 */
	async uploadAssessmentPhotoFromBase64(
		base64Data: string,
		assessmentId: string,
		category: 'identification' | '360' | 'interior' | 'tyres' | 'damage',
		subcategory?: string
	): Promise<UploadPhotoResult> {
		const folder = subcategory
			? `assessments/${assessmentId}/${category}/${subcategory}`
			: `assessments/${assessmentId}/${category}`;

		return this.uploadPhotoFromBase64(base64Data, { folder });
	}
}

export const storageService = new StorageService();

