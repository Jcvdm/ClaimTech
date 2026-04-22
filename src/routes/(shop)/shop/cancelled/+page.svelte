<script lang="ts">
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Briefcase, Hash, User, Car, Calendar, Activity } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { formatDate, formatCurrency } from '$lib/utils/formatters';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	type EstimateStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'revised' | 'expired';

	const estimateStatusVariantMap: Record<EstimateStatus, 'muted' | 'info' | 'success' | 'destructive-soft' | 'warning'> = {
		draft: 'muted',
		sent: 'info',
		approved: 'success',
		declined: 'destructive-soft',
		revised: 'warning',
		expired: 'muted'
	};

	const estimateStatusLabelMap: Record<EstimateStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		approved: 'Approved',
		declined: 'Declined',
		revised: 'Revised',
		expired: 'Expired'
	};

	const jobsWithDetails = $derived(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(data.jobs as any[]).map((job: any) => {
			const vehicleParts = [
				job.vehicle_year ? String(job.vehicle_year) : null,
				job.vehicle_make,
				job.vehicle_model
			].filter(Boolean);
			const vehicleDisplay =
				vehicleParts.length > 0
					? vehicleParts.join(' ') + (job.vehicle_reg ? ` (${job.vehicle_reg})` : '')
					: '—';

			const firstEstimate = Array.isArray(job.shop_estimates) ? job.shop_estimates[0] : null;
			const estimateStatus: EstimateStatus | null = firstEstimate?.status ?? null;

			return {
				id: job.id,
				job_number: job.job_number,
				customer_name: job.customer_name,
				vehicle_display: vehicleDisplay,
				estimate_status: estimateStatus,
				total_display: formatCurrency(firstEstimate?.total),
				job_type: job.job_type,
				date: formatDate(job.created_at)
			};
		})
	);

	const columns = [
		{ key: 'job_number' as const, label: 'Job #', sortable: true, icon: Hash },
		{ key: 'customer_name' as const, label: 'Customer', sortable: true, icon: User },
		{ key: 'vehicle_display' as const, label: 'Vehicle', sortable: false, icon: Car },
		{ key: 'estimate_status' as const, label: 'Est. Status', sortable: true, icon: Activity },
		{ key: 'total_display' as const, label: 'Total', sortable: false },
		{ key: 'job_type' as const, label: 'Type', sortable: true },
		{ key: 'date' as const, label: 'Date', sortable: true, icon: Calendar }
	];

	function handleRowClick(row: (typeof jobsWithDetails)[0]) {
		startNavigation(row.id, `/shop/jobs/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Cancelled" description="Cancelled estimates and jobs." />

	{#if data.jobs.length === 0}
		<EmptyState
			icon={Briefcase}
			title="No cancelled jobs"
			description="Cancelled jobs and estimates will appear here."
		/>
	{:else}
		<ModernDataTable
			data={jobsWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
			emptyMessage="No cancelled jobs found"
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'job_number'}
					<TableCell variant="primary" bold>
						{row.job_number}
					</TableCell>
				{:else if column.key === 'estimate_status'}
					{#if row.estimate_status}
						{@const variant = estimateStatusVariantMap[row.estimate_status] ?? 'muted'}
						{@const label = estimateStatusLabelMap[row.estimate_status] ?? row.estimate_status}
						<Badge {variant}>{label}</Badge>
					{:else}
						<span class="text-gray-400">—</span>
					{/if}
				{:else if column.key === 'job_type'}
					{#if row.job_type}
						<Badge variant={row.job_type === 'autobody' ? 'info' : 'warning'}>{row.job_type.charAt(0).toUpperCase() + row.job_type.slice(1)}</Badge>
					{:else}
						<span class="text-gray-400">—</span>
					{/if}
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
