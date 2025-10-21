<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { StickyNote, MessageSquare } from 'lucide-svelte';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';
	import type { AssessmentNote } from '$lib/types/assessment';
	import NoteBubble from './NoteBubble.svelte';
	import AddNoteInput from './AddNoteInput.svelte';

	interface Props {
		assessmentId: string;
		notes: AssessmentNote[];
		currentTab: string; // Current tab ID for tracking note source
		onUpdate: () => void;
		lastSaved?: string | null;
	}

	let { assessmentId, notes, currentTab, onUpdate, lastSaved = null }: Props = $props();

	// Sort notes by created_at (oldest first for chat-style display)
	const sortedNotes = $derived(
		[...notes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
	);

	// Scroll to bottom when new notes are added
	let notesContainer: HTMLDivElement;
	$effect(() => {
		if (notesContainer && notes.length > 0) {
			// Small delay to ensure DOM is updated
			setTimeout(() => {
				notesContainer.scrollTop = notesContainer.scrollHeight;
			}, 100);
		}
	});

	async function handleAddNote(noteText: string) {
		try {
			await assessmentNotesService.createNote({
				assessment_id: assessmentId,
				note_text: noteText,
				note_type: 'manual',
				source_tab: currentTab // Track which tab the note was added from
			});
			onUpdate();
		} catch (error) {
			console.error('Error adding note:', error);
			throw error;
		}
	}

	async function handleEditNote(noteId: string, noteText: string) {
		try {
			await assessmentNotesService.updateNote(noteId, {
				note_text: noteText,
				is_edited: true,
				edited_at: new Date().toISOString()
			});
			onUpdate();
		} catch (error) {
			console.error('Error editing note:', error);
			throw error;
		}
	}

	async function handleDeleteNote(noteId: string) {
		try {
			await assessmentNotesService.deleteNote(noteId);
			onUpdate();
		} catch (error) {
			console.error('Error deleting note:', error);
			throw error;
		}
	}
</script>

<Card class="border-blue-200 bg-blue-50/50">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-blue-200 p-4">
		<div class="flex items-center gap-2">
			<StickyNote class="h-5 w-5 text-blue-600" />
			<h3 class="text-lg font-semibold text-gray-900">Assessment Notes</h3>
		</div>
		<div class="flex items-center gap-2 text-sm text-gray-600">
			<MessageSquare class="h-4 w-4" />
			<span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
		</div>
	</div>

	<!-- Notes List (scrollable) -->
	<div
		bind:this={notesContainer}
		class="max-h-[500px] min-h-[200px] space-y-3 overflow-y-auto p-4"
	>
		{#if sortedNotes.length === 0}
			<div class="flex h-[180px] flex-col items-center justify-center text-center text-gray-500">
				<MessageSquare class="mb-2 h-12 w-12 opacity-30" />
				<p class="text-sm font-medium">No notes yet</p>
				<p class="text-xs">Add your first note below</p>
			</div>
		{:else}
			{#each sortedNotes as note (note.id)}
				<NoteBubble {note} onEdit={handleEditNote} onDelete={handleDeleteNote} />
			{/each}
		{/if}
	</div>

	<!-- Add Note Input (sticky at bottom) -->
	<div class="border-t border-blue-200 bg-white p-4">
		<AddNoteInput onAdd={handleAddNote} />
	</div>
</Card>

