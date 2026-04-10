<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Trash2 } from 'lucide-svelte';
	import AddNoteInput from '$lib/components/assessment/AddNoteInput.svelte';
	import type { ShopJobNote } from '$lib/services/shop-job-notes.service';

	interface StatusHistoryEntry {
		status: string;
		timestamp: string;
		user_id?: string;
		reason?: string;
	}

	interface Props {
		statusHistory: StatusHistoryEntry[];
		notes: ShopJobNote[];
		userNames: Record<string, string>;
		statusLabels: Record<string, string>;
		onAddNote: (noteText: string) => Promise<void>;
		onDeleteNote: (noteId: string) => Promise<void>;
	}

	let { statusHistory, notes, userNames, statusLabels, onAddNote, onDeleteNote }: Props = $props();
</script>

<Card.Root>
	<Card.Header class="pb-2">
		<Card.Title class="text-base">Notes & Activity</Card.Title>
	</Card.Header>
	<Card.Content>
		<!-- Activity Timeline -->
		{#if statusHistory.length > 0}
			<div class="mb-4 space-y-2">
				<h4 class="text-xs font-semibold uppercase text-gray-500">Status History</h4>
				<div class="space-y-1.5">
					{#each statusHistory as entry}
						<div class="flex items-start gap-2 text-xs">
							<div class="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-400"></div>
							<div>
								<span class="font-medium">{statusLabels[entry.status] ?? entry.status}</span>
								<span class="text-gray-500">
									— {new Date(entry.timestamp).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
									{new Date(entry.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
								</span>
								{#if entry.user_id && userNames[entry.user_id]}
									<span class="text-gray-500">by {userNames[entry.user_id]}</span>
								{/if}
								{#if entry.reason}
									<p class="mt-0.5 text-orange-600">Reason: {entry.reason}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<Separator class="my-3" />

		<!-- Notes -->
		<div class="space-y-2">
			<h4 class="text-xs font-semibold uppercase text-gray-500">Notes</h4>
			{#if notes.length > 0}
				<div class="max-h-64 space-y-2 overflow-y-auto">
					{#each notes as note}
						<div class="rounded-lg p-2.5 text-sm {note.note_type === 'qc_rejection' ? 'bg-orange-50 border border-orange-200' : note.note_type === 'system' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1">
									{#if note.note_title}
										<p class="text-xs font-semibold {note.note_type === 'qc_rejection' ? 'text-orange-700' : note.note_type === 'system' ? 'text-blue-700' : 'text-gray-700'}">{note.note_title}</p>
									{/if}
									<p class="text-gray-700">{note.note_text}</p>
									<p class="mt-1 text-xs text-gray-400">
										{new Date(note.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
										{new Date(note.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
										{#if note.created_by && userNames[note.created_by]}
											— {userNames[note.created_by]}
										{/if}
										{#if note.is_edited}
											<span class="italic">(edited)</span>
										{/if}
									</p>
								</div>
								{#if note.note_type === 'manual'}
									<Button variant="ghost" size="sm" class="h-6 w-6 p-0 text-gray-400" onclick={() => onDeleteNote(note.id)}>
										<Trash2 class="h-3 w-3" />
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-gray-400 py-2">No notes yet.</p>
			{/if}

			<!-- Add note using assessment's AddNoteInput -->
			<AddNoteInput onAdd={onAddNote} placeholder="Add a note..." />
		</div>
	</Card.Content>
</Card.Root>
