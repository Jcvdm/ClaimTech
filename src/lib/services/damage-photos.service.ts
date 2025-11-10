import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type {
	DamagePhoto,
	CreateDamagePhotoInput,
	UpdateDamagePhotoInput
} from '$lib/types/assessment';

/**
 * Service for managing damage photos (photos of vehicle damage)
 */
class DamagePhotosService {
	/**
	 * Get all photos for an assessment
	 */
	async getPhotosByAssessment(assessmentId: string, client?: ServiceClient): Promise<DamagePhoto[]> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_damage_photos')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('display_order', { ascending: true })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error fetching damage photos:', error);
			throw new Error(`Failed to fetch damage photos: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Create a new photo
	 */
	async createPhoto(input: CreateDamagePhotoInput, client?: ServiceClient): Promise<DamagePhoto> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_damage_photos')
			.insert({
				assessment_id: input.assessment_id,
				photo_url: input.photo_url,
				photo_path: input.photo_path,
				label: input.label || null,
				panel: input.panel || null,
				display_order: input.display_order || 0
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating damage photo:', error);
			throw new Error(`Failed to create damage photo: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update a photo's label, panel, or display order
	 */
	async updatePhoto(
		photoId: string,
		input: UpdateDamagePhotoInput,
		client?: ServiceClient
	): Promise<DamagePhoto> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_damage_photos')
			.update({
				label: input.label,
				panel: input.panel,
				display_order: input.display_order
			})
			.eq('id', photoId)
			.select()
			.single();

		if (error) {
			console.error('Error updating damage photo:', error);
			throw new Error(`Failed to update damage photo: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update a photo's label only
	 */
	async updatePhotoLabel(photoId: string, label: string, client?: ServiceClient): Promise<DamagePhoto> {
		return this.updatePhoto(photoId, { label }, client);
	}

	/**
	 * Update a photo's panel only
	 */
	async updatePhotoPanel(photoId: string, panel: string, client?: ServiceClient): Promise<DamagePhoto> {
		return this.updatePhoto(photoId, { panel }, client);
	}

	/**
	 * Delete a photo
	 */
	async deletePhoto(photoId: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		const { error } = await db
			.from('assessment_damage_photos')
			.delete()
			.eq('id', photoId);

		if (error) {
			console.error('Error deleting damage photo:', error);
			throw new Error(`Failed to delete damage photo: ${error.message}`);
		}
	}

	/**
	 * Reorder photos for an assessment
	 */
	async reorderPhotos(assessmentId: string, photoIds: string[], client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;
		// Update display_order for each photo based on its position in the array
		const updates = photoIds.map((photoId, index) =>
			db
				.from('assessment_damage_photos')
				.update({ display_order: index })
				.eq('id', photoId)
				.eq('assessment_id', assessmentId)
		);

		const results = await Promise.all(updates);

		// Check for errors
		const errors = results.filter((result) => result.error);
		if (errors.length > 0) {
			console.error('Error reordering damage photos:', errors);
			throw new Error('Failed to reorder damage photos');
		}
	}

	/**
	 * Get next display order for a new photo
	 */
	async getNextDisplayOrder(assessmentId: string, client?: ServiceClient): Promise<number> {
		const db = client ?? supabase;
		const { data, error } = await db
			.from('assessment_damage_photos')
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

export const damagePhotosService = new DamagePhotosService();

