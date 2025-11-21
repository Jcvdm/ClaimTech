<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import StatusBadge from '$lib/components/data/StatusBadge.svelte';
	import ActivityTimeline from '$lib/components/data/ActivityTimeline.svelte';
	import FormField from '$lib/components/forms/FormField.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import {
		ArrowLeft,
		Edit,
		Car,
		User,
		FileText,
		UserPlus,
		CheckCircle,
		XCircle,
		RotateCcw,
		Calendar,
		MapPin,
		Clock,
		ClipboardList
	} from 'lucide-svelte';
	import { inspectionService } from '$lib/services/inspection.service';
	import { requestService } from '$lib/services/request.service';
	import { appointmentService } from '$lib/services/appointment.service';
	import { assessmentService } from '$lib/services/assessment.service';
	import type { PageData } from './$types';
	import { formatDateLong as formatDate } from '$lib/utils/formatters';
	import type { AppointmentType } from '$lib/types/appointment';

	let { data }: { data: PageData } = $props();

	// ASSESSMENT-CENTRIC ARCHITECTURE: Create helper variables for backward compatibility
	// The page now receives data.assessment and data.inspection (inspection may be null)
	// We create a virtual "inspection" object that merges data from both sources
	const inspection = $derived({
		// Use inspection data if available, otherwise fall back to request/assessment data
		id: data.inspection?.id || data.assessment.id,
		inspection_number: data.inspection?.inspection_number || data.assessment.assessment_number,
		request_number: data.request?.request_number || '',
		request_id: data.assessment.request_id,
		client_id: data.request?.client_id || '',
		claim_number: data.request?.claim_number || null,
		type: data.request?.type || 'private',
		notes: data.inspection?.notes || data.request?.description || null,
		inspection_location: data.inspection?.inspection_location || null,
		status: data.inspection?.status || data.assessment.status,
		assigned_engineer_id: data.inspection?.assigned_engineer_id || data.request?.assigned_engineer_id || null,
		vehicle_province: data.inspection?.vehicle_province || data.request?.vehicle_province || null,
		vehicle_make: data.inspection?.vehicle_make || data.request?.vehicle_make || null,
		vehicle_model: data.inspection?.vehicle_model || data.request?.vehicle_model || null,
		vehicle_year: data.inspection?.vehicle_year || data.request?.vehicle_year || null,
		vehicle_color: data.inspection?.vehicle_color || data.request?.vehicle_color || null,
		vehicle_registration: data.inspection?.vehicle_registration || data.request?.vehicle_registration || null,
		vehicle_mileage: data.inspection?.vehicle_mileage || data.request?.vehicle_mileage || null,
		vehicle_vin: data.inspection?.vehicle_vin || data.request?.vehicle_vin || null,
		created_at: data.assessment.created_at,
		updated_at: data.assessment.updated_at,
		accepted_at: data.inspection?.accepted_at || null,
		scheduled_date: data.inspection?.scheduled_date || null
	});

	let showAppointmentModal = $state(false);
	let selectedEngineerId = $state('');
	let scheduledDate = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Appointment creation modal state
	let showCreateAppointmentModal = $state(false);
	let appointmentType = $state<AppointmentType>('in_person');
	let appointmentDate = $state('');
	let appointmentTime = $state('');
	let appointmentDuration = $state(60);
	let locationAddress = $state('');
	let locationCity = $state('');
	let locationProvince = $state('');
	let locationNotes = $state('');
	let appointmentNotes = $state('');
	let specialInstructions = $state('');

	function handleBack() {
		goto('/work/inspections');
	}

	async function handleCancelInspection() {
		if (
			!confirm(
				'Are you sure you want to cancel this inspection? This will revert the request status.'
			)
		) {
			return;
		}

		loading = true;
		error = null;

		try {
			// Cancel inspection (if exists)
			if (data.inspection) {
				await inspectionService.updateInspectionStatus(data.inspection.id, 'cancelled');
			}

			// Revert request status back to submitted
			await requestService.updateRequest(data.assessment.request_id, {
				status: 'submitted',
				current_step: 'request',
				assigned_engineer_id: null
			});

			// CRITICAL: Clear foreign keys BEFORE stage transition (follows check constraint)
			// Stage 1 (request_submitted) requires appointment_id and inspection_id to be NULL
			await assessmentService.updateAssessment(
				data.assessment.id,
				{ appointment_id: null, inspection_id: null },
				$page.data.supabase
			);

			// NOW safe to update assessment stage (constraint satisfied)
			await assessmentService.updateStage(
				data.assessment.id,
				'request_submitted',
				$page.data.supabase
			);

			// Navigate to archive with cancelled tab selected
			goto('/work/archive?tab=cancelled');
		} catch (err) {
			console.error('Error cancelling inspection:', err);
			error = err instanceof Error ? err.message : 'Failed to cancel inspection';
		} finally {
			loading = false;
		}
	}

	async function handleReactivateInspection() {
		if (!confirm('Are you sure you want to reactivate this inspection?')) {
			return;
		}

		loading = true;
		error = null;

		try {
			// Reactivate inspection to pending status (if exists)
			if (data.inspection) {
				await inspectionService.updateInspectionStatus(data.inspection.id, 'pending');
			}

			// Update request status back to in_progress
			await requestService.updateRequest(data.assessment.request_id, {
				status: 'in_progress',
				current_step: 'assessment'
			});

			// Update assessment stage
			await assessmentService.updateStage(
				data.assessment.id,
				'inspection_scheduled',
				$page.data.supabase
			);

			// Navigate back to inspections list (data will be fresh on next page)
			goto('/work/inspections');
		} catch (err) {
			console.error('Error reactivating inspection:', err);
			error = err instanceof Error ? err.message : 'Failed to reactivate inspection';
		} finally {
			loading = false;
		}
	}

	function handleOpenAppointmentModal() {
		showAppointmentModal = true;
		selectedEngineerId = '';
		scheduledDate = '';
		error = null;
	}

	async function handleAppointEngineer() {
		if (!selectedEngineerId) {
			error = 'Please select an engineer';
			return;
		}

		loading = true;
		error = null;

		try {
			// Appoint engineer to inspection (if inspection exists)
			if (data.inspection) {
				await inspectionService.appointEngineer(
					data.inspection.id,
					selectedEngineerId,
					scheduledDate || undefined
				);
			}

			// Update request with assigned engineer and move to assessment step
			await requestService.updateRequest(data.assessment.request_id, {
				assigned_engineer_id: selectedEngineerId,
				current_step: 'assessment'
			});

			showAppointmentModal = false;

			// ✅ Refresh page data to show updated engineer assignment
			// Uses assessment ID (assessment-centric)
			await goto(`/work/inspections/${data.assessment.id}`, { invalidateAll: true });
		} catch (err) {
			console.error('Error appointing engineer:', err);
			error = err instanceof Error ? err.message : 'Failed to appoint engineer';
		} finally {
			loading = false;
		}
	}

	function handleReassignEngineer() {
		handleOpenAppointmentModal();
	}

	function handleOpenCreateAppointmentModal() {
		showCreateAppointmentModal = true;
		appointmentType = 'in_person';
		appointmentDate = '';
		appointmentTime = '';
		appointmentDuration = 60;
		locationAddress = '';
		locationCity = '';
		locationProvince = inspection.vehicle_province || '';
		locationNotes = '';
		appointmentNotes = '';
		specialInstructions = '';
		error = null;
	}

	async function handleCreateAppointment() {
		if (!appointmentDate) {
			error = 'Please select an appointment date';
			return;
		}

		if (!inspection.assigned_engineer_id) {
			error = 'No engineer assigned to this inspection';
			return;
		}

		// VALIDATION: Ensure inspection exists (not an early-stage assessment)
		if (!data.inspection) {
			error = 'Cannot create appointment: No inspection assigned to this assessment';
			return;
		}

		// VALIDATION: Ensure assessment has inspection_id populated
		if (!data.assessment.inspection_id) {
			error = 'Data integrity error: Assessment does not have inspection_id set';
			return;
		}

		loading = true;
		error = null;

		try {
			// ASSESSMENT-CENTRIC: Create appointment with validated inspection_id
			const appointment = await appointmentService.createAppointment({
				inspection_id: data.assessment.inspection_id, // Use assessment's FK (validated above)
				request_id: data.assessment.request_id,
				client_id: data.request?.client_id || '',
				engineer_id: inspection.assigned_engineer_id,
				appointment_type: appointmentType,
				appointment_date: appointmentDate,
				appointment_time: appointmentTime || undefined,
				duration_minutes: appointmentDuration,
				location_address: appointmentType === 'in_person' ? locationAddress : undefined,
				location_city: appointmentType === 'in_person' ? locationCity : undefined,
				location_province: appointmentType === 'in_person' ? (locationProvince as any) : undefined,
				location_notes: appointmentType === 'in_person' ? locationNotes : undefined,
				notes: appointmentNotes || undefined,
				special_instructions: specialInstructions || undefined,
				vehicle_make: inspection.vehicle_make || undefined,
				vehicle_model: inspection.vehicle_model || undefined,
				vehicle_year: inspection.vehicle_year || undefined,
				vehicle_registration: inspection.vehicle_registration || undefined
			});

			// VALIDATION: Verify appointment's inspection_id matches before linking
			if (appointment.inspection_id !== data.assessment.inspection_id) {
				throw new Error('Data integrity error: Appointment inspection_id mismatch');
			}

			// ASSESSMENT-CENTRIC: Link appointment directly to assessment (validated)
			await assessmentService.updateAssessment(
				data.assessment.id,
				{ appointment_id: appointment.id },
				$page.data.supabase
			);

			// Update assessment stage to appointment_scheduled
			await assessmentService.updateStage(
				data.assessment.id,
				'appointment_scheduled',
				$page.data.supabase
			);

			showCreateAppointmentModal = false;
			// Navigate to appointments list with cache invalidation to show new appointment
			goto('/work/appointments', { invalidateAll: true });
		} catch (err) {
			console.error('Error creating appointment:', err);
			error = err instanceof Error ? err.message : 'Failed to create appointment';
		} finally {
			loading = false;
		}
	}

	const engineerOptions = [
		{ value: '', label: 'Select an engineer...' },
		...(data.availableEngineers || []).map((engineer) => ({
			value: engineer.id,
			label: `${engineer.name} - ${engineer.company_name || 'N/A'}`
		}))
	];
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title={`Inspection ${inspection.inspection_number}`}
		description={data.client?.name || 'Unknown Client'}
	>
		{#snippet actions()}
			<Button variant="outline" onclick={handleBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to List
			</Button>
			<Button variant="outline">
				<Edit class="mr-2 h-4 w-4" />
				Edit
			</Button>

			<!-- Show Cancel button for non-cancelled/non-completed inspections -->
			{#if inspection.status !== 'completed' && inspection.status !== 'cancelled'}
				<Button variant="destructive" onclick={handleCancelInspection} disabled={loading}>
					<XCircle class="mr-2 h-4 w-4" />
					Cancel Inspection
				</Button>
			{/if}

			<!-- Show Reactivate button for cancelled inspections -->
			{#if inspection.status === 'cancelled'}
				<Button variant="default" onclick={handleReactivateInspection} disabled={loading}>
					<RotateCcw class="mr-2 h-4 w-4" />
					Reactivate Inspection
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Inspection Information -->
			<Card class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Inspection Details</h3>
					<StatusBadge status={inspection.status} />
				</div>

				<div class="grid gap-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm font-medium text-gray-500">Inspection Number</p>
							<p class="mt-1 text-sm text-gray-900">{inspection.inspection_number}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Request Number</p>
							<p class="mt-1 text-sm text-gray-900">{inspection.request_number}</p>
						</div>
					</div>

					{#if inspection.claim_number}
						<div>
							<p class="text-sm font-medium text-gray-500">Claim Number</p>
							<p class="mt-1 text-sm text-gray-900">{inspection.claim_number}</p>
						</div>
					{/if}

					<div>
						<p class="text-sm font-medium text-gray-500">Type</p>
						<p class="mt-1">
							<Badge variant={inspection.type === 'insurance' ? 'default' : 'secondary'}>
								{inspection.type === 'insurance' ? 'Insurance' : 'Private'}
							</Badge>
						</p>
					</div>

					{#if inspection.notes}
						<div>
							<p class="text-sm font-medium text-gray-500">Notes</p>
							<p class="mt-1 text-sm text-gray-900">{inspection.notes}</p>
						</div>
					{/if}

					{#if inspection.inspection_location}
						<div>
							<p class="text-sm font-medium text-gray-500">Inspection Location</p>
							<p class="mt-1 text-sm text-gray-900">{inspection.inspection_location}</p>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Engineer Assignment -->
			{#if data.assignedEngineer}
				<!-- Assigned Engineer Card -->
				<Card class="p-6">
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<CheckCircle class="h-5 w-5 text-green-600" />
							<h3 class="text-lg font-semibold text-gray-900">Assigned Engineer</h3>
						</div>
						<Button variant="outline" size="sm" onclick={handleReassignEngineer}>
							<UserPlus class="mr-2 h-4 w-4" />
							Change Engineer
						</Button>
					</div>

					<div class="grid gap-4">
						<div class="grid gap-4 md:grid-cols-2">
							<div>
								<p class="text-sm font-medium text-gray-500">Name</p>
								<p class="mt-1 text-sm text-gray-900">{data.assignedEngineer.name}</p>
							</div>
							<div>
								<p class="text-sm font-medium text-gray-500">Email</p>
								<p class="mt-1 text-sm">
									<a
										href="mailto:{data.assignedEngineer.email}"
										class="text-blue-600 hover:underline"
									>
										{data.assignedEngineer.email}
									</a>
								</p>
							</div>
						</div>

						{#if data.assignedEngineer.phone}
							<div>
								<p class="text-sm font-medium text-gray-500">Phone</p>
								<p class="mt-1 text-sm">
									<a
										href="tel:{data.assignedEngineer.phone}"
										class="text-blue-600 hover:underline"
									>
										{data.assignedEngineer.phone}
									</a>
								</p>
							</div>
						{/if}

						<div class="grid gap-4 md:grid-cols-2">
							{#if data.assignedEngineer.province}
								<div>
									<p class="text-sm font-medium text-gray-500">Province</p>
									<p class="mt-1 text-sm text-gray-900">{data.assignedEngineer.province}</p>
								</div>
							{/if}

							{#if data.assignedEngineer.company_name}
								<div>
									<p class="text-sm font-medium text-gray-500">Company</p>
									<p class="mt-1 text-sm text-gray-900">{data.assignedEngineer.company_name}</p>
								</div>
							{/if}
						</div>

						{#if inspection.scheduled_date}
							<div>
								<p class="text-sm font-medium text-gray-500">Scheduled Date</p>
								<p class="mt-1 text-sm text-gray-900">
									{formatDate(inspection.scheduled_date)}
								</p>
							</div>
						{/if}
					</div>

					<!-- Schedule Appointment Button -->
					{#if inspection.status === 'scheduled' || inspection.status === 'in_progress'}
						<div class="mt-4 border-t pt-4 space-y-2">
							<Button class="w-full" onclick={handleOpenCreateAppointmentModal}>
								<Calendar class="mr-2 h-4 w-4" />
								Schedule Appointment
							</Button>

							<!-- View Assessment Button (if appointment exists) -->
							{#if data.appointment}
								<Button
									class="w-full"
									variant="outline"
									onclick={() => goto(`/work/assessments/${data.appointment?.id}`)}
								>
									<ClipboardList class="mr-2 h-4 w-4" />
									View Assessment
								</Button>
							{/if}
						</div>
					{/if}
				</Card>
			{:else if inspection.status === 'pending'}
				<!-- Appoint Engineer Card -->
				<Card class="border-dashed border-2 border-blue-300 bg-blue-50 p-6">
					<div class="text-center">
						<UserPlus class="mx-auto h-12 w-12 text-blue-600" />
						<h3 class="mt-4 text-lg font-semibold text-gray-900">Appoint an Engineer</h3>
						<p class="mt-2 text-sm text-gray-600">
							{#if inspection.vehicle_province}
								Select an engineer from {inspection.vehicle_province} to conduct this inspection.
							{:else}
								Select an engineer to conduct this inspection.
							{/if}
						</p>
						{#if data.availableEngineers && data.availableEngineers.length > 0}
							<Button class="mt-4" onclick={handleOpenAppointmentModal}>
								<UserPlus class="mr-2 h-4 w-4" />
								Appoint Engineer
							</Button>
						{:else}
							<p class="mt-4 text-sm text-red-600">
								No engineers available
								{#if inspection.vehicle_province}
									in {inspection.vehicle_province}
								{/if}
							</p>
							<Button variant="outline" class="mt-2" href="/engineers/new">
								<UserPlus class="mr-2 h-4 w-4" />
								Add New Engineer
							</Button>
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

				<div class="grid gap-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm font-medium text-gray-500">Make & Model</p>
							<p class="mt-1 text-sm text-gray-900">
								{inspection.vehicle_make || '-'}
								{inspection.vehicle_model || ''}
							</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Year</p>
							<p class="mt-1 text-sm text-gray-900">{inspection.vehicle_year || '-'}</p>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-3">
						<div>
							<p class="text-sm font-medium text-gray-500">Color</p>
							<p class="mt-1 text-sm text-gray-900">{inspection.vehicle_color || '-'}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Registration</p>
							<p class="mt-1 text-sm text-gray-900">
								{inspection.vehicle_registration || '-'}
							</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Mileage</p>
							<p class="mt-1 text-sm text-gray-900">
								{inspection.vehicle_mileage
									? `${inspection.vehicle_mileage.toLocaleString()} km`
									: '-'}
							</p>
						</div>
					</div>

					{#if inspection.vehicle_vin}
						<div>
							<p class="text-sm font-medium text-gray-500">VIN</p>
							<p class="mt-1 font-mono text-xs text-gray-900">{inspection.vehicle_vin}</p>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Original Request Information -->
			{#if data.request}
				<Card class="p-6">
					<div class="mb-4 flex items-center gap-2">
						<FileText class="h-5 w-5 text-gray-500" />
						<h3 class="text-lg font-semibold text-gray-900">Original Request</h3>
					</div>

					<div class="grid gap-4">
						{#if data.request.description}
							<div>
								<p class="text-sm font-medium text-gray-500">Description</p>
								<p class="mt-1 text-sm text-gray-900">{data.request.description}</p>
							</div>
						{/if}

						{#if data.request.date_of_loss}
							<div>
								<p class="text-sm font-medium text-gray-500">Date of Loss</p>
								<p class="mt-1 text-sm text-gray-900">{formatDate(data.request.date_of_loss)}</p>
							</div>
						{/if}

						{#if data.request.incident_description}
							<div>
								<p class="text-sm font-medium text-gray-500">Incident Description</p>
								<p class="mt-1 text-sm text-gray-900">{data.request.incident_description}</p>
							</div>
						{/if}
					</div>
				</Card>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Client Information -->
			{#if data.client}
				<Card class="p-6">
					<div class="mb-4 flex items-center gap-2">
						<User class="h-5 w-5 text-gray-500" />
						<h3 class="text-lg font-semibold text-gray-900">Client</h3>
					</div>

					<div class="space-y-3">
						<div>
							<p class="text-sm font-medium text-gray-500">Name</p>
							<p class="mt-1 text-sm text-gray-900">{data.client.name}</p>
						</div>

						{#if data.client.contact_name}
							<div>
								<p class="text-sm font-medium text-gray-500">Contact Person</p>
								<p class="mt-1 text-sm text-gray-900">{data.client.contact_name}</p>
							</div>
						{/if}

						{#if data.client.email}
							<div>
								<p class="text-sm font-medium text-gray-500">Email</p>
								<p class="mt-1 text-sm">
									<a href="mailto:{data.client.email}" class="text-blue-600 hover:underline">
										{data.client.email}
									</a>
								</p>
							</div>
						{/if}

						{#if data.client.phone}
							<div>
								<p class="text-sm font-medium text-gray-500">Phone</p>
								<p class="mt-1 text-sm">
									<a href="tel:{data.client.phone}" class="text-blue-600 hover:underline">
										{data.client.phone}
									</a>
								</p>
							</div>
						{/if}

						<Separator />

						<Button
							variant="outline"
							class="w-full"
							onclick={() => goto(`/clients/${data.client?.id}`)}
						>
							View Client Details
						</Button>
					</div>
				</Card>
			{/if}

			<!-- Metadata -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Metadata</h3>

				<div class="space-y-3 text-sm">
					<div>
						<p class="font-medium text-gray-500">Created</p>
						<p class="mt-1 text-gray-900">{formatDate(inspection.created_at)}</p>
					</div>

					<div>
						<p class="font-medium text-gray-500">Last Updated</p>
						<p class="mt-1 text-gray-900">{formatDate(inspection.updated_at)}</p>
					</div>

					{#if inspection.accepted_at}
						<div>
							<p class="font-medium text-gray-500">Accepted</p>
							<p class="mt-1 text-gray-900">{formatDate(inspection.accepted_at)}</p>
						</div>
					{/if}

					{#if inspection.scheduled_date}
						<div>
							<p class="font-medium text-gray-500">Scheduled Date</p>
							<p class="mt-1 text-gray-900">{formatDate(inspection.scheduled_date)}</p>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Activity Log -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Activity Log</h3>
				<ActivityTimeline logs={data.auditLogs} />
			</Card>
		</div>
	</div>
</div>

<!-- Appointment Modal -->
<Dialog bind:open={showAppointmentModal}>
	<DialogContent class="sm:max-w-[500px]">
		<DialogHeader>
			<DialogTitle>Appoint Engineer</DialogTitle>
			<DialogDescription>
				Select an engineer to conduct this inspection
				{#if inspection.vehicle_province}
					in {inspection.vehicle_province}
				{/if}.
			</DialogDescription>
		</DialogHeader>

		{#if error}
			<div class="rounded-md bg-red-50 p-3">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<label for="engineer" class="text-sm font-medium text-gray-900">Engineer</label>
				<select
					id="engineer"
					bind:value={selectedEngineerId}
					class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#each engineerOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			{#if selectedEngineerId}
				{@const selectedEngineer = data.availableEngineers?.find(
					(e) => e.id === selectedEngineerId
				)}
				{#if selectedEngineer}
					<div class="rounded-lg border bg-gray-50 p-4">
						<p class="text-sm font-medium text-gray-900">Engineer Details</p>
						<div class="mt-2 space-y-1 text-sm text-gray-600">
							<p>
								<span class="font-medium">Email:</span>
								{selectedEngineer.email}
							</p>
							{#if selectedEngineer.phone}
								<p>
									<span class="font-medium">Phone:</span>
									{selectedEngineer.phone}
								</p>
							{/if}
							{#if selectedEngineer.province}
								<p>
									<span class="font-medium">Province:</span>
									{selectedEngineer.province}
								</p>
							{/if}
							{#if selectedEngineer.company_name}
								<p>
									<span class="font-medium">Company:</span>
									{selectedEngineer.company_name}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			{/if}

			<div class="space-y-2">
				<label for="scheduled_date" class="text-sm font-medium text-gray-900">
					Scheduled Date (Optional)
				</label>
				<input
					id="scheduled_date"
					type="date"
					bind:value={scheduledDate}
					class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				/>
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (showAppointmentModal = false)} disabled={loading}>
				Cancel
			</Button>
			<Button onclick={handleAppointEngineer} disabled={loading || !selectedEngineerId}>
				{loading ? 'Appointing...' : 'Appoint Engineer'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Create Appointment Modal -->
<Dialog bind:open={showCreateAppointmentModal}>
	<DialogContent class="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>Schedule Appointment</DialogTitle>
			<DialogDescription>
				Create an appointment for this inspection - choose between in-person or digital assessment
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4 py-4">
			{#if error}
				<div class="rounded-md bg-red-50 p-3">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			<!-- Appointment Type -->
			<div class="space-y-2">
				<fieldset>
					<legend class="text-sm font-medium text-gray-900">Appointment Type</legend>
					<div class="flex gap-4 mt-1">
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								bind:group={appointmentType}
								value="in_person"
								class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<span class="text-sm text-gray-700">In-Person Inspection</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								bind:group={appointmentType}
								value="digital"
								class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<span class="text-sm text-gray-700">Digital Assessment</span>
						</label>
					</div>
				</fieldset>
			</div>

			<!-- Date and Time -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<label for="appointment_date" class="text-sm font-medium text-gray-900">
						Date <span class="text-red-500">*</span>
					</label>
					<input
						id="appointment_date"
						type="date"
						bind:value={appointmentDate}
						required
						class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
					/>
				</div>
				<div class="space-y-2">
					<label for="appointment_time" class="text-sm font-medium text-gray-900">
						Time (Optional)
					</label>
					<input
						id="appointment_time"
						type="time"
						bind:value={appointmentTime}
						class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
					/>
				</div>
			</div>

			<!-- Duration -->
			<div class="space-y-2">
				<label for="duration" class="text-sm font-medium text-gray-900">Duration</label>
				<select
					id="duration"
					bind:value={appointmentDuration}
					class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
				>
					<option value={30}>30 minutes</option>
					<option value={60}>1 hour</option>
					<option value={90}>1.5 hours</option>
					<option value={120}>2 hours</option>
					<option value={180}>3 hours</option>
				</select>
			</div>

			<!-- Location fields (only for in-person) -->
			{#if appointmentType === 'in_person'}
				<div class="space-y-4 border-t pt-4">
					<h4 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
						<MapPin class="h-4 w-4" />
						Location Details
					</h4>

					<div class="space-y-2">
						<label for="location_address" class="text-sm font-medium text-gray-900">
							Address
						</label>
						<input
							id="location_address"
							type="text"
							bind:value={locationAddress}
							placeholder="Street address"
							class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
						/>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<label for="location_city" class="text-sm font-medium text-gray-900">City</label>
							<input
								id="location_city"
								type="text"
								bind:value={locationCity}
								placeholder="City"
								class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
							/>
						</div>
						<div class="space-y-2">
							<label for="location_province" class="text-sm font-medium text-gray-900">
								Province
							</label>
							<input
								id="location_province"
								type="text"
								bind:value={locationProvince}
								placeholder="Province"
								class="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<label for="location_notes" class="text-sm font-medium text-gray-900">
							Location Notes
						</label>
						<textarea
							id="location_notes"
							bind:value={locationNotes}
							placeholder="Directions, parking info, access codes, etc."
							rows="2"
							class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
						></textarea>
					</div>
				</div>
			{/if}

			<!-- Special Instructions -->
			<div class="space-y-2">
				<label for="special_instructions" class="text-sm font-medium text-gray-900">
					Special Instructions
				</label>
				<textarea
					id="special_instructions"
					bind:value={specialInstructions}
					placeholder="Any special requirements or instructions for the engineer"
					rows="2"
					class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
				></textarea>
			</div>

			<!-- General Notes -->
			<div class="space-y-2">
				<label for="appointment_notes" class="text-sm font-medium text-gray-900">
					General Notes
				</label>
				<textarea
					id="appointment_notes"
					bind:value={appointmentNotes}
					placeholder="Additional notes about this appointment"
					rows="2"
					class="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
				></textarea>
			</div>
		</div>

		<DialogFooter>
			<Button
				variant="outline"
				onclick={() => (showCreateAppointmentModal = false)}
				disabled={loading}
			>
				Cancel
			</Button>
			<Button onclick={handleCreateAppointment} disabled={loading || !appointmentDate}>
				{loading ? 'Creating...' : 'Create Appointment'}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

