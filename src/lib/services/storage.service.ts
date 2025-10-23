import { supabase } from '$lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

export interface UploadPhotoResult {
	url: string;
	path: string;
}

export interface UploadPhotoOptions {
	bucket?: string;
	folder?: string;
	fileName?: string;
	maxSizeMB?: number;
	supabaseClient?: SupabaseClient<Database>;
}

class StorageService {
	private readonly DEFAULT_BUCKET = 'documents';
	private readonly MAX_FILE_SIZE_MB = 50;
	private readonly SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

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
			maxSizeMB = this.MAX_FILE_SIZE_MB,
			supabaseClient = supabase
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
		const { data, error } = await supabaseClient.storage.from(bucket).upload(filePath, file, {
			cacheControl: '3600',
			upsert: false
		});

		if (error) {
			console.error('Upload error:', error);
			throw new Error(`Failed to upload photo: ${error.message}`);
		}

		// Get signed URL (1 hour expiry)
		const { data: signedUrlData, error: urlError } = await supabaseClient.storage
			.from(bucket)
			.createSignedUrl(filePath, this.SIGNED_URL_EXPIRY_SECONDS);

		if (urlError || !signedUrlData) {
			console.error('Signed URL error:', urlError);
			throw new Error(`Failed to generate signed URL: ${urlError?.message}`);
		}

		return {
			url: signedUrlData.signedUrl,
			path: filePath
		};
	}

	/**
	 * Upload a PDF file to Supabase Storage
	 */
	async uploadPdf(
		file: File,
		options: UploadPhotoOptions = {}
	): Promise<UploadPhotoResult> {
		const {
			bucket = this.DEFAULT_BUCKET,
			folder = 'documents',
			fileName,
			maxSizeMB = this.MAX_FILE_SIZE_MB,
			supabaseClient = supabase
		} = options;

		// Validate file size
		const fileSizeMB = file.size / (1024 * 1024);
		if (fileSizeMB > maxSizeMB) {
			throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
		}

		// Validate file type
		if (file.type !== 'application/pdf') {
			throw new Error('Only PDF files are allowed');
		}

		// Generate unique file name
		const timestamp = Date.now();
		const randomString = Math.random().toString(36).substring(2, 8);
		const uniqueFileName = fileName || `${timestamp}-${randomString}.pdf`;
		const filePath = `${folder}/${uniqueFileName}`;

		// Upload file
		const { data, error } = await supabaseClient.storage.from(bucket).upload(filePath, file, {
			cacheControl: '3600',
			upsert: false,
			contentType: 'application/pdf'
		});

		if (error) {
			console.error('Upload error:', error);
			throw new Error(`Failed to upload PDF: ${error.message}`);
		}

		// Get signed URL (1 hour expiry)
		const { data: signedUrlData, error: urlError } = await supabaseClient.storage
			.from(bucket)
			.createSignedUrl(filePath, this.SIGNED_URL_EXPIRY_SECONDS);

		if (urlError || !signedUrlData) {
			console.error('Signed URL error:', urlError);
			throw new Error(`Failed to generate signed URL: ${urlError?.message}`);
		}

		return {
			url: signedUrlData.signedUrl,
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
	 * Get signed URL for a photo (1 hour expiry)
	 */
	async getSignedUrl(
		path: string,
		bucket: string = this.DEFAULT_BUCKET,
		supabaseClient: SupabaseClient<Database> = supabase
	): Promise<string> {
		const { data, error } = await supabaseClient.storage
			.from(bucket)
			.createSignedUrl(path, this.SIGNED_URL_EXPIRY_SECONDS);

		if (error || !data) {
			console.error('Signed URL error:', error);
			throw new Error(`Failed to generate signed URL: ${error?.message}`);
		}

		return data.signedUrl;
	}

	/**
	 * Get signed URLs for multiple photos
	 */
	async getSignedUrls(
		paths: string[],
		bucket: string = this.DEFAULT_BUCKET,
		supabaseClient: SupabaseClient<Database> = supabase
	): Promise<string[]> {
		const urls = await Promise.all(
			paths.map((path) => this.getSignedUrl(path, bucket, supabaseClient))
		);
		return urls;
	}

	/**
	 * Upload assessment photo with proper folder structure
	 */
	async uploadAssessmentPhoto(
		file: File,
		assessmentId: string,
		category: 'identification' | '360' | 'interior' | 'tyres' | 'damage' | 'estimate' | 'pre-incident',
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

	/**
	 * Upload assessment PDF with proper folder structure
	 */
	async uploadAssessmentPdf(
		file: File,
		assessmentId: string,
		category: 'values' | 'reports' | 'documents'
	): Promise<UploadPhotoResult> {
		const folder = `assessments/${assessmentId}/${category}`;
		return this.uploadPdf(file, { folder });
	}
}

export const storageService = new StorageService();

