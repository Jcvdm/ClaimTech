<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Archive, FileText, ClipboardCheck, ClipboardList, FileCheck } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Type filter state
	type ArchiveType = 'all' | 'requests' | 'inspections' | 'assessments' | 'frc';
	let selectedType = $state<ArchiveType>('all');

	// Search state
	let searchQuery = $state('');

	// Prepare unified archive data
	type ArchiveItem = {
		id: string;
		type: 'request' | 'inspection' | 'assessment' | 'frc';
		number: string;
		clientName: string;
		clientType: string;
		vehicle: string;
		registration: string;
		status: string;
		completedDate: string;
		formattedDate: string;
		detailUrl: string;
	};

	const allArchiveItems: ArchiveItem[] = [];

	// Add completed requests
	data.completedRequests.forEach((request: any) => {
		const client = request.client;
		allArchiveItems.push({
			id: request.id,
			type: 'request',
			number: request.request_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: `${request.vehicle_year || ''} ${request.vehicle_make || ''} ${request.vehicle_model || ''}`.trim() || 'N/A',
			registration: request.vehicle_registration || 'N/A',
			status: 'Completed',
			completedDate: request.updated_at,
			formattedDate: new Date(request.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/requests/${request.id}`
		});
	});

	// Add completed inspections
	data.completedInspections.forEach((inspection: any) => {
		const request = inspection.request;
		const client = request?.client;
		allArchiveItems.push({
			id: inspection.id,
			type: 'inspection',
			number: inspection.inspection_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: `${request?.vehicle_year || ''} ${request?.vehicle_make || ''} ${request?.vehicle_model || ''}`.trim() || 'N/A',
			registration: request?.vehicle_registration || 'N/A',
			status: 'Completed',
			completedDate: inspection.updated_at,
			formattedDate: new Date(inspection.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/work/inspections/${inspection.id}`
		});
	});

	// Add archived assessments (status = 'archived', set when FRC is completed)
	data.completedAssessments.forEach((assessment: any) => {
		const request = assessment.appointment?.inspection?.request;
		const client = request?.client;
		allArchiveItems.push({
			id: assessment.id,
			type: 'assessment',
			number: assessment.assessment_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: `${request?.vehicle_year || ''} ${request?.vehicle_make || ''} ${request?.vehicle_model || ''}`.trim() || 'N/A',
			registration: request?.vehicle_registration || 'N/A',
			status: 'Completed',
			completedDate: assessment.completed_at || assessment.updated_at,
			formattedDate: new Date(assessment.completed_at || assessment.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/work/assessments/${assessment.appointment_id}`
		});
	});

	// Add completed FRC
	data.completedFRC.forEach((frc: any) => {
		// Skip if assessment data is missing
		if (!frc.assessment || !frc.assessment.appointment_id) {
			console.warn('Skipping FRC with missing assessment data:', frc.id);
			return;
		}

		const assessment = frc.assessment;
		const request = assessment?.appointment?.inspection?.request;
		const client = request?.client;
		allArchiveItems.push({
			id: frc.id,
			type: 'frc',
			number: assessment?.assessment_number || 'N/A',
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: `${request?.vehicle_year || ''} ${request?.vehicle_make || ''} ${request?.vehicle_model || ''}`.trim() || 'N/A',
			registration: request?.vehicle_registration || 'N/A',
			status: 'FRC Completed',
			completedDate: frc.completed_at || frc.updated_at,
			formattedDate: new Date(frc.completed_at || frc.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/work/assessments/${assessment?.appointment_id}?tab=frc`
		});
	});

	// Sort by completed date (most recent first)
	allArchiveItems.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());

	// Filter and search archive items
	const archiveItems = $derived(
		allArchiveItems.filter((item) => {
			// Type filter
			const typeMatch = selectedType === 'all' || item.type === selectedType;
			
			// Search filter
			const searchMatch = searchQuery === '' || 
				item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.registration.toLowerCase().includes(searchQuery.toLowerCase());
			
			return typeMatch && searchMatch;
		})
	);

	// Count items by type
	const typeCounts = $derived({
		all: allArchiveItems.length,
		requests: allArchiveItems.filter((i) => i.type === 'request').length,
		inspections: allArchiveItems.filter((i) => i.type === 'inspection').length,
		assessments: allArchiveItems.filter((i) => i.type === 'assessment').length,
		frc: allArchiveItems.filter((i) => i.type === 'frc').length
	});

	// Type badge configuration
	const typeBadgeConfig: Record<string, { label: string; class: string; icon: any }> = {
		request: {
			label: 'Request',
			class: 'bg-gray-100 text-gray-800',
			icon: FileText
		},
		inspection: {
			label: 'Inspection',
			class: 'bg-blue-100 text-blue-800',
			icon: ClipboardCheck
		},
		assessment: {
			label: 'Assessment',
			class: 'bg-purple-100 text-purple-800',
			icon: ClipboardList
		},
		frc: {
			label: 'FRC',
			class: 'bg-green-100 text-green-800',
			icon: FileCheck
		}
	};

	// Table columns
	const columns = [
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			render: (value: string) => {
				const config = typeBadgeConfig[value];
				if (!config) {
					console.warn(`Unknown archive type: ${value}`);
					return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">${value}</span>`;
				}
				return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.class}">${config.label}</span>`;
			}
		},
		{
			key: 'number',
			label: 'Number',
			sortable: true
		},
		{
			key: 'clientName',
			label: 'Client',
			sortable: true
		},
		{
			key: 'clientType',
			label: 'Client Type',
			sortable: true,
			render: (value: string) => {
				const isInsurance = value === 'insurance';
				return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isInsurance ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}">${isInsurance ? 'Insurance' : 'Private'}</span>`;
			}
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
			render: (value: string) => {
				return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">${value}</span>`;
			}
		},
		{
			key: 'formattedDate',
			label: 'Completed',
			sortable: true
		}
	];

	function handleRowClick(item: ArchiveItem) {
		goto(item.detailUrl);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Archive"
		description="Search and view all completed requests, inspections, assessments, and FRC records"
	/>

	<!-- Search Bar -->
	<div class="flex items-center gap-4">
		<div class="flex-1">
			<input
				type="text"
				placeholder="Search by number, client, vehicle, or registration..."
				bind:value={searchQuery}
				class="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>
	</div>

	<!-- Type Filter Tabs -->
	<div class="flex gap-2 border-b border-gray-200">
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedType === 'all'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedType = 'all')}
		>
			All
			<Badge variant="secondary" class="ml-2">{typeCounts.all}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedType === 'requests'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedType = 'requests')}
		>
			Requests
			<Badge variant="secondary" class="ml-2">{typeCounts.requests}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedType === 'inspections'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedType = 'inspections')}
		>
			Inspections
			<Badge variant="secondary" class="ml-2">{typeCounts.inspections}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedType === 'assessments'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedType = 'assessments')}
		>
			Assessments
			<Badge variant="secondary" class="ml-2">{typeCounts.assessments}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedType === 'frc'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedType = 'frc')}
		>
			FRC
			<Badge variant="secondary" class="ml-2">{typeCounts.frc}</Badge>
		</button>
	</div>

	{#if archiveItems.length === 0}
		<EmptyState
			icon={Archive}
			title="No archived items found"
			description={searchQuery ? 'Try adjusting your search or filters' : 'Completed items will appear here'}
		/>
	{:else}
		<div class="rounded-lg border bg-white">
			<DataTable
				data={archiveItems}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No items found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{archiveItems.length}</span>
				{archiveItems.length === 1 ? 'item' : 'items'}
			</p>
		</div>
	{/if}
</div>

