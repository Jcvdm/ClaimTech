<script lang="ts">
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Briefcase, Hash, User, Car, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatCurrency(amount: number | null) {
		if (amount == null) return '-';
		return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
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

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const invoices: any[] = job.shop_invoices || [];
			const totalAmount: number | null = invoices.length > 0 ? (invoices[0].total ?? null) : null;

			return {
				id: job.id,
				job_number: job.job_number,
				customer_name: job.customer_name,
				vehicle_display: vehicleDisplay,
				total: totalAmount,
				date_completed: formatDate(job.updated_at ?? job.created_at)
			};
		})
	);

	const columns = [
		{ key: 'job_number' as const, label: 'Job #', sortable: true, icon: Hash },
		{ key: 'customer_name' as const, label: 'Customer', sortable: true, icon: User },
		{ key: 'vehicle_display' as const, label: 'Vehicle', sortable: false, icon: Car },
		{ key: 'total' as const, label: 'Total', sortable: true },
		{ key: 'date_completed' as const, label: 'Date Completed', sortable: true, icon: Calendar }
	];

	function handleRowClick(row: (typeof jobsWithDetails)[0]) {
		startNavigation(row.id, `/shop/jobs/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Completed" description="Jobs that have been completed and paid." />

	{#if data.jobs.length === 0}
		<EmptyState
			icon={Briefcase}
			title="No completed jobs yet"
			description="Jobs that have been completed and fully paid will appear here."
		/>
	{:else}
		<ModernDataTable
			data={jobsWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
			emptyMessage="No completed jobs found"
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'job_number'}
					<TableCell variant="primary" bold>
						{row.job_number}
					</TableCell>
				{:else if column.key === 'total'}
					{formatCurrency(row.total)}
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
