<script lang="ts">
	import { goto } from '$app/navigation';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { FileText, Hash, User, Car, Activity, DollarSign, Calendar, Plus } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	type EstimateStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'revised' | 'expired';

	const statusVariantMap: Record<EstimateStatus, 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple'> = {
		draft: 'gray',
		sent: 'blue',
		approved: 'green',
		declined: 'red',
		revised: 'yellow',
		expired: 'gray'
	};

	const statusLabelMap: Record<EstimateStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		approved: 'Approved',
		declined: 'Declined',
		revised: 'Revised',
		expired: 'Expired'
	};

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const estimatesWithDetails = $derived(
		data.estimates.map((estimate) => {
			const job = estimate.shop_jobs;
			const vehicleParts = [job?.vehicle_make, job?.vehicle_model].filter(Boolean);
			const vehicleDisplay = vehicleParts.length > 0
				? vehicleParts.join(' ') + (job?.vehicle_reg ? ` (${job.vehicle_reg})` : '')
				: '—';
			return {
				id: estimate.id,
				estimate_number: estimate.estimate_number,
				customer_name: job?.customer_name ?? '—',
				vehicle_display: vehicleDisplay,
				job_type: job?.job_type ?? '—',
				status: estimate.status as EstimateStatus,
				total_display: formatCurrency(estimate.total),
				created_at: formatDate(estimate.created_at)
			};
		})
	);

	const columns = [
		{ key: 'estimate_number' as const, label: 'Estimate #', sortable: true, icon: Hash },
		{ key: 'customer_name' as const, label: 'Customer', sortable: true, icon: User },
		{ key: 'vehicle_display' as const, label: 'Vehicle', sortable: false, icon: Car },
		{ key: 'job_type' as const, label: 'Type', sortable: true },
		{ key: 'status' as const, label: 'Status', sortable: true, icon: Activity },
		{ key: 'total_display' as const, label: 'Total', sortable: false, icon: DollarSign },
		{ key: 'created_at' as const, label: 'Date', sortable: true, icon: Calendar }
	];

	function handleRowClick(row: (typeof estimatesWithDetails)[0]) {
		startNavigation(row.id, `/shop/estimates/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Estimates" description="Manage repair estimates for customers.">
		{#snippet actions()}
			<Button href="/shop/estimates/new">
				<Plus class="h-4 w-4 mr-2" />
				New Estimate
			</Button>
		{/snippet}
	</PageHeader>

	{#if estimatesWithDetails.length === 0}
		<EmptyState
			icon={FileText}
			title="No estimates yet"
			description="Create your first estimate to get started."
			actionLabel="New Estimate"
			onAction={() => goto('/shop/estimates/new')}
		/>
	{:else}
		<ModernDataTable
			data={estimatesWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
			emptyMessage="No estimates found"
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'estimate_number'}
					<TableCell variant="primary" bold>
						{row.estimate_number}
					</TableCell>
				{:else if column.key === 'status'}
					{@const variant = statusVariantMap[row.status] ?? 'gray'}
					{@const label = statusLabelMap[row.status] ?? row.status}
					<GradientBadge {variant} {label} />
				{:else if column.key === 'job_type'}
					{#if row.job_type && row.job_type !== '—'}
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
				Showing <span class="font-medium text-gray-900">{estimatesWithDetails.length}</span>
				{estimatesWithDetails.length === 1 ? 'estimate' : 'estimates'}
			</p>
		</div>
	{/if}
</div>
