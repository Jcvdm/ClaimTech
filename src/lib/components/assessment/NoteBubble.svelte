<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Pencil, Trash2, Check, X, Percent, User } from 'lucide-svelte';
	import type { AssessmentNote } from '$lib/types/assessment';

	interface Props {
		note: AssessmentNote;
		onEdit: (id: string, noteText: string) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
	}

	let { note, onEdit, onDelete }: Props = $props();

	let isEditing = $state(false);
	let editText = $state(note.note_text);
	let saving = $state(false);

	// Format timestamp to readable format
	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get bubble style based on note type
	function getBubbleStyle(noteType: string): string {
		switch (noteType) {
			case 'betterment':
				return 'bg-orange-50 border-orange-200 text-orange-900';
			case 'system':
				return 'bg-blue-50 border-blue-200 text-blue-900';
			case 'manual':
			default:
				return 'bg-gray-50 border-gray-200 text-gray-900';
		}
	}

	// Get icon for note type
	function getNoteIcon(noteType: string) {
		switch (noteType) {
			case 'betterment':
				return Percent;
			case 'system':
			case 'manual':
			default:
				return User;
		}
	}

	async function handleSaveEdit() {
		if (editText.trim() === note.note_text) {
			isEditing = false;
			return;
		}

		saving = true;
		try {
			await onEdit(note.id, editText.trim());
			isEditing = false;
		} catch (error) {
			console.error('Error saving note edit:', error);
		} finally {
			saving = false;
		}
	}

	function handleCancelEdit() {
		editText = note.note_text;
		isEditing = false;
	}

	async function handleDeleteNote() {
		if (!confirm('Are you sure you want to delete this note?')) return;

		saving = true;
		try {
			await onDelete(note.id);
		} catch (error) {
			console.error('Error deleting note:', error);
		} finally {
			saving = false;
		}
	}

	function handleStartEdit() {
		editText = note.note_text;
		isEditing = true;
	}
</script>

<div
	class="flex gap-2 {note.note_type === 'betterment'
		? 'justify-end'
		: 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-200"
>
	<div class="max-w-[85%] rounded-lg border p-3 shadow-sm {getBubbleStyle(note.note_type)}">
		<!-- Note Header -->
		<div class="mb-2 flex items-start justify-between gap-2">
			<div class="flex items-center gap-2">
				<svelte:component this={getNoteIcon(note.note_type)} class="h-4 w-4 opacity-60" />
				{#if note.note_title}
					<span class="text-sm font-semibold">{note.note_title}</span>
				{:else}
					<span class="text-xs font-medium opacity-60">
						{note.note_type === 'betterment' ? 'Betterment' : note.note_type === 'system' ? 'System' : 'Note'}
					</span>
				{/if}
			</div>

			<!-- Actions (visible on hover for manual notes) -->
			{#if note.note_type === 'manual' && !isEditing}
				<div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					<button
						onclick={handleStartEdit}
						class="rounded p-1 hover:bg-gray-200/50 transition-colors"
						title="Edit note"
						disabled={saving}
					>
						<Pencil class="h-3.5 w-3.5" />
					</button>
					<button
						onclick={handleDeleteNote}
						class="rounded p-1 hover:bg-red-100 hover:text-red-600 transition-colors"
						title="Delete note"
						disabled={saving}
					>
						<Trash2 class="h-3.5 w-3.5" />
					</button>
				</div>
			{/if}
		</div>

		<!-- Note Content -->
		{#if isEditing}
			<div class="space-y-2">
				<Textarea
					bind:value={editText}
					rows={4}
					class="min-h-[80px] resize-none text-sm"
					disabled={saving}
					autofocus
				/>
				<div class="flex gap-2">
					<Button
						onclick={handleSaveEdit}
						size="sm"
						disabled={saving || !editText.trim()}
						class="flex-1"
					>
						<Check class="mr-1 h-3.5 w-3.5" />
						{saving ? 'Saving...' : 'Save'}
					</Button>
					<Button onclick={handleCancelEdit} size="sm" variant="outline" disabled={saving}>
						<X class="mr-1 h-3.5 w-3.5" />
						Cancel
					</Button>
				</div>
			</div>
		{:else}
			<div class="whitespace-pre-wrap text-sm leading-relaxed">{note.note_text}</div>
		{/if}

		<!-- Note Footer -->
		<div class="mt-2 flex items-center justify-between text-xs opacity-60">
			<span>{formatTimestamp(note.created_at)}</span>
			{#if note.is_edited}
				<span class="italic">(edited)</span>
			{/if}
		</div>
	</div>
</div>

