<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { FileCheck, ClipboardList } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Status filter state - default to 'in_progress' for better UX
	type FRCStatus = 'not_started' | 'in_progress' | 'completed';
	let selectedStatus = $state<FRCStatus | 'all'>('in_progress');

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
				formattedStarted: frc.started_at
					? new Date(frc.started_at).toLocaleDateString('en-ZA', {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						})
					: 'N/A',
				formattedCompleted: frc.completed_at
					? new Date(frc.completed_at).toLocaleDateString('en-ZA', {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						})
					: '-'
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
			key: 'status',
			label: 'Status',
			sortable: true,
			render: (value: FRCStatus) => {
				const config = statusBadgeConfig[value];
				if (!config) {
					console.warn(`Unknown FRC status: ${value}`);
					return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">${value || 'Unknown'}</span>`;
				}
				return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.class}">${config.label}</span>`;
			}
		},
		{
			key: 'lineItemCount',
			label: 'Line Items',
			sortable: true
		},
		{
			key: 'formattedStarted',
			label: 'Started',
			sortable: true
		},
		{
			key: 'formattedCompleted',
			label: 'Completed',
			sortable: true
		}
	];

	function handleRowClick(frc: (typeof frcWithDetails)[0]) {
		// Navigate to assessment page with FRC tab
		goto(`/work/assessments/${frc.appointmentId}?tab=frc`);
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
		<div class="rounded-lg border bg-white">
			<DataTable
				data={frcWithDetails}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No FRC records found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{frcWithDetails.length}</span>
				{frcWithDetails.length === 1 ? 'FRC record' : 'FRC records'}
			</p>
		</div>
	{/if}
</div>

