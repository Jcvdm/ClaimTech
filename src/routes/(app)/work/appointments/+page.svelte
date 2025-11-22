<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import ActionButtonGroup from '$lib/components/data/ActionButtonGroup.svelte';
	import ActionIconButton from '$lib/components/data/ActionIconButton.svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Calendar, Clock, MapPin, User, Car, AlertCircle, Play, Eye, Hash } from 'lucide-svelte';
	import type { Assessment } from '$lib/types/assessment';
	import type { AppointmentType } from '$lib/types/appointment';
	import type { Province } from '$lib/types/engineer';
	import { formatDateWithWeekday } from '$lib/utils/formatters';
	import { formatTimeDisplay, isAppointmentOverdue } from '$lib/utils/table-helpers';
	import { appointmentService } from '$lib/services/appointment.service';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	// Filter state
	let selectedType = $state<AppointmentType | 'all'>('all');
	let dateFilter = $state<string>(''); // Date picker value
	let loading = $state(false);

	const typeTabItems = [
		{ value: 'all', label: 'All' },
		{ value: 'in_person', label: 'In-Person' },
		{ value: 'digital', label: 'Digital' }
	] as const;

	// Schedule/Reschedule modal state
	let showScheduleModal = $state(false);
	let selectedAssessment = $state<(typeof allAssessmentsWithDetails)[0] | null>(null);
	let scheduleDate = $state('');
	let scheduleTime = $state('');
	let scheduleDuration = $state(60);
	let scheduleLocationAddress = $state('');
	let scheduleLocationCity = $state('');
	let scheduleLocationProvince = $state<Province | ''>('');
	let scheduleLocationNotes = $state('');
	let scheduleNotes = $state('');
	let scheduleSpecialInstructions = $state('');
	let scheduleError = $state<string | null>(null);

	// Prepare assessment data with additional fields from nested appointment
	const allAssessmentsWithDetails = $derived(
		data.assessments
			.filter((assessment) => assessment.appointment !== null) // Guard against null appointments
			.map((assessment) => {
				const appointment = assessment.appointment!; // Safe after filter
				const appointmentDate = new Date(appointment.appointment_date);
				const dateKey = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD

				return {
					// Assessment data
					id: assessment.id,
					assessment_id: assessment.id,
					assessment_number: assessment.assessment_number,
					stage: assessment.stage,

					// Appointment data
					appointment_id: appointment.id,
					appointment_number: appointment.appointment_number,
					appointment_type: appointment.appointment_type,
					appointment_date: appointment.appointment_date,
					appointment_time: appointment.appointment_time,
					duration_minutes: appointment.duration_minutes,
					status: appointment.status,
					location_address: appointment.location_address,
					location_city: appointment.location_city,
					location_province: appointment.location_province,
					location_notes: appointment.location_notes,
					notes: appointment.notes,
					special_instructions: appointment.special_instructions,

					// Derived display fields
					client_name: assessment.request?.client?.name || 'Unknown Client',
					engineer_name: appointment.engineer?.name || 'Unknown Engineer',
					vehicle_display:
						`${assessment.request?.vehicle_make || ''} ${assessment.request?.vehicle_model || ''}`.trim() ||
						'-',
					type_display: appointment.appointment_type === 'in_person' ? 'In-Person' : 'Digital',
					location_display:
						appointment.appointment_type === 'in_person'
							? appointment.location_city || appointment.location_address || '-'
							: 'Digital',
					datetime_display: formatDateWithWeekday(appointment.appointment_date),
					time_display: formatTimeDisplay(
						appointment.appointment_time,
						appointment.duration_minutes || undefined
					),
					dateKey,
					isOverdue: isAppointmentOverdue(
						appointment.appointment_date,
						appointment.appointment_time
					),
					// Parse time for sorting
					timeValue: appointment.appointment_time
						? parseInt(appointment.appointment_time.replace(':', ''))
						: 9999 // Put appointments without time at the end
				};
			})
	);

	// Filter assessments by type and date
	const filteredAssessments = $derived(
		allAssessmentsWithDetails.filter((item) => {
			const typeMatch = selectedType === 'all' || item.appointment_type === selectedType;
			const dateMatch = !dateFilter || item.dateKey === dateFilter;
			return typeMatch && dateMatch;
		})
	);

	// Separate overdue and upcoming assessments
	const overdueAssessments = $derived(filteredAssessments.filter((item) => item.isOverdue));
	const upcomingAssessments = $derived(filteredAssessments.filter((item) => !item.isOverdue));

	// Calculate type counts
	const typeCounts = $derived({
		all: filteredAssessments.length,
		in_person: filteredAssessments.filter((a) => a.appointment_type === 'in_person').length,
		digital: filteredAssessments.filter((a) => a.appointment_type === 'digital').length
	});

	// Table columns
	const columns = [
		{ key: 'appointment_number' as const, label: 'Appointment #', sortable: true, icon: Hash },
		{ key: 'appointment_type' as const, label: 'Type', sortable: true, icon: Calendar },
		{ key: 'datetime_display' as const, label: 'Date & Time', sortable: true, icon: Clock },
		{ key: 'client_name' as const, label: 'Client', sortable: true, icon: User },
		{ key: 'vehicle_display' as const, label: 'Vehicle', sortable: false, icon: Car },
		{ key: 'engineer_name' as const, label: 'Engineer', sortable: true, icon: User },
		{ key: 'location_display' as const, label: 'Location', sortable: false, icon: MapPin }
	];

	function handleRowClick(row: (typeof allAssessmentsWithDetails)[0]) {
		startNavigation(row.appointment_id, `/work/appointments/${row.appointment_id}`);
	}

	async function handleStartAssessment(assessmentId: string, appointmentId: string) {
		// Use the navigation loading utility to handle loading state
		// Note: Table handles row-level loading via loadingRowId - no need for button-level loading prop
		startNavigation(assessmentId, `/work/assessments/${appointmentId}`);
	}

	function handleOpenScheduleModal(assessment: (typeof allAssessmentsWithDetails)[0]) {
		selectedAssessment = assessment;
		scheduleDate = assessment.appointment_date.split('T')[0]; // Extract YYYY-MM-DD
		scheduleTime = assessment.appointment_time || '';
		scheduleDuration = assessment.duration_minutes || 60;
		scheduleLocationAddress = assessment.location_address || '';
		scheduleLocationCity = assessment.location_city || '';
		scheduleLocationProvince = (assessment.location_province as Province) || '';
		scheduleLocationNotes = assessment.location_notes || '';
		scheduleNotes = assessment.notes || '';
		scheduleSpecialInstructions = assessment.special_instructions || '';
		scheduleError = null;
		showScheduleModal = true;
	}

	async function handleSaveSchedule() {
		if (!selectedAssessment) return;
		if (!scheduleDate) {
			scheduleError = 'Please select an appointment date';
			return;
		}

		loading = true;
		scheduleError = null;

		try {
			// Prepare update data
			const updateData: any = {
				appointment_date: scheduleDate,
				appointment_time: scheduleTime || null,
				duration_minutes: scheduleDuration,
				notes: scheduleNotes || null,
				special_instructions: scheduleSpecialInstructions || null
			};

			// Add location fields for in-person appointments
			if (selectedAssessment.appointment_type === 'in_person') {
				updateData.location_address = scheduleLocationAddress || null;
				updateData.location_city = scheduleLocationCity || null;
				updateData.location_province = scheduleLocationProvince || null;
				updateData.location_notes = scheduleLocationNotes || null;
			}

			// Detect if this is a reschedule (appointment already has a date/time set)
			const currentDate = selectedAssessment.appointment_date?.split('T')[0];
			const isReschedule = currentDate && currentDate !== scheduleDate;

			if (isReschedule) {
				// Use reschedule method for tracking
				const reason = prompt('Reason for rescheduling (optional):');
				if (reason === null) {
					// User cancelled the reschedule
					loading = false;
					return;
				}
				await appointmentService.rescheduleAppointment(
					selectedAssessment.appointment_id,
					updateData,
					reason || undefined
				);
			} else {
				// Use update method for initial scheduling
				await appointmentService.updateAppointment(selectedAssessment.appointment_id, updateData);
			}

			// Close modal
			showScheduleModal = false;

			// Refresh page data to show updated appointment
			await goto('/work/appointments', { invalidateAll: true });
		} catch (error) {
			console.error('Error updating appointment:', error);
			scheduleError =
				error instanceof Error ? error.message : 'Failed to update appointment. Please try again.';
			loading = false;
		}
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title="Appointments"
		description="Upcoming inspection appointments - both in-person and digital assessments"
	/>

	<!-- Filters -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<!-- Date Filter -->
		<div class="flex items-center gap-2">
			<Calendar class="h-4 w-4 text-gray-500" />
			<Input type="date" bind:value={dateFilter} placeholder="Filter by date" class="w-48" />
			{#if dateFilter}
				<Button variant="ghost" size="sm" onclick={() => (dateFilter = '')}>Clear</Button>
			{/if}
		</div>

		<!-- Type Filter -->
		<Tabs
			bind:value={selectedType}
			class="w-auto"
			onValueChange={(value: string) => (selectedType = value as AppointmentType | 'all')}
		>
			<TabsList
				class="flex w-full items-center justify-start gap-2 rounded-none border-b border-border bg-transparent p-0"
			>
				{#each typeTabItems as item}
					<TabsTrigger
						value={item.value}
						class="w-auto gap-2 rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-rose-500"
					>
						<span>{item.label}</span>
						<Badge variant="secondary">
							{item.value === 'all'
								? typeCounts.all
								: item.value === 'in_person'
									? typeCounts.in_person
									: typeCounts.digital}
						</Badge>
					</TabsTrigger>
				{/each}
			</TabsList>
		</Tabs>
	</div>

	{#if filteredAssessments.length === 0}
		<EmptyState
			icon={Calendar}
			title="No appointments found"
			description="Assessments with appointments will appear here when scheduled"
			actionLabel="View Inspections"
			onAction={() => goto('/work/inspections')}
		/>
	{:else}
		<!-- Overdue Appointments Section -->
		{#if overdueAssessments.length > 0}
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<AlertCircle class="h-5 w-5 text-red-600" />
					<h2 class="text-lg font-semibold text-red-600">Overdue ({overdueAssessments.length})</h2>
				</div>

				<div class="overflow-hidden rounded-xl border-2 border-red-200 bg-red-50/30 shadow-sm">
					<ModernDataTable
						data={overdueAssessments}
						{columns}
						onRowClick={handleRowClick}
						loadingRowId={loadingId}
						rowIdKey="appointment_id"
						striped
					>
						{#snippet cellContent(column, row)}
							{#if column.key === 'appointment_number'}
								<TableCell variant="primary" bold class="text-red-900">
									{row.appointment_number}
								</TableCell>
							{:else if column.key === 'appointment_type'}
								<GradientBadge
									variant={row.appointment_type === 'in_person' ? 'blue' : 'purple'}
									label={row.type_display}
								/>
							{:else if column.key === 'datetime_display'}
								<div class="space-y-1">
									<div class="font-medium text-red-900">{row.datetime_display}</div>
									<div class="flex items-center gap-1 text-sm text-red-600">
										<Clock class="h-3 w-3" />
										<span>{row.time_display}</span>
									</div>
								</div>
							{:else}
								{row[column.key]}
							{/if}
						{/snippet}
					</ModernDataTable>
				</div>
			</div>
		{/if}

		<!-- Upcoming Appointments Section -->
		{#if upcomingAssessments.length > 0}
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<Calendar class="h-5 w-5 text-blue-600" />
					<h2 class="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
					<Badge variant="secondary">{upcomingAssessments.length}</Badge>
				</div>

				<ModernDataTable
					data={upcomingAssessments}
					{columns}
					onRowClick={handleRowClick}
					loadingRowId={loadingId}
					rowIdKey="appointment_id"
					striped
				>
					{#snippet cellContent(column, row)}
						{#if column.key === 'appointment_number'}
							<TableCell variant="primary" bold>
								{row.appointment_number}
							</TableCell>
						{:else if column.key === 'appointment_type'}
							<GradientBadge
								variant={row.appointment_type === 'in_person' ? 'blue' : 'purple'}
								label={row.type_display}
							/>
						{:else if column.key === 'datetime_display'}
							<div class="space-y-1">
								<div class="font-medium text-gray-900">{row.datetime_display}</div>
								<div class="flex items-center gap-1 text-sm text-gray-600">
									<Clock class="h-3 w-3" />
									<span>{row.time_display}</span>
								</div>
							</div>
						{:else}
							{row[column.key]}
						{/if}
					{/snippet}
				</ModernDataTable>
			</div>
		{/if}

		<!-- Summary -->
		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{filteredAssessments.length}</span>
				{filteredAssessments.length === 1 ? 'appointment' : 'appointments'}
				{#if overdueAssessments.length > 0}
					<span class="text-red-600">({overdueAssessments.length} overdue)</span>
				{/if}
			</p>
		</div>
	{/if}
</div>

<!-- Schedule/Reschedule Modal -->
<Dialog bind:open={showScheduleModal}>
	<DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
		<DialogHeader>
			<DialogTitle>
				{selectedAssessment?.appointment_time ? 'Reschedule' : 'Schedule'} Appointment
			</DialogTitle>
			<DialogDescription>
				Update appointment details for {selectedAssessment?.appointment_number}
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4 py-4">
			{#if scheduleError}
				<div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
					{scheduleError}
				</div>
			{/if}

			<!-- Appointment Type (read-only) -->
			<div class="space-y-2">
				<div class="text-sm font-medium text-gray-900">Appointment Type</div>
				<div
					class="flex h-10 w-full items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
				>
					{selectedAssessment?.type_display}
				</div>
			</div>

			<!-- Date and Time -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<label for="schedule_date" class="text-sm font-medium text-gray-900">
						Date <span class="text-red-500">*</span>
					</label>
					<input
						id="schedule_date"
						type="date"
						bind:value={scheduleDate}
						required
						class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
				</div>
				<div class="space-y-2">
					<label for="schedule_time" class="text-sm font-medium text-gray-900">
						Time (Optional)
					</label>
					<input
						id="schedule_time"
						type="time"
						bind:value={scheduleTime}
						class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
				</div>
			</div>

			<!-- Duration -->
			<div class="space-y-2">
				<label for="schedule_duration" class="text-sm font-medium text-gray-900">
					Duration (minutes)
				</label>
				<input
					id="schedule_duration"
					type="number"
					bind:value={scheduleDuration}
					min="15"
					step="15"
					class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
				/>
			</div>

			<!-- Location Fields (only for in-person appointments) -->
			{#if selectedAssessment?.appointment_type === 'in_person'}
				<div class="space-y-4 rounded-lg border border-gray-200 p-4">
					<h4 class="text-sm font-semibold text-gray-900">Location Details</h4>

					<div class="space-y-2">
						<label for="schedule_location_address" class="text-sm font-medium text-gray-900">
							Address
						</label>
						<input
							id="schedule_location_address"
							type="text"
							bind:value={scheduleLocationAddress}
							placeholder="Street address"
							class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
						/>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<label for="schedule_location_city" class="text-sm font-medium text-gray-900">
								City
							</label>
							<input
								id="schedule_location_city"
								type="text"
								bind:value={scheduleLocationCity}
								placeholder="City"
								class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
							/>
						</div>
						<div class="space-y-2">
							<label for="schedule_location_province" class="text-sm font-medium text-gray-900">
								Province
							</label>
							<select
								id="schedule_location_province"
								bind:value={scheduleLocationProvince}
								class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								<option value="">Select province</option>
								<option value="Eastern Cape">Eastern Cape</option>
								<option value="Free State">Free State</option>
								<option value="Gauteng">Gauteng</option>
								<option value="KwaZulu-Natal">KwaZulu-Natal</option>
								<option value="Limpopo">Limpopo</option>
								<option value="Mpumalanga">Mpumalanga</option>
								<option value="Northern Cape">Northern Cape</option>
								<option value="North West">North West</option>
								<option value="Western Cape">Western Cape</option>
							</select>
						</div>
					</div>

					<div class="space-y-2">
						<label for="schedule_location_notes" class="text-sm font-medium text-gray-900">
							Location Notes
						</label>
						<textarea
							id="schedule_location_notes"
							bind:value={scheduleLocationNotes}
							rows="2"
							placeholder="Additional location details or directions"
							class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
						></textarea>
					</div>
				</div>
			{/if}

			<!-- Notes -->
			<div class="space-y-2">
				<label for="schedule_notes" class="text-sm font-medium text-gray-900">Notes</label>
				<textarea
					id="schedule_notes"
					bind:value={scheduleNotes}
					rows="3"
					placeholder="General notes about the appointment"
					class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
				></textarea>
			</div>

			<!-- Special Instructions -->
			<div class="space-y-2">
				<label for="schedule_special_instructions" class="text-sm font-medium text-gray-900">
					Special Instructions
				</label>
				<textarea
					id="schedule_special_instructions"
					bind:value={scheduleSpecialInstructions}
					rows="2"
					placeholder="Any special instructions for the engineer"
					class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
				></textarea>
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (showScheduleModal = false)} disabled={loading}>
				Cancel
			</Button>
			<Button onclick={handleSaveSchedule} disabled={loading || !scheduleDate}>
				{loading ? 'Saving...' : 'Save Changes'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
