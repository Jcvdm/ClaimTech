import { supabase } from '$lib/supabase';
import type {
	AssessmentNote,
	CreateAssessmentNoteInput,
	UpdateAssessmentNoteInput
} from '$lib/types/assessment';
import { auditService } from './audit.service';

/**
 * Service for managing assessment notes (global notes visible across all tabs)
 */
class AssessmentNotesService {
	/**
	 * Get all notes for an assessment
	 */
	async getNotesByAssessment(assessmentId: string): Promise<AssessmentNote[]> {
		const { data, error } = await supabase
			.from('assessment_notes')
			.select('*')
			.eq('assessment_id', assessmentId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching assessment notes:', error);
			throw new Error(`Failed to fetch assessment notes: ${error.message}`);
		}

		return (data as AssessmentNote[]) || [];
	}

	/**
	 * Get a single note by ID
	 */
	async getNote(id: string): Promise<AssessmentNote> {
		const { data, error } = await supabase
			.from('assessment_notes')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			console.error('Error fetching assessment note:', error);
			throw new Error(`Failed to fetch assessment note: ${error.message}`);
		}

		return data as AssessmentNote;
	}

	/**
	 * Create a new note
	 */
	async createNote(input: CreateAssessmentNoteInput): Promise<AssessmentNote> {
		const { data, error } = await supabase
			.from('assessment_notes')
			.insert({
				assessment_id: input.assessment_id,
				note_text: input.note_text,
				note_type: input.note_type || 'manual',
				note_title: input.note_title,
				source_tab: input.source_tab,
				created_by: input.created_by
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating assessment note:', error);
			throw new Error(`Failed to create assessment note: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'assessment_notes',
				entity_id: input.assessment_id,
				action: 'created',
				metadata: {
					note_id: data.id,
					note_type: input.note_type || 'manual'
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as AssessmentNote;
	}

	/**
	 * Create a betterment note with deduplication
	 * Checks if a betterment note already exists for the same line item and updates it instead of creating a duplicate
	 */
	async createBettermentNote(
		assessmentId: string,
		lineItemId: string,
		lineItemDescription: string,
		bettermentDetails: string,
		totalDeduction: number,
		sourceTab?: string
	): Promise<AssessmentNote> {
		const noteTitle = `Betterment: ${lineItemDescription}`;

		// Check if betterment note already exists for this line item
		const { data: existing } = await supabase
			.from('assessment_notes')
			.select('*')
			.eq('assessment_id', assessmentId)
			.eq('note_type', 'betterment')
			.eq('note_title', noteTitle)
			.maybeSingle();

		// If exists, update instead of creating duplicate
		if (existing) {
			return await this.updateNote(existing.id, {
				note_text: bettermentDetails,
				is_edited: true,
				edited_at: new Date().toISOString()
			});
		}

		// Create new betterment note
		return await this.createNote({
			assessment_id: assessmentId,
			note_text: bettermentDetails,
			note_type: 'betterment',
			note_title: noteTitle,
			source_tab: sourceTab
		});
	}

	/**
	 * Update a note
	 */
	async updateNote(id: string, input: UpdateAssessmentNoteInput): Promise<AssessmentNote> {
		const updateData: any = {
			updated_at: new Date().toISOString()
		};

		if (input.note_text !== undefined) {
			updateData.note_text = input.note_text;
		}
		if (input.note_title !== undefined) {
			updateData.note_title = input.note_title;
		}
		if (input.is_edited !== undefined) {
			updateData.is_edited = input.is_edited;
		}
		if (input.edited_at !== undefined) {
			updateData.edited_at = input.edited_at;
		}
		if (input.edited_by !== undefined) {
			updateData.edited_by = input.edited_by;
		}

		const { data, error } = await supabase
			.from('assessment_notes')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating assessment note:', error);
			throw new Error(`Failed to update assessment note: ${error.message}`);
		}

		// Log audit trail
		try {
			await auditService.logChange({
				entity_type: 'assessment_notes',
				entity_id: data.assessment_id,
				action: 'updated',
				metadata: {
					note_id: id
				}
			});
		} catch (auditError) {
			console.error('Error logging audit change:', auditError);
		}

		return data as AssessmentNote;
	}

	/**
	 * Delete a note
	 */
	async deleteNote(id: string): Promise<void> {
		// Get note before deletion for audit logging
		const note = await this.getNote(id).catch(() => null);

		const { error } = await supabase.from('assessment_notes').delete().eq('id', id);

		if (error) {
			console.error('Error deleting assessment note:', error);
			throw new Error(`Failed to delete assessment note: ${error.message}`);
		}

		// Log audit trail
		if (note) {
			try {
				await auditService.logChange({
					entity_type: 'assessment_notes',
					entity_id: note.assessment_id,
					action: 'cancelled',
					metadata: {
						note_id: id
					}
				});
			} catch (auditError) {
				console.error('Error logging audit change:', auditError);
			}
		}
	}

	/**
	 * Delete all notes for an assessment
	 */
	async deleteNotesByAssessment(assessmentId: string): Promise<void> {
		const { error } = await supabase
			.from('assessment_notes')
			.delete()
			.eq('assessment_id', assessmentId);

		if (error) {
			console.error('Error deleting assessment notes:', error);
			throw new Error(`Failed to delete assessment notes: ${error.message}`);
		}
	}
}

export const assessmentNotesService = new AssessmentNotesService();

