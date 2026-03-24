<script lang="ts">
	import { goto } from '$app/navigation';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Briefcase, Hash, User, Car, Activity, Calendar, Plus } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { ShopJobStatus } from '$lib/services/shop-job.service';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	const statusVariantMap: Record<ShopJobStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
		quote_requested: 'gray',
		quoted: 'blue',
		approved: 'green',
		checked_in: 'yellow',
		in_progress: 'yellow',
		quality_check: 'purple',
		ready_for_collection: 'green',
		completed: 'green',
		cancelled: 'red'
	};

	const statusLabelMap: Record<ShopJobStatus, string> = {
		quote_requested: 'Quote Requested',
		quoted: 'Quoted',
		approved: 'Approved',
		checked_in: 'Checked In',
		in_progress: 'In Progress',
		quality_check: 'Quality Check',
		ready_for_collection: 'Ready for Collection',
		completed: 'Completed',
		cancelled: 'Cancelled'
	};

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	const jobsWithDetails = $derived(
		data.jobs.map((job) => {
			const vehicleParts = [
				job.vehicle_year ? String(job.vehicle_year) : null,
				job.vehicle_make,
				job.vehicle_model
			].filter(Boolean);
			const vehicleDisplay = vehicleParts.length > 0
				? vehicleParts.join(' ') + (job.vehicle_reg ? ` (${job.vehicle_reg})` : '')
				: '—';
			return {
				id: job.id,
				job_number: job.job_number,
				customer_name: job.customer_name,
				vehicle_display: vehicleDisplay,
				job_type: job.job_type,
				status: job.status as ShopJobStatus,
				date_in: formatDate(job.date_in)
			};
		})
	);

	const columns = [
		{ key: 'job_number' as const, label: 'Job #', sortable: true, icon: Hash },
		{ key: 'customer_name' as const, label: 'Customer', sortable: true, icon: User },
		{ key: 'vehicle_display' as const, label: 'Vehicle', sortable: false, icon: Car },
		{ key: 'job_type' as const, label: 'Type', sortable: true },
		{ key: 'status' as const, label: 'Status', sortable: true, icon: Activity },
		{ key: 'date_in' as const, label: 'Date In', sortable: true, icon: Calendar }
	];

	function handleRowClick(row: (typeof jobsWithDetails)[0]) {
		startNavigation(row.id, `/shop/jobs/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Jobs" description="Manage workshop jobs from intake to completion.">
		{#snippet actions()}
			<Button href="/shop/jobs/new">
				<Plus class="h-4 w-4 mr-2" />
				New Job
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.jobs.length === 0}
		<EmptyState
			icon={Briefcase}
			title="No jobs found"
			description="Create your first job to get started."
			actionLabel="New Job"
			onAction={() => goto('/shop/jobs/new')}
		/>
	{:else}
		<ModernDataTable
			data={jobsWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
			emptyMessage="No jobs found"
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'job_number'}
					<TableCell variant="primary" bold>
						{row.job_number}
					</TableCell>
				{:else if column.key === 'job_type'}
					{#if row.job_type}
						<GradientBadge
							variant={row.job_type === 'autobody' ? 'blue' : 'yellow'}
							label={row.job_type.charAt(0).toUpperCase() + row.job_type.slice(1)}
						/>
					{:else}
						<span class="text-gray-400">—</span>
					{/if}
				{:else if column.key === 'status'}
					{@const variant = statusVariantMap[row.status] ?? 'gray'}
					{@const label = statusLabelMap[row.status] ?? row.status}
					<GradientBadge {variant} {label} />
				{:else}
					{row[column.key]}
				{/if}
			{/snippet}
		</ModernDataTable>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{jobsWithDetails.length}</span>
				{jobsWithDetails.length === 1 ? 'job' : 'jobs'}
			</p>
		</div>
	{/if}
</div>
