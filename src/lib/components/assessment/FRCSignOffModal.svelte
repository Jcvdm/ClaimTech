<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { CheckCircle } from 'lucide-svelte';
	import type { Engineer } from '$lib/types/engineer';

	interface Props {
		engineer?: Engineer | null;
		onConfirm: (signOffData: {
			name: string;
			email: string;
			role: string;
			notes?: string;
		}) => void;
		onCancel: () => void;
	}

	let { engineer, onConfirm, onCancel }: Props = $props();

	// Pre-populate fields from engineer data if available
	let name = $state(engineer?.name || '');
	let email = $state(engineer?.email || '');
	let role = $state(engineer?.specialization || '');
	let notes = $state('');
	let errors = $state<Record<string, string>>({});

	function validate() {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) newErrors.name = 'Name is required';
		if (!email.trim()) newErrors.email = 'Email is required';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			newErrors.email = 'Invalid email format';
		}
		if (!role.trim()) newErrors.role = 'Role/Title is required';

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleConfirm() {
		if (!validate()) return;

		onConfirm({
			name: name.trim(),
			email: email.trim(),
			role: role.trim(),
			notes: notes.trim() || undefined
		});
	}
</script>

<Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
	<DialogContent class="max-w-md">
		<DialogHeader>
			<div class="flex items-center gap-2">
				<CheckCircle class="h-6 w-6 text-green-600" />
				<DialogTitle>Sign Off FRC</DialogTitle>
			</div>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<p class="text-sm text-gray-600">
				Please confirm your details to sign off and complete this Final Repair Costing.
			</p>

			<!-- Name -->
			<div class="space-y-2">
				<Label for="name">Engineer Name *</Label>
				<Input
					id="name"
					bind:value={name}
					placeholder="e.g., John Smith"
					class={errors.name ? 'border-red-500' : ''}
				/>
				{#if errors.name}
					<p class="text-sm text-red-600">{errors.name}</p>
				{/if}
			</div>

			<!-- Email -->
			<div class="space-y-2">
				<Label for="email">Email Address *</Label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					placeholder="e.g., john.smith@company.com"
					class={errors.email ? 'border-red-500' : ''}
				/>
				{#if errors.email}
					<p class="text-sm text-red-600">{errors.email}</p>
				{/if}
			</div>

			<!-- Role -->
			<div class="space-y-2">
				<Label for="role">Role/Title *</Label>
				<Input
					id="role"
					bind:value={role}
					placeholder="e.g., Senior Vehicle Assessor"
					class={errors.role ? 'border-red-500' : ''}
				/>
				{#if errors.role}
					<p class="text-sm text-red-600">{errors.role}</p>
				{/if}
			</div>

			<!-- Notes (Optional) -->
			<div class="space-y-2">
				<Label for="notes">Sign-Off Notes (Optional)</Label>
				<Textarea
					id="notes"
					bind:value={notes}
					placeholder="Any additional comments or notes..."
					rows={3}
				/>
			</div>

			<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
				<p class="text-xs text-blue-800">
					<strong>Note:</strong> By signing off, you confirm that all line items have been reviewed
					and the actual repair costs have been verified against invoices.
				</p>
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
			<Button onclick={handleConfirm} class="bg-green-600 hover:bg-green-700">
				Agree & Sign Off
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

