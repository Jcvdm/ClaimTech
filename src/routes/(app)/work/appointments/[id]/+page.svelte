<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
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

	function handleBack() {
		goto('/work/appointments');
	}

	async function handleStartAssessment() {
		// Update appointment status to in_progress and navigate to assessment
		loading = true;
		error = null;

		try {
			await appointmentService.updateAppointmentStatus(data.appointment.id, 'in_progress');
			// Navigate to assessment page
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
			await invalidateAll();
		} catch (err) {
			console.error('Error completing appointment:', err);
			error = err instanceof Error ? err.message : 'Failed to complete appointment';
		} finally {
			loading = false;
		}
	}

	async function handleCancelAppointment() {
		const reason = prompt('Reason for cancellation (optional):');
		if (reason === null) return; // User clicked cancel

		loading = true;
		error = null;

		try {
			await appointmentService.cancelAppointment(data.appointment.id, reason || undefined);
			await invalidateAll();
		} catch (err) {
			console.error('Error cancelling appointment:', err);
			error = err instanceof Error ? err.message : 'Failed to cancel appointment';
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


