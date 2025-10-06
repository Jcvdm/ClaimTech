<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import StatusBadge from '$lib/components/data/StatusBadge.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { ClipboardCheck, FileText, ExternalLink } from 'lucide-svelte';
	import type { Inspection, InspectionStatus } from '$lib/types/inspection';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedInspection = $state<Inspection | null>(null);
	let showSummary = $state(false);

	// Status filter state
	let selectedStatus = $state<InspectionStatus | 'all'>('all');

	// Prepare data for table (no ID column)
	const allInspectionsWithDetails = data.inspections.map((inspection) => ({
		...inspection,
		client_name: data.clientMap[inspection.client_id]?.name || 'Unknown Client',
		vehicle_display:
			`${inspection.vehicle_make || ''} ${inspection.vehicle_model || ''}`.trim() || '-',
		formatted_date: new Date(inspection.created_at).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}));

	// Filter inspections based on selected status
	const inspectionsWithDetails = $derived(
		selectedStatus === 'all'
			? allInspectionsWithDetails
			: allInspectionsWithDetails.filter((insp) => insp.status === selectedStatus)
	);

	// Count inspections by status
	const statusCounts = $derived({
		all: allInspectionsWithDetails.length,
		pending: allInspectionsWithDetails.filter((i) => i.status === 'pending').length,
		scheduled: allInspectionsWithDetails.filter((i) => i.status === 'scheduled').length,
		in_progress: allInspectionsWithDetails.filter((i) => i.status === 'in_progress').length,
		completed: allInspectionsWithDetails.filter((i) => i.status === 'completed').length,
		cancelled: allInspectionsWithDetails.filter((i) => i.status === 'cancelled').length
	});

	const columns = [
		{
			key: 'inspection_number',
			label: 'Inspection #',
			sortable: true
		},
		{
			key: 'request_number',
			label: 'Request #',
			sortable: true
		},
		{
			key: 'client_name',
			label: 'Client',
			sortable: true
		},
		{
			key: 'vehicle_display',
			label: 'Vehicle',
			sortable: false
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			render: (value: string) => {
				const statusClasses: Record<string, string> = {
					pending:
						'inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800',
					scheduled:
						'inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800',
					in_progress:
						'inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800',
					completed:
						'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800',
					cancelled:
						'inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
				};
				const className = statusClasses[value] || statusClasses.pending;
				return `<span class="${className}">${value}</span>`;
			}
		},
		{
			key: 'formatted_date',
			label: 'Created',
			sortable: true
		}
	];

	function handleRowClick(inspection: (typeof inspectionsWithDetails)[0]) {
		selectedInspection = data.inspections.find((i) => i.id === inspection.id) || null;
		showSummary = true;
	}

	function handleOpenReport() {
		if (selectedInspection) {
			goto(`/work/inspections/${selectedInspection.id}`);
		}
	}

	function closeSummary() {
		showSummary = false;
		selectedInspection = null;
	}

	const selectedClient = $derived(
		selectedInspection ? data.clientMap[selectedInspection.client_id] : null
	);
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="Inspections" description="Manage vehicle damage inspections" />

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
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'pending'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'pending')}
		>
			Pending
			<Badge variant="secondary" class="ml-2">{statusCounts.pending}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'scheduled'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'scheduled')}
		>
			Scheduled
			<Badge variant="secondary" class="ml-2">{statusCounts.scheduled}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'in_progress'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'in_progress')}
		>
			In Progress
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
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'cancelled'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'cancelled')}
		>
			Cancelled
			<Badge variant="secondary" class="ml-2">{statusCounts.cancelled}</Badge>
		</button>
	</div>

	{#if inspectionsWithDetails.length === 0}
		<EmptyState
			icon={ClipboardCheck}
			title="No inspections yet"
			description="Inspections will appear here when requests are accepted"
			actionLabel="View Requests"
			onAction={() => goto('/requests')}
		/>
	{:else}
		<div class="rounded-lg border bg-white">
			<DataTable
				data={inspectionsWithDetails}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No inspections found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{inspectionsWithDetails.length}</span>
				{inspectionsWithDetails.length === 1 ? 'inspection' : 'inspections'}
			</p>
		</div>
	{/if}
</div>

<!-- Summary Modal -->
<Dialog.Root open={showSummary} onOpenChange={(open) => !open && closeSummary()}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Inspection Summary</Dialog.Title>
		</Dialog.Header>

		{#if selectedInspection}
			<div class="space-y-4">
				<!-- Claim Information -->
				<Card class="p-4">
					<h3 class="mb-3 text-sm font-semibold text-gray-900">Claim Information</h3>
					<dl class="grid gap-3 text-sm">
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Inspection #:</dt>
							<dd class="col-span-2 text-gray-900">{selectedInspection.inspection_number}</dd>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Request #:</dt>
							<dd class="col-span-2 text-gray-900">{selectedInspection.request_number}</dd>
						</div>
						{#if selectedInspection.claim_number}
							<div class="grid grid-cols-3 gap-2">
								<dt class="font-medium text-gray-500">Claim #:</dt>
								<dd class="col-span-2 text-gray-900">{selectedInspection.claim_number}</dd>
							</div>
						{/if}
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Type:</dt>
							<dd class="col-span-2">
								<Badge variant={selectedInspection.type === 'insurance' ? 'default' : 'secondary'}>
									{selectedInspection.type === 'insurance' ? 'Insurance' : 'Private'}
								</Badge>
							</dd>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Status:</dt>
							<dd class="col-span-2">
								<StatusBadge status={selectedInspection.status} />
							</dd>
						</div>
					</dl>
				</Card>

				<!-- Client Contact Details -->
				<Card class="p-4">
					<h3 class="mb-3 text-sm font-semibold text-gray-900">Client Contact Details</h3>
					{#if selectedClient}
						<dl class="grid gap-3 text-sm">
							<div class="grid grid-cols-3 gap-2">
								<dt class="font-medium text-gray-500">Name:</dt>
								<dd class="col-span-2 text-gray-900">{selectedClient.name}</dd>
							</div>
							{#if selectedClient.contact_name}
								<div class="grid grid-cols-3 gap-2">
									<dt class="font-medium text-gray-500">Contact:</dt>
									<dd class="col-span-2 text-gray-900">{selectedClient.contact_name}</dd>
								</div>
							{/if}
							{#if selectedClient.email}
								<div class="grid grid-cols-3 gap-2">
									<dt class="font-medium text-gray-500">Email:</dt>
									<dd class="col-span-2">
										<a href="mailto:{selectedClient.email}" class="text-blue-600 hover:underline">
											{selectedClient.email}
										</a>
									</dd>
								</div>
							{/if}
							{#if selectedClient.phone}
								<div class="grid grid-cols-3 gap-2">
									<dt class="font-medium text-gray-500">Phone:</dt>
									<dd class="col-span-2">
										<a href="tel:{selectedClient.phone}" class="text-blue-600 hover:underline">
											{selectedClient.phone}
										</a>
									</dd>
								</div>
							{/if}
						</dl>
					{:else}
						<p class="text-sm text-gray-500">Client information not available</p>
					{/if}
				</Card>

				<!-- Vehicle Information -->
				<Card class="p-4">
					<h3 class="mb-3 text-sm font-semibold text-gray-900">Vehicle Information</h3>
					<dl class="grid gap-3 text-sm">
						<div class="grid grid-cols-3 gap-2">
							<dt class="font-medium text-gray-500">Vehicle:</dt>
							<dd class="col-span-2 text-gray-900">
								{selectedInspection.vehicle_make || '-'}
								{selectedInspection.vehicle_model || ''}
								{#if selectedInspection.vehicle_year}
									({selectedInspection.vehicle_year})
								{/if}
							</dd>
						</div>
						{#if selectedInspection.vehicle_registration}
							<div class="grid grid-cols-3 gap-2">
								<dt class="font-medium text-gray-500">Registration:</dt>
								<dd class="col-span-2 text-gray-900">{selectedInspection.vehicle_registration}</dd>
							</div>
						{/if}
						{#if selectedInspection.vehicle_vin}
							<div class="grid grid-cols-3 gap-2">
								<dt class="font-medium text-gray-500">VIN:</dt>
								<dd class="col-span-2 font-mono text-xs text-gray-900">
									{selectedInspection.vehicle_vin}
								</dd>
							</div>
						{/if}
					</dl>
				</Card>

				<!-- Action Buttons -->
				<Dialog.Footer>
					<Button variant="outline" onclick={closeSummary}>Close</Button>
					<Button onclick={handleOpenReport}>
						<ExternalLink class="mr-2 h-4 w-4" />
						Open Report
					</Button>
				</Dialog.Footer>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

