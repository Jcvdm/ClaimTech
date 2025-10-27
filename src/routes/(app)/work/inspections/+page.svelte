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
	import type { Assessment } from '$lib/types/assessment';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedAssessment = $state<Assessment | null>(null);
	let showSummary = $state(false);

	// Derive display data from assessments with nested request/client
	const assessmentsWithDetails = $derived(
		data.assessments.map((assessment) => ({
			id: assessment.id,
			assessment_number: assessment.assessment_number,
			request_number: assessment.request?.request_number || '-',
			client_name: assessment.request?.client?.name || 'Unknown Client',
			vehicle_display:
				`${assessment.request?.vehicle_make || ''} ${assessment.request?.vehicle_model || ''}`.trim() ||
				'-',
			type: assessment.request?.type || 'insurance',
			request_date: assessment.request?.created_at
				? new Date(assessment.request.created_at).toLocaleDateString('en-ZA', {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})
				: '-',
			stage: assessment.stage,
			created_at: assessment.created_at
		}))
	);

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
			key: 'stage',
			label: 'Stage',
			sortable: true,
			icon: Activity
		}
	];

	function handleRowClick(row: (typeof assessmentsWithDetails)[0]) {
		selectedAssessment = data.assessments.find((a) => a.id === row.id) || null;
		showSummary = true;
	}

	function handleOpenReport() {
		if (selectedAssessment) {
			// Route based on appointment existence
			// Assessments at inspection_scheduled stage don't have appointments yet
			if (!selectedAssessment.appointment_id) {
				// No appointment - use inspection detail page (assessment-centric)
				goto(`/work/inspections/${selectedAssessment.id}`);
			} else {
				// Has appointment - use assessment detail page
				goto(`/work/assessments/${selectedAssessment.appointment_id}`);
			}
		}
	}

	function closeSummary() {
		showSummary = false;
		selectedAssessment = null;
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

<!-- Summary Modal -->
<Dialog.Root open={showSummary} onOpenChange={(open) => !open && closeSummary()}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Assessment Summary</Dialog.Title>
		</Dialog.Header>

		{#if selectedAssessment}
			<SummaryComponent assessment={selectedAssessment} showAssessmentData={false} />

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

