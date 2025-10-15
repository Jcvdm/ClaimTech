<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		onConfirm: (reason: string) => void;
		onCancel: () => void;
	}

	let { onConfirm, onCancel }: Props = $props();

	let reason = $state('');
	let error = $state('');

	function handleConfirm() {
		if (!reason.trim()) {
			error = 'Please provide a reason for declining';
			return;
		}
		onConfirm(reason);
	}
</script>

<Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Decline Additional Line Item</DialogTitle>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="reason">Reason for Declining *</Label>
				<Textarea
					id="reason"
					bind:value={reason}
					placeholder="e.g., Unrelated damage, Pre-incident damage, Not part of accident..."
					rows={4}
					class={error ? 'border-red-500' : ''}
				/>
				{#if error}
					<p class="text-sm text-red-600">{error}</p>
				{/if}
			</div>

			<p class="text-sm text-gray-600">
				Common reasons: Unrelated damage, Pre-incident damage, Not part of accident, Duplicate
				item, Incorrect pricing
			</p>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
			<Button onclick={handleConfirm} class="bg-red-600 hover:bg-red-700"> Decline Item </Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

