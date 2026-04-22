<script lang="ts">
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Briefcase, Hash, User, Car, Activity, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { formatDate, formatCurrency } from '$lib/utils/formatters';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

			const invoices: any[] = job.shop_invoices || [];
			const estimates: any[] = job.shop_estimates || [];

			// Determine invoice payment status
			let invoiceStatus: 'none' | 'unpaid' | 'partial' | 'paid' = 'none';
			let totalAmount: number | null = null;

			if (invoices.length > 0) {
				const firstInvoice = invoices[0];
				invoiceStatus = firstInvoice.status ?? 'unpaid';
				totalAmount = firstInvoice.total ?? null;
			} else if (estimates.length > 0) {
				totalAmount = estimates[0].total ?? null;
			}

			return {
				id: job.id,
				job_number: job.job_number,
				customer_name: job.customer_name,
				vehicle_display: vehicleDisplay,
				invoice_status: invoiceStatus,
				total: totalAmount,
				date_completed: formatDate(job.updated_at ?? job.created_at)
			};
		})
	);

	const columns = [
		{ key: 'job_number' as const, label: 'Job #', sortable: true, icon: Hash },
		{ key: 'customer_name' as const, label: 'Customer', sortable: true, icon: User },
		{ key: 'vehicle_display' as const, label: 'Vehicle', sortable: false, icon: Car },
		{ key: 'invoice_status' as const, label: 'Invoice Status', sortable: true, icon: Activity },
		{ key: 'total' as const, label: 'Total', sortable: true },
		{ key: 'date_completed' as const, label: 'Date Completed', sortable: true, icon: Calendar }
	];

	function handleRowClick(row: (typeof jobsWithDetails)[0]) {
		startNavigation(row.id, `/shop/jobs/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Invoiced" description="Completed jobs awaiting payment." />

	{#if data.jobs.length === 0}
		<EmptyState
			icon={Briefcase}
			title="No invoiced jobs"
			description="Completed jobs awaiting payment will appear here."
		/>
	{:else}
		<ModernDataTable
			data={jobsWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
			emptyMessage="No invoiced jobs found"
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'job_number'}
					<TableCell variant="primary" bold>
						{row.job_number}
					</TableCell>
				{:else if column.key === 'invoice_status'}
					{#if row.invoice_status === 'none'}
						<Badge variant="muted">No Invoice</Badge>
					{:else if row.invoice_status === 'paid'}
						<Badge variant="success">Paid</Badge>
					{:else if row.invoice_status === 'partial'}
						<Badge variant="info">Partial</Badge>
					{:else}
						<Badge variant="warning">Unpaid</Badge>
					{/if}
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
