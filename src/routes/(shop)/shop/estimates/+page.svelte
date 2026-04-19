<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import FilterTabs from '$lib/components/ui/tabs/FilterTabs.svelte';
	import { Button } from '$lib/components/ui/button';
	import { FileText, Hash, User, Car, Activity, Calendar, Plus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import { formatDate, formatCurrency } from '$lib/utils/formatters';

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

			const firstEstimate = Array.isArray(job.shop_estimates) ? job.shop_estimates[0] : null;
			const estimateStatus: EstimateStatus | null = firstEstimate?.status ?? null;
			const estimateTotal = firstEstimate?.total ?? null;

			return {
				id: job.id,
				estimate_id: firstEstimate?.id ?? null,
				job_number: job.job_number,
				customer_name: job.customer_name ?? '—',
				vehicle_display: vehicleDisplay,
				estimate_status: estimateStatus,
				total_display: formatCurrency(estimateTotal),
				date_quoted: formatDate(job.date_quoted),
				actions: null as null
			};
		})
	);

	const columns = [
		{ key: 'job_number' as const, label: 'Job #', sortable: true, icon: Hash },
		{ key: 'customer_name' as const, label: 'Customer', sortable: true, icon: User },
		{ key: 'vehicle_display' as const, label: 'Vehicle', sortable: false, icon: Car },
		{ key: 'estimate_status' as const, label: 'Status', sortable: true, icon: Activity },
		{ key: 'total_display' as const, label: 'Total', sortable: false },
		{ key: 'date_quoted' as const, label: 'Date Quoted', sortable: true, icon: Calendar },
		{ key: 'actions' as const, label: 'Actions', sortable: false }
	];

	type EstimateFilter = 'all' | 'awaiting' | 'approved' | 'declined';
	let selectedFilter = $state<EstimateFilter>('all');

	const filteredEstimates = $derived.by(() => {
		switch (selectedFilter) {
			case 'awaiting':
				return jobsWithDetails.filter(e =>
					e.estimate_status === null || e.estimate_status === 'draft' || e.estimate_status === 'sent'
				);
			case 'approved':
				return jobsWithDetails.filter(e => e.estimate_status === 'approved');
			case 'declined':
				return jobsWithDetails.filter(e => e.estimate_status === 'declined');
			default:
				return jobsWithDetails;
		}
	});

	const estimateFilterCounts = $derived({
		all: jobsWithDetails.length,
		awaiting: jobsWithDetails.filter(e =>
			e.estimate_status === null || e.estimate_status === 'draft' || e.estimate_status === 'sent'
		).length,
		approved: jobsWithDetails.filter(e => e.estimate_status === 'approved').length,
		declined: jobsWithDetails.filter(e => e.estimate_status === 'declined').length,
	});

	const estimateFilterItems = [
		{ value: 'all' as const, label: 'All' },
		{ value: 'awaiting' as const, label: 'Awaiting Response' },
		{ value: 'approved' as const, label: 'Approved' },
		{ value: 'declined' as const, label: 'Declined' },
	];

	function handleRowClick(row: (typeof jobsWithDetails)[0]) {
		startNavigation(row.id, `/shop/jobs/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Estimates" description="Jobs pending quote approval.">
		{#snippet actions()}
			<Button href="/shop/estimates/new">
				<Plus class="h-4 w-4 mr-2" />
				New Quote
			</Button>
		{/snippet}
	</PageHeader>

	{#if jobsWithDetails.length === 0}
		<EmptyState
			icon={FileText}
			title="No pending quotes"
			description="No jobs are awaiting quote approval."
			actionLabel="New Quote"
			onAction={() => goto('/shop/estimates/new')}
		/>
	{:else}
		<FilterTabs items={estimateFilterItems} bind:value={selectedFilter} counts={estimateFilterCounts} />

		{#if filteredEstimates.length === 0}
			<EmptyState
				icon={FileText}
				title="No estimates found"
				description="No estimates match the selected filter."
			/>
		{:else}
			<ModernDataTable
				data={filteredEstimates}
				{columns}
				onRowClick={handleRowClick}
				loadingRowId={loadingId}
				rowIdKey="id"
				striped
				emptyMessage="No pending quotes found"
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
					{:else if column.key === 'actions'}
						{#if row.estimate_id}
							<!-- svelte-ignore event_directive_deprecated -->
							<div class="flex items-center gap-1" onclick={(e) => e.stopPropagation()}>
								{#if row.estimate_status === 'draft'}
									<form
										method="POST"
										action="?/send"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success') {
													toast.success('Estimate sent');
												} else if (result.type === 'failure') {
													toast.error((result.data as any)?.error || 'Failed to send');
												}
												await update({ reset: false });
											};
										}}
									>
										<input type="hidden" name="estimate_id" value={row.estimate_id} />
										<Button type="submit" variant="outline" size="sm" class="h-7 text-xs">Send</Button>
									</form>
								{/if}
								{#if row.estimate_status === 'draft' || row.estimate_status === 'sent'}
									<form
										method="POST"
										action="?/accept"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success') {
													toast.success('Estimate accepted');
												} else if (result.type === 'failure') {
													toast.error((result.data as any)?.error || 'Failed to accept');
												}
												await update({ reset: false });
											};
										}}
									>
										<input type="hidden" name="estimate_id" value={row.estimate_id} />
										<Button
											type="submit"
											variant="default"
											size="sm"
											class="h-7 text-xs bg-green-600 hover:bg-green-700"
										>Accept</Button>
									</form>
									<form
										method="POST"
										action="?/decline"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success') {
													toast.success('Estimate declined');
												} else if (result.type === 'failure') {
													toast.error((result.data as any)?.error || 'Failed to decline');
												}
												await update({ reset: false });
											};
										}}
									>
										<input type="hidden" name="estimate_id" value={row.estimate_id} />
										<Button type="submit" variant="destructive" size="sm" class="h-7 text-xs">Decline</Button>
									</form>
								{/if}
							</div>
						{:else}
							<span class="text-gray-400">—</span>
						{/if}
					{:else}
						{row[column.key]}
					{/if}
				{/snippet}
			</ModernDataTable>
		{/if}

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{filteredEstimates.length}</span>
				{filteredEstimates.length === 1 ? 'job' : 'jobs'}
			</p>
		</div>
	{/if}
</div>
