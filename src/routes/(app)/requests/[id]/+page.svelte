<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import StatusBadge from '$lib/components/data/StatusBadge.svelte';
	import ActivityTimeline from '$lib/components/data/ActivityTimeline.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import LoadingButton from '$lib/components/ui/button/LoadingButton.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft,
		Edit,
		Trash2,
		User,
		Car,
		MapPin,
		Calendar,
		DollarSign,
		FileText,
		Users,
		CheckCircle2,
		Clock,
		AlertCircle,
		Check,
		RotateCcw
	} from 'lucide-svelte';
	import { requestService } from '$lib/services/request.service';
	import { inspectionService } from '$lib/services/inspection.service';
	import { assessmentService } from '$lib/services/assessment.service';
	import type { PageData } from './$types';
	import type { RequestStep } from '$lib/types/request';
	import { formatCurrency, formatDateLong as formatDate } from '$lib/utils/formatters';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let showDeleteConfirm = $state(false);

	const stepLabels: Record<RequestStep, string> = {
		request: 'Request',
		assessment: 'Assessment',
		quote: 'Quote',
		approval: 'Approval'
	};

	async function handleDelete() {
		if (!confirm('Are you sure you want to cancel this request?')) {
			return;
		}

		loading = true;
		error = null;

		try {
			await requestService.updateRequest(data.request.id, { status: 'cancelled' });
			// Navigate back to requests list (data will be fresh on next page)
			goto('/requests');
		} catch (err) {
			console.error('Error cancelling request:', err);
			error = err instanceof Error ? err.message : 'Failed to cancel request';
		} finally {
			loading = false;
		}
	}

	async function handleReactivate() {
		if (!confirm('Are you sure you want to reactivate this request?')) {
			return;
		}

		loading = true;
		error = null;

		try {
			// Reactivate to submitted status
			await requestService.updateRequest(data.request.id, {
				status: 'submitted',
				current_step: 'request'
			});
			// Refresh page to show updated status
			goto(`/requests/${data.request.id}`);
		} catch (err) {
			console.error('Error reactivating request:', err);
			error = err instanceof Error ? err.message : 'Failed to reactivate request';
		} finally {
			loading = false;
		}
	}

	function handleEdit() {
		goto(`/requests/${data.request.id}/edit`);
	}

	function handleBack() {
		goto('/requests');
	}

	async function handleAccept() {
		if (!confirm('Accept this request and create an inspection?')) {
			return;
		}

		loading = true;
		error = null;

		try {
			// Create inspection from request
			const inspection = await inspectionService.createInspectionFromRequest(data.request);

			// Find or create assessment for this request
			const assessment = await assessmentService.findOrCreateByRequest(
				data.request.id,
				$page.data.supabase
			);

			// Update assessment stage to inspection_scheduled
			await assessmentService.updateStage(
				assessment.id,
				'inspection_scheduled',
				$page.data.supabase
			);

			// Link inspection to assessment
			await assessmentService.updateAssessment(
				assessment.id,
				{ inspection_id: inspection.id },
				$page.data.supabase
			);

			// Update request status
			await requestService.updateRequest(data.request.id, {
				status: 'in_progress',
				current_step: 'assessment'
			});

			// Show success message
			alert(
				`Request accepted! Inspection ${inspection.inspection_number} has been created. You can now appoint an engineer.`
			);

			// Navigate to inspection detail page using assessment ID (assessment-centric architecture)
			// The inspection detail page expects assessment ID as route parameter, not inspection ID
			goto(`/work/inspections/${assessment.id}`);
		} catch (err) {
			console.error('Error accepting request:', err);
			error = err instanceof Error ? err.message : 'Failed to accept request';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title={`Request ${data.request.request_number}`}
		description={data.client?.name || 'Unknown Client'}
	>
		{#snippet actions()}
			<Button variant="outline" onclick={handleBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back
			</Button>

			<!-- Show Accept button only for draft/submitted requests -->
			{#if data.request.status === 'draft' || data.request.status === 'submitted'}
				<LoadingButton onclick={handleAccept} {loading}>
					{#if !loading}
						<Check class="mr-2 h-4 w-4" />
					{/if}
					Accept Request
				</LoadingButton>
			{/if}

			<!-- Show Reactivate button only for cancelled requests -->
			{#if data.request.status === 'cancelled'}
				<LoadingButton variant="default" onclick={handleReactivate} {loading}>
					{#if !loading}
						<RotateCcw class="mr-2 h-4 w-4" />
					{/if}
					Reactivate Request
				</LoadingButton>
			{/if}

			<Button variant="outline" onclick={handleEdit}>
				<Edit class="mr-2 h-4 w-4" />
				Edit
			</Button>

			<!-- Show Cancel/Delete button only for non-cancelled requests -->
			{#if data.request.status !== 'cancelled'}
				<LoadingButton variant="destructive" onclick={handleDelete} {loading}>
					{#if !loading}
						<Trash2 class="mr-2 h-4 w-4" />
					{/if}
					Cancel
				</LoadingButton>
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
			<!-- Basic Information -->
			<Card class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Request Information</h3>
					<StatusBadge status={data.request.status} />
				</div>

				<div class="grid gap-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm font-medium text-gray-500">Request Number</p>
							<p class="mt-1 text-sm text-gray-900">{data.request.request_number}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Type</p>
							<p class="mt-1 text-sm text-gray-900">
								{data.request.type === 'insurance' ? 'Insurance' : 'Private'}
							</p>
						</div>
					</div>

					{#if data.request.claim_number}
						<div>
							<p class="text-sm font-medium text-gray-500">Claim Number</p>
							<p class="mt-1 text-sm text-gray-900">{data.request.claim_number}</p>
						</div>
					{/if}

					{#if data.request.description}
						<div>
							<p class="text-sm font-medium text-gray-500">Description</p>
							<p class="mt-1 text-sm text-gray-900">{data.request.description}</p>
						</div>
					{/if}

					<div>
						<p class="text-sm font-medium text-gray-500">Current Step</p>
						<p class="mt-1">
							<Badge variant="outline">{stepLabels[data.request.current_step]}</Badge>
						</p>
					</div>
				</div>
			</Card>

			<!-- Incident Details -->
			<Card class="p-6">
				<div class="mb-4 flex items-center gap-2">
					<AlertCircle class="h-5 w-5 text-gray-500" />
					<h3 class="text-lg font-semibold text-gray-900">Incident Details</h3>
				</div>

				<div class="grid gap-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm font-medium text-gray-500">Date of Loss</p>
							<p class="mt-1 text-sm text-gray-900">{formatDate(data.request.date_of_loss)}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Insured Value</p>
							<p class="mt-1 text-sm text-gray-900">
								{formatCurrency(data.request.insured_value)}
							</p>
						</div>
					</div>

					{#if data.request.excess_amount}
						<div>
							<p class="text-sm font-medium text-gray-500">Excess Amount</p>
							<p class="mt-1 text-sm font-semibold text-orange-600">
								{formatCurrency(data.request.excess_amount)}
							</p>
						</div>
					{/if}

					{#if data.request.incident_type}
						<div>
							<p class="text-sm font-medium text-gray-500">Incident Type</p>
							<p class="mt-1 text-sm text-gray-900 capitalize">{data.request.incident_type}</p>
						</div>
					{/if}

					{#if data.request.incident_location}
						<div>
							<p class="text-sm font-medium text-gray-500">Location</p>
							<p class="mt-1 text-sm text-gray-900">{data.request.incident_location}</p>
						</div>
					{/if}

					{#if data.request.incident_description}
						<div>
							<p class="text-sm font-medium text-gray-500">Description</p>
							<p class="mt-1 text-sm text-gray-900">{data.request.incident_description}</p>
						</div>
					{/if}
				</div>
			</Card>

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
								{data.request.vehicle_make || '-'}
								{data.request.vehicle_model || ''}
							</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Year</p>
							<p class="mt-1 text-sm text-gray-900">{data.request.vehicle_year || '-'}</p>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-3">
						<div>
							<p class="text-sm font-medium text-gray-500">Color</p>
							<p class="mt-1 text-sm text-gray-900">{data.request.vehicle_color || '-'}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Registration</p>
							<p class="mt-1 text-sm text-gray-900">{data.request.vehicle_registration || '-'}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Mileage</p>
							<p class="mt-1 text-sm text-gray-900">
								{data.request.vehicle_mileage ? `${data.request.vehicle_mileage} km` : '-'}
							</p>
						</div>
					</div>

					{#if data.request.vehicle_vin}
						<div>
							<p class="text-sm font-medium text-gray-500">VIN</p>
							<p class="mt-1 font-mono text-sm text-gray-900">{data.request.vehicle_vin}</p>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Owner & Third Party Details -->
			<Card class="p-6">
				<div class="mb-4 flex items-center gap-2">
					<Users class="h-5 w-5 text-gray-500" />
					<h3 class="text-lg font-semibold text-gray-900">Owner & Third Party</h3>
				</div>

				<div class="space-y-6">
					<!-- Owner Details -->
					<div>
						<h4 class="mb-3 text-sm font-semibold text-gray-700">Owner (Insured Party)</h4>
						<div class="grid gap-4 md:grid-cols-2">
							<div>
								<p class="text-sm font-medium text-gray-500">Name</p>
								<p class="mt-1 text-sm text-gray-900">{data.request.owner_name || '-'}</p>
							</div>
							<div>
								<p class="text-sm font-medium text-gray-500">Phone</p>
								<p class="mt-1 text-sm text-gray-900">
									{#if data.request.owner_phone}
										<a href="tel:{data.request.owner_phone}" class="text-blue-600 hover:underline">
											{data.request.owner_phone}
										</a>
									{:else}
										-
									{/if}
								</p>
							</div>
						</div>
						<div class="grid gap-4 md:grid-cols-2">
							<div>
								<p class="text-sm font-medium text-gray-500">Email</p>
								<p class="mt-1 text-sm text-gray-900">
									{#if data.request.owner_email}
										<a
											href="mailto:{data.request.owner_email}"
											class="text-blue-600 hover:underline"
										>
											{data.request.owner_email}
										</a>
									{:else}
										-
									{/if}
								</p>
							</div>
							<div>
								<p class="text-sm font-medium text-gray-500">Address</p>
								<p class="mt-1 text-sm text-gray-900">{data.request.owner_address || '-'}</p>
							</div>
						</div>
					</div>

					<!-- Third Party Details -->
					{#if data.request.third_party_name}
						<Separator />
						<div>
							<h4 class="mb-3 text-sm font-semibold text-gray-700">Third Party</h4>
							<div class="grid gap-4">
								<div class="grid gap-4 md:grid-cols-2">
									<div>
										<p class="text-sm font-medium text-gray-500">Name</p>
										<p class="mt-1 text-sm text-gray-900">{data.request.third_party_name}</p>
									</div>
									<div>
										<p class="text-sm font-medium text-gray-500">Phone</p>
										<p class="mt-1 text-sm text-gray-900">
											{#if data.request.third_party_phone}
												<a
													href="tel:{data.request.third_party_phone}"
													class="text-blue-600 hover:underline"
												>
													{data.request.third_party_phone}
												</a>
											{:else}
												-
											{/if}
										</p>
									</div>
								</div>
								<div class="grid gap-4 md:grid-cols-2">
									<div>
										<p class="text-sm font-medium text-gray-500">Email</p>
										<p class="mt-1 text-sm text-gray-900">
											{#if data.request.third_party_email}
												<a
													href="mailto:{data.request.third_party_email}"
													class="text-blue-600 hover:underline"
												>
													{data.request.third_party_email}
												</a>
											{:else}
												-
											{/if}
										</p>
									</div>
									<div>
										<p class="text-sm font-medium text-gray-500">Insurance</p>
										<p class="mt-1 text-sm text-gray-900">
											{data.request.third_party_insurance || '-'}
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Client Info -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Client</h3>
				{#if data.client}
					<div class="space-y-3">
						<div>
							<p class="text-sm font-medium text-gray-500">Name</p>
							<p class="mt-1 text-sm text-gray-900">{data.client.name}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Type</p>
							<p class="mt-1">
								<Badge variant={data.client.type === 'insurance' ? 'default' : 'secondary'}>
									{data.client.type === 'insurance' ? 'Insurance' : 'Private'}
								</Badge>
							</p>
						</div>
						{#if data.client.email}
							<div>
								<p class="text-sm font-medium text-gray-500">Email</p>
								<p class="mt-1 text-sm text-gray-900">
									<a href="mailto:{data.client.email}" class="text-blue-600 hover:underline">
										{data.client.email}
									</a>
								</p>
							</div>
						{/if}
						{#if data.client.phone}
							<div>
								<p class="text-sm font-medium text-gray-500">Phone</p>
								<p class="mt-1 text-sm text-gray-900">
									<a href="tel:{data.client.phone}" class="text-blue-600 hover:underline">
										{data.client.phone}
									</a>
								</p>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-gray-500">No client information available</p>
				{/if}
			</Card>

			<!-- Tasks -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Tasks</h3>
				{#if data.tasks.length > 0}
					<div class="space-y-3">
						{#each data.tasks as task}
							<div class="rounded-lg border p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<p class="text-sm font-medium text-gray-900">{task.title}</p>
										{#if task.description}
											<p class="mt-1 text-xs text-gray-500">{task.description}</p>
										{/if}
									</div>
									<div class="ml-2">
										{#if task.status === 'completed'}
											<CheckCircle2 class="h-4 w-4 text-green-600" />
										{:else if task.status === 'in_progress'}
											<Clock class="h-4 w-4 text-yellow-600" />
										{:else}
											<AlertCircle class="h-4 w-4 text-gray-400" />
										{/if}
									</div>
								</div>
								<div class="mt-2">
									<StatusBadge status={task.status} />
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-gray-500">No tasks yet</p>
				{/if}
			</Card>

			<!-- Metadata -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Metadata</h3>
				<div class="space-y-3">
					<div>
						<p class="text-sm font-medium text-gray-500">Created</p>
						<p class="mt-1 text-sm text-gray-900">{formatDate(data.request.created_at)}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-500">Last Updated</p>
						<p class="mt-1 text-sm text-gray-900">{formatDate(data.request.updated_at)}</p>
					</div>
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
