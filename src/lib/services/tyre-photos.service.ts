import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type { TyrePhoto, CreateTyrePhotoInput, UpdateTyrePhotoInput } from '$lib/types/assessment';
import { auditService } from './audit.service';

/**
 * Service for managing tyre photos
 * Follows unified photo panel pattern with ServiceClient injection
 */
class TyrePhotosService {
	/**
	 * Get all photos for a specific tyre
	 */
	async getPhotosByTyre(tyreId: string, client?: ServiceClient): Promise<TyrePhoto[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_tyre_photos')
			.select('*')
			.eq('tyre_id', tyreId)
			.order('display_order', { ascending: true });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Get all photos for an assessment (all tyres)
	 */
	async getPhotosByAssessment(assessmentId: string, client?: ServiceClient): Promise<TyrePhoto[]> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_tyre_photos')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('display_order', { ascending: true });

		if (error) throw error;
		return data || [];
	}

	/**
	 * Create a new tyre photo
	 */
	async createPhoto(input: CreateTyrePhotoInput, client?: ServiceClient): Promise<TyrePhoto> {
		const db = client ?? supabase;

		// Get next display order
		const displayOrder = input.display_order ?? (await this.getNextDisplayOrder(input.tyre_id, client));

		const { data, error } = await db
			.from('assessment_tyre_photos')
			.insert({
				...input,
				display_order: displayOrder
			})
			.select()
			.single();

		if (error) throw error;

		// Audit log
		await auditService.logChange(
			input.assessment_id,
			'tyre_photo',
			'create',
			null,
			data,
			client
		);

		return data;
	}

	/**
	 * Update a tyre photo (label, display_order)
	 */
	async updatePhoto(
		id: string,
		assessmentId: string,
		updates: UpdateTyrePhotoInput,
		client?: ServiceClient
	): Promise<TyrePhoto> {
		const db = client ?? supabase;

		// Get old data for audit
		const { data: oldData } = await db
			.from('assessment_tyre_photos')
			.select('*')
			.eq('id', id)
			.single();

		const { data, error } = await db
			.from('assessment_tyre_photos')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) throw error;

		// Audit log
		await auditService.logChange(
			assessmentId,
			'tyre_photo',
			'update',
			oldData,
			data,
			client
		);

		return data;
	}

	/**
	 * Delete a tyre photo
	 */
	async deletePhoto(id: string, assessmentId: string, client?: ServiceClient): Promise<void> {
		const db = client ?? supabase;

		// Get data for audit before deletion
		const { data: oldData } = await db
			.from('assessment_tyre_photos')
			.select('*')
			.eq('id', id)
			.single();

		const { error } = await db
			.from('assessment_tyre_photos')
			.delete()
			.eq('id', id);

		if (error) throw error;

		// Audit log
		await auditService.logChange(
			assessmentId,
			'tyre_photo',
			'delete',
			oldData,
			null,
			client
		);
	}

	/**
	 * Get next display order for a tyre
	 */
	private async getNextDisplayOrder(tyreId: string, client?: ServiceClient): Promise<number> {
		const db = client ?? supabase;

		const { data, error } = await db
			.from('assessment_tyre_photos')
			.select('display_order')
			.eq('tyre_id', tyreId)
			.order('display_order', { ascending: false })
			.limit(1)
			.single();

		if (error || !data) return 0;
		return (data.display_order || 0) + 1;
	}
}

export const tyrePhotosService = new TyrePhotosService();

