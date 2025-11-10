import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type {
	EstimatePhoto,
	CreateEstimatePhotoInput,
	UpdateEstimatePhotoInput
} from '$lib/types/assessment';

/**
 * Service for managing estimate photos (incident photos)
 */
class EstimatePhotosService {
	/**
	 * Get all photos for an estimate
	 */
	async getPhotosByEstimate(estimateId: string, client?: ServiceClient): Promise<EstimatePhoto[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('estimate_photos')
			.select('*')
			.eq('estimate_id', estimateId)
			.order('display_order', { ascending: true })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error fetching estimate photos:', error);
			throw new Error(`Failed to fetch estimate photos: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Create a new photo
	 */
	async createPhoto(input: CreateEstimatePhotoInput, client?: ServiceClient): Promise<EstimatePhoto> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('estimate_photos')
			.insert({
				estimate_id: input.estimate_id,
				photo_url: input.photo_url,
				photo_path: input.photo_path,
				label: input.label || null,
				display_order: input.display_order || 0
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating estimate photo:', error);
			throw new Error(`Failed to create estimate photo: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update a photo's label or display order
	 */
	async updatePhoto(photoId: string, input: UpdateEstimatePhotoInput, client?: ServiceClient): Promise<EstimatePhoto> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('estimate_photos')
			.update({
				label: input.label,
				display_order: input.display_order
			})
			.eq('id', photoId)
			.select()
			.single();

		if (error) {
			console.error('Error updating estimate photo:', error);
			throw new Error(`Failed to update estimate photo: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update photo label only
	 */
	async updatePhotoLabel(photoId: string, label: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		const { error } = await db
			.from('estimate_photos')
			.update({ label })
			.eq('id', photoId);

		if (error) {
			console.error('Error updating photo label:', error);
			throw new Error(`Failed to update photo label: ${error.message}`);
		}
	}

	/**
	 * Delete a photo
	 */
	async deletePhoto(photoId: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		const { error } = await db.from('estimate_photos').delete().eq('id', photoId);

		if (error) {
			console.error('Error deleting estimate photo:', error);
			throw new Error(`Failed to delete estimate photo: ${error.message}`);
		}
	}

	/**
	 * Reorder photos for an estimate
	 */
	async reorderPhotos(estimateId: string, photoIds: string[], client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		// Update display_order for each photo
		const updates = photoIds.map((photoId, index) => ({
			id: photoId,
			display_order: index
		}));

		for (const update of updates) {
			await db
				.from('estimate_photos')
				.update({ display_order: update.display_order })
				.eq('id', update.id)
				.eq('estimate_id', estimateId);
		}
	}

	/**
	 * Get next display order for a new photo
	 */
	async getNextDisplayOrder(estimateId: string, client?: ServiceClient): Promise<number> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('estimate_photos')
			.select('display_order')
			.eq('estimate_id', estimateId)
			.order('display_order', { ascending: false })
			.limit(1)
			.single();

		if (error && error.code !== 'PGRST116') {
			// PGRST116 = no rows returned
			console.error('Error getting next display order:', error);
			return 0;
		}

		return data ? data.display_order + 1 : 0;
	}
}

export const estimatePhotosService = new EstimatePhotosService();

