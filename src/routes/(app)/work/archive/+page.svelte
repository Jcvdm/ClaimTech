<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import type { CardConfig } from '$lib/components/data/ListItemCard.svelte';
	import ActionButtonGroup from '$lib/components/data/ActionButtonGroup.svelte';
	import ActionIconButton from '$lib/components/data/ActionIconButton.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { FilterTabs } from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { formatDate, formatVehicle } from '$lib/utils/formatters';
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
		Clock,
		Download
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Type filter state - simplified to completed/cancelled
	type ArchiveType = 'all' | 'completed' | 'cancelled';
	// Initialize from URL query parameter if present
	const initialTab = ($page.url.searchParams.get('tab') as ArchiveType) || 'all';
	let selectedType = $state<ArchiveType>(
		initialTab === 'completed' || initialTab === 'cancelled' ? initialTab : 'all'
	);

	// Search state
	let searchQuery = $state('');

	// Download state
	let downloadingDocs = $state<string | null>(null);

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
		const vehicleMake = vehicleId?.vehicle_make || request?.vehicle_make;
		const vehicleModel = vehicleId?.vehicle_model || request?.vehicle_model;
		const vehicleYear = vehicleId?.vehicle_year || request?.vehicle_year;
		const registration = vehicleId?.registration_number || request?.vehicle_registration || 'N/A';

		allArchiveItems.push({
			id: assessment.id,
			type: 'assessment',
			number: assessment.assessment_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: formatVehicle(vehicleYear, vehicleMake, vehicleModel),
			registration: registration,
			status: 'Completed',
			completedDate: assessment.updated_at,
			formattedDate: formatDate(assessment.updated_at),
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
			vehicle: formatVehicle(request.vehicle_year, request.vehicle_make, request.vehicle_model),
			registration: request.vehicle_registration || 'N/A',
			status: 'Cancelled',
			completedDate: request.updated_at,
			formattedDate: formatDate(request.updated_at),
			detailUrl: `/requests/${request.id}`
		});
	});

	// Add cancelled inspections
	data.cancelledInspections.forEach((inspection: any) => {
		const request = inspection.request;
		const client = request?.client;
		// Get assessment ID from request - assessments are linked via request_id
		// Supabase returns assessments as an array (one-to-many relationship)
		const assessments = request?.assessments || [];
		const assessment = Array.isArray(assessments) ? assessments[0] : assessments;
		const assessmentId = assessment?.id || inspection.id; // Fallback to inspection ID if no assessment found

		allArchiveItems.push({
			id: inspection.id,
			type: 'inspection',
			number: inspection.inspection_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: formatVehicle(request?.vehicle_year, request?.vehicle_make, request?.vehicle_model),
			registration: request?.vehicle_registration || 'N/A',
			status: 'Cancelled',
			completedDate: inspection.updated_at,
			formattedDate: formatDate(inspection.updated_at),
			detailUrl: `/work/inspections/${assessmentId}` // Use assessment ID for route navigation
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
			vehicle: formatVehicle(request?.vehicle_year, request?.vehicle_make, request?.vehicle_model),
			registration: request?.vehicle_registration || 'N/A',
			status: 'Cancelled',
			completedDate: appointment.updated_at,
			formattedDate: formatDate(appointment.updated_at),
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
		const vehicleMake = vehicleId?.vehicle_make || request?.vehicle_make;
		const vehicleModel = vehicleId?.vehicle_model || request?.vehicle_model;
		const vehicleYear = vehicleId?.vehicle_year || request?.vehicle_year;
		const registration = vehicleId?.registration_number || request?.vehicle_registration || 'N/A';

		allArchiveItems.push({
			id: assessment.id,
			type: 'assessment',
			number: assessment.assessment_number,
			clientName: client?.name || 'Unknown Client',
			clientType: client?.type || 'N/A',
			vehicle: formatVehicle(vehicleYear, vehicleMake, vehicleModel),
			registration: registration,
			status: 'Cancelled',
			completedDate: assessment.cancelled_at || assessment.updated_at,
			formattedDate: formatDate(assessment.cancelled_at || assessment.updated_at),
			detailUrl: `/work/assessments/${assessment.appointment_id}`
		});
	});

	// Sort by completed date (most recent first)
	allArchiveItems.sort(
		(a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
	);

	// Filter and search archive items
	const archiveItems = $derived(
		allArchiveItems.filter((item) => {
			// Status filter (completed vs cancelled)
			const statusMatch =
				selectedType === 'all' ||
				(selectedType === 'completed' && item.status === 'Completed') ||
				(selectedType === 'cancelled' && item.status === 'Cancelled');

			// Search filter
			const searchMatch =
				searchQuery === '' ||
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
			key: 'type' as const,
			label: 'Type',
			sortable: true,
			icon: ClipboardList
		},
		{
			key: 'number' as const,
			label: 'Number',
			sortable: true,
			icon: Hash
		},
		{
			key: 'clientName' as const,
			label: 'Client',
			sortable: true,
			icon: User
		},
		{
			key: 'clientType' as const,
			label: 'Client Type',
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
			icon: CreditCard
		},
		{
			key: 'status' as const,
			label: 'Status',
			sortable: true,
			icon: CheckCircle2
		},
		{
			key: 'formattedDate' as const,
			label: 'Completed',
			sortable: true,
			icon: Clock
		}
	];

	// Mobile card configuration
	const mobileCardConfig: CardConfig<ArchiveItem> = {
		primaryField: 'number',
		secondaryField: 'status',
		bodyFields: ['clientName', 'vehicle', 'registration'],
		footerField: 'formattedDate'
	};

	function handleRowClick(item: ArchiveItem) {
		goto(item.detailUrl);
	}

	async function handleDownload(item: ArchiveItem) {
		downloadingDocs = item.id;
		try {
			// TODO: Implement document download logic
			// This could download all associated documents as ZIP
			console.log('Downloading documents for:', item.type, item.number);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate download
		} finally {
			downloadingDocs = null;
		}
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader
		title="Archive"
		description="Search and view all completed requests, inspections, assessments, and FRC records"
	/>

	<!-- Search Bar -->
	<div class="flex items-center gap-4">
		<div class="flex-1">
			<Input
				type="text"
				placeholder="Search by number, client, vehicle, or registration..."
				bind:value={searchQuery}
				class="w-full"
			/>
		</div>
	</div>

	<!-- Type Filter Tabs -->
	<FilterTabs
		items={[
			{ value: 'all', label: 'All' },
			{ value: 'completed', label: 'Completed' },
			{ value: 'cancelled', label: 'Cancelled' }
		]}
		bind:value={selectedType}
		counts={typeCounts}
	/>

	{#if archiveItems.length === 0}
		<EmptyState
			icon={Archive}
			title="No archived items found"
			description={searchQuery
				? 'Try adjusting your search or filters'
				: 'Completed items will appear here'}
		/>
	{:else}
		<ModernDataTable
			data={archiveItems}
			{columns}
			onRowClick={handleRowClick}
			striped
			{mobileCardConfig}
		>
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
			{#snippet mobileCardContent(field, row)}
				{#if field === 'number'}
					<span class="font-semibold text-gray-900">{row.number}</span>
				{:else if field === 'status'}
					{@const isCompleted = row.status === 'Completed'}
					<GradientBadge
						variant={isCompleted ? 'green' : 'red'}
						label={row.status}
						icon={isCompleted ? CheckCircle2 : XCircle}
					/>
				{:else if field === 'clientName'}
					<span class="text-gray-600"><User class="inline h-3.5 w-3.5 mr-1 text-gray-400" />{row.clientName}</span>
				{:else if field === 'vehicle'}
					<span class="text-gray-600"><Car class="inline h-3.5 w-3.5 mr-1 text-gray-400" />{row.vehicle}</span>
				{:else if field === 'registration'}
					<span class="text-gray-500"><CreditCard class="inline h-3.5 w-3.5 mr-1 text-gray-400" />{row.registration}</span>
				{:else}
					{row[field]}
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
