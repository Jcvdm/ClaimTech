<script lang="ts">
	import { goto } from '$app/navigation';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import ActionButtonGroup from '$lib/components/data/ActionButtonGroup.svelte';
	import ActionIconButton from '$lib/components/data/ActionIconButton.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { formatDate, formatVehicle } from '$lib/utils/formatters';
	import {
		ClipboardCheck,
		Hash,
		FileText,
		User,
		Car,
		Calendar,
		Activity
	} from 'lucide-svelte';
	import type { Assessment } from '$lib/types/assessment';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	// Derive display data from assessments with nested request/client
	const assessmentsWithDetails = $derived(
		data.assessments.map((assessment) => ({
			id: assessment.id,
			assessment_number: assessment.assessment_number,
			request_number: assessment.request?.request_number || '-',
			client_name: assessment.request?.client?.name || 'Unknown Client',
			vehicle_display: formatVehicle(
				assessment.request?.vehicle_year,
				assessment.request?.vehicle_make,
				assessment.request?.vehicle_model
			),
			type: assessment.request?.type || 'insurance',
			request_date: assessment.request?.created_at
				? formatDate(assessment.request.created_at)
				: '-',
			stage: assessment.stage,
			created_at: assessment.created_at
		}))
	);

	const columns = [
		{
			key: 'assessment_number' as const,
			label: 'Assessment #',
			sortable: true,
			icon: Hash
		},
		{
			key: 'request_number' as const,
			label: 'Request #',
			sortable: true,
			icon: FileText
		},
		{
			key: 'client_name' as const,
			label: 'Client',
			sortable: true,
			icon: User
		},
		{
			key: 'vehicle_display' as const,
			label: 'Vehicle',
			sortable: false,
			icon: Car
		},
		{
			key: 'type' as const,
			label: 'Type',
			sortable: true,
			icon: User
		},
		{
			key: 'request_date' as const,
			label: 'Request Date',
			sortable: true,
			icon: Calendar
		},
		{
			key: 'stage' as const,
			label: 'Stage',
			sortable: true,
			icon: Activity
		}
	];

	function handleRowClick(row: (typeof assessmentsWithDetails)[0]) {
		// Navigate directly to inspection detail page with loading state
		startNavigation(row.id, `/work/inspections/${row.id}`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="Inspections" description="Manage vehicle damage inspections" />

	{#if data.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{data.error}</p>
		</div>
	{/if}

	{#if assessmentsWithDetails.length === 0}
		<EmptyState
			icon={ClipboardCheck}
			title="No inspections scheduled"
			description="Assessments at the inspection stage will appear here"
			actionLabel="View Requests"
			onAction={() => goto('/requests')}
		/>
	{:else}
		<ModernDataTable
			data={assessmentsWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'assessment_number'}
					<TableCell variant="primary" bold>
						{row.assessment_number}
					</TableCell>
				{:else if column.key === 'type'}
					{@const isInsurance = row.type === 'insurance'}
					<GradientBadge
						variant={isInsurance ? 'blue' : 'purple'}
						label={isInsurance ? 'Insurance' : 'Private'}
					/>
				{:else if column.key === 'stage'}
					<GradientBadge variant="yellow" label="Inspection Scheduled" />
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{assessmentsWithDetails.length}</span>
				{assessmentsWithDetails.length === 1 ? 'assessment' : 'assessments'}
			</p>
		</div>
	{/if}
</div>
