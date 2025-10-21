<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, FileCheck } from 'lucide-svelte';
	import type { AdditionalLineItem } from '$lib/types/assessment';

	let { data }: { data: PageData } = $props();

	// Filter state
	type FilterType = 'all' | 'pending' | 'approved' | 'declined';
	let selectedFilter = $state<FilterType>('all');

	// Prepare data for table
	// Use vehicle data from assessment_vehicle_identification (updated during assessment)
	const allAdditionalsWithDetails = data.additionalsRecords.map((additionals: any) => {
		const assessment = additionals.assessment;
		const request = assessment?.appointment?.inspection?.request;
		const client = request?.client;
		const vehicleId = assessment?.vehicle_identification;
		const lineItems = (additionals.line_items || []) as AdditionalLineItem[];

		// Prefer assessment vehicle data over request data
		const vehicleMake = vehicleId?.vehicle_make || request?.vehicle_make || '';
		const vehicleModel = vehicleId?.vehicle_model || request?.vehicle_model || '';
		const vehicleYear = vehicleId?.vehicle_year || request?.vehicle_year || '';
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
			vehicle: `${vehicleYear} ${vehicleMake} ${vehicleModel}`.trim() || 'N/A',
			registration: registration,
			pendingCount,
			approvedCount,
			declinedCount,
			totalApproved: additionals.total_approved || 0,
			createdAt: additionals.created_at,
			formattedCreated: new Date(additionals.created_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			})
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
			key: 'pendingCount',
			label: 'Pending',
			sortable: true,
			render: (value: number) => {
				if (value === 0) return '<span class="text-gray-400">0</span>';
				return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">${value}</span>`;
			}
		},
		{
			key: 'approvedCount',
			label: 'Approved',
			sortable: true,
			render: (value: number) => {
				if (value === 0) return '<span class="text-gray-400">0</span>';
				return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">${value}</span>`;
			}
		},
		{
			key: 'declinedCount',
			label: 'Declined',
			sortable: true,
			render: (value: number) => {
				if (value === 0) return '<span class="text-gray-400">0</span>';
				return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">${value}</span>`;
			}
		},
		{
			key: 'totalApproved',
			label: 'Total Approved',
			sortable: true,
			render: (value: number) => {
				return `<span class="font-medium">R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
			}
		},
		{
			key: 'formattedCreated',
			label: 'Created',
			sortable: true
		}
	];

	function handleRowClick(record: (typeof additionalsWithDetails)[0]) {
		// Navigate to assessment page with Additionals tab
		goto(`/work/assessments/${record.appointmentId}?tab=additionals`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Additionals"
		description="Manage additional line items for finalized assessments"
	/>

	<!-- Filter Tabs -->
	<div class="flex gap-2 border-b border-gray-200">
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedFilter === 'all'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedFilter = 'all')}
		>
			All
			<Badge variant="secondary" class="ml-2">{filterCounts.all}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedFilter === 'pending'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedFilter = 'pending')}
		>
			Pending Items
			<Badge variant="secondary" class="ml-2">{filterCounts.pending}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedFilter === 'approved'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedFilter = 'approved')}
		>
			Approved Items
			<Badge variant="secondary" class="ml-2">{filterCounts.approved}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedFilter === 'declined'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedFilter = 'declined')}
		>
			Declined Items
			<Badge variant="secondary" class="ml-2">{filterCounts.declined}</Badge>
		</button>
	</div>

	{#if additionalsWithDetails.length === 0}
		<EmptyState
			icon={Plus}
			title="No additionals yet"
			description="Additionals will appear here when added to finalized assessments"
			actionLabel="View Finalized Assessments"
			onAction={() => goto('/work/finalized-assessments')}
		/>
	{:else}
		<div class="rounded-lg border bg-white">
			<DataTable
				data={additionalsWithDetails}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No additionals found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{additionalsWithDetails.length}</span>
				{additionalsWithDetails.length === 1 ? 'assessment' : 'assessments'} with additionals
			</p>
		</div>
	{/if}
</div>

