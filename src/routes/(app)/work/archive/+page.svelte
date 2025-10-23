<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Archive,
		FileText,
		ClipboardCheck,
		ClipboardList,
		Hash,
		User,
		Car,
		CreditCard,
		CheckCircle2,
		XCircle,
		Clock
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Type filter state - simplified to completed/cancelled
	type ArchiveType = 'all' | 'completed' | 'cancelled';
	let selectedType = $state<ArchiveType>('all');

	// Search state
	let searchQuery = $state('');

	// Prepare unified archive data
	type ArchiveItem = {
		id: string;
		type: 'request' | 'inspection' | 'appointment' | 'assessment';
		number: string;
		clientName: string;
		clientType: string;
		vehicle: string;
		registration: string;
		status: 'Completed' | 'Cancelled';
		completedDate: string;
		formattedDate: string;
		detailUrl: string;
	};

	const allArchiveItems: ArchiveItem[] = [];

	// COMPLETED ITEMS: Only archived assessments (FRC completed)
	// Use vehicle data from assessment_vehicle_identification (updated during assessment)
	data.archivedAssessments.forEach((assessment: any) => {
		const request = assessment.appointment?.inspection?.request;
		const client = request?.client;
		const vehicleId = assessment.vehicle_identification;

		// Prefer assessment vehicle data over request data
		const vehicleMake = vehicleId?.vehicle_make || request?.vehicle_make || '';
		const vehicleModel = vehicleId?.vehicle_model || request?.vehicle_model || '';
		const vehicleYear = vehicleId?.vehicle_year || request?.vehicle_year || '';
		const registration = vehicleId?.registration_number || request?.vehicle_registration || 'N/A';

		allArchiveItems.push({
			id: assessment.id,
			type: 'assessment',
			number: assessment.assessment_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: `${vehicleYear} ${vehicleMake} ${vehicleModel}`.trim() || 'N/A',
			registration: registration,
			status: 'Completed',
			completedDate: assessment.updated_at,
			formattedDate: new Date(assessment.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/work/assessments/${assessment.appointment_id}`
		});
	});

	// CANCELLED ITEMS: All entity types with cancelled status

	// Add cancelled requests
	data.cancelledRequests.forEach((request: any) => {
		const client = request.client;
		allArchiveItems.push({
			id: request.id,
			type: 'request',
			number: request.request_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: `${request.vehicle_year || ''} ${request.vehicle_make || ''} ${request.vehicle_model || ''}`.trim() || 'N/A',
			registration: request.vehicle_registration || 'N/A',
			status: 'Cancelled',
			completedDate: request.updated_at,
			formattedDate: new Date(request.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/requests/${request.id}`
		});
	});

	// Add cancelled inspections
	data.cancelledInspections.forEach((inspection: any) => {
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
			status: 'Cancelled',
			completedDate: inspection.updated_at,
			formattedDate: new Date(inspection.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/work/inspections/${inspection.id}`
		});
	});

	// Add cancelled appointments
	data.cancelledAppointments.forEach((appointment: any) => {
		const request = appointment.inspection?.request;
		const client = request?.client;
		allArchiveItems.push({
			id: appointment.id,
			type: 'appointment',
			number: appointment.inspection?.inspection_number || 'N/A',
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: `${request?.vehicle_year || ''} ${request?.vehicle_make || ''} ${request?.vehicle_model || ''}`.trim() || 'N/A',
			registration: request?.vehicle_registration || 'N/A',
			status: 'Cancelled',
			completedDate: appointment.updated_at,
			formattedDate: new Date(appointment.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/work/appointments/${appointment.id}`
		});
	});

	// Add cancelled assessments
	// Use vehicle data from assessment_vehicle_identification (updated during assessment)
	data.cancelledAssessments.forEach((assessment: any) => {
		const request = assessment.appointment?.inspection?.request;
		const client = request?.client;
		const vehicleId = assessment.vehicle_identification;

		// Prefer assessment vehicle data over request data
		const vehicleMake = vehicleId?.vehicle_make || request?.vehicle_make || '';
		const vehicleModel = vehicleId?.vehicle_model || request?.vehicle_model || '';
		const vehicleYear = vehicleId?.vehicle_year || request?.vehicle_year || '';
		const registration = vehicleId?.registration_number || request?.vehicle_registration || 'N/A';

		allArchiveItems.push({
			id: assessment.id,
			type: 'assessment',
			number: assessment.assessment_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: `${vehicleYear} ${vehicleMake} ${vehicleModel}`.trim() || 'N/A',
			registration: registration,
			status: 'Cancelled',
			completedDate: assessment.cancelled_at || assessment.updated_at,
			formattedDate: new Date(assessment.cancelled_at || assessment.updated_at).toLocaleDateString('en-ZA', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}),
			detailUrl: `/work/assessments/${assessment.appointment_id}`
		});
	});

	// Sort by completed date (most recent first)
	allArchiveItems.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());

	// Filter and search archive items
	const archiveItems = $derived(
		allArchiveItems.filter((item) => {
			// Status filter (completed vs cancelled)
			const statusMatch = selectedType === 'all' ||
				(selectedType === 'completed' && item.status === 'Completed') ||
				(selectedType === 'cancelled' && item.status === 'Cancelled');

			// Search filter
			const searchMatch = searchQuery === '' ||
				item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.registration.toLowerCase().includes(searchQuery.toLowerCase());

			return statusMatch && searchMatch;
		})
	);

	// Count items by status
	const typeCounts = $derived({
		all: allArchiveItems.length,
		completed: allArchiveItems.filter((i) => i.status === 'Completed').length,
		cancelled: allArchiveItems.filter((i) => i.status === 'Cancelled').length
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
		appointment: {
			label: 'Appointment',
			class: 'bg-yellow-100 text-yellow-800',
			icon: ClipboardList
		},
		assessment: {
			label: 'Assessment',
			class: 'bg-purple-100 text-purple-800',
			icon: ClipboardList
		}
	};

	// Table columns
	const columns = [
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			icon: ClipboardList
		},
		{
			key: 'number',
			label: 'Number',
			sortable: true,
			icon: Hash
		},
		{
			key: 'clientName',
			label: 'Client',
			sortable: true,
			icon: User
		},
		{
			key: 'clientType',
			label: 'Client Type',
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
			icon: CheckCircle2
		},
		{
			key: 'formattedDate',
			label: 'Completed',
			sortable: true,
			icon: Clock
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
			class="px-4 py-2 text-sm font-medium transition-colors {selectedType === 'completed'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedType = 'completed')}
		>
			Completed
			<Badge variant="secondary" class="ml-2">{typeCounts.completed}</Badge>
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {selectedType === 'cancelled'
				? 'border-b-2 border-blue-600 text-blue-600'
				: 'text-gray-500 hover:text-gray-700'}"
			onclick={() => (selectedType = 'cancelled')}
		>
			Cancelled
			<Badge variant="secondary" class="ml-2">{typeCounts.cancelled}</Badge>
		</button>
	</div>

	{#if archiveItems.length === 0}
		<EmptyState
			icon={Archive}
			title="No archived items found"
			description={searchQuery ? 'Try adjusting your search or filters' : 'Completed items will appear here'}
		/>
	{:else}
		<ModernDataTable data={archiveItems} {columns} onRowClick={handleRowClick} striped>
			{#snippet cellContent(column, row)}
				{#if column.key === 'type'}
					{@const config = typeBadgeConfig[row.type]}
					{@const variant =
						row.type === 'request'
							? 'gray'
							: row.type === 'inspection'
								? 'blue'
								: row.type === 'appointment'
									? 'yellow'
									: 'purple'}
					<GradientBadge {variant} label={config?.label || row.type} icon={config?.icon} />
				{:else if column.key === 'number'}
					<TableCell variant="primary" bold>
						{row.number}
					</TableCell>
				{:else if column.key === 'clientType'}
					{@const isInsurance = row.clientType === 'insurance'}
					<GradientBadge
						variant={isInsurance ? 'blue' : 'purple'}
						label={isInsurance ? 'Insurance' : 'Private'}
					/>
				{:else if column.key === 'status'}
					{@const isCompleted = row.status === 'Completed'}
					<GradientBadge
						variant={isCompleted ? 'green' : 'red'}
						label={row.status}
						icon={isCompleted ? CheckCircle2 : XCircle}
					/>
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{archiveItems.length}</span>
				{archiveItems.length === 1 ? 'item' : 'items'}
			</p>
		</div>
	{/if}
</div>

