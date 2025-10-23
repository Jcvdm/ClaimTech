<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import SummaryComponent from '$lib/components/shared/SummaryComponent.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		ClipboardCheck,
		ExternalLink,
		Hash,
		FileText,
		User,
		Car,
		Calendar,
		Activity
	} from 'lucide-svelte';
	import type { Inspection } from '$lib/types/inspection';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedInspection = $state<Inspection | null>(null);
	let showSummary = $state(false);

	// Create request map for easy lookup
	const requestMap = data.requests.reduce(
		(acc, request) => {
			if (request) {
				acc[request.id] = request;
			}
			return acc;
		},
		{} as Record<string, any>
	);

	// Prepare data for table (no ID column)
	const allInspectionsWithDetails = data.inspections.map((inspection) => ({
		...inspection,
		client_name: data.clientMap[inspection.client_id]?.name || 'Unknown Client',
		vehicle_display:
			`${inspection.vehicle_make || ''} ${inspection.vehicle_model || ''}`.trim() || '-',
		request_date: requestMap[inspection.request_id]?.created_at
			? new Date(requestMap[inspection.request_id].created_at).toLocaleDateString('en-ZA', {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})
			: '-',
		formatted_date: new Date(inspection.created_at).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}));

	// Show all inspections (no filtering)
	const inspectionsWithDetails = $derived(allInspectionsWithDetails);

	const columns = [
		{
			key: 'inspection_number',
			label: 'Inspection #',
			sortable: true,
			icon: Hash
		},
		{
			key: 'request_number',
			label: 'Request #',
			sortable: true,
			icon: FileText
		},
		{
			key: 'client_name',
			label: 'Client',
			sortable: true,
			icon: User
		},
		{
			key: 'vehicle_display',
			label: 'Vehicle',
			sortable: false,
			icon: Car
		},
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			icon: User
		},
		{
			key: 'request_date',
			label: 'Request Date',
			sortable: true,
			icon: Calendar
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			icon: Activity
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



	{#if inspectionsWithDetails.length === 0}
		<EmptyState
			icon={ClipboardCheck}
			title="No inspections yet"
			description="Inspections will appear here when requests are accepted"
			actionLabel="View Requests"
			onAction={() => goto('/requests')}
		/>
	{:else}
		<ModernDataTable
			data={inspectionsWithDetails}
			{columns}
			onRowClick={handleRowClick}
			striped
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'inspection_number'}
					<TableCell variant="primary" bold>
						{row.inspection_number}
					</TableCell>
				{:else if column.key === 'type'}
					{@const isInsurance = row.type === 'insurance'}
					<GradientBadge
						variant={isInsurance ? 'blue' : 'purple'}
						label={isInsurance ? 'Insurance' : 'Private'}
					/>
				{:else if column.key === 'status'}
					{@const variant =
						row.status === 'pending'
							? 'yellow'
							: row.status === 'scheduled'
								? 'blue'
								: row.status === 'in_progress'
									? 'purple'
									: row.status === 'completed'
										? 'green'
										: 'red'}
					<GradientBadge {variant} label={row.status} />
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

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
			<SummaryComponent
				inspection={selectedInspection}
				request={data.requests?.find((r) => r.id === selectedInspection?.request_id) || null}
				client={selectedClient}
				showAssessmentData={false}
			/>

			<!-- Action Buttons -->
			<Dialog.Footer>
				<Button variant="outline" onclick={closeSummary}>Close</Button>
				<Button onclick={handleOpenReport}>
					<ExternalLink class="mr-2 h-4 w-4" />
					Open Report
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

