<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import ActionButtonGroup from '$lib/components/data/ActionButtonGroup.svelte';
	import ActionIconButton from '$lib/components/data/ActionIconButton.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { FilterTabs } from '$lib/components/ui/tabs';
	import { formatDate, formatVehicle } from '$lib/utils/formatters';
	import {
		Plus,
		Hash,
		FileText,
		User,
		Car,
		CreditCard,
		Clock,
		CheckCircle,
		XCircle,
		AlertCircle,
		DollarSign,
		Edit
	} from 'lucide-svelte';
	import type { AdditionalLineItem } from '$lib/types/assessment';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	// Filter state
	type FilterType = 'all' | 'pending' | 'approved' | 'declined';
	let selectedFilter = $state<FilterType>('all');

	const filterTabItems = [
		{ value: 'all', label: 'All' },
		{ value: 'pending', label: 'Pending Items' },
		{ value: 'approved', label: 'Approved Items' },
		{ value: 'declined', label: 'Declined Items' }
	] as const;

	// Prepare data for table
	// Use vehicle data from assessment_vehicle_identification (updated during assessment)
	const allAdditionalsWithDetails = data.additionalsRecords.map((additionals: any) => {
		const assessment = additionals.assessment;
		const request = assessment?.appointment?.inspection?.request;
		const client = request?.client;
		const vehicleId = assessment?.vehicle_identification;
		const lineItems = (additionals.line_items || []) as AdditionalLineItem[];

		// Prefer assessment vehicle data over request data
		const vehicleMake = vehicleId?.vehicle_make || request?.vehicle_make;
		const vehicleModel = vehicleId?.vehicle_model || request?.vehicle_model;
		const vehicleYear = vehicleId?.vehicle_year || request?.vehicle_year;
		const registration = vehicleId?.registration_number || request?.vehicle_registration || 'N/A';

		// Count line items by status (excluding reversals and reversed items)
		const reversedTargets = new Set(
			lineItems
				.filter((i) => i.action === 'reversal' && i.reverses_line_id)
				.map((i) => i.reverses_line_id!)
		);

		const activeLineItems = lineItems.filter(
			(item) => item.action !== 'reversal' && !reversedTargets.has(item.id!)
		);

		const pendingCount = activeLineItems.filter((item) => item.status === 'pending').length;
		const approvedCount = activeLineItems.filter((item) => item.status === 'approved').length;
		const declinedCount = activeLineItems.filter((item) => item.status === 'declined').length;

		return {
			id: additionals.id,
			assessmentId: assessment?.id,
			appointmentId: assessment?.appointment?.id,
			assessmentNumber: assessment?.assessment_number || 'N/A',
			requestNumber: request?.request_number || 'N/A',
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: formatVehicle(vehicleYear, vehicleMake, vehicleModel),
			registration: registration,
			pendingCount,
			approvedCount,
			declinedCount,
			totalApproved: additionals.total_approved || 0,
			createdAt: additionals.created_at,
			formattedCreated: formatDate(additionals.created_at)
		};
	});

	// Filter additionals records
	const additionalsWithDetails = $derived(
		allAdditionalsWithDetails.filter((record) => {
			if (selectedFilter === 'all') return true;
			if (selectedFilter === 'pending') return record.pendingCount > 0;
			if (selectedFilter === 'approved') return record.approvedCount > 0;
			if (selectedFilter === 'declined') return record.declinedCount > 0;
			return true;
		})
	);

	// Count records by filter type
	const filterCounts = $derived({
		all: allAdditionalsWithDetails.length,
		pending: allAdditionalsWithDetails.filter((r) => r.pendingCount > 0).length,
		approved: allAdditionalsWithDetails.filter((r) => r.approvedCount > 0).length,
		declined: allAdditionalsWithDetails.filter((r) => r.declinedCount > 0).length
	});

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
			key: 'pendingCount',
			label: 'Pending',
			sortable: true,
			icon: AlertCircle
		},
		{
			key: 'approvedCount',
			label: 'Approved',
			sortable: true,
			icon: CheckCircle
		},
		{
			key: 'declinedCount',
			label: 'Declined',
			sortable: true,
			icon: XCircle
		},
		{
			key: 'totalApproved',
			label: 'Total Approved',
			sortable: true,
			icon: DollarSign
		},
		{
			key: 'formattedCreated',
			label: 'Created',
			sortable: true,
			icon: Clock
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false
		}
	];

	function handleRowClick(record: (typeof additionalsWithDetails)[0]) {
		// Navigate directly to Additionals tab on assessment page with loading state
		startNavigation(record.id, `/work/assessments/${record.appointmentId}?tab=additionals`);
	}

	function handleEditAdditional(record: (typeof additionalsWithDetails)[0]) {
		// Navigate to assessment page with Additionals tab in edit mode with loading state
		startNavigation(
			record.id,
			`/work/assessments/${record.appointmentId}?tab=additionals&edit=true`
		);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Additionals"
		description="Manage additional line items for finalized assessments"
	/>

	<FilterTabs
		items={filterTabItems}
		bind:value={selectedFilter}
		counts={filterCounts}
	/>

	{#if additionalsWithDetails.length === 0}
		<EmptyState
			icon={Plus}
			title="No additionals yet"
			description="Additionals will appear here when added to finalized assessments"
			actionLabel="View Finalized Assessments"
			onAction={() => goto('/work/finalized-assessments')}
		/>
	{:else}
		<ModernDataTable
			data={additionalsWithDetails}
			columns={columns as any}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'assessmentNumber'}
					<TableCell variant="primary" bold>
						{row.assessmentNumber}
					</TableCell>
				{:else if column.key === 'pendingCount'}
					{#if row.pendingCount === 0}
						<span class="text-gray-400">0</span>
					{:else}
						<GradientBadge variant="yellow" label={row.pendingCount.toString()} />
					{/if}
				{:else if column.key === 'approvedCount'}
					{#if row.approvedCount === 0}
						<span class="text-gray-400">0</span>
					{:else}
						<GradientBadge variant="green" label={row.approvedCount.toString()} />
					{/if}
				{:else if column.key === 'declinedCount'}
					{#if row.declinedCount === 0}
						<span class="text-gray-400">0</span>
					{:else}
						<GradientBadge variant="red" label={row.declinedCount.toString()} />
					{/if}
				{:else if column.key === 'totalApproved'}
					<TableCell variant="success" bold>
						R {row.totalApproved.toLocaleString('en-ZA', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</TableCell>
				{:else if (column.key as any) === 'actions'}
					<ActionButtonGroup align="right">
						<ActionIconButton
							icon={Edit}
							label="Edit Additional"
							onclick={() => handleEditAdditional(row)}
						/>
					</ActionButtonGroup>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{additionalsWithDetails.length}</span>
				{additionalsWithDetails.length === 1 ? 'assessment' : 'assessments'} with additionals
			</p>
		</div>
	{/if}
</div>
