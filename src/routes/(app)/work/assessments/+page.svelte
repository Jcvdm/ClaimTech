<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ClipboardList, RefreshCw } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
	let refreshing = $state(false);

	// Manual refresh function
	async function handleRefresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			setTimeout(() => {
				refreshing = false;
			}, 500);
		}
	}

	// Refresh when page becomes visible
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

	// Prepare data for table
	const assessmentsWithDetails = data.assessments.map((assessment: any) => {
		const request = assessment.requests;
		const appointment = assessment.appointments;
		const engineer = appointment?.engineers;

		// Calculate progress percentage
		const totalTabs = 5; // identification, 360, interior, tyres, damage
		const completedTabs = assessment.tabs_completed?.length || 0;
		const progressPercentage = Math.round((completedTabs / totalTabs) * 100);

		return {
			...assessment,
			request_number: request?.request_number || '-',
			vehicle_display:
				`${request?.vehicle_make || ''} ${request?.vehicle_model || ''} ${request?.vehicle_year || ''}`.trim() ||
				'-',
			vehicle_registration: request?.vehicle_registration || '-',
			engineer_name: engineer?.name || 'Unassigned',
			progress_percentage: progressPercentage,
			progress_display: `${completedTabs}/${totalTabs} tabs`,
			formatted_updated: new Date(assessment.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			})
		};
	});

	// Define columns for DataTable
	const columns = [
		{
			key: 'assessment_number',
			label: 'Assessment #',
			sortable: true
		},
		{
			key: 'request_number',
			label: 'Request #',
			sortable: true
		},
		{
			key: 'vehicle_display',
			label: 'Vehicle',
			sortable: true
		},
		{
			key: 'vehicle_registration',
			label: 'Registration',
			sortable: true
		},
		{
			key: 'engineer_name',
			label: 'Engineer',
			sortable: true
		},
		{
			key: 'progress_display',
			label: 'Progress',
			sortable: false,
			render: (value: string, row: any) => {
				const percentage = row.progress_percentage;
				const colorClass =
					percentage === 100
						? 'bg-green-100 text-green-800'
						: percentage >= 60
							? 'bg-blue-100 text-blue-800'
							: percentage >= 30
								? 'bg-yellow-100 text-yellow-800'
								: 'bg-gray-100 text-gray-800';
				return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}">${value} (${percentage}%)</span>`;
			}
		},
		{
			key: 'formatted_updated',
			label: 'Last Updated',
			sortable: true
		}
	];

	function handleRowClick(assessment: (typeof assessmentsWithDetails)[0]) {
		// Navigate to assessment page using appointment_id
		goto(`/work/assessments/${assessment.appointment_id}`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Open Assessments"
		description="Active vehicle assessments currently in progress"
	>
		{#snippet actions()}
			<Button onclick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
				<RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
				{refreshing ? 'Refreshing...' : 'Refresh'}
			</Button>
		{/snippet}
	</PageHeader>

	{#if assessmentsWithDetails.length === 0}
		<EmptyState
			icon={ClipboardList}
			title="No open assessments"
			description="Assessments will appear here when started from appointments"
			actionLabel="View Appointments"
			onAction={() => goto('/work/appointments')}
		/>
	{:else}
		<div class="rounded-lg border bg-white">
			<DataTable
				data={assessmentsWithDetails}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No assessments found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{assessmentsWithDetails.length}</span>
				{assessmentsWithDetails.length === 1 ? 'assessment' : 'assessments'} in progress
			</p>
		</div>
	{/if}
</div>

