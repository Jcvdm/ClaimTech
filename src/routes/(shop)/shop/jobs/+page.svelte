<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { ShopJobStatus } from '$lib/services/shop-job.service';

	let { data }: { data: PageData } = $props();

	const statusConfig: Record<ShopJobStatus, { label: string; classes: string }> = {
		quote_requested: { label: 'Quote Requested', classes: 'bg-gray-100 text-gray-700' },
		quoted: { label: 'Quoted', classes: 'bg-blue-100 text-blue-700' },
		approved: { label: 'Approved', classes: 'bg-green-100 text-green-700' },
		checked_in: { label: 'Checked In', classes: 'bg-yellow-100 text-yellow-700' },
		in_progress: { label: 'In Progress', classes: 'bg-orange-100 text-orange-700' },
		quality_check: { label: 'Quality Check', classes: 'bg-purple-100 text-purple-700' },
		ready_for_collection: { label: 'Ready for Collection', classes: 'bg-teal-100 text-teal-700' },
		completed: { label: 'Completed', classes: 'bg-green-200 text-green-800' },
		cancelled: { label: 'Cancelled', classes: 'bg-red-100 text-red-700' }
	};

	const jobTypeConfig: Record<string, { label: string; classes: string }> = {
		autobody: { label: 'Autobody', classes: 'bg-blue-100 text-blue-700' },
		mechanical: { label: 'Mechanical', classes: 'bg-orange-100 text-orange-700' }
	};

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="space-y-6 pt-4">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Jobs</h1>
			<p class="mt-1 text-sm text-gray-500">Manage workshop jobs from intake to completion.</p>
		</div>
		<a
			href="/shop/jobs/new"
			class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
		>
			+ New Job
		</a>
	</div>

	<div class="rounded-2xl border border-gray-200 bg-white shadow-sm">
		{#if data.jobs.length === 0}
			<div class="py-16 text-center">
				<p class="text-sm text-gray-500">No jobs found. Create your first job to get started.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
						<tr>
							<th class="px-4 py-3">Job #</th>
							<th class="px-4 py-3">Customer</th>
							<th class="px-4 py-3">Vehicle</th>
							<th class="px-4 py-3">Type</th>
							<th class="px-4 py-3">Status</th>
							<th class="px-4 py-3">Date In</th>
							<th class="px-4 py-3">Promised</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.jobs as job}
							<tr
								class="cursor-pointer transition-colors hover:bg-gray-50"
								onclick={() => goto(`/shop/jobs/${job.id}`)}
							>
								<td class="px-4 py-3 font-medium text-gray-900">{job.job_number}</td>
								<td class="px-4 py-3 text-gray-700">{job.customer_name}</td>
								<td class="px-4 py-3 text-gray-700">
									{job.vehicle_year ? `${job.vehicle_year} ` : ''}{job.vehicle_make}
									{job.vehicle_model}
									{#if job.vehicle_reg}
										<span class="ml-1 text-xs text-gray-400">({job.vehicle_reg})</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									{#if jobTypeConfig[job.job_type]}
										<span
											class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {jobTypeConfig[job.job_type].classes}"
										>
											{jobTypeConfig[job.job_type].label}
										</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									{#if statusConfig[job.status as ShopJobStatus]}
										<span
											class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusConfig[job.status as ShopJobStatus].classes}"
										>
											{statusConfig[job.status as ShopJobStatus].label}
										</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-gray-600">{formatDate(job.date_in)}</td>
								<td class="px-4 py-3 text-gray-600">{formatDate(job.date_promised)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
