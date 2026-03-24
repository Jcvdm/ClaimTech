<script lang="ts">
	import { Plus, FileText } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type EstimateStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'revised' | 'expired';

	const statusConfig: Record<EstimateStatus, { label: string; classes: string }> = {
		draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
		sent: { label: 'Sent', classes: 'bg-blue-100 text-blue-700' },
		approved: { label: 'Approved', classes: 'bg-green-100 text-green-700' },
		declined: { label: 'Declined', classes: 'bg-red-100 text-red-700' },
		revised: { label: 'Revised', classes: 'bg-orange-100 text-orange-700' },
		expired: { label: 'Expired', classes: 'bg-gray-100 text-gray-500' }
	};

	function getStatusConfig(status: string) {
		return statusConfig[status as EstimateStatus] ?? { label: status, classes: 'bg-gray-100 text-gray-700' };
	}

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
</script>

<div class="space-y-6 pt-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Estimates</h1>
			<p class="mt-1 text-sm text-gray-500">Manage repair estimates for customers.</p>
		</div>
		<a
			href="/shop/estimates/new"
			class="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
		>
			<Plus class="h-4 w-4" />
			New Estimate
		</a>
	</div>

	{#if data.estimates.length === 0}
		<div class="rounded-2xl border border-gray-200 bg-white p-12 shadow-sm">
			<div class="flex flex-col items-center gap-3 text-center">
				<div class="rounded-full bg-gray-100 p-4">
					<FileText class="h-8 w-8 text-gray-400" />
				</div>
				<h3 class="font-semibold text-gray-900">No estimates yet</h3>
				<p class="text-sm text-gray-500">Create your first estimate to get started.</p>
				<a
					href="/shop/estimates/new"
					class="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
				>
					<Plus class="h-4 w-4" />
					New Estimate
				</a>
			</div>
		</div>
	{:else}
		<div class="rounded-2xl border border-gray-200 bg-white shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-gray-100">
							<th class="px-4 py-3 text-left font-medium text-gray-500">Estimate #</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500">Vehicle</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500">Type</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
							<th class="px-4 py-3 text-right font-medium text-gray-500">Total</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500">Date</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50">
						{#each data.estimates as estimate}
							{@const job = estimate.shop_jobs}
							{@const sc = getStatusConfig(estimate.status)}
							<tr
								class="cursor-pointer transition-colors hover:bg-gray-50"
								onclick={() => window.location.href = `/shop/estimates/${estimate.id}`}
							>
								<td class="px-4 py-3 font-medium text-gray-900">
									{estimate.estimate_number}
								</td>
								<td class="px-4 py-3 text-gray-700">
									{job?.customer_name ?? '—'}
								</td>
								<td class="px-4 py-3 text-gray-700">
									{#if job?.vehicle_make || job?.vehicle_model}
										{[job?.vehicle_make, job?.vehicle_model].filter(Boolean).join(' ')}
										{#if job?.vehicle_reg}
											<span class="ml-1 text-gray-400">({job.vehicle_reg})</span>
										{/if}
									{:else}
										—
									{/if}
								</td>
								<td class="px-4 py-3">
									<span class="capitalize text-gray-700">{job?.job_type ?? '—'}</span>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {sc.classes}">
										{sc.label}
									</span>
								</td>
								<td class="px-4 py-3 text-right font-medium text-gray-900">
									{formatCurrency(estimate.total)}
								</td>
								<td class="px-4 py-3 text-gray-500">
									{formatDate(estimate.created_at)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
