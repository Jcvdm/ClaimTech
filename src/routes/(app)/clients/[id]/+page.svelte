<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ClientForm from '$lib/components/forms/ClientForm.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { clientService } from '$lib/services/client.service';
	import { Pencil, Trash2, ArrowLeft } from 'lucide-svelte';
	import type { UpdateClientInput } from '$lib/types/client';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let editing = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleUpdate(formData: FormData) {
		loading = true;
		error = null;

		try {
			const updateData: UpdateClientInput = {
				name: formData.get('name') as string,
				type: formData.get('type') as 'insurance' | 'private',
				contact_name: formData.get('contact_name') as string,
				email: formData.get('email') as string,
				phone: formData.get('phone') as string,
				address: formData.get('address') as string,
				city: formData.get('city') as string,
				postal_code: formData.get('postal_code') as string,
				notes: formData.get('notes') as string
			};

			await clientService.updateClient(data.client.id, updateData);
			editing = false;
			// Reload the page to get fresh data
			window.location.reload();
		} catch (err) {
			console.error('Error updating client:', err);
			error = err instanceof Error ? err.message : 'Failed to update client';
		} finally {
			loading = false;
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
			return;
		}

		loading = true;
		error = null;

		try {
			await clientService.deleteClient(data.client.id);
			goto('/clients');
		} catch (err) {
			console.error('Error deleting client:', err);
			error = err instanceof Error ? err.message : 'Failed to delete client';
			loading = false;
		}
	}

	function handleCancel() {
		editing = false;
		error = null;
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title={data.client.name} description="Client details and information">
		{#snippet actions()}
			<div class="flex gap-2">
				<Button variant="outline" href="/clients">
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back to Clients
				</Button>
				{#if !editing}
					<Button onclick={() => (editing = true)}>
						<Pencil class="mr-2 h-4 w-4" />
						Edit
					</Button>
					<Button variant="destructive" onclick={handleDelete} disabled={loading}>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					</Button>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	{#if editing}
		<ClientForm client={data.client} onsubmit={handleUpdate} oncancel={handleCancel} {loading} />
	{:else}
		<div class="space-y-6">
			<Card class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Basic Information</h3>
					<Badge variant={data.client.type === 'insurance' ? 'default' : 'secondary'}>
						{data.client.type === 'insurance' ? 'Insurance' : 'Private'}
					</Badge>
				</div>
				<dl class="grid gap-4 md:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Client Name</dt>
						<dd class="mt-1 text-sm text-gray-900">{data.client.name}</dd>
					</div>
				</dl>
			</Card>

			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Contact Information</h3>
				<dl class="grid gap-4 md:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Contact Name</dt>
						<dd class="mt-1 text-sm text-gray-900">{data.client.contact_name || '-'}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Email</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{#if data.client.email}
								<a href="mailto:{data.client.email}" class="text-blue-600 hover:underline">
									{data.client.email}
								</a>
							{:else}
								-
							{/if}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Phone</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{#if data.client.phone}
								<a href="tel:{data.client.phone}" class="text-blue-600 hover:underline">
									{data.client.phone}
								</a>
							{:else}
								-
							{/if}
						</dd>
					</div>
				</dl>
			</Card>

			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Address</h3>
				<dl class="grid gap-4 md:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Street Address</dt>
						<dd class="mt-1 text-sm text-gray-900">{data.client.address || '-'}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">City</dt>
						<dd class="mt-1 text-sm text-gray-900">{data.client.city || '-'}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Postal Code</dt>
						<dd class="mt-1 text-sm text-gray-900">{data.client.postal_code || '-'}</dd>
					</div>
				</dl>
			</Card>

			{#if data.client.notes}
				<Card class="p-6">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Notes</h3>
					<p class="text-sm text-gray-700 whitespace-pre-wrap">{data.client.notes}</p>
				</Card>
			{/if}

			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Metadata</h3>
				<dl class="grid gap-4 md:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500">Created</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{new Date(data.client.created_at).toLocaleDateString('en-ZA', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500">Last Updated</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{new Date(data.client.updated_at).toLocaleDateString('en-ZA', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}
						</dd>
					</div>
				</dl>
			</Card>
		</div>
	{/if}
</div>

