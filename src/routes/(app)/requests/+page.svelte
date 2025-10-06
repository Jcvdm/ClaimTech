<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import StatusBadge from '$lib/components/data/StatusBadge.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { FileText, Plus } from 'lucide-svelte';
	import type { Request, RequestStatus } from '$lib/types/request';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type RequestWithClient = Request & { client_name: string; formatted_date: string };

	// Status filter state
	let selectedStatus = $state<RequestStatus | 'all'>('all');

	// Add client names and formatted dates to requests
	const allRequestsWithDetails: RequestWithClient[] = data.requests.map((req) => ({
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

	// Count requests by status
	const statusCounts = $derived({
		all: allRequestsWithDetails.length,
		draft: allRequestsWithDetails.filter((r) => r.status === 'draft').length,
		submitted: allRequestsWithDetails.filter((r) => r.status === 'submitted').length,
		in_progress: allRequestsWithDetails.filter((r) => r.status === 'in_progress').length,
		completed: allRequestsWithDetails.filter((r) => r.status === 'completed').length,
		cancelled: allRequestsWithDetails.filter((r) => r.status === 'cancelled').length
	});

	const columns = [
		{
			key: 'request_number' as keyof RequestWithClient,
			label: 'Request #',
			sortable: true
		},
		{
			key: 'client_name' as keyof RequestWithClient,
			label: 'Client',
			sortable: true
		},
		{
			key: 'type' as keyof RequestWithClient,
			label: 'Type',
			sortable: true,
			render: (value: string) => {
				return value === 'insurance' ? 'Insurance' : 'Private';
			}
		},
		{
			key: 'status' as keyof RequestWithClient,
			label: 'Status',
			sortable: true,
			render: (value: string | null | undefined, row: RequestWithClient) => {
				const statusValue = String(value || 'draft');
				const statusClasses: Record<string, string> = {
					draft: 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800',
					submitted: 'inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800',
					in_progress: 'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800',
					completed: 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800',
					cancelled: 'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
				};
				const className = statusClasses[statusValue] || statusClasses.draft;
				const displayValue = statusValue.replace('_', ' ');
				return `<span class="${className}">${displayValue}</span>`;
			}
		},
		{
			key: 'vehicle_make' as keyof RequestWithClient,
			label: 'Vehicle',
			sortable: true,
			render: (value: string | null, row: RequestWithClient) => {
				if (!value) return '-';
				return `${value} ${row.vehicle_model || ''}`.trim();
			}
		},
		{
			key: 'current_step' as keyof RequestWithClient,
			label: 'Step',
			sortable: true,
			render: (value: string) => {
				const steps: Record<string, string> = {
					request: 'Request',
					assessment: 'Assessment',
					quote: 'Quote',
					approval: 'Approval'
				};
				return steps[value] || value;
			}
		},
		{
			key: 'formatted_date' as keyof RequestWithClient,
			label: 'Created',
			sortable: true
		}
	];

	function handleRowClick(request: RequestWithClient) {
		goto(`/requests/${request.id}`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="Requests" description="Manage vehicle damage assessment requests">
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
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'in_progress'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'in_progress')}
		>
			Accepted
			<Badge variant="secondary" class="ml-2">{statusCounts.in_progress}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'completed'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'completed')}
		>
			Completed
			<Badge variant="secondary" class="ml-2">{statusCounts.completed}</Badge>
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
		<div class="rounded-lg border bg-white">
			<DataTable
				data={requestsWithDetails}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No requests found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{requestsWithDetails.length}</span>
				{requestsWithDetails.length === 1 ? 'request' : 'requests'}
			</p>
		</div>
	{/if}
</div>

