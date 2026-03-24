<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Users, User, Phone, Mail, MapPin, Plus } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	let searchValue = $state(data.search ?? '');

	function handleSearch(event: Event) {
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const search = formData.get('search') as string;
		const url = new URL($page.url);
		if (search.trim()) {
			url.searchParams.set('search', search.trim());
		} else {
			url.searchParams.delete('search');
		}
		goto(url.toString(), { keepFocus: true });
	}

	const customersWithDetails = $derived(
		data.customers.map((customer) => ({
			id: customer.id,
			name: customer.name + (customer.company_name ? `\n${customer.company_name}` : ''),
			name_display: customer.name,
			company_name: customer.company_name ?? null,
			phone: customer.phone ?? '-',
			email: customer.email ?? '-',
			city: customer.city ?? '-'
		}))
	);

	const columns = [
		{ key: 'name_display' as const, label: 'Name', sortable: true, icon: User },
		{ key: 'phone' as const, label: 'Phone', sortable: false, icon: Phone },
		{ key: 'email' as const, label: 'Email', sortable: true, icon: Mail },
		{ key: 'city' as const, label: 'City', sortable: true, icon: MapPin }
	];

	function handleRowClick(row: (typeof customersWithDetails)[0]) {
		startNavigation(row.id, `/shop/customers/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Customers" description="Manage customer records and contact information.">
		{#snippet actions()}
			<Button href="/shop/customers/new">
				<Plus class="h-4 w-4 mr-2" />
				Add Customer
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Search -->
	<form onsubmit={handleSearch} class="flex gap-2">
		<Input
			type="text"
			name="search"
			bind:value={searchValue}
			placeholder="Search by name, phone, email..."
			class="w-full max-w-sm"
		/>
		<Button type="submit" variant="outline">Search</Button>
		{#if data.search}
			<Button variant="ghost" href="/shop/customers">Clear</Button>
		{/if}
	</form>

	{#if customersWithDetails.length === 0}
		<EmptyState
			icon={Users}
			title={data.search ? `No customers found for "${data.search}"` : 'No customers yet'}
			description={data.search ? 'Try a different search term.' : 'Add your first customer to get started.'}
			actionLabel={data.search ? undefined : 'Add Customer'}
			onAction={data.search ? undefined : () => goto('/shop/customers/new')}
		/>
	{:else}
		<ModernDataTable
			data={customersWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
			emptyMessage="No customers found"
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'name_display'}
					<div>
						<TableCell variant="primary" bold>
							{row.name_display}
						</TableCell>
						{#if row.company_name}
							<p class="mt-0.5 text-xs text-gray-500">{row.company_name}</p>
						{/if}
					</div>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{customersWithDetails.length}</span>
				{customersWithDetails.length === 1 ? 'customer' : 'customers'}
			</p>
		</div>
	{/if}
</div>
