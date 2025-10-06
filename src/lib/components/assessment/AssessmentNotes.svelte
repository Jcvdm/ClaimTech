<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { StickyNote, Plus, Trash2, Edit2, X, Check } from 'lucide-svelte';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';
	import type { AssessmentNote } from '$lib/types/assessment';

	interface Props {
		assessmentId: string;
		notes: AssessmentNote[];
		onUpdate: () => void;
	}

	let { assessmentId, notes, onUpdate }: Props = $props();

	let isAddingNote = $state(false);
	let newNoteText = $state('');
	let editingNoteId = $state<string | null>(null);
	let editNoteText = $state('');
	let saving = $state(false);

	async function handleAddNote() {
		if (!newNoteText.trim()) return;

		saving = true;
		try {
			await assessmentNotesService.createNote({
				assessment_id: assessmentId,
				note_text: newNoteText.trim()
			});
			newNoteText = '';
			isAddingNote = false;
			onUpdate();
		} catch (error) {
			console.error('Error adding note:', error);
		} finally {
			saving = false;
		}
	}

	async function handleUpdateNote(noteId: string) {
		if (!editNoteText.trim()) return;

		saving = true;
		try {
			await assessmentNotesService.updateNote(noteId, {
				note_text: editNoteText.trim()
			});
			editingNoteId = null;
			editNoteText = '';
			onUpdate();
		} catch (error) {
			console.error('Error updating note:', error);
		} finally {
			saving = false;
		}
	}

	async function handleDeleteNote(noteId: string) {
		if (!confirm('Are you sure you want to delete this note?')) return;

		saving = true;
		try {
			await assessmentNotesService.deleteNote(noteId);
			onUpdate();
		} catch (error) {
			console.error('Error deleting note:', error);
		} finally {
			saving = false;
		}
	}

	function startEditing(note: AssessmentNote) {
		editingNoteId = note.id;
		editNoteText = note.note_text;
	}

	function cancelEditing() {
		editingNoteId = null;
		editNoteText = '';
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<Card class="border-blue-200 bg-blue-50/50">
	<div class="p-4">
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<StickyNote class="h-5 w-5 text-blue-600" />
				<h3 class="font-semibold text-gray-900">Assessment Notes</h3>
				<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
					{notes.length}
				</span>
			</div>
			{#if !isAddingNote}
				<Button
					size="sm"
					variant="outline"
					onclick={() => (isAddingNote = true)}
					disabled={saving}
					class="gap-1"
				>
					<Plus class="h-4 w-4" />
					Add Note
				</Button>
			{/if}
		</div>

		<!-- Add Note Form -->
		{#if isAddingNote}
			<div class="mb-4 space-y-2 rounded-lg border border-blue-200 bg-white p-3">
				<Textarea
					bind:value={newNoteText}
					placeholder="Enter your note here..."
					rows={3}
					class="resize-none"
					disabled={saving}
				/>
				<div class="flex justify-end gap-2">
					<Button
						size="sm"
						variant="outline"
						onclick={() => {
							isAddingNote = false;
							newNoteText = '';
						}}
						disabled={saving}
					>
						<X class="h-4 w-4" />
						Cancel
					</Button>
					<Button size="sm" onclick={handleAddNote} disabled={saving || !newNoteText.trim()}>
						<Check class="h-4 w-4" />
						Save Note
					</Button>
				</div>
			</div>
		{/if}

		<!-- Notes List -->
		{#if notes.length === 0 && !isAddingNote}
			<div class="py-8 text-center">
				<StickyNote class="mx-auto h-12 w-12 text-gray-300" />
				<p class="mt-2 text-sm text-gray-500">No notes yet</p>
				<p class="text-xs text-gray-400">Add notes to keep track of important information</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each notes as note (note.id)}
					<div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
						{#if editingNoteId === note.id}
							<!-- Edit Mode -->
							<div class="space-y-2">
								<Textarea
									bind:value={editNoteText}
									rows={3}
									class="resize-none"
									disabled={saving}
								/>
								<div class="flex justify-end gap-2">
									<Button size="sm" variant="outline" onclick={cancelEditing} disabled={saving}>
										<X class="h-4 w-4" />
										Cancel
									</Button>
									<Button
										size="sm"
										onclick={() => handleUpdateNote(note.id)}
										disabled={saving || !editNoteText.trim()}
									>
										<Check class="h-4 w-4" />
										Save
									</Button>
								</div>
							</div>
						{:else}
							<!-- View Mode -->
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1">
									<p class="whitespace-pre-wrap text-sm text-gray-700">{note.note_text}</p>
									<p class="mt-1 text-xs text-gray-500">
										{formatDate(note.created_at)}
										{#if note.updated_at !== note.created_at}
											<span class="text-gray-400">(edited)</span>
										{/if}
									</p>
								</div>
								<div class="flex gap-1">
									<Button
										size="sm"
										variant="ghost"
										onclick={() => startEditing(note)}
										disabled={saving}
										class="h-8 w-8 p-0"
									>
										<Edit2 class="h-3.5 w-3.5" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onclick={() => handleDeleteNote(note.id)}
										disabled={saving}
										class="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
									>
										<Trash2 class="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</Card>

