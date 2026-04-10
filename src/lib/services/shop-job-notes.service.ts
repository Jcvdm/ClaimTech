// NOTE: Using untyped SupabaseClient because shop tables are not yet reflected
// in database.types.ts. Run `npm run generate:types` after applying migrations
// to the preview database to get full type safety.
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopJobNote {
	id: string;
	job_id: string;
	note_text: string;
	note_type: 'manual' | 'system' | 'qc_rejection';
	note_title: string | null;
	context: string;
	created_by: string | null;
	is_edited: boolean;
	edited_at: string | null;
	created_at: string;
	updated_at: string;
}

// ─── Service Factory ──────────────────────────────────────────────────────────

export function createShopJobNotesService(supabase: SupabaseClient) {
	return {
		/**
		 * Fetch all notes for a job, ordered oldest-first (activity log order).
		 */
		async getNotes(jobId: string) {
			return supabase
				.from('shop_job_notes')
				.select('*')
				.eq('job_id', jobId)
				.order('created_at', { ascending: true });
		},

		/**
		 * Add a new note to a job.
		 */
		async addNote(
			jobId: string,
			note: {
				note_text: string;
				note_type?: string;
				note_title?: string;
				context?: string;
				created_by?: string;
			}
		) {
			return supabase
				.from('shop_job_notes')
				.insert({
					job_id: jobId,
					note_text: note.note_text,
					note_type: note.note_type || 'manual',
					note_title: note.note_title || null,
					context: note.context || 'general',
					created_by: note.created_by || null
				})
				.select()
				.single();
		},

		/**
		 * Update the text of an existing note and mark it as edited.
		 */
		async updateNote(noteId: string, noteText: string) {
			return supabase
				.from('shop_job_notes')
				.update({
					note_text: noteText,
					is_edited: true,
					edited_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.eq('id', noteId)
				.select()
				.single();
		},

		/**
		 * Delete a note by ID.
		 */
		async deleteNote(noteId: string) {
			return supabase.from('shop_job_notes').delete().eq('id', noteId);
		}
	};
}
