<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import StatusBadge from '$lib/components/data/StatusBadge.svelte';
	import ActivityTimeline from '$lib/components/data/ActivityTimeline.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft,
		Calendar,
		Clock,
		MapPin,
		User,
		Car,
		FileText,
		CheckCircle,
		XCircle,
		Play
	} from 'lucide-svelte';
	import { appointmentService } from '$lib/services/appointment.service';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let showRescheduleModal = $state(false);

	// Reschedule form state
	let rescheduleDate = $state(data.appointment.appointment_date?.split('T')[0] || '');
	let rescheduleTime = $state(data.appointment.appointment_time || '');
	let rescheduleDuration = $state(data.appointment.duration_minutes || 60);
	let rescheduleLocationAddress = $state(data.appointment.location_address || '');
	let rescheduleLocationCity = $state(data.appointment.location_city || '');
	let rescheduleLocationProvince = $state(data.appointment.location_province || '');
	let rescheduleLocationNotes = $state(data.appointment.location_notes || '');
	let rescheduleNotes = $state(data.appointment.notes || '');
	let rescheduleSpecialInstructions = $state(data.appointment.special_instructions || '');
	let rescheduleReason = $state('');

	// Get minimum date for reschedule validation (today)
	const minDate = new Date().toISOString().split('T')[0];

	function handleBack() {
		goto('/work/appointments');
	}

	async function handleStartAssessment() {
		// Update appointment status and assessment stage, then navigate
		loading = true;
		error = null;

		try {
			// Step 1: Update appointment status to in_progress
			await appointmentService.updateAppointmentStatus(data.appointment.id, 'in_progress');

			// Step 2: Find assessment by appointment_id
			const assessment = await assessmentService.getAssessmentByAppointment(
				data.appointment.id
			);

			// Step 3: Update assessment stage to assessment_in_progress
			if (assessment) {
				await assessmentService.updateStage(
					assessment.id,
					'assessment_in_progress'
				);
			} else {
				console.error('No assessment found for appointment:', data.appointment.id);
				throw new Error('Assessment not found for this appointment');
			}

			// Step 4: Navigate to assessment page
			goto(`/work/assessments/${data.appointment.id}`);
		} catch (err) {
			console.error('Error starting assessment:', err);
			error = err instanceof Error ? err.message : 'Failed to start assessment';
			loading = false;
		}
	}

	async function handleCompleteAppointment() {
		if (!confirm('Mark this appointment as completed?')) return;

		loading = true;
		error = null;

		try {
			await appointmentService.updateAppointmentStatus(data.appointment.id, 'completed');
			// Refresh page to show updated status
			goto(`/work/appointments/${data.appointment.id}`);
		} catch (err) {
			console.error('Error completing appointment:', err);
			error = err instanceof Error ? err.message : 'Failed to complete appointment';
		} finally {
			loading = false;
		}
	}

	async function handleCancelAppointment() {
		const reason = prompt('Reason for cancellation (optional):\n\nNote: This will move the assessment back to inspection scheduling stage.');
		if (reason === null) return; // User clicked cancel

		loading = true;
		error = null;

		try {
			await appointmentService.cancelAppointmentWithFallback(data.appointment.id, reason || undefined);
			alert('Appointment cancelled successfully. The assessment has been moved back to inspection scheduling.');
			// Navigate back to appointments list (data will be fresh on next page)
			goto('/work/appointments');
		} catch (err) {
			console.error('Error cancelling appointment:', err);
			error = err instanceof Error ? err.message : 'Failed to cancel appointment';
		} finally {
			loading = false;
		}
	}

	function handleOpenReschedule() {
		// Reset form with current appointment data
		rescheduleDate = data.appointment.appointment_date?.split('T')[0] || '';
		rescheduleTime = data.appointment.appointment_time || '';
		rescheduleDuration = data.appointment.duration_minutes || 60;
		rescheduleLocationAddress = data.appointment.location_address || '';
		rescheduleLocationCity = data.appointment.location_city || '';
		rescheduleLocationProvince = data.appointment.location_province || '';
		rescheduleLocationNotes = data.appointment.location_notes || '';
		rescheduleNotes = data.appointment.notes || '';
		rescheduleSpecialInstructions = data.appointment.special_instructions || '';
		rescheduleReason = '';
		showRescheduleModal = true;
	}

	async function handleSaveReschedule(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		try {
			// Use proper type instead of 'any' for type safety
			const input: import('$lib/types/appointment').RescheduleAppointmentInput = {
				appointment_date: rescheduleDate,
				appointment_time: rescheduleTime || null,
				duration_minutes: rescheduleDuration,
				notes: rescheduleNotes || null,
				special_instructions: rescheduleSpecialInstructions || null,
				// Initialize location fields (will be set conditionally below)
				location_address: null,
				location_city: null,
				location_province: null,
				location_notes: null
			};

			// Add location fields for in-person appointments
			if (data.appointment.appointment_type === 'in_person') {
				input.location_address = rescheduleLocationAddress || null;
				input.location_city = rescheduleLocationCity || null;
				input.location_province = (rescheduleLocationProvince as any) || null;
				input.location_notes = rescheduleLocationNotes || null;
			}

			await appointmentService.rescheduleAppointment(
				data.appointment.id,
				input,
				rescheduleReason || undefined
			);

			showRescheduleModal = false;
			// Refresh page to show updated data
			await goto(`/work/appointments/${data.appointment.id}`, { invalidateAll: true });
		} catch (err) {
			console.error('Error rescheduling appointment:', err);
			error = err instanceof Error ? err.message : 'Failed to reschedule appointment';
		} finally {
			loading = false;
		}
	}

	// Format date and time
	const formattedDate = $derived(
		new Date(data.appointment.appointment_date).toLocaleDateString('en-ZA', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

	const formattedTime = $derived(data.appointment.appointment_time || 'Not specified');

	const typeDisplay = $derived(
		data.appointment.appointment_type === 'in_person' ? 'In-Person Inspection' : 'Digital Assessment'
	);

	const typeBadgeClass = $derived(
		data.appointment.appointment_type === 'in_person'
			? 'bg-blue-100 text-blue-700'
			: 'bg-purple-100 text-purple-700'
	);
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title={`Appointment ${data.appointment.appointment_number}`}
		description={data.client?.name || 'Unknown Client'}
	>
		{#snippet actions()}
			<Button variant="outline" onclick={handleBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to List
			</Button>

			<!-- Reschedule button for scheduled/confirmed/rescheduled appointments -->
			{#if data.appointment.status === 'scheduled' || data.appointment.status === 'confirmed' || data.appointment.status === 'rescheduled'}
				<Button variant="outline" onclick={handleOpenReschedule} disabled={loading}>
					<Calendar class="mr-2 h-4 w-4" />
					Reschedule
				</Button>
			{/if}

			<!-- Start Assessment button for scheduled/confirmed appointments -->
			{#if data.appointment.status === 'scheduled' || data.appointment.status === 'confirmed'}
				<Button variant="default" onclick={handleStartAssessment} disabled={loading}>
					<Play class="mr-2 h-4 w-4" />
					Start Assessment
				</Button>
			{/if}

			<!-- Complete button for in-progress appointments -->
			{#if data.appointment.status === 'in_progress'}
				<Button variant="default" onclick={handleCompleteAppointment} disabled={loading}>
					<CheckCircle class="mr-2 h-4 w-4" />
					Mark as Completed
				</Button>
			{/if}

			<!-- Cancel button for non-completed/non-cancelled appointments -->
			{#if data.appointment.status !== 'completed' && data.appointment.status !== 'cancelled'}
				<Button variant="destructive" onclick={handleCancelAppointment} disabled={loading}>
					<XCircle class="mr-2 h-4 w-4" />
					Cancel Appointment
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	<!-- Reschedule History Alert -->
	{#if data.appointment.reschedule_count && data.appointment.reschedule_count > 0}
		<div class="rounded-md bg-yellow-50 border border-yellow-200 p-4">
			<div class="flex items-start">
				<div class="flex-shrink-0">
					<Calendar class="h-5 w-5 text-yellow-400" />
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-yellow-800">
						Appointment Rescheduled ({data.appointment.reschedule_count} time{data.appointment.reschedule_count > 1 ? 's' : ''})
					</h3>
					{#if data.appointment.rescheduled_from_date}
						<div class="mt-2 text-sm text-yellow-700">
							<p>Original date: {new Date(data.appointment.rescheduled_from_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
						</div>
					{/if}
					{#if data.appointment.reschedule_reason}
						<div class="mt-2 text-sm text-yellow-700">
							<p><strong>Reason:</strong> {data.appointment.reschedule_reason}</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Appointment Information -->
			<Card class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Appointment Details</h3>
					<div class="flex items-center gap-2">
						<Badge class={typeBadgeClass}>{typeDisplay}</Badge>
						<StatusBadge status={data.appointment.status} />
					</div>
				</div>

				<div class="grid gap-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm font-medium text-gray-500">Appointment Number</p>
							<p class="mt-1 text-sm text-gray-900">{data.appointment.appointment_number}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Duration</p>
							<p class="mt-1 text-sm text-gray-900">{data.appointment.duration_minutes} minutes</p>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<div class="flex items-center gap-2">
								<Calendar class="h-4 w-4 text-gray-400" />
								<p class="text-sm font-medium text-gray-500">Date</p>
							</div>
							<p class="mt-1 text-sm text-gray-900">{formattedDate}</p>
						</div>
						<div>
							<div class="flex items-center gap-2">
								<Clock class="h-4 w-4 text-gray-400" />
								<p class="text-sm font-medium text-gray-500">Time</p>
							</div>
							<p class="mt-1 text-sm text-gray-900">{formattedTime}</p>
						</div>
					</div>

					<div>
						<div class="flex items-center gap-2">
							<User class="h-4 w-4 text-gray-400" />
							<p class="text-sm font-medium text-gray-500">Engineer</p>
						</div>
						<p class="mt-1 text-sm text-gray-900">
							{data.engineer?.name || 'Unknown Engineer'}
						</p>
						{#if data.engineer?.email}
							<p class="mt-1 text-sm text-gray-500">{data.engineer.email}</p>
						{/if}
						{#if data.engineer?.phone}
							<p class="mt-1 text-sm text-gray-500">{data.engineer.phone}</p>
						{/if}
					</div>
				</div>
			</Card>

			<!-- Location Card (for in-person only) -->
			{#if data.appointment.appointment_type === 'in_person'}
				<Card class="p-6">
					<div class="mb-4 flex items-center gap-2">
						<MapPin class="h-5 w-5 text-gray-500" />
						<h3 class="text-lg font-semibold text-gray-900">Location</h3>
					</div>

					<div class="space-y-3">
						{#if data.appointment.location_address}
							<div>
								<p class="text-sm font-medium text-gray-500">Address</p>
								<p class="mt-1 text-sm text-gray-900">{data.appointment.location_address}</p>
							</div>
						{/if}

						<div class="grid gap-3 md:grid-cols-2">
							{#if data.appointment.location_city}
								<div>
									<p class="text-sm font-medium text-gray-500">City</p>
									<p class="mt-1 text-sm text-gray-900">{data.appointment.location_city}</p>
								</div>
							{/if}
							{#if data.appointment.location_province}
								<div>
									<p class="text-sm font-medium text-gray-500">Province</p>
									<p class="mt-1 text-sm text-gray-900">{data.appointment.location_province}</p>
								</div>
							{/if}
						</div>

						{#if data.appointment.location_notes}
							<div>
								<p class="text-sm font-medium text-gray-500">Location Notes</p>
								<p class="mt-1 text-sm text-gray-900">{data.appointment.location_notes}</p>
							</div>
						{/if}
					</div>
				</Card>
			{/if}

			<!-- Vehicle Information -->
			<Card class="p-6">
				<div class="mb-4 flex items-center gap-2">
					<Car class="h-5 w-5 text-gray-500" />
					<h3 class="text-lg font-semibold text-gray-900">Vehicle Information</h3>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					{#if data.appointment.vehicle_make || data.appointment.vehicle_model}
						<div>
							<p class="text-sm font-medium text-gray-500">Make & Model</p>
							<p class="mt-1 text-sm text-gray-900">
								{data.appointment.vehicle_make || ''} {data.appointment.vehicle_model || ''}
							</p>
						</div>
					{/if}
					{#if data.appointment.vehicle_year}
						<div>
							<p class="text-sm font-medium text-gray-500">Year</p>
							<p class="mt-1 text-sm text-gray-900">{data.appointment.vehicle_year}</p>
						</div>
					{/if}
					{#if data.appointment.vehicle_registration}
						<div>
							<p class="text-sm font-medium text-gray-500">Registration</p>
							<p class="mt-1 text-sm text-gray-900">{data.appointment.vehicle_registration}</p>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Inspection Details -->
			<Card class="p-6">
				<div class="mb-4 flex items-center gap-2">
					<FileText class="h-5 w-5 text-gray-500" />
					<h3 class="text-lg font-semibold text-gray-900">Related Records</h3>
				</div>

				<div class="grid gap-3">
					<div class="grid grid-cols-3 gap-2">
						<dt class="text-sm font-medium text-gray-500">Inspection #:</dt>
						<dd class="col-span-2 text-sm text-gray-900">
							<a
								href="/work/inspections/{data.inspection?.id}"
								class="text-blue-600 hover:underline"
							>
								{data.inspection?.inspection_number || 'N/A'}
							</a>
						</dd>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<dt class="text-sm font-medium text-gray-500">Request #:</dt>
						<dd class="col-span-2 text-sm text-gray-900">
							<a href="/requests/{data.request?.id}" class="text-blue-600 hover:underline">
								{data.request?.request_number || 'N/A'}
							</a>
						</dd>
					</div>
					{#if data.inspection?.claim_number}
						<div class="grid grid-cols-3 gap-2">
							<dt class="text-sm font-medium text-gray-500">Claim #:</dt>
							<dd class="col-span-2 text-sm text-gray-900">{data.inspection.claim_number}</dd>
						</div>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Client Information -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Client Information</h3>
				<div class="space-y-3">
					<div>
						<p class="text-sm font-medium text-gray-500">Name</p>
						<p class="mt-1 text-sm text-gray-900">
							<a href="/clients/{data.client?.id}" class="text-blue-600 hover:underline">
								{data.client?.name || 'Unknown'}
							</a>
						</p>
					</div>
					{#if data.client?.email}
						<div>
							<p class="text-sm font-medium text-gray-500">Email</p>
							<p class="mt-1 text-sm text-gray-900">{data.client.email}</p>
						</div>
					{/if}
					{#if data.client?.phone}
						<div>
							<p class="text-sm font-medium text-gray-500">Phone</p>
							<p class="mt-1 text-sm text-gray-900">{data.client.phone}</p>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Notes -->
			{#if data.appointment.special_instructions || data.appointment.notes}
				<Card class="p-6">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Notes</h3>
					<div class="space-y-3">
						{#if data.appointment.special_instructions}
							<div>
								<p class="text-sm font-medium text-gray-500">Special Instructions</p>
								<p class="mt-1 text-sm text-gray-900">{data.appointment.special_instructions}</p>
							</div>
						{/if}
						{#if data.appointment.notes}
							<div>
								<p class="text-sm font-medium text-gray-500">General Notes</p>
								<p class="mt-1 text-sm text-gray-900">{data.appointment.notes}</p>
							</div>
						{/if}
					</div>
				</Card>
			{/if}

			<!-- Activity Log -->
			{#if data.auditLogs && data.auditLogs.length > 0}
				<Card class="p-6">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Activity Log</h3>
					<ActivityTimeline logs={data.auditLogs} />
				</Card>
			{/if}
		</div>
	</div>
</div>

<!-- Reschedule Modal -->
{#if showRescheduleModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
			<form onsubmit={handleSaveReschedule} class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">Reschedule Appointment</h2>
					<button
						type="button"
						onclick={() => showRescheduleModal = false}
						class="text-gray-400 hover:text-gray-600"
					>
						<XCircle class="h-6 w-6" />
					</button>
				</div>

				<div class="space-y-4">
					<!-- Date and Time -->
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<label for="reschedule-date" class="block text-sm font-medium text-gray-700">Date *</label>
							<input
								type="date"
								id="reschedule-date"
								bind:value={rescheduleDate}
								min={minDate}
								required
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>

						<div>
							<label for="reschedule-time" class="block text-sm font-medium text-gray-700">Time</label>
							<input
								type="time"
								id="reschedule-time"
								bind:value={rescheduleTime}
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>
					</div>

					<!-- Duration -->
					<div>
						<label for="reschedule-duration" class="block text-sm font-medium text-gray-700">Duration (minutes)</label>
						<input
							type="number"
							id="reschedule-duration"
							bind:value={rescheduleDuration}
							min="15"
							step="15"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<!-- Location fields (for in-person appointments) -->
					{#if data.appointment.appointment_type === 'in_person'}
						<div class="space-y-4 border-t pt-4">
							<h3 class="text-sm font-medium text-gray-900">Location Information</h3>

							<div>
								<label for="reschedule-address" class="block text-sm font-medium text-gray-700">Address</label>
								<input
									type="text"
									id="reschedule-address"
									bind:value={rescheduleLocationAddress}
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>

							<div class="grid gap-4 md:grid-cols-2">
								<div>
									<label for="reschedule-city" class="block text-sm font-medium text-gray-700">City</label>
									<input
										type="text"
										id="reschedule-city"
										bind:value={rescheduleLocationCity}
										class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>

								<div>
									<label for="reschedule-province" class="block text-sm font-medium text-gray-700">Province</label>
									<input
										type="text"
										id="reschedule-province"
										bind:value={rescheduleLocationProvince}
										class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
							</div>

							<div>
								<label for="reschedule-location-notes" class="block text-sm font-medium text-gray-700">Location Notes</label>
								<textarea
									id="reschedule-location-notes"
									bind:value={rescheduleLocationNotes}
									rows="2"
									class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								></textarea>
							</div>
						</div>
					{/if}

					<!-- Notes and Instructions -->
					<div class="space-y-4 border-t pt-4">
						<div>
							<label for="reschedule-notes" class="block text-sm font-medium text-gray-700">General Notes</label>
							<textarea
								id="reschedule-notes"
								bind:value={rescheduleNotes}
								rows="2"
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							></textarea>
						</div>

						<div>
							<label for="reschedule-special-instructions" class="block text-sm font-medium text-gray-700">Special Instructions</label>
							<textarea
								id="reschedule-special-instructions"
								bind:value={rescheduleSpecialInstructions}
								rows="2"
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							></textarea>
						</div>

						<div>
							<label for="reschedule-reason" class="block text-sm font-medium text-gray-700">Reason for Rescheduling (optional)</label>
							<textarea
								id="reschedule-reason"
								bind:value={rescheduleReason}
								rows="3"
								placeholder="e.g., Client requested different time due to work conflict"
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							></textarea>
						</div>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						onclick={() => showRescheduleModal = false}
						disabled={loading}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="default"
						disabled={loading}
					>
						{loading ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}


