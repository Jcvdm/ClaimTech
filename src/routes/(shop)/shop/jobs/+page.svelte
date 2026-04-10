<script lang="ts">
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import FilterTabs from '$lib/components/ui/tabs/FilterTabs.svelte';
	import { Briefcase, Hash, User, Car, Activity, Calendar } from 'lucide-svelte';
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(data.jobs as any[]).map((job) => {
			const vehicleParts = [
				job.vehicle_year ? String(job.vehicle_year) : null,
				job.vehicle_make,
				job.vehicle_model
			].filter(Boolean);
			const vehicleDisplay =
				vehicleParts.length > 0
					? vehicleParts.join(' ') + (job.vehicle_reg ? ` (${job.vehicle_reg})` : '')
					: '—';
			return {
				id: job.id,
				job_number: job.job_number,
				customer_name: job.customer_name,
				vehicle_display: vehicleDisplay,
				job_type: job.job_type,
				status: job.status as ShopJobStatus,
				date_booked: formatDate(job.date_booked)
			};
		})
	);

	const columns = [
		{ key: 'job_number' as const, label: 'Job #', sortable: true, icon: Hash },
		{ key: 'customer_name' as const, label: 'Customer', sortable: true, icon: User },
		{ key: 'vehicle_display' as const, label: 'Vehicle', sortable: false, icon: Car },
		{ key: 'job_type' as const, label: 'Type', sortable: true },
		{ key: 'status' as const, label: 'Status', sortable: true, icon: Activity },
		{ key: 'date_booked' as const, label: 'Date Booked', sortable: true, icon: Calendar }
	];

	type JobFilter = 'all' | 'awaiting' | 'workshop' | 'ready';
	let selectedFilter = $state<JobFilter>('all');

	const allActiveStatuses = ['approved', 'checked_in', 'in_progress', 'quality_check', 'ready_for_collection'];
	const workshopStatuses = ['checked_in', 'in_progress', 'quality_check'];

	const filteredJobs = $derived.by(() => {
		switch (selectedFilter) {
			case 'all': return jobsWithDetails.filter(j => allActiveStatuses.includes(j.status));
			case 'awaiting': return jobsWithDetails.filter(j => j.status === 'approved');
			case 'workshop': return jobsWithDetails.filter(j => workshopStatuses.includes(j.status));
			case 'ready': return jobsWithDetails.filter(j => j.status === 'ready_for_collection');
			default: return jobsWithDetails;
		}
	});

	const jobFilterCounts = $derived({
		all: jobsWithDetails.filter(j => allActiveStatuses.includes(j.status)).length,
		awaiting: jobsWithDetails.filter(j => j.status === 'approved').length,
		workshop: jobsWithDetails.filter(j => workshopStatuses.includes(j.status)).length,
		ready: jobsWithDetails.filter(j => j.status === 'ready_for_collection').length,
	});

	const jobFilterItems = [
		{ value: 'all' as const, label: 'All' },
		{ value: 'awaiting' as const, label: 'Awaiting Check-In' },
		{ value: 'workshop' as const, label: 'In Workshop' },
		{ value: 'ready' as const, label: 'Ready' },
	];

	function handleRowClick(row: (typeof jobsWithDetails)[0]) {
		startNavigation(row.id, `/shop/jobs/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Active Jobs" description="Jobs currently in progress." />

	{#if jobsWithDetails.length === 0}
		<EmptyState
			icon={Briefcase}
			title="No active jobs"
			description="No jobs are currently in progress."
		/>
	{:else}
		<FilterTabs items={jobFilterItems} bind:value={selectedFilter} counts={jobFilterCounts} />

		{#if filteredJobs.length === 0}
			<EmptyState
				icon={Briefcase}
				title="No jobs found"
				description="No jobs match the selected filter."
			/>
		{:else}
			<ModernDataTable
				data={filteredJobs}
				{columns}
				onRowClick={handleRowClick}
				loadingRowId={loadingId}
				rowIdKey="id"
				striped
				emptyMessage="No active jobs found"
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
					Showing <span class="font-medium text-gray-900">{filteredJobs.length}</span>
					{filteredJobs.length === 1 ? 'job' : 'jobs'}
				</p>
			</div>
		{/if}
	{/if}
</div>
