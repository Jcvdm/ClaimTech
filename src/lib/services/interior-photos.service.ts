import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type {
	InteriorPhoto,
	CreateInteriorPhotoInput,
	UpdateInteriorPhotoInput
} from '$lib/types/assessment';

/**
 * Service for managing interior photos (additional interior photos)
 */
class InteriorPhotosService {
	/**
	 * Get all photos for an assessment
	 */
	async getPhotosByAssessment(assessmentId: string, client?: ServiceClient): Promise<InteriorPhoto[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_interior_photos')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('display_order', { ascending: true })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error fetching interior photos:', error);
			throw new Error(`Failed to fetch interior photos: ${error.message}`);
		}

		return (data as unknown as InteriorPhoto[]) || [];
	}

	/**
	 * Create a new photo
	 */
	async createPhoto(input: CreateInteriorPhotoInput, client?: ServiceClient): Promise<InteriorPhoto> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_interior_photos')
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
			console.error('Error creating interior photo:', error);
			throw new Error(`Failed to create interior photo: ${error.message}`);
		}

		return data as unknown as InteriorPhoto;
	}

	/**
	 * Update a photo's label or display order
	 */
	async updatePhoto(photoId: string, input: UpdateInteriorPhotoInput, client?: ServiceClient): Promise<InteriorPhoto> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_interior_photos')
			.update({
				label: input.label,
				display_order: input.display_order
			})
			.eq('id', photoId)
			.select()
			.single();

		if (error) {
			console.error('Error updating interior photo:', error);
			throw new Error(`Failed to update interior photo: ${error.message}`);
		}

		return data as unknown as InteriorPhoto;
	}

	/**
	 * Update photo label only
	 */
	async updatePhotoLabel(photoId: string, label: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		const { error } = await db
			.from('assessment_interior_photos')
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
		const { error } = await db.from('assessment_interior_photos').delete().eq('id', photoId);

		if (error) {
			console.error('Error deleting interior photo:', error);
			throw new Error(`Failed to delete interior photo: ${error.message}`);
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
				.from('assessment_interior_photos')
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
			.from('assessment_interior_photos')
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

		return data ? (data.display_order || 0) + 1 : 0;
	}
}

export const interiorPhotosService = new InteriorPhotosService();

