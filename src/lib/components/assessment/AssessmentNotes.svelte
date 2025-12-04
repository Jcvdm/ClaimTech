<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { StickyNote, MessageSquare, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';
	import type { AssessmentNote } from '$lib/types/assessment';
	import NoteBubble from './NoteBubble.svelte';
	import AddNoteInput from './AddNoteInput.svelte';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface Props {
		assessmentId: string;
		notes: AssessmentNote[];
		currentTab: string; // Current tab ID for tracking note source
		onUpdate: () => void;
		lastSaved?: string | null;
	}

	let { assessmentId, notes, currentTab, onUpdate, lastSaved = null }: Props = $props();

	// Collapsible state - default to expanded, but collapse on mobile
	let isExpanded = $state(true);

	// On mount, collapse on small screens
	onMount(() => {
		if (browser && window.innerWidth < 640) {
			isExpanded = false;
		}
	});

	// Sort notes by created_at (oldest first for chat-style display)
	const sortedNotes = $derived(
		[...notes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
	);

	// Scroll to bottom when new notes are added
	let notesContainer: HTMLDivElement;
	$effect(() => {
		if (notesContainer && notes.length > 0 && isExpanded) {
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
	<!-- Header - Clickable to expand/collapse -->
	<button
		type="button"
		onclick={() => (isExpanded = !isExpanded)}
		class="flex w-full items-center justify-between border-b border-blue-200 p-3 transition-colors hover:bg-blue-100/50 sm:p-4"
		class:border-b-0={!isExpanded}
	>
		<div class="flex items-center gap-2">
			<StickyNote class="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" />
			<h3 class="text-base font-semibold text-gray-900 sm:text-lg">Notes</h3>
			<span class="text-xs text-gray-500 sm:text-sm">({notes.length})</span>
		</div>
		<div class="flex items-center gap-2">
			{#if !isExpanded && notes.length > 0}
				<span class="text-xs text-gray-500">Tap to expand</span>
			{/if}
			{#if isExpanded}
				<ChevronUp class="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
			{:else}
				<ChevronDown class="h-4 w-4 text-gray-500 sm:h-5 sm:w-5" />
			{/if}
		</div>
	</button>

	{#if isExpanded}
		<!-- Notes List (scrollable) - responsive heights -->
		<div
			bind:this={notesContainer}
			class="max-h-[250px] min-h-[100px] space-y-3 overflow-y-auto p-3 sm:max-h-[400px] sm:min-h-[150px] sm:p-4"
		>
			{#if sortedNotes.length === 0}
				<div class="flex h-[80px] flex-col items-center justify-center text-center text-gray-500 sm:h-[130px]">
					<MessageSquare class="mb-2 h-8 w-8 opacity-30 sm:h-12 sm:w-12" />
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
		<div class="border-t border-blue-200 bg-white p-3 sm:p-4">
			<AddNoteInput onAdd={handleAddNote} />
		</div>
	{/if}
</Card>

