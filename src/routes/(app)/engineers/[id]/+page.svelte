<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowLeft, Edit, Trash2, User, MapPin, Briefcase } from 'lucide-svelte';
	import { engineerService } from '$lib/services/engineer.service';
	import type { PageData } from './$types';
	import { formatDateLong as formatDate } from '$lib/utils/formatters';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	function handleBack() {
		goto('/engineers');
	}

	function handleEdit() {
		goto(`/engineers/${data.engineer.id}/edit`);
	}

	async function handleDeactivate() {
		if (
			!confirm(
				`Are you sure you want to ${data.engineer.is_active ? 'deactivate' : 'activate'} this engineer?`
			)
		) {
			return;
		}

		loading = true;
		error = null;

		try {
			await engineerService.updateEngineer(data.engineer.id, {
				is_active: !data.engineer.is_active
			});
			goto('/engineers', { invalidateAll: true });
		} catch (err) {
			console.error('Error updating engineer:', err);
			error = err instanceof Error ? err.message : 'Failed to update engineer';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title={data.engineer.name} description="Engineer Details">
		{#snippet actions()}
			<Button variant="outline" onclick={handleBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back
			</Button>
			<Button variant="outline" onclick={handleEdit}>
				<Edit class="mr-2 h-4 w-4" />
				Edit
			</Button>
			<Button
				variant={data.engineer.is_active ? 'destructive' : 'default'}
				onclick={handleDeactivate}
				disabled={loading}
			>
				<Trash2 class="mr-2 h-4 w-4" />
				{data.engineer.is_active ? 'Deactivate' : 'Activate'}
			</Button>
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
					<h3 class="text-lg font-semibold text-gray-900">Basic Information</h3>
					<Badge variant={data.engineer.is_active ? 'default' : 'secondary'}>
						{data.engineer.is_active ? 'Active' : 'Inactive'}
					</Badge>
				</div>

				<div class="grid gap-4">
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm font-medium text-gray-500">Full Name</p>
							<p class="mt-1 text-sm text-gray-900">{data.engineer.name}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-500">Email</p>
							<p class="mt-1 text-sm">
								<a href="mailto:{data.engineer.email}" class="text-blue-600 hover:underline">
									{data.engineer.email}
								</a>
							</p>
						</div>
					</div>

					{#if data.engineer.phone}
						<div>
							<p class="text-sm font-medium text-gray-500">Phone</p>
							<p class="mt-1 text-sm">
								<a href="tel:{data.engineer.phone}" class="text-blue-600 hover:underline">
									{data.engineer.phone}
								</a>
							</p>
						</div>
					{/if}

					{#if data.engineer.province}
						<div>
							<p class="text-sm font-medium text-gray-500">Province</p>
							<p class="mt-1 text-sm text-gray-900">{data.engineer.province}</p>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Professional Details -->
			<Card class="p-6">
				<div class="mb-4 flex items-center gap-2">
					<Briefcase class="h-5 w-5 text-gray-500" />
					<h3 class="text-lg font-semibold text-gray-900">Professional Details</h3>
				</div>

				<div class="grid gap-4">
					{#if data.engineer.specialization}
						<div>
							<p class="text-sm font-medium text-gray-500">Specialization</p>
							<p class="mt-1 text-sm text-gray-900">{data.engineer.specialization}</p>
						</div>
					{/if}

					{#if data.engineer.company_name}
						<div>
							<p class="text-sm font-medium text-gray-500">Company</p>
							<p class="mt-1 text-sm text-gray-900">{data.engineer.company_name}</p>
						</div>
					{/if}

					{#if data.engineer.company_type}
						<div>
							<p class="text-sm font-medium text-gray-500">Company Type</p>
							<p class="mt-1">
								<Badge variant={data.engineer.company_type === 'internal' ? 'default' : 'secondary'}>
									{data.engineer.company_type === 'internal' ? 'Internal' : 'External'}
								</Badge>
							</p>
						</div>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Metadata -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Metadata</h3>

				<div class="space-y-3 text-sm">
					<div>
						<p class="font-medium text-gray-500">Created</p>
						<p class="mt-1 text-gray-900">{formatDate(data.engineer.created_at)}</p>
					</div>

					{#if data.engineer.updated_at}
						<div>
							<p class="font-medium text-gray-500">Last Updated</p>
							<p class="mt-1 text-gray-900">{formatDate(data.engineer.updated_at)}</p>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Quick Actions -->
			<Card class="p-6">
				<h3 class="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>

				<div class="space-y-2">
					<Button variant="outline" class="w-full" onclick={handleEdit}>
						<Edit class="mr-2 h-4 w-4" />
						Edit Details
					</Button>

					<Button
						variant={data.engineer.is_active ? 'outline' : 'default'}
						class="w-full"
						onclick={handleDeactivate}
						disabled={loading}
					>
						<Trash2 class="mr-2 h-4 w-4" />
						{data.engineer.is_active ? 'Deactivate' : 'Activate'}
					</Button>
				</div>
			</Card>
		</div>
	</div>
</div>

