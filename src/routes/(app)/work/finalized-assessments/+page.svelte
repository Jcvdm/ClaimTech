<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		FileCheck,
		RefreshCw,
		ClipboardCheck,
		FileText,
		User,
		Car,
		Hash,
		Calendar
	} from 'lucide-svelte';
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
	// This ensures data is fresh when user navigates back after making changes
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
	// Use vehicle data from assessment_vehicle_identification (updated during assessment)
	// Falls back to request data if assessment data is not available
	const tableData = $derived(
		data.assessments.map((assessment: any) => {
			const request = assessment.appointment?.inspection?.request;
			const client = request?.client;
			const vehicleId = assessment.vehicle_identification;

			// Prefer assessment vehicle data over request data
			const vehicleMake = vehicleId?.vehicle_make || request?.vehicle_make || '';
			const vehicleModel = vehicleId?.vehicle_model || request?.vehicle_model || '';
			const vehicleYear = vehicleId?.vehicle_year || request?.vehicle_year || '';
			const registration = vehicleId?.registration_number || request?.vehicle_registration || 'N/A';

			return {
				id: assessment.id,
				appointmentId: assessment.appointment_id,
				assessmentNumber: assessment.assessment_number,
				requestNumber: request?.request_number || 'N/A',
				clientName: client?.name || 'N/A',
				clientType: client?.type || 'N/A',
				vehicle: `${vehicleYear} ${vehicleMake} ${vehicleModel}`.trim() || 'N/A',
				registration: registration,
				finalizedAt: assessment.estimate_finalized_at,
				submittedAt: assessment.submitted_at
			};
		})
	);

	const columns = [
		{
			key: 'assessmentNumber' as const,
			label: 'Assessment #',
			sortable: true,
			icon: ClipboardCheck
		},
		{
			key: 'requestNumber' as const,
			label: 'Request #',
			sortable: true,
			icon: FileText
		},
		{
			key: 'clientName' as const,
			label: 'Client',
			sortable: true,
			icon: User
		},
		{
			key: 'vehicle' as const,
			label: 'Vehicle',
			sortable: true,
			icon: Car
		},
		{
			key: 'registration' as const,
			label: 'Registration',
			sortable: true,
			icon: Hash
		},
		{
			key: 'finalizedAt' as const,
			label: 'Finalized',
			sortable: true,
			icon: Calendar
		}
	];
</script>

<div class="flex-1 space-y-6 p-8">
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
		<ModernDataTable
			data={tableData}
			{columns}
			onRowClick={(row) => handleViewAssessment(row.appointmentId)}
			striped={true}
			animated={true}
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'assessmentNumber'}
					<TableCell variant="primary" icon={ClipboardCheck} iconColor="text-blue-600">
						{row.assessmentNumber}
					</TableCell>
				{:else if column.key === 'requestNumber'}
					<TableCell variant="default" bold={true}>
						{row.requestNumber}
					</TableCell>
				{:else if column.key === 'clientName'}
					<TableCell variant="default">
						<div class="flex flex-col">
							<span class="font-medium text-gray-900">{row.clientName}</span>
							<GradientBadge
								variant={row.clientType === 'insurance' ? 'blue' : 'purple'}
								label={row.clientType === 'insurance' ? 'Insurance' : 'Private'}
								class="mt-1"
							/>
						</div>
					</TableCell>
				{:else if column.key === 'vehicle'}
					<TableCell variant="default">
						<div class="flex flex-col">
							<span class="font-medium text-gray-900">{row.vehicle}</span>
							<span class="text-xs text-gray-500">{row.registration}</span>
						</div>
					</TableCell>
				{:else if column.key === 'registration'}
					<!-- Skip - shown with vehicle -->
				{:else if column.key === 'finalizedAt'}
					<TableCell variant="muted">
						<div class="flex items-center gap-2">
							<Calendar class="h-4 w-4 text-gray-400" />
							<span class="text-sm">{formatDateTime(row.finalizedAt)}</span>
						</div>
					</TableCell>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-semibold text-gray-900">{tableData.length}</span>
				{tableData.length === 1 ? 'assessment' : 'assessments'}
			</p>
		</div>
	{/if}
</div>

