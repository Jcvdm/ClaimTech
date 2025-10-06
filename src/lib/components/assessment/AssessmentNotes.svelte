<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { StickyNote } from 'lucide-svelte';
	import { assessmentNotesService } from '$lib/services/assessment-notes.service';
	import type { AssessmentNote } from '$lib/types/assessment';

	interface Props {
		assessmentId: string;
		notes: AssessmentNote[];
		onUpdate: () => void;
		lastSaved?: string | null;
	}

	let { assessmentId, notes, onUpdate, lastSaved = null }: Props = $props();

	// Get the first (and only) note for this assessment
	let notesText = $state(notes.length > 0 ? notes[0].note_text : '');
	let saving = $state(false);

	// Track initial value for comparison
	let initialValue = notes.length > 0 ? notes[0].note_text : '';

	// Auto-resize textarea as content grows
	function handleInput(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		textarea.style.height = 'auto';
		const maxHeight = 600; // ~30 rows at default line height
		textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
	}

	// Save on blur (when user clicks away)
	async function handleBlur() {
		if (notesText !== initialValue) {
			await handleSave();
		}
	}

	// Save notes using upsert pattern
	async function handleSave() {
		if (saving) return;

		saving = true;
		try {
			await assessmentNotesService.upsertNote(assessmentId, notesText);
			initialValue = notesText; // Update initial state after successful save
			onUpdate();
		} catch (error) {
			console.error('Error saving notes:', error);
		} finally {
			saving = false;
		}
	}
</script>

<Card class="border-blue-200 bg-blue-50/50">
	<div class="p-6">
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<StickyNote class="h-5 w-5 text-blue-600" />
				<h3 class="text-lg font-semibold text-gray-900">Assessment Notes</h3>
			</div>
			<div class="text-xs text-gray-500">
				{#if saving}
					<span class="text-blue-600">Saving...</span>
				{:else if lastSaved}
					<span>Last saved: {lastSaved}</span>
				{/if}
			</div>
		</div>

		<!-- Large Expandable Textarea -->
		<Textarea
			bind:value={notesText}
			oninput={handleInput}
			onblur={handleBlur}
			placeholder="Add notes, observations, and comments about this assessment...

You can add multiple lines and paragraphs here.
- Use bullet points
- Document findings
- Add timestamps if needed

The textarea will automatically expand as you type (up to 30 rows)."
			rows={10}
			class="min-h-[250px] max-h-[600px] resize-none overflow-y-auto font-mono text-sm"
			disabled={saving}
		/>

		<!-- Footer Info -->
		<div class="mt-2 flex items-center justify-between text-xs text-gray-500">
			<span>{notesText.length} characters</span>
			<span>Auto-saves every 30 seconds</span>
		</div>
	</div>
</Card>

