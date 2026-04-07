<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { FileText, Hash, User, Car, Activity, Calendar, Plus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
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

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
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
		<ModernDataTable
			data={jobsWithDetails}
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

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{jobsWithDetails.length}</span>
				{jobsWithDetails.length === 1 ? 'job' : 'jobs'}
			</p>
		</div>
	{/if}
</div>
