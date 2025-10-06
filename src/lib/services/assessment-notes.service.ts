import { supabase } from '$lib/supabase';
import type {
	AssessmentNote,
	CreateAssessmentNoteInput,
	UpdateAssessmentNoteInput
} from '$lib/types/assessment';

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

		return data || [];
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

		return data;
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
				created_by: input.created_by
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating assessment note:', error);
			throw new Error(`Failed to create assessment note: ${error.message}`);
		}

		return data;
	}

	/**
	 * Upsert a note (insert or update) - ensures only one note per assessment
	 */
	async upsertNote(assessmentId: string, noteText: string, createdBy?: string): Promise<AssessmentNote> {
		const { data, error } = await supabase
			.from('assessment_notes')
			.upsert(
				{
					assessment_id: assessmentId,
					note_text: noteText,
					created_by: createdBy,
					updated_at: new Date().toISOString()
				},
				{
					onConflict: 'assessment_id',
					ignoreDuplicates: false
				}
			)
			.select()
			.single();

		if (error) {
			console.error('Error upserting assessment note:', error);
			throw new Error(`Failed to upsert assessment note: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update a note
	 */
	async updateNote(id: string, input: UpdateAssessmentNoteInput): Promise<AssessmentNote> {
		const { data, error } = await supabase
			.from('assessment_notes')
			.update({
				note_text: input.note_text,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('Error updating assessment note:', error);
			throw new Error(`Failed to update assessment note: ${error.message}`);
		}

		return data;
	}

	/**
	 * Delete a note
	 */
	async deleteNote(id: string): Promise<void> {
		const { error } = await supabase.from('assessment_notes').delete().eq('id', id);

		if (error) {
			console.error('Error deleting assessment note:', error);
			throw new Error(`Failed to delete assessment note: ${error.message}`);
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

