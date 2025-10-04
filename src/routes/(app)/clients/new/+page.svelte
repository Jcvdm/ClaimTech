<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ClientForm from '$lib/components/forms/ClientForm.svelte';
	import { clientService } from '$lib/services/client.service';
	import type { CreateClientInput } from '$lib/types/client';

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(formData: FormData) {
		loading = true;
		error = null;

		try {
			const clientData: CreateClientInput = {
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

			const newClient = await clientService.createClient(clientData);
			goto(`/clients/${newClient.id}`);
		} catch (err) {
			console.error('Error creating client:', err);
			error = err instanceof Error ? err.message : 'Failed to create client';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		goto('/clients');
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="New Client" description="Add a new insurance or private client" />

	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	<ClientForm onsubmit={handleSubmit} oncancel={handleCancel} {loading} />
</div>

