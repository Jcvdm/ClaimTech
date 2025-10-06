<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar, ClipboardCheck } from 'lucide-svelte';
	import type { Appointment, AppointmentStatus, AppointmentType } from '$lib/types/appointment';

	let { data }: { data: PageData } = $props();

	// Status filter state
	let selectedStatus = $state<AppointmentStatus | 'all'>('all');
	let selectedType = $state<AppointmentType | 'all'>('all');

	// Prepare data for table
	const allAppointmentsWithDetails = data.appointments.map((appointment) => ({
		...appointment,
		client_name: data.clientMap[appointment.client_id]?.name || 'Unknown Client',
		engineer_name: data.engineerMap[appointment.engineer_id]?.name || 'Unknown Engineer',
		vehicle_display:
			`${appointment.vehicle_make || ''} ${appointment.vehicle_model || ''}`.trim() || '-',
		formatted_date: new Date(appointment.appointment_date).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}),
		formatted_time: appointment.appointment_time || '-',
		type_display: appointment.appointment_type === 'in_person' ? 'In-Person' : 'Digital',
		location_display:
			appointment.appointment_type === 'in_person'
				? appointment.location_city || appointment.location_address || '-'
				: 'Digital'
	}));

	// Filter appointments by status and type
	const appointmentsWithDetails = $derived(
		allAppointmentsWithDetails.filter((apt) => {
			const statusMatch = selectedStatus === 'all' || apt.status === selectedStatus;
			const typeMatch = selectedType === 'all' || apt.appointment_type === selectedType;
			return statusMatch && typeMatch;
		})
	);

	// Calculate status counts
	const statusCounts = $derived({
		all: allAppointmentsWithDetails.length,
		scheduled: allAppointmentsWithDetails.filter((a) => a.status === 'scheduled').length,
		confirmed: allAppointmentsWithDetails.filter((a) => a.status === 'confirmed').length,
		in_progress: allAppointmentsWithDetails.filter((a) => a.status === 'in_progress').length,
		completed: allAppointmentsWithDetails.filter((a) => a.status === 'completed').length,
		cancelled: allAppointmentsWithDetails.filter((a) => a.status === 'cancelled').length,
		rescheduled: allAppointmentsWithDetails.filter((a) => a.status === 'rescheduled').length
	});

	// Calculate type counts
	const typeCounts = $derived({
		all: allAppointmentsWithDetails.length,
		in_person: allAppointmentsWithDetails.filter((a) => a.appointment_type === 'in_person')
			.length,
		digital: allAppointmentsWithDetails.filter((a) => a.appointment_type === 'digital').length
	});

	// Status badge classes
	const statusClasses: Record<AppointmentStatus, string> = {
		scheduled: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700',
		confirmed: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700',
		in_progress: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-yellow-50 text-yellow-700',
		completed: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-700',
		cancelled: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-50 text-red-700',
		rescheduled: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700'
	};

	// Type badge classes
	const typeClasses: Record<AppointmentType, string> = {
		in_person: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700',
		digital: 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700'
	};

	// Table columns
	const columns = [
		{
			key: 'appointment_number',
			label: 'Appointment #',
			sortable: true
		},
		{
			key: 'type_display',
			label: 'Type',
			sortable: true,
			render: (value: string, row: any) => {
				const className = typeClasses[row.appointment_type] || typeClasses.in_person;
				return `<span class="${className}">${value}</span>`;
			}
		},
		{
			key: 'formatted_date',
			label: 'Date',
			sortable: true
		},
		{
			key: 'formatted_time',
			label: 'Time',
			sortable: false
		},
		{
			key: 'engineer_name',
			label: 'Engineer',
			sortable: true
		},
		{
			key: 'client_name',
			label: 'Client',
			sortable: true
		},
		{
			key: 'vehicle_display',
			label: 'Vehicle',
			sortable: false
		},
		{
			key: 'location_display',
			label: 'Location',
			sortable: false
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			render: (value: string) => {
				const className = statusClasses[value as AppointmentStatus] || statusClasses.scheduled;
				return `<span class="${className}">${value}</span>`;
			}
		}
	];

	function handleRowClick(appointment: (typeof appointmentsWithDetails)[0]) {
		goto(`/work/appointments/${appointment.id}`);
	}


</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Appointments"
		description="Manage inspection appointments - both in-person and digital assessments"
	/>

	<!-- Status Filter Tabs -->
	<div class="flex items-center gap-2 border-b border-gray-200">
		<button
			onclick={() => (selectedStatus = 'all')}
			class="relative px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'all'
				? 'text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
		>
			All
			<Badge variant="secondary" class="ml-2">{statusCounts.all}</Badge>
			{#if selectedStatus === 'all'}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
			{/if}
		</button>
		<button
			onclick={() => (selectedStatus = 'scheduled')}
			class="relative px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'scheduled'
				? 'text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
		>
			Scheduled
			<Badge variant="secondary" class="ml-2">{statusCounts.scheduled}</Badge>
			{#if selectedStatus === 'scheduled'}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
			{/if}
		</button>
		<button
			onclick={() => (selectedStatus = 'confirmed')}
			class="relative px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'confirmed'
				? 'text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
		>
			Confirmed
			<Badge variant="secondary" class="ml-2">{statusCounts.confirmed}</Badge>
			{#if selectedStatus === 'confirmed'}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
			{/if}
		</button>
		<button
			onclick={() => (selectedStatus = 'in_progress')}
			class="relative px-4 py-2 text-sm font-medium transition-colors {selectedStatus ===
			'in_progress'
				? 'text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
		>
			In Progress
			<Badge variant="secondary" class="ml-2">{statusCounts.in_progress}</Badge>
			{#if selectedStatus === 'in_progress'}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
			{/if}
		</button>
		<button
			onclick={() => (selectedStatus = 'completed')}
			class="relative px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'completed'
				? 'text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
		>
			Completed
			<Badge variant="secondary" class="ml-2">{statusCounts.completed}</Badge>
			{#if selectedStatus === 'completed'}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
			{/if}
		</button>
		<button
			onclick={() => (selectedStatus = 'cancelled')}
			class="relative px-4 py-2 text-sm font-medium transition-colors {selectedStatus === 'cancelled'
				? 'text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
		>
			Cancelled
			<Badge variant="secondary" class="ml-2">{statusCounts.cancelled}</Badge>
			{#if selectedStatus === 'cancelled'}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
			{/if}
		</button>
	</div>

	<!-- Type Filter Tabs -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-gray-700">Type:</span>
		<button
			onclick={() => (selectedType = 'all')}
			class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {selectedType === 'all'
				? 'bg-blue-100 text-blue-700'
				: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		>
			All ({typeCounts.all})
		</button>
		<button
			onclick={() => (selectedType = 'in_person')}
			class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {selectedType ===
			'in_person'
				? 'bg-blue-100 text-blue-700'
				: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		>
			In-Person ({typeCounts.in_person})
		</button>
		<button
			onclick={() => (selectedType = 'digital')}
			class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {selectedType === 'digital'
				? 'bg-blue-100 text-blue-700'
				: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		>
			Digital ({typeCounts.digital})
		</button>
	</div>

	{#if appointmentsWithDetails.length === 0}
		<EmptyState
			icon={Calendar}
			title="No appointments found"
			description="Appointments will appear here when scheduled from inspections"
			actionLabel="View Inspections"
			onAction={() => goto('/work/inspections')}
		/>
	{:else}
		<div class="rounded-lg border bg-white">
			<DataTable
				data={appointmentsWithDetails}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No appointments found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{appointmentsWithDetails.length}</span>
				{appointmentsWithDetails.length === 1 ? 'appointment' : 'appointments'}
			</p>
		</div>
	{/if}
</div>
