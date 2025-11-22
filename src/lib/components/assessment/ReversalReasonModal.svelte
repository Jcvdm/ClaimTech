<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { X } from 'lucide-svelte';

	interface Props {
		title?: string;
		description?: string;
		onConfirm: (reason: string) => void;
		onCancel: () => void;
	}

	let {
		title = 'Reversal Reason',
		description = 'Please provide a reason for this reversal action.',
		onConfirm,
		onCancel
	}: Props = $props();

	let reason = $state('');
	let error = $state('');

	function handleConfirm() {
		if (!reason.trim()) {
			error = 'Reason is required';
			return;
		}
		if (reason.trim().length < 10) {
			error = 'Reason must be at least 10 characters';
			return;
		}
		onConfirm(reason.trim());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal Overlay -->
<div
	class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
	onclick={onCancel}
	role="button"
	tabindex={-1}
>
	<!-- Modal Content -->
	<Card
		class="w-full max-w-md p-6 relative"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		tabindex={-1}
	>
		<!-- Close Button -->
		<button
			onclick={onCancel}
			class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
			aria-label="Close"
		>
			<X class="h-5 w-5" />
		</button>

		<!-- Header -->
		<div class="mb-4">
			<h2 class="text-xl font-semibold text-gray-900">{title}</h2>
			<p class="text-sm text-gray-600 mt-1">{description}</p>
		</div>

		<!-- Form -->
		<div class="space-y-4">
			<div>
				<label for="reason" class="block text-sm font-medium text-gray-700 mb-1">
					Reason <span class="text-red-500">*</span>
				</label>
				<textarea
					id="reason"
					bind:value={reason}
					placeholder="Enter reason for reversal (minimum 10 characters)..."
					rows="4"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					oninput={() => (error = '')}
				></textarea>
				{#if error}
					<p class="text-sm text-red-600 mt-1">{error}</p>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex gap-2 justify-end">
				<Button variant="outline" onclick={onCancel}>Cancel</Button>
				<Button onclick={handleConfirm}>Confirm Reversal</Button>
			</div>
		</div>
	</Card>
</div>

<style>
	textarea {
		resize: vertical;
		min-height: 100px;
	}
</style>

