<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
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
	import { Calendar, Clock, MapPin, User, Car, AlertCircle, Play } from 'lucide-svelte';
	import type { Appointment, AppointmentType } from '$lib/types/appointment';
	import type { Province } from '$lib/types/engineer';
	import { formatDateWithWeekday } from '$lib/utils/formatters';
	import { appointmentService } from '$lib/services/appointment.service';

	let { data }: { data: PageData } = $props();

	// Filter state
	let selectedType = $state<AppointmentType | 'all'>('all');
	let dateFilter = $state<string>(''); // Date picker value
	let loading = $state(false);
	let startingAssessment = $state<string | null>(null); // Track which assessment is being started

	// Schedule/Reschedule modal state
	let showScheduleModal = $state(false);
	let selectedAppointment = $state<(typeof allAppointmentsWithDetails)[0] | null>(null);
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

	// Helper to check if appointment is overdue
	function isOverdue(appointment: Appointment): boolean {
		const now = new Date();
		const appointmentDate = new Date(appointment.appointment_date);

		// If appointment has a time, combine date and time
		if (appointment.appointment_time) {
			const [hours, minutes] = appointment.appointment_time.split(':').map(Number);
			appointmentDate.setHours(hours, minutes, 0, 0);
		} else {
			// If no time, consider overdue if date has passed (end of day)
			appointmentDate.setHours(23, 59, 59, 999);
		}

		return now > appointmentDate;
	}

	// Prepare appointment data with additional fields
	const allAppointmentsWithDetails = $derived(
		data.appointments.map((appointment) => {
			const appointmentDate = new Date(appointment.appointment_date);
			const dateKey = appointmentDate.toISOString().split('T')[0]; // YYYY-MM-DD

			return {
				...appointment,
				client_name: data.clientMap[appointment.client_id]?.name || 'Unknown Client',
				engineer_name: data.engineerMap[appointment.engineer_id]?.name || 'Unknown Engineer',
				vehicle_display:
					`${appointment.vehicle_make || ''} ${appointment.vehicle_model || ''}`.trim() || '-',
				type_display: appointment.appointment_type === 'in_person' ? 'In-Person' : 'Digital',
				location_display:
					appointment.appointment_type === 'in_person'
						? appointment.location_city || appointment.location_address || '-'
						: 'Digital',
				dateKey,
				isOverdue: isOverdue(appointment),
				// Parse time for sorting
				timeValue: appointment.appointment_time
					? parseInt(appointment.appointment_time.replace(':', ''))
					: 9999 // Put appointments without time at the end
			};
		})
	);

	// Filter appointments by type and date
	const filteredAppointments = $derived(
		allAppointmentsWithDetails.filter((apt) => {
			const typeMatch = selectedType === 'all' || apt.appointment_type === selectedType;
			const dateMatch = !dateFilter || apt.dateKey === dateFilter;
			return typeMatch && dateMatch;
		})
	);

	// Separate overdue and upcoming appointments
	const overdueAppointments = $derived(
		filteredAppointments.filter((apt) => apt.isOverdue)
	);

	const upcomingAppointments = $derived(
		filteredAppointments.filter((apt) => !apt.isOverdue)
	);

	// Group upcoming appointments by date
	const groupedByDate = $derived(() => {
		const groups = new Map<string, typeof upcomingAppointments>();

		upcomingAppointments.forEach((apt) => {
			if (!groups.has(apt.dateKey)) {
				groups.set(apt.dateKey, []);
			}
			groups.get(apt.dateKey)!.push(apt);
		});

		// Sort each group by time
		groups.forEach((appointments) => {
			appointments.sort((a, b) => a.timeValue - b.timeValue);
		});

		// Convert to array and sort by date
		return Array.from(groups.entries())
			.sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
			.map(([dateKey, appointments]) => ({
				dateKey,
				dateDisplay: formatDateWithWeekday(appointments[0].appointment_date),
				appointments
			}));
	});

	// Calculate type counts
	const typeCounts = $derived({
		all: filteredAppointments.length,
		in_person: filteredAppointments.filter((a) => a.appointment_type === 'in_person').length,
		digital: filteredAppointments.filter((a) => a.appointment_type === 'digital').length
	});

	// Format time display with duration
	function formatTimeDisplay(appointment: typeof allAppointmentsWithDetails[0]): string {
		if (!appointment.appointment_time) {
			return 'No time set';
		}

		const [hours, minutes] = appointment.appointment_time.split(':');
		const startTime = `${hours}:${minutes}`;

		// Calculate end time
		const startDate = new Date();
		startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
		const endDate = new Date(startDate.getTime() + appointment.duration_minutes * 60000);
		const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

		return `${startTime} - ${endTime}`;
	}

	function handleAppointmentClick(appointmentId: string) {
		goto(`/work/appointments/${appointmentId}`);
	}

	async function handleStartAssessment(appointmentId: string) {
		// Prevent double-click: if already starting this assessment, ignore
		if (startingAssessment === appointmentId) {
			console.log('Assessment already being started, ignoring duplicate click');
			return;
		}

		startingAssessment = appointmentId;
		try {
			// Navigate to assessment page (will auto-create assessment)
			// Status will be updated on server-side AFTER successful assessment creation
			goto(`/work/assessments/${appointmentId}`);
		} catch (error) {
			console.error('Error starting assessment:', error);
			alert('Failed to start assessment. Please try again.');
		} finally {
			// Reset after navigation delay to allow button to be clicked again if needed
			setTimeout(() => {
				startingAssessment = null;
			}, 1000);
		}
	}

	function handleOpenScheduleModal(appointment: (typeof allAppointmentsWithDetails)[0]) {
		selectedAppointment = appointment;
		scheduleDate = appointment.appointment_date.split('T')[0]; // Extract YYYY-MM-DD
		scheduleTime = appointment.appointment_time || '';
		scheduleDuration = appointment.duration_minutes;
		scheduleLocationAddress = appointment.location_address || '';
		scheduleLocationCity = appointment.location_city || '';
		scheduleLocationProvince = (appointment.location_province as Province) || '';
		scheduleLocationNotes = appointment.location_notes || '';
		scheduleNotes = appointment.notes || '';
		scheduleSpecialInstructions = appointment.special_instructions || '';
		scheduleError = null;
		showScheduleModal = true;
	}

	async function handleSaveSchedule() {
		if (!selectedAppointment) return;
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
			if (selectedAppointment.appointment_type === 'in_person') {
				updateData.location_address = scheduleLocationAddress || null;
				updateData.location_city = scheduleLocationCity || null;
				updateData.location_province = scheduleLocationProvince || null;
				updateData.location_notes = scheduleLocationNotes || null;
			}

			// Update appointment
			await appointmentService.updateAppointment(selectedAppointment.id, updateData);

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
			<Input
				type="date"
				bind:value={dateFilter}
				placeholder="Filter by date"
				class="w-48"
			/>
			{#if dateFilter}
				<Button variant="ghost" size="sm" onclick={() => (dateFilter = '')}>
					Clear
				</Button>
			{/if}
		</div>

		<!-- Type Filter -->
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
	</div>

	{#if filteredAppointments.length === 0}
		<EmptyState
			icon={Calendar}
			title="No appointments found"
			description="Appointments will appear here when scheduled from inspections"
			actionLabel="View Inspections"
			onAction={() => goto('/work/inspections')}
		/>
	{:else}
		<!-- Overdue Appointments Section -->
		{#if overdueAppointments.length > 0}
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<AlertCircle class="h-5 w-5 text-red-600" />
					<h2 class="text-lg font-semibold text-red-600">
						Overdue ({overdueAppointments.length})
					</h2>
				</div>

				<div class="space-y-3">
					{#each overdueAppointments as appointment}
						<button
							onclick={() => handleAppointmentClick(appointment.id)}
							class="w-full rounded-lg border-2 border-red-200 bg-red-50 p-4 text-left transition-all hover:border-red-300 hover:bg-red-100 hover:shadow-md"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-2">
									<!-- Header Row -->
									<div class="flex items-center gap-3">
										<Badge
											class={appointment.appointment_type === 'in_person'
												? 'bg-blue-100 text-blue-700'
												: 'bg-purple-100 text-purple-700'}
										>
											{appointment.type_display}
										</Badge>
										<span class="font-semibold text-gray-900">
											{appointment.appointment_number}
										</span>
										<div class="flex items-center gap-1 text-sm text-red-600">
											<Clock class="h-4 w-4" />
											<span class="font-medium">
												{formatTimeDisplay(appointment)}
											</span>
										</div>
									</div>

									<!-- Details Row -->
									<div class="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
										<div class="flex items-center gap-2">
											<User class="h-4 w-4 text-gray-400" />
											<span>{appointment.client_name}</span>
										</div>
										<div class="flex items-center gap-2">
											<Car class="h-4 w-4 text-gray-400" />
											<span>{appointment.vehicle_display}</span>
										</div>
										<div class="flex items-center gap-2">
											<MapPin class="h-4 w-4 text-gray-400" />
											<span>{appointment.location_display}</span>
										</div>
										<div class="flex items-center gap-2">
											<User class="h-4 w-4 text-gray-400" />
											<span class="text-gray-600">Engineer: {appointment.engineer_name}</span>
										</div>
									</div>
								</div>

								<!-- Action Buttons (vertical stack) -->
								<div class="ml-4 flex flex-col gap-2">
									<!-- Schedule/Reschedule Button -->
									<Button
										size="sm"
										variant="outline"
										onclick={(e) => {
											e.stopPropagation();
											handleOpenScheduleModal(appointment);
										}}
										disabled={loading}
									>
										<Calendar class="mr-2 h-4 w-4" />
										{appointment.appointment_time ? 'Reschedule' : 'Schedule'}
									</Button>

									<!-- Start Assessment Button -->
									<Button
										size="sm"
										onclick={(e) => {
											e.stopPropagation();
											handleStartAssessment(appointment.id);
										}}
										disabled={startingAssessment === appointment.id}
									>
										<Play class="mr-2 h-4 w-4" />
										{startingAssessment === appointment.id ? 'Starting...' : 'Start Assessment'}
									</Button>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Upcoming Appointments Section -->
		<div class="space-y-6">
			{#each groupedByDate() as dateGroup}
				<div class="space-y-3">
					<!-- Date Header -->
					<div class="flex items-center gap-2 border-b pb-2">
						<Calendar class="h-5 w-5 text-blue-600" />
						<h2 class="text-lg font-semibold text-gray-900">{dateGroup.dateDisplay}</h2>
						<Badge variant="secondary">{dateGroup.appointments.length}</Badge>
					</div>

					<!-- Appointments for this date -->
					<div class="space-y-3">
						{#each dateGroup.appointments as appointment}
							<button
								onclick={() => handleAppointmentClick(appointment.id)}
								class="w-full rounded-lg border bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-md"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1 space-y-2">
										<!-- Header Row -->
										<div class="flex items-center gap-3">
											<Badge
												class={appointment.appointment_type === 'in_person'
													? 'bg-blue-100 text-blue-700'
													: 'bg-purple-100 text-purple-700'}
											>
												{appointment.type_display}
											</Badge>
											<span class="font-semibold text-gray-900">
												{appointment.appointment_number}
											</span>
											<div class="flex items-center gap-1 text-sm text-gray-600">
												<Clock class="h-4 w-4" />
												<span class="font-medium">
													{formatTimeDisplay(appointment)}
												</span>
											</div>
										</div>

										<!-- Details Row -->
										<div class="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
											<div class="flex items-center gap-2">
												<User class="h-4 w-4 text-gray-400" />
												<span>{appointment.client_name}</span>
											</div>
											<div class="flex items-center gap-2">
												<Car class="h-4 w-4 text-gray-400" />
												<span>{appointment.vehicle_display}</span>
											</div>
											<div class="flex items-center gap-2">
												<MapPin class="h-4 w-4 text-gray-400" />
												<span>{appointment.location_display}</span>
											</div>
											<div class="flex items-center gap-2">
												<User class="h-4 w-4 text-gray-400" />
												<span class="text-gray-600">Engineer: {appointment.engineer_name}</span>
											</div>
										</div>
									</div>

									<!-- Action Buttons (vertical stack) -->
									<div class="ml-4 flex flex-col gap-2">
										<!-- Schedule/Reschedule Button -->
										<Button
											size="sm"
											variant="outline"
											onclick={(e) => {
												e.stopPropagation();
												handleOpenScheduleModal(appointment);
											}}
											disabled={loading}
										>
											<Calendar class="mr-2 h-4 w-4" />
											{appointment.appointment_time ? 'Reschedule' : 'Schedule'}
										</Button>

										<!-- Start Assessment Button -->
										<Button
											size="sm"
											onclick={(e) => {
												e.stopPropagation();
												handleStartAssessment(appointment.id);
											}}
											disabled={startingAssessment === appointment.id}
										>
											<Play class="mr-2 h-4 w-4" />
											{startingAssessment === appointment.id ? 'Starting...' : 'Start Assessment'}
										</Button>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Summary -->
		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{filteredAppointments.length}</span>
				{filteredAppointments.length === 1 ? 'appointment' : 'appointments'}
				{#if overdueAppointments.length > 0}
					<span class="text-red-600">
						({overdueAppointments.length} overdue)
					</span>
				{/if}
			</p>
		</div>
	{/if}
</div>

<!-- Schedule/Reschedule Modal -->
<Dialog bind:open={showScheduleModal}>
	<DialogContent class="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>
				{selectedAppointment?.appointment_time ? 'Reschedule' : 'Schedule'} Appointment
			</DialogTitle>
			<DialogDescription>
				Update appointment details for {selectedAppointment?.appointment_number}
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
				<label class="text-sm font-medium text-gray-900">Appointment Type</label>
				<div class="flex h-10 w-full items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
					{selectedAppointment?.type_display}
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
						class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
						class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
					class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
				/>
			</div>

			<!-- Location Fields (only for in-person appointments) -->
			{#if selectedAppointment?.appointment_type === 'in_person'}
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
							class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
								class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
							/>
						</div>
						<div class="space-y-2">
							<label for="schedule_location_province" class="text-sm font-medium text-gray-900">
								Province
							</label>
							<select
								id="schedule_location_province"
								bind:value={scheduleLocationProvince}
								class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
							class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
						></textarea>
					</div>
				</div>
			{/if}

			<!-- Notes -->
			<div class="space-y-2">
				<label for="schedule_notes" class="text-sm font-medium text-gray-900">
					Notes
				</label>
				<textarea
					id="schedule_notes"
					bind:value={scheduleNotes}
					rows="3"
					placeholder="General notes about the appointment"
					class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
					class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
