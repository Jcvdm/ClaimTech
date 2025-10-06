<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import StatusBadge from '$lib/components/data/StatusBadge.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowLeft, Edit, Car, User, FileText, MapPin, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function handleBack() {
		goto('/work/inspections');
	}

	function formatDate(dateString: string | null | undefined) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader
		title={`Inspection ${data.inspection.inspection_number}`}
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
		{/snippet}
	</PageHeader>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Inspection Information -->
			<Card class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Inspection Details</h3>
					<StatusBadge status={data.inspection.status} />
				</div>

				<div class="grid gap-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm font-medium text-gray-500">Inspection Number</p>
							<p class="mt-1 text-sm text-gray-900">{data.inspection.inspection_number}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Request Number</p>
							<p class="mt-1 text-sm text-gray-900">{data.inspection.request_number}</p>
						</div>
					</div>

					{#if data.inspection.claim_number}
						<div>
							<p class="text-sm font-medium text-gray-500">Claim Number</p>
							<p class="mt-1 text-sm text-gray-900">{data.inspection.claim_number}</p>
						</div>
					{/if}

					<div>
						<p class="text-sm font-medium text-gray-500">Type</p>
						<p class="mt-1">
							<Badge variant={data.inspection.type === 'insurance' ? 'default' : 'secondary'}>
								{data.inspection.type === 'insurance' ? 'Insurance' : 'Private'}
							</Badge>
						</p>
					</div>

					{#if data.inspection.notes}
						<div>
							<p class="text-sm font-medium text-gray-500">Notes</p>
							<p class="mt-1 text-sm text-gray-900">{data.inspection.notes}</p>
						</div>
					{/if}

					{#if data.inspection.inspection_location}
						<div>
							<p class="text-sm font-medium text-gray-500">Inspection Location</p>
							<p class="mt-1 text-sm text-gray-900">{data.inspection.inspection_location}</p>
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
								{data.inspection.vehicle_make || '-'}
								{data.inspection.vehicle_model || ''}
							</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Year</p>
							<p class="mt-1 text-sm text-gray-900">{data.inspection.vehicle_year || '-'}</p>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-3">
						<div>
							<p class="text-sm font-medium text-gray-500">Color</p>
							<p class="mt-1 text-sm text-gray-900">{data.inspection.vehicle_color || '-'}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Registration</p>
							<p class="mt-1 text-sm text-gray-900">
								{data.inspection.vehicle_registration || '-'}
							</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Mileage</p>
							<p class="mt-1 text-sm text-gray-900">
								{data.inspection.vehicle_mileage
									? `${data.inspection.vehicle_mileage.toLocaleString()} km`
									: '-'}
							</p>
						</div>
					</div>

					{#if data.inspection.vehicle_vin}
						<div>
							<p class="text-sm font-medium text-gray-500">VIN</p>
							<p class="mt-1 font-mono text-xs text-gray-900">{data.inspection.vehicle_vin}</p>
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
						<p class="mt-1 text-gray-900">{formatDate(data.inspection.created_at)}</p>
					</div>

					<div>
						<p class="font-medium text-gray-500">Last Updated</p>
						<p class="mt-1 text-gray-900">{formatDate(data.inspection.updated_at)}</p>
					</div>

					{#if data.inspection.accepted_at}
						<div>
							<p class="font-medium text-gray-500">Accepted</p>
							<p class="mt-1 text-gray-900">{formatDate(data.inspection.accepted_at)}</p>
						</div>
					{/if}

					{#if data.inspection.scheduled_date}
						<div>
							<p class="font-medium text-gray-500">Scheduled Date</p>
							<p class="mt-1 text-gray-900">{formatDate(data.inspection.scheduled_date)}</p>
						</div>
					{/if}
				</div>
			</Card>
		</div>
	</div>
</div>

