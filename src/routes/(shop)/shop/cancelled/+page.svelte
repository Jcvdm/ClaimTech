<script lang="ts">
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Briefcase, Hash, User, Car, Calendar, Activity } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	type EstimateStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'revised' | 'expired';

	const estimateStatusVariantMap: Record<EstimateStatus, 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple'> = {
		draft: 'gray',
		sent: 'blue',
		approved: 'green',
		declined: 'red',
		revised: 'yellow',
		expired: 'gray'
	};

	const estimateStatusLabelMap: Record<EstimateStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		approved: 'Approved',
		declined: 'Declined',
		revised: 'Revised',
		expired: 'Expired'
	};

	function formatCurrency(amount: number | null | undefined) {
		if (amount == null) return '—';
		return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
	}

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
						{@const variant = estimateStatusVariantMap[row.estimate_status] ?? 'gray'}
						{@const label = estimateStatusLabelMap[row.estimate_status] ?? row.estimate_status}
						<GradientBadge {variant} {label} />
					{:else}
						<span class="text-gray-400">—</span>
					{/if}
				{:else if column.key === 'job_type'}
					{#if row.job_type}
						<GradientBadge
							variant={row.job_type === 'autobody' ? 'blue' : 'yellow'}
							label={row.job_type.charAt(0).toUpperCase() + row.job_type.slice(1)}
						/>
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
