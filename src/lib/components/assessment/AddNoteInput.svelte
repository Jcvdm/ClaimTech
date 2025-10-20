<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Plus, Loader2 } from 'lucide-svelte';

	interface Props {
		onAdd: (noteText: string) => Promise<void>;
		placeholder?: string;
	}

	let {
		onAdd,
		placeholder = 'Add a note... (e.g., observations, findings, comments)'
	}: Props = $props();

	let noteText = $state('');
	let adding = $state(false);

	// Auto-resize textarea as content grows
	function handleInput(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		textarea.style.height = 'auto';
		const maxHeight = 200; // ~10 rows at default line height
		textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
	}

	async function handleAddNote() {
		if (!noteText.trim()) return;

		adding = true;
		try {
			await onAdd(noteText.trim());
			noteText = ''; // Clear input after successful add
			// Reset textarea height
			const textarea = document.querySelector('textarea');
			if (textarea) {
				textarea.style.height = 'auto';
			}
		} catch (error) {
			console.error('Error adding note:', error);
		} finally {
			adding = false;
		}
	}

	// Handle Ctrl+Enter to submit
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleAddNote();
		}
	}
</script>

<div class="space-y-2">
	<Textarea
		bind:value={noteText}
		oninput={handleInput}
		onkeydown={handleKeydown}
		{placeholder}
		rows={2}
		class="min-h-[60px] max-h-[200px] resize-none text-sm"
		disabled={adding}
	/>

	<div class="flex items-center justify-between">
		<span class="text-xs text-gray-500">
			{#if noteText.length > 0}
				{noteText.length} characters • Press Ctrl+Enter to add
			{:else}
				Type your note and click Add
			{/if}
		</span>

		<Button onclick={handleAddNote} size="sm" disabled={adding || !noteText.trim()}>
			{#if adding}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Adding...
			{:else}
				<Plus class="mr-2 h-4 w-4" />
				Add Note
			{/if}
		</Button>
	</div>
</div>

