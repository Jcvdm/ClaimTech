<script lang="ts">
	import { goto } from '$app/navigation';
	import { useNavigationLoading } from '$lib/utils/useNavigationLoading.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ModernDataTable from '$lib/components/data/ModernDataTable.svelte';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import TableCell from '$lib/components/data/TableCell.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import FilterTabs from '$lib/components/ui/tabs/FilterTabs.svelte';
	import { Button } from '$lib/components/ui/button';
	import { FileText, Hash, User, Activity, DollarSign, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { ShopInvoiceStatus } from '$lib/services/shop-invoice.service';
	import { formatDate, formatCurrency } from '$lib/utils/formatters';

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
				amount_due: invoice.amount_due ?? 0,
				amount_due_display: formatCurrency(invoice.amount_due ?? 0),
				due_date_display: formatDate(invoice.due_date),
				issue_date: invoice.issue_date ?? null
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

	type InvoiceFilter = 'outstanding' | '30' | '60' | '90' | '120' | 'paid';
	let selectedFilter = $state<InvoiceFilter>('outstanding');

	function daysSinceIssue(issueDateStr: string | null): number {
		if (!issueDateStr) return 0;
		const issued = new Date(issueDateStr);
		const now = new Date();
		return Math.floor((now.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
	}

	const outstandingInvoices = $derived(
		invoicesWithDetails.filter(inv => !['paid', 'void'].includes(inv.status))
	);

	const filteredInvoices = $derived.by(() => {
		if (selectedFilter === 'paid') {
			return invoicesWithDetails.filter(inv => inv.status === 'paid');
		}
		if (selectedFilter === 'outstanding') return outstandingInvoices;

		const range = parseInt(selectedFilter);
		if (range === 120) {
			return outstandingInvoices.filter(inv => daysSinceIssue(inv.issue_date) >= 120);
		}
		const min = range - 30;
		return outstandingInvoices.filter(inv => {
			const days = daysSinceIssue(inv.issue_date);
			return days > min && days <= range;
		});
	});

	const filterCounts = $derived({
		outstanding: outstandingInvoices.length,
		'30': outstandingInvoices.filter(inv => daysSinceIssue(inv.issue_date) <= 30).length,
		'60': outstandingInvoices.filter(inv => { const d = daysSinceIssue(inv.issue_date); return d > 30 && d <= 60; }).length,
		'90': outstandingInvoices.filter(inv => { const d = daysSinceIssue(inv.issue_date); return d > 60 && d <= 90; }).length,
		'120': outstandingInvoices.filter(inv => daysSinceIssue(inv.issue_date) >= 120).length,
		paid: invoicesWithDetails.filter(inv => inv.status === 'paid').length,
	});

	const bandAmounts = $derived({
		outstanding: outstandingInvoices.reduce((sum, inv) => sum + (inv.amount_due || 0), 0),
		'30': outstandingInvoices.filter(inv => daysSinceIssue(inv.issue_date) <= 30).reduce((sum, inv) => sum + (inv.amount_due || 0), 0),
		'60': outstandingInvoices.filter(inv => { const d = daysSinceIssue(inv.issue_date); return d > 30 && d <= 60; }).reduce((sum, inv) => sum + (inv.amount_due || 0), 0),
		'90': outstandingInvoices.filter(inv => { const d = daysSinceIssue(inv.issue_date); return d > 60 && d <= 90; }).reduce((sum, inv) => sum + (inv.amount_due || 0), 0),
		'120': outstandingInvoices.filter(inv => daysSinceIssue(inv.issue_date) >= 120).reduce((sum, inv) => sum + (inv.amount_due || 0), 0),
	});

	const filterTabItems = [
		{ value: 'outstanding' as const, label: 'Outstanding' },
		{ value: '30' as const, label: '0-30 Days' },
		{ value: '60' as const, label: '31-60 Days' },
		{ value: '90' as const, label: '61-90 Days' },
		{ value: '120' as const, label: '120+ Days' },
		{ value: 'paid' as const, label: 'Paid' },
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
		<!-- Aged Debtor Summary -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
			<div class="rounded-lg border bg-white p-3 text-center">
				<p class="text-xs text-gray-500">Total Outstanding</p>
				<p class="text-lg font-bold text-gray-900">{formatCurrency(bandAmounts.outstanding)}</p>
			</div>
			<div class="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
				<p class="text-xs text-green-700">0-30 Days</p>
				<p class="text-lg font-bold text-green-700">{formatCurrency(bandAmounts['30'])}</p>
			</div>
			<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center">
				<p class="text-xs text-yellow-700">31-60 Days</p>
				<p class="text-lg font-bold text-yellow-700">{formatCurrency(bandAmounts['60'])}</p>
			</div>
			<div class="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center">
				<p class="text-xs text-orange-700">61-90 Days</p>
				<p class="text-lg font-bold text-orange-700">{formatCurrency(bandAmounts['90'])}</p>
			</div>
			<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
				<p class="text-xs text-red-700">120+ Days</p>
				<p class="text-lg font-bold text-red-700">{formatCurrency(bandAmounts['120'])}</p>
			</div>
		</div>

		<FilterTabs
			items={filterTabItems}
			bind:value={selectedFilter}
			counts={filterCounts}
		/>

		{#if filteredInvoices.length === 0}
			<div class="py-12 text-center text-sm text-gray-500">
				No invoices match this filter.
			</div>
		{:else}
			<ModernDataTable
				data={filteredInvoices}
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
					Showing <span class="font-medium text-gray-900">{filteredInvoices.length}</span>
					{filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
				</p>
			</div>
		{/if}
	{/if}
</div>
