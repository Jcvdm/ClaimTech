<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import ActionButtonGroup from '$lib/components/data/ActionButtonGroup.svelte';
	import ActionIconButton from '$lib/components/data/ActionIconButton.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDateTime, formatVehicle } from '$lib/utils/formatters';
	import {
		ClipboardList,
		RefreshCw,
		Hash,
		FileText,
		Car,
		CreditCard,
		User,
		TrendingUp,
		Clock,
		Play
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
	let refreshing = $state(false);
	const { loadingId, startNavigation, isLoading } = useNavigationLoading();

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
	// Use vehicle data from assessment_vehicle_identification (updated during assessment)
	// Falls back to request data if assessment data is not available
	const assessmentsWithDetails = data.assessments.map((assessment: any) => {
		const request = assessment.requests;
		const appointment = assessment.appointments;
		const engineer = appointment?.engineers;
		const vehicleId = assessment.vehicle_identification;

		// Prefer assessment vehicle data over request data
		const vehicleMake = vehicleId?.vehicle_make || request?.vehicle_make;
		const vehicleModel = vehicleId?.vehicle_model || request?.vehicle_model;
		const vehicleYear = vehicleId?.vehicle_year || request?.vehicle_year;
		const registration = vehicleId?.registration_number || request?.vehicle_registration || '-';

		// Calculate progress percentage
		const totalTabs = 5; // identification, 360, interior, tyres, damage
		const completedTabs = assessment.tabs_completed?.length || 0;
		const progressPercentage = Math.round((completedTabs / totalTabs) * 100);

		return {
			...assessment,
			request_number: request?.request_number || '-',
			vehicle_display: formatVehicle(vehicleYear, vehicleMake, vehicleModel),
			vehicle_registration: registration,
			engineer_name: engineer?.name || 'Unassigned',
			progress_percentage: progressPercentage,
			progress_display: `${completedTabs}/${totalTabs} tabs`,
			formatted_updated: formatDateTime(assessment.updated_at)
		};
	});

	// Define columns for ModernDataTable
	const columns = [
		{
			key: 'assessment_number',
			label: 'Assessment #',
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
			key: 'vehicle_display',
			label: 'Vehicle',
			sortable: true,
			icon: Car
		},
		{
			key: 'vehicle_registration',
			label: 'Registration',
			sortable: true,
			icon: CreditCard
		},
		{
			key: 'engineer_name',
			label: 'Engineer',
			sortable: true,
			icon: User
		},
		{
			key: 'progress_display',
			label: 'Progress',
			sortable: false,
			icon: TrendingUp
		},
		{
			key: 'formatted_updated',
			label: 'Last Updated',
			sortable: true,
			icon: Clock
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false
		}
	];

	function handleRowClick(assessment: (typeof assessmentsWithDetails)[0]) {
		// Navigate directly to assessment detail page with loading state
		startNavigation(assessment.appointment_id, `/work/assessments/${assessment.appointment_id}`);
	}

	function handleContinueAssessment(assessment: (typeof assessmentsWithDetails)[0]) {
		// Navigate to assessment page using appointment_id with loading state
		startNavigation(assessment.appointment_id, `/work/assessments/${assessment.appointment_id}`);
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
		<ModernDataTable
			data={assessmentsWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="appointment_id"
			striped
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'progress_display'}
					{@const percentage = row.progress_percentage}
					{@const variant =
						percentage === 100
							? 'green'
							: percentage >= 60
								? 'blue'
								: percentage >= 30
									? 'yellow'
									: 'gray'}
					<GradientBadge {variant}>
						{row.progress_display} ({percentage}%)
					</GradientBadge>
				{:else if column.key === 'engineer_name'}
					<TableCell variant={row.engineer_name === 'Unassigned' ? 'muted' : 'default'}>
						{row.engineer_name}
					</TableCell>
				{:else if column.key === 'assessment_number'}
					<TableCell variant="primary" bold>
						{row.assessment_number}
					</TableCell>
				{:else if column.key === 'actions'}
					<ActionButtonGroup align="right">
						<ActionIconButton
							icon={Play}
							label="Continue Assessment"
							onclick={() => handleContinueAssessment(row)}
							variant="primary"
						/>
					</ActionButtonGroup>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{assessmentsWithDetails.length}</span>
				{assessmentsWithDetails.length === 1 ? 'assessment' : 'assessments'} in progress
			</p>
		</div>
	{/if}
</div>
