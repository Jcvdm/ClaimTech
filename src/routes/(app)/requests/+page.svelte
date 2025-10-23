<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { FileText, Plus, Hash, User, Car, Calendar } from 'lucide-svelte';
	import type { Request, RequestStatus } from '$lib/types/request';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type RequestWithClient = Request & { client_name: string; formatted_date: string };

	// Status filter state
	let selectedStatus = $state<RequestStatus | 'all'>('all');

	// Add client names and formatted dates to requests
	// Only include submitted and draft requests
	const allRequestsWithDetails: RequestWithClient[] = data.requests
		.filter((req) => req.status === 'submitted' || req.status === 'draft')
		.map((req) => ({
			...req,
			client_name: (data.clientMap as Record<string, string>)[req.client_id] || 'Unknown Client',
			formatted_date: new Date(req.created_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			})
		}));

	// Filter requests based on selected status
	const requestsWithDetails = $derived(
		selectedStatus === 'all'
			? allRequestsWithDetails
			: allRequestsWithDetails.filter((req) => req.status === selectedStatus)
	);

	// Count requests by status (only submitted and draft)
	const statusCounts = $derived({
		all: allRequestsWithDetails.length,
		submitted: allRequestsWithDetails.filter((r) => r.status === 'submitted').length,
		draft: allRequestsWithDetails.filter((r) => r.status === 'draft').length
	});

	const columns = [
		{
			key: 'request_number' as keyof RequestWithClient,
			label: 'Request #',
			sortable: true,
			icon: Hash
		},
		{
			key: 'client_name' as keyof RequestWithClient,
			label: 'Client',
			sortable: true,
			icon: User
		},
		{
			key: 'vehicle_make' as keyof RequestWithClient,
			label: 'Vehicle',
			sortable: true,
			icon: Car
		},
		{
			key: 'type' as keyof RequestWithClient,
			label: 'Type',
			sortable: true,
			icon: User
		},
		{
			key: 'formatted_date' as keyof RequestWithClient,
			label: 'Date Requested',
			sortable: true,
			icon: Calendar
		}
	];

	function handleRowClick(request: RequestWithClient) {
		goto(`/requests/${request.id}`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="New Requests" description="Review and accept new vehicle damage assessment requests">
		{#snippet actions()}
			<Button href="/requests/new">
				<Plus class="mr-2 h-4 w-4" />
				New Request
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{data.error}</p>
		</div>
	{/if}

	<!-- Status Filter Tabs -->
	<div class="flex gap-2 border-b border-gray-200">
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'all'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'all')}
		>
			All
			<Badge variant="secondary" class="ml-2">{statusCounts.all}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'submitted'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'submitted')}
		>
			New
			<Badge variant="secondary" class="ml-2">{statusCounts.submitted}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'draft'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'draft')}
		>
			Draft
			<Badge variant="secondary" class="ml-2">{statusCounts.draft}</Badge>
		</button>
	</div>

	{#if requestsWithDetails.length === 0}
		<EmptyState
			icon={FileText}
			title="No requests yet"
			description="Get started by creating your first request"
			actionLabel="New Request"
			onAction={() => goto('/requests/new')}
		/>
	{:else}
		<ModernDataTable data={requestsWithDetails} {columns} onRowClick={handleRowClick} striped>
			{#snippet cellContent(column, row)}
				{#if column.key === 'request_number'}
					<TableCell variant="primary" bold>
						{row.request_number}
					</TableCell>
				{:else if column.key === 'vehicle_make'}
					{@const vehicle = row.vehicle_make
						? `${row.vehicle_make} ${row.vehicle_model || ''}`.trim()
						: '-'}
					{vehicle}
				{:else if column.key === 'type'}
					{@const isInsurance = row.type === 'insurance'}
					<GradientBadge
						variant={isInsurance ? 'blue' : 'purple'}
						label={isInsurance ? 'Insurance' : 'Private'}
					/>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{requestsWithDetails.length}</span>
				{requestsWithDetails.length === 1 ? 'request' : 'requests'}
			</p>
		</div>
	{/if}
</div>

