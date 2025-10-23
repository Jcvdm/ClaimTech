import { supabase } from '$lib/supabase';
import type {
	AdditionalsPhoto,
	CreateAdditionalsPhotoInput,
	UpdateAdditionalsPhotoInput
} from '$lib/types/assessment';
import type { ServiceClient } from '$lib/types/service';

/**
 * Service for managing additionals photos
 */
class AdditionalsPhotosService {
	/**
	 * Get all photos for an additionals record
	 */
	async getPhotosByAdditionals(additionalsId: string, client?: ServiceClient): Promise<AdditionalsPhoto[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_additionals_photos')
			.select('*')
			.eq('additionals_id', additionalsId)
			.order('display_order', { ascending: true })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error fetching additionals photos:', error);
			throw new Error(`Failed to fetch additionals photos: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Create a new photo
	 */
	async createPhoto(input: CreateAdditionalsPhotoInput, client?: ServiceClient): Promise<AdditionalsPhoto> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_additionals_photos')
			.insert({
				additionals_id: input.additionals_id,
				photo_url: input.photo_url,
				photo_path: input.photo_path,
				label: input.label || null,
				display_order: input.display_order || 0
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating additionals photo:', error);
			throw new Error(`Failed to create additionals photo: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update a photo's label or display order
	 */
	async updatePhoto(
		photoId: string,
		input: UpdateAdditionalsPhotoInput,
		client?: ServiceClient
	): Promise<AdditionalsPhoto> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_additionals_photos')
			.update({
				label: input.label,
				display_order: input.display_order
			})
			.eq('id', photoId)
			.select()
			.single();

		if (error) {
			console.error('Error updating additionals photo:', error);
			throw new Error(`Failed to update additionals photo: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update photo label only
	 */
	async updatePhotoLabel(photoId: string, label: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;

		const { error } = await db
			.from('assessment_additionals_photos')
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

		const { error } = await db
			.from('assessment_additionals_photos')
			.delete()
			.eq('id', photoId);

		if (error) {
			console.error('Error deleting additionals photo:', error);
			throw new Error(`Failed to delete additionals photo: ${error.message}`);
		}
	}

	/**
	 * Reorder photos for an additionals record
	 */
	async reorderPhotos(additionalsId: string, photoIds: string[], client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;

		// Update display_order for each photo
		const updates = photoIds.map((photoId, index) => ({
			id: photoId,
			display_order: index
		}));

		for (const update of updates) {
			await db
				.from('assessment_additionals_photos')
				.update({ display_order: update.display_order })
				.eq('id', update.id)
				.eq('additionals_id', additionalsId);
		}
	}

	/**
	 * Get next display order for a new photo
	 */
	async getNextDisplayOrder(additionalsId: string, client?: ServiceClient): Promise<number> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_additionals_photos')
			.select('display_order')
			.eq('additionals_id', additionalsId)
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

export const additionalsPhotosService = new AdditionalsPhotosService();

