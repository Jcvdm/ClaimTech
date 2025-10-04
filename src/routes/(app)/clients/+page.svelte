<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Users, Plus } from 'lucide-svelte';
	import type { Client } from '$lib/types/client';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns = [
		{
			key: 'name' as keyof Client,
			label: 'Name',
			sortable: true
		},
		{
			key: 'type' as keyof Client,
			label: 'Type',
			sortable: true,
			render: (value: string) => {
				const type = value as 'insurance' | 'private';
				return type === 'insurance' ? 'Insurance' : 'Private';
			}
		},
		{
			key: 'contact_name' as keyof Client,
			label: 'Contact',
			sortable: true,
			render: (value: string | null) => value || '-'
		},
		{
			key: 'email' as keyof Client,
			label: 'Email',
			sortable: true,
			render: (value: string | null) => value || '-'
		},
		{
			key: 'phone' as keyof Client,
			label: 'Phone',
			sortable: true,
			render: (value: string | null) => value || '-'
		},
		{
			key: 'city' as keyof Client,
			label: 'City',
			sortable: true,
			render: (value: string | null) => value || '-'
		}
	];

	function handleRowClick(client: Client) {
		goto(`/clients/${client.id}`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="Clients" description="Manage your insurance and private clients">
		{#snippet actions()}
			<Button href="/clients/new">
				<Plus class="mr-2 h-4 w-4" />
				New Client
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{data.error}</p>
		</div>
	{/if}

	{#if data.clients.length === 0}
		<EmptyState
			icon={Users}
			title="No clients yet"
			description="Get started by creating your first client"
			actionLabel="New Client"
			onAction={() => goto('/clients/new')}
		/>
	{:else}
		<div class="rounded-lg border bg-white">
			<DataTable
				data={data.clients}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No clients found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{data.clients.length}</span>
				{data.clients.length === 1 ? 'client' : 'clients'}
			</p>
		</div>
	{/if}
</div>

