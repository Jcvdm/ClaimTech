<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import StatusBadge from '$lib/components/data/StatusBadge.svelte';
	import { Button } from '$lib/components/ui/button';
	import { FileCheck, RefreshCw } from 'lucide-svelte';
	import { formatDate, formatDateTime } from '$lib/utils/formatters';

	let { data }: { data: PageData } = $props();
	let refreshing = $state(false);

	// Manual refresh function
	async function handleRefresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			// Keep spinner visible for at least 500ms for better UX
			setTimeout(() => {
				refreshing = false;
			}, 500);
		}
	}

	// Refresh when page becomes visible (user returns to tab)
	onMount(() => {
		if (!browser) return;

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				invalidateAll();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	// Navigate to assessment detail
	function handleViewAssessment(appointmentId: string) {
		goto(`/work/assessments/${appointmentId}`);
	}

	// Prepare table data
	const tableData = $derived(
		data.assessments.map((assessment: any) => {
			const request = assessment.appointment?.inspection?.request;
			const client = request?.client;

			return {
				id: assessment.id,
				appointmentId: assessment.appointment_id,
				assessmentNumber: assessment.assessment_number,
				requestNumber: request?.request_number || 'N/A',
				clientName: client?.name || 'N/A',
				clientType: client?.type || 'N/A',
				vehicle: request
					? `${request.vehicle_year || ''} ${request.vehicle_make || ''} ${request.vehicle_model || ''}`.trim() ||
						'N/A'
					: 'N/A',
				registration: request?.vehicle_registration || 'N/A',
				finalizedAt: assessment.estimate_finalized_at,
				submittedAt: assessment.submitted_at
			};
		})
	);

	const columns = [
		{
			key: 'assessmentNumber',
			label: 'Assessment #',
			sortable: true
		},
		{
			key: 'requestNumber',
			label: 'Request #',
			sortable: true
		},
		{
			key: 'clientName',
			label: 'Client',
			sortable: true
		},
		{
			key: 'vehicle',
			label: 'Vehicle',
			sortable: true
		},
		{
			key: 'registration',
			label: 'Registration',
			sortable: true
		},
		{
			key: 'finalizedAt',
			label: 'Finalized',
			sortable: true
		}
	];
</script>

<div class="space-y-6">
	<PageHeader
		title="Finalized Assessments"
		description="View all finalized assessments with estimates sent to clients"
	>
		{#snippet actions()}
			<Button onclick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
				<RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
				{refreshing ? 'Refreshing...' : 'Refresh'}
			</Button>
		{/snippet}
	</PageHeader>

	{#if tableData.length === 0}
		<EmptyState
			title="No Finalized Assessments"
			description="Finalized assessments will appear here once estimates are marked as sent."
			icon={FileCheck}
		/>
	{:else}
		<DataTable
			data={tableData}
			{columns}
			onRowClick={(row) => handleViewAssessment(row.appointmentId)}
			searchPlaceholder="Search by assessment, request, client, or vehicle..."
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'assessmentNumber'}
					<span class="font-medium text-blue-600">{row.assessmentNumber}</span>
				{:else if column.key === 'clientType'}
					<StatusBadge
						status={row.clientType === 'insurance' ? 'in_progress' : 'new'}
						label={row.clientType === 'insurance' ? 'Insurance' : 'Private'}
					/>
				{:else if column.key === 'finalizedAt'}
					<span class="text-sm text-gray-600">{formatDateTime(row.finalizedAt)}</span>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</DataTable>
	{/if}
</div>

