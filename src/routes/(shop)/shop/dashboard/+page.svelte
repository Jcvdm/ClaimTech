<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import GradientBadge from '$lib/components/data/GradientBadge.svelte';
	import {
		Wrench,
		FileText,
		Users,
		CheckCircle,
		Plus,
		ArrowRight,
		Briefcase,
		ClipboardList
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'invoiced';
	type JobStatus =
		| 'quote_requested'
		| 'quoted'
		| 'approved'
		| 'checked_in'
		| 'in_progress'
		| 'quality_check'
		| 'ready_for_collection'
		| 'completed'
		| 'cancelled';

	const estimateStatusVariant: Record<
		EstimateStatus,
		'gray' | 'blue' | 'green' | 'yellow' | 'red'
	> = {
		draft: 'gray',
		sent: 'blue',
		approved: 'green',
		rejected: 'red',
		invoiced: 'green'
	};

	const estimateStatusLabel: Record<EstimateStatus, string> = {
		draft: 'Draft',
		sent: 'Sent',
		approved: 'Approved',
		rejected: 'Rejected',
		invoiced: 'Invoiced'
	};

	const jobStatusVariant: Record<
		JobStatus,
		'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
	> = {
		quote_requested: 'gray',
		quoted: 'blue',
		approved: 'green',
		checked_in: 'yellow',
		in_progress: 'yellow',
		quality_check: 'purple',
		ready_for_collection: 'green',
		completed: 'green',
		cancelled: 'red'
	};

	const jobStatusLabel: Record<JobStatus, string> = {
		quote_requested: 'Quote Requested',
		quoted: 'Quoted',
		approved: 'Approved',
		checked_in: 'Checked In',
		in_progress: 'In Progress',
		quality_check: 'Quality Check',
		ready_for_collection: 'Ready',
		completed: 'Completed',
		cancelled: 'Cancelled'
	};

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-ZA', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatCurrency(value: number | null) {
		if (value == null) return '—';
		return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
	}

	const statCards = $derived([
		{
			label: 'Active Jobs',
			value: data.stats.activeJobs,
			sub: `${data.stats.totalJobs} total`,
			icon: Wrench,
			color: 'bg-blue-50 text-blue-600',
			ring: 'ring-blue-100'
		},
		{
			label: 'Completed Jobs',
			value: data.stats.completedJobs,
			sub: 'all time',
			icon: CheckCircle,
			color: 'bg-green-50 text-green-600',
			ring: 'ring-green-100'
		},
		{
			label: 'Open Estimates',
			value: data.stats.draftEstimates + data.stats.pendingEstimates,
			sub: `${data.stats.draftEstimates} draft · ${data.stats.pendingEstimates} sent`,
			icon: FileText,
			color: 'bg-amber-50 text-amber-600',
			ring: 'ring-amber-100'
		},
		{
			label: 'Customers',
			value: data.stats.totalCustomers,
			sub: 'registered',
			icon: Users,
			color: 'bg-purple-50 text-purple-600',
			ring: 'ring-purple-100'
		}
	]);
</script>

<div class="space-y-6 pt-4">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-semibold text-gray-900">Workshop Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500">Overview of your workshop activity.</p>
	</div>

	<!-- Stats row -->
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		{#each statCards as card}
			<div
				class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm ring-1 {card.ring}"
			>
				<div class="flex items-center justify-between">
					<div class="rounded-lg p-2 {card.color}">
						<card.icon class="h-5 w-5" />
					</div>
				</div>
				<div>
					<p class="text-3xl font-bold text-gray-900">{card.value}</p>
					<p class="mt-0.5 text-sm font-medium text-gray-700">{card.label}</p>
					<p class="mt-0.5 text-xs text-gray-400">{card.sub}</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Quick Actions -->
	<div class="flex flex-wrap gap-3">
		<Button href="/shop/estimates/new">
			<Plus class="mr-2 h-4 w-4" />
			New Estimate
		</Button>
		<Button href="/shop/jobs" variant="outline">
			<Briefcase class="mr-2 h-4 w-4" />
			View All Jobs
		</Button>
		<Button href="/shop/customers" variant="outline">
			<Users class="mr-2 h-4 w-4" />
			View All Customers
		</Button>
	</div>

	<!-- Recent activity: two columns on md+ -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Recent Estimates -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<div class="flex items-center gap-2">
					<ClipboardList class="h-4 w-4 text-gray-400" />
					<h2 class="text-sm font-semibold text-gray-900">Recent Estimates</h2>
				</div>
				<a
					href="/shop/estimates"
					class="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
				>
					View all <ArrowRight class="h-3 w-3" />
				</a>
			</div>

			{#if data.recentEstimates.length === 0}
				<div class="px-5 py-8 text-center text-sm text-gray-400">No estimates yet.</div>
			{:else}
				<ul class="divide-y divide-gray-50">
					{#each data.recentEstimates as estimate}
						{@const status = (estimate.status ?? 'draft') as EstimateStatus}
						{@const job = Array.isArray(estimate.shop_jobs)
							? estimate.shop_jobs[0]
							: estimate.shop_jobs}
						<li>
							<button
								type="button"
								onclick={() => goto(`/shop/estimates/${estimate.id}`)}
								class="w-full px-5 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
							>
								<div class="flex items-center justify-between gap-2">
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-semibold text-gray-900">
											{estimate.estimate_number ?? '—'}
										</p>
										{#if job}
											<p class="truncate text-xs text-gray-500">
												{job.customer_name ?? '—'}
												{#if job.vehicle_make || job.vehicle_model}
													&middot; {[job.vehicle_make, job.vehicle_model]
														.filter(Boolean)
														.join(' ')}
												{/if}
											</p>
										{/if}
										<p class="mt-0.5 text-xs text-gray-400">{formatDate(estimate.created_at)}</p>
									</div>
									<div class="flex shrink-0 flex-col items-end gap-1">
										<GradientBadge
											variant={estimateStatusVariant[status] ?? 'gray'}
											label={estimateStatusLabel[status] ?? status}
										/>
										<span class="text-xs font-medium text-gray-700">
											{formatCurrency(estimate.total)}
										</span>
									</div>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Recent Jobs -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<div class="flex items-center gap-2">
					<Wrench class="h-4 w-4 text-gray-400" />
					<h2 class="text-sm font-semibold text-gray-900">Recent Jobs</h2>
				</div>
				<a
					href="/shop/jobs"
					class="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
				>
					View all <ArrowRight class="h-3 w-3" />
				</a>
			</div>

			{#if data.recentJobs.length === 0}
				<div class="px-5 py-8 text-center text-sm text-gray-400">No jobs yet.</div>
			{:else}
				<ul class="divide-y divide-gray-50">
					{#each data.recentJobs as job}
						{@const status = (job.status ?? 'quote_requested') as JobStatus}
						<li>
							<button
								type="button"
								onclick={() => goto(`/shop/jobs/${job.id}`)}
								class="w-full px-5 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
							>
								<div class="flex items-center justify-between gap-2">
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-semibold text-gray-900">
											{job.job_number ?? '—'}
										</p>
										<p class="truncate text-xs text-gray-500">
											{job.customer_name ?? '—'}
											{#if job.vehicle_make || job.vehicle_model}
												&middot; {[job.vehicle_make, job.vehicle_model].filter(Boolean).join(' ')}
											{/if}
										</p>
										<p class="mt-0.5 text-xs text-gray-400">{formatDate(job.created_at)}</p>
									</div>
									<div class="flex shrink-0 flex-col items-end gap-1">
										<GradientBadge
											variant={jobStatusVariant[status] ?? 'gray'}
											label={jobStatusLabel[status] ?? status}
										/>
										{#if job.job_type}
											<span class="text-xs text-gray-400 capitalize">{job.job_type}</span>
										{/if}
									</div>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
