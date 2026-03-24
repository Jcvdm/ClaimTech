<script lang="ts">
	import { goto } from '$app/navigation';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { FileText, Hash, User, Activity, DollarSign, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { ShopInvoiceStatus } from '$lib/services/shop-invoice.service';

	let { data }: { data: PageData } = $props();
	const { loadingId, startNavigation } = useNavigationLoading();

	const statusVariantMap: Record<ShopInvoiceStatus, 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple'> = {
		draft: 'gray',
		sent: 'blue',
		paid: 'green',
		partially_paid: 'yellow',
		overdue: 'red',
		void: 'gray'
	};

	const statusLabelMap: Record<ShopInvoiceStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		paid: 'Paid',
		partially_paid: 'Partially Paid',
		overdue: 'Overdue',
		void: 'Void'
	};

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const invoicesWithDetails = $derived(
		data.invoices.map((invoice) => {
			const job = invoice.shop_jobs;
			return {
				id: invoice.id,
				invoice_number: invoice.invoice_number,
				customer_name: job?.customer_name ?? '—',
				job_number: job?.job_number ?? '—',
				status: invoice.status as ShopInvoiceStatus,
				total_display: formatCurrency(invoice.total ?? 0),
				amount_due_display: formatCurrency(invoice.amount_due ?? 0),
				due_date_display: formatDate(invoice.due_date)
			};
		})
	);

	const columns = [
		{ key: 'invoice_number' as const, label: 'Invoice #', sortable: true, icon: Hash },
		{ key: 'customer_name' as const, label: 'Customer', sortable: true, icon: User },
		{ key: 'job_number' as const, label: 'Job #', sortable: true, icon: Hash },
		{ key: 'status' as const, label: 'Status', sortable: true, icon: Activity },
		{ key: 'total_display' as const, label: 'Total', sortable: false, icon: DollarSign },
		{ key: 'amount_due_display' as const, label: 'Amount Due', sortable: false, icon: DollarSign },
		{ key: 'due_date_display' as const, label: 'Due Date', sortable: true, icon: Calendar }
	];

	function handleRowClick(row: (typeof invoicesWithDetails)[0]) {
		startNavigation(row.id, `/shop/invoices/${row.id}`);
	}
</script>

<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
	<PageHeader title="Invoices" description="Manage invoices and payments for completed jobs.">
		{#snippet actions()}
			<Button href="/shop/jobs">
				View Jobs
			</Button>
		{/snippet}
	</PageHeader>

	{#if invoicesWithDetails.length === 0}
		<EmptyState
			icon={FileText}
			title="No invoices yet"
			description="Invoices are created from completed jobs. Go to a job and click Create Invoice."
			actionLabel="View Jobs"
			onAction={() => goto('/shop/jobs')}
		/>
	{:else}
		<ModernDataTable
			data={invoicesWithDetails}
			{columns}
			onRowClick={handleRowClick}
			loadingRowId={loadingId}
			rowIdKey="id"
			striped
			emptyMessage="No invoices found"
		>
			{#snippet cellContent(column, row)}
				{#if column.key === 'invoice_number'}
					<TableCell variant="primary" bold>
						{row.invoice_number}
					</TableCell>
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
				Showing <span class="font-medium text-gray-900">{invoicesWithDetails.length}</span>
				{invoicesWithDetails.length === 1 ? 'invoice' : 'invoices'}
			</p>
		</div>
	{/if}
</div>
