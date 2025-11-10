import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type {
	Exterior360Photo,
	CreateExterior360PhotoInput,
	UpdateExterior360PhotoInput
} from '$lib/types/assessment';

/**
 * Service for managing exterior 360 additional photos (photos beyond the required 8-position 360° photos)
 */
class Exterior360PhotosService {
	/**
	 * Get all photos for an assessment
	 */
	async getPhotosByAssessment(assessmentId: string, client?: ServiceClient): Promise<Exterior360Photo[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_exterior_360_photos')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('display_order', { ascending: true })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error fetching exterior 360 photos:', error);
			throw new Error(`Failed to fetch exterior 360 photos: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Create a new photo
	 */
	async createPhoto(input: CreateExterior360PhotoInput, client?: ServiceClient): Promise<Exterior360Photo> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_exterior_360_photos')
			.insert({
				assessment_id: input.assessment_id,
				photo_url: input.photo_url,
				photo_path: input.photo_path,
				label: input.label || null,
				display_order: input.display_order || 0
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating exterior 360 photo:', error);
			throw new Error(`Failed to create exterior 360 photo: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update a photo's label or display order
	 */
	async updatePhoto(photoId: string, input: UpdateExterior360PhotoInput, client?: ServiceClient): Promise<Exterior360Photo> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_exterior_360_photos')
			.update({
				label: input.label,
				display_order: input.display_order
			})
			.eq('id', photoId)
			.select()
			.single();

		if (error) {
			console.error('Error updating exterior 360 photo:', error);
			throw new Error(`Failed to update exterior 360 photo: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update photo label only
	 */
	async updatePhotoLabel(photoId: string, label: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		const { error } = await db
			.from('assessment_exterior_360_photos')
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
		const { error } = await db.from('assessment_exterior_360_photos').delete().eq('id', photoId);

		if (error) {
			console.error('Error deleting exterior 360 photo:', error);
			throw new Error(`Failed to delete exterior 360 photo: ${error.message}`);
		}
	}

	/**
	 * Reorder photos for an assessment
	 */
	async reorderPhotos(assessmentId: string, photoIds: string[], client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		// Update display_order for each photo
		const updates = photoIds.map((photoId, index) => ({
			id: photoId,
			display_order: index
		}));

		for (const update of updates) {
			await db
				.from('assessment_exterior_360_photos')
				.update({ display_order: update.display_order })
				.eq('id', update.id)
				.eq('assessment_id', assessmentId);
		}
	}

	/**
	 * Get next display order for a new photo
	 */
	async getNextDisplayOrder(assessmentId: string, client?: ServiceClient): Promise<number> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_exterior_360_photos')
			.select('display_order')
			.eq('assessment_id', assessmentId)
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

export const exterior360PhotosService = new Exterior360PhotosService();

