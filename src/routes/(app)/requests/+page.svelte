<script lang="ts">
	import { goto } from '$app/navigation';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
import type { CardConfig } from '$lib/components/data/ListItemCard.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
import { FilterTabs } from '$lib/components/ui/tabs';
	import { FileText, Plus, Hash, User, Car, Calendar } from 'lucide-svelte';
	import { getTypeVariant, getTypeLabel, formatVehicleDisplay, formatDateDisplay } from '$lib/utils/table-helpers';
	import type { Request, RequestStatus } from '$lib/types/request';
	import type { PageData } from './$types';
	import PageContainer from '$lib/components/layout/PageContainer.svelte';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	type RequestWithClient = Request & { client_name: string; formatted_date: string };

	// Status filter state
	type StatusFilterValue = RequestStatus | 'all';
	let selectedStatus = $state<StatusFilterValue>('all');

	const statusTabItems = [
		{ value: 'all', label: 'All' },
		{ value: 'submitted', label: 'New' },
		{ value: 'draft', label: 'Draft' }
	] as const;

	// Add client names and formatted dates to requests
	// Only include submitted and draft requests
	const allRequestsWithDetails: RequestWithClient[] = data.requests
		.filter((req) => req.status === 'submitted' || req.status === 'draft')
		.map((req) => ({
			...req,
			client_name: (data.clientMap as Record<string, string>)[req.client_id] || 'Unknown Client',
			formatted_date: formatDateDisplay(req.created_at)
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

	// Mobile card configuration
	const mobileCardConfig: CardConfig<RequestWithClient> = {
		primaryField: 'request_number',
		secondaryField: 'type',
		bodyFields: ['client_name', 'vehicle_make'],
		footerField: 'formatted_date'
	};

	function handleRowClick(request: RequestWithClient) {
		startNavigation(request.id, `/requests/${request.id}`);
	}
</script>

<PageContainer class="flex-1 space-y-4 md:space-y-6">
	<PageHeader title="Requests" description="Review and accept new vehicle damage assessment requests">
		{#snippet actions()}
			<Button href="/requests/new">
				<Plus class="mr-2 h-4 w-4" />
				New Request
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.error}
		<Alert variant="destructive">
			<AlertTitle>Unable to load requests</AlertTitle>
			<AlertDescription>{data.error}</AlertDescription>
		</Alert>
	{/if}

	<FilterTabs
		items={statusTabItems}
		bind:value={selectedStatus}
		counts={statusCounts}
	/>

	{#if requestsWithDetails.length === 0}
		<EmptyState
			icon={FileText}
			title="No requests yet"
			description="Get started by creating your first request"
			actionLabel="New Request"
			onAction={() => goto('/requests/new')}
		/>
	{:else}
		<ModernDataTable
			data={requestsWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
			{mobileCardConfig}
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'request_number'}
					<TableCell variant="primary" bold>
						{row.request_number}
					</TableCell>
				{:else if column.key === 'vehicle_make'}
					{formatVehicleDisplay(row.vehicle_make, row.vehicle_model)}
				{:else if column.key === 'type'}
					<GradientBadge
						variant={getTypeVariant(row.type as 'insurance' | 'private')}
						label={getTypeLabel(row.type as 'insurance' | 'private')}
					/>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
			{#snippet mobileCardContent(field, row)}
				{#if field === 'request_number'}
					<span class="font-semibold text-gray-900">{row.request_number}</span>
				{:else if field === 'type'}
					<GradientBadge
						variant={getTypeVariant(row.type as 'insurance' | 'private')}
						label={getTypeLabel(row.type as 'insurance' | 'private')}
					/>
				{:else if field === 'client_name'}
					<span class="text-gray-600"><User class="inline h-3.5 w-3.5 mr-1 text-gray-400" />{row.client_name}</span>
				{:else if field === 'vehicle_make'}
					<span class="text-gray-600"><Car class="inline h-3.5 w-3.5 mr-1 text-gray-400" />{formatVehicleDisplay(row.vehicle_make, row.vehicle_model)}</span>
				{:else}
					{row[field]}
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
</PageContainer>
