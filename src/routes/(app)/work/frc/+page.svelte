<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import ActionButtonGroup from '$lib/components/data/ActionButtonGroup.svelte';
	import ActionIconButton from '$lib/components/data/ActionIconButton.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import SummaryComponent from '$lib/components/shared/SummaryComponent.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { formatDate } from '$lib/utils/formatters';
	import {
		FileCheck,
		ClipboardList,
		Hash,
		FileText,
		User,
		Car,
		CreditCard,
		Activity,
		Calendar,
		CheckCircle2,
		Edit,
		Eye,
		ExternalLink
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Status filter state - default to 'in_progress' for better UX
	type FRCStatus = 'not_started' | 'in_progress' | 'completed';
	let selectedStatus = $state<FRCStatus | 'all'>('in_progress');
	let selectedAssessment = $state<any | null>(null);
	let showSummary = $state(false);

	// Prepare data for table - filter out malformed records
	const allFRCWithDetails = data.frcRecords
		.filter((frc: any) => {
			// Skip FRC records with missing assessment data
			if (!frc.assessment || !frc.assessment.appointment) {
				console.warn('Skipping FRC with missing assessment data:', frc.id);
				return false;
			}
			return true;
		})
		.map((frc: any) => {
			const assessment = frc.assessment;
			const request = assessment?.appointment?.inspection?.request;
			const client = request?.client;

			return {
				id: frc.id,
				assessmentId: assessment?.id,
				appointmentId: assessment?.appointment?.id,
				assessmentNumber: assessment?.assessment_number || 'N/A',
				requestNumber: request?.request_number || 'N/A',
				clientName: client?.name || 'Unknown Client',
				clientType: client?.type || 'N/A',
				vehicle: request
					? `${request.vehicle_year || ''} ${request.vehicle_make || ''} ${request.vehicle_model || ''}`.trim() ||
						'N/A'
					: 'N/A',
				registration: request?.vehicle_registration || 'N/A',
				status: frc.status || 'not_started',
				startedAt: frc.started_at,
				completedAt: frc.completed_at,
				lineItemCount: frc.line_items?.length || 0,
				formattedStarted: frc.started_at ? formatDate(frc.started_at) : 'N/A',
				formattedCompleted: frc.completed_at ? formatDate(frc.completed_at) : '-'
			};
		});

	// Filter FRC records by status
	const frcWithDetails = $derived(
		selectedStatus === 'all'
			? allFRCWithDetails
			: allFRCWithDetails.filter((frc) => frc.status === selectedStatus)
	);

	// Count FRC records by status
	const statusCounts = $derived({
		all: allFRCWithDetails.length,
		not_started: allFRCWithDetails.filter((f) => f.status === 'not_started').length,
		in_progress: allFRCWithDetails.filter((f) => f.status === 'in_progress').length,
		completed: allFRCWithDetails.filter((f) => f.status === 'completed').length
	});

	// Status badge configuration
	const statusBadgeConfig: Record<
		FRCStatus,
		{ label: string; class: string }
	> = {
		not_started: {
			label: 'Not Started',
			class: 'bg-gray-100 text-gray-800'
		},
		in_progress: {
			label: 'In Progress',
			class: 'bg-blue-100 text-blue-800'
		},
		completed: {
			label: 'Completed',
			class: 'bg-green-100 text-green-800'
		}
	};

	// Table columns
	const columns = [
		{
			key: 'assessmentNumber',
			label: 'Assessment #',
			sortable: true,
			icon: Hash
		},
		{
			key: 'requestNumber',
			label: 'Request #',
			sortable: true,
			icon: FileText
		},
		{
			key: 'clientName',
			label: 'Client',
			sortable: true,
			icon: User
		},
		{
			key: 'vehicle',
			label: 'Vehicle',
			sortable: true,
			icon: Car
		},
		{
			key: 'registration',
			label: 'Registration',
			sortable: true,
			icon: CreditCard
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			icon: Activity
		},
		{
			key: 'lineItemCount',
			label: 'Line Items',
			sortable: true,
			icon: ClipboardList
		},
		{
			key: 'formattedStarted',
			label: 'Started',
			sortable: true,
			icon: Calendar
		},
		{
			key: 'formattedCompleted',
			label: 'Completed',
			sortable: true,
			icon: CheckCircle2
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false
		}
	];

	function handleRowClick(frc: (typeof frcWithDetails)[0]) {
		// Find the full assessment data for the summary modal
		const frcRecord = data.frcRecords.find((f: any) => f.id === frc.id);
		if (frcRecord?.assessment) {
			selectedAssessment = frcRecord.assessment;
			showSummary = true;
		}
	}

	function handleViewReport(frc: (typeof frcWithDetails)[0]) {
		// Defensive check: Ensure appointment_id exists before navigation
		if (!frc.appointmentId) {
			console.error('Cannot navigate to assessment: FRC record missing appointment_id', frc);
			// TODO: Show toast notification to user
			return;
		}
		// Navigate to assessment page with FRC tab
		goto(`/work/assessments/${frc.appointmentId}?tab=frc`);
	}

	function handleEditFRC(frc: (typeof frcWithDetails)[0]) {
		// Defensive check: Ensure appointment_id exists before navigation
		if (!frc.appointmentId) {
			console.error('Cannot navigate to assessment: FRC record missing appointment_id', frc);
			// TODO: Show toast notification to user
			return;
		}
		// Navigate to FRC edit page (if exists) or assessment FRC tab
		goto(`/work/assessments/${frc.appointmentId}?tab=frc&edit=true`);
	}

	function handleOpenReport() {
		// Defensive check: Ensure assessment and appointment_id exist
		if (!selectedAssessment) {
			console.error('Cannot navigate: No assessment selected');
			return;
		}

		// Use nested appointment.id since selectedAssessment comes from the nested query structure
		// Fallback to appointment_id for backward compatibility
		const appointmentId = selectedAssessment.appointment?.id ?? selectedAssessment.appointment_id;

		if (!appointmentId) {
			console.error('[snapshot] Cannot navigate to assessment: Missing appointment_id', $state.snapshot(selectedAssessment));
			// TODO: Show toast notification to user
			return;
		}

		goto(`/work/assessments/${appointmentId}?tab=frc`);
	}

	function closeSummary() {
		showSummary = false;
		selectedAssessment = null;
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Final Repair Costing (FRC)"
		description="Review and manage final repair costing for completed assessments"
	/>

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
			class="px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'not_started'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedStatus = 'not_started')}
		>
			Not Started
			<Badge variant="secondary" class="ml-2">{statusCounts.not_started}</Badge>
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
	</div>

	{#if frcWithDetails.length === 0}
		<EmptyState
			icon={FileCheck}
			title="No FRC records yet"
			description="FRC records will appear here when started from finalized assessments"
			actionLabel="View Finalized Assessments"
			onAction={() => goto('/work/finalized-assessments')}
		/>
	{:else}
		<ModernDataTable data={frcWithDetails} {columns} onRowClick={handleRowClick} striped>
			{#snippet cellContent(column, row)}
				{#if column.key === 'assessmentNumber'}
					<TableCell variant="primary" bold>
						{row.assessmentNumber}
					</TableCell>
				{:else if column.key === 'status'}
					{@const variant =
						row.status === 'completed'
							? 'green'
							: row.status === 'in_progress'
								? 'blue'
								: 'gray'}
					{@const label =
						row.status === 'completed'
							? 'Completed'
							: row.status === 'in_progress'
								? 'In Progress'
								: 'Not Started'}
					<GradientBadge {variant} {label} />
				{:else if column.key === 'lineItemCount'}
					<TableCell variant={row.lineItemCount > 0 ? 'default' : 'muted'}>
						{row.lineItemCount}
					</TableCell>
				{:else if column.key === 'actions'}
					<ActionButtonGroup align="right">
						<ActionIconButton
							icon={FileText}
							label="View FRC Report"
							onclick={() => handleViewReport(row)}
						/>
						<ActionIconButton
							icon={Edit}
							label="Edit FRC"
							onclick={() => handleEditFRC(row)}
						/>
						<ActionIconButton
							icon={Eye}
							label="View Details"
							onclick={() => handleRowClick(row)}
						/>
					</ActionButtonGroup>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{frcWithDetails.length}</span>
				{frcWithDetails.length === 1 ? 'FRC record' : 'FRC records'}
			</p>
		</div>
	{/if}
</div>

<!-- Summary Modal -->
<Dialog.Root open={showSummary} onOpenChange={(open) => !open && closeSummary()}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Assessment Summary</Dialog.Title>
		</Dialog.Header>

		{#if selectedAssessment}
			<SummaryComponent assessment={selectedAssessment} showAssessmentData={true} />

			<!-- Action Buttons -->
			<Dialog.Footer>
				<Button variant="outline" onclick={closeSummary}>Close</Button>
				<Button onclick={handleOpenReport}>
					<ExternalLink class="mr-2 h-4 w-4" />
					View FRC Report
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

