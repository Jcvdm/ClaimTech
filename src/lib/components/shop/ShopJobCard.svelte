<script lang="ts">
	import type { EstimateLineItem } from '$lib/types/assessment';
	import { getProcessTypeBadgeColor } from '$lib/constants/processTypes';

	interface Props {
		job: any;
		lineItems: EstimateLineItem[];
		additionalLineItems?: EstimateLineItem[];
	}

	let { job, lineItems, additionalLineItems = [] }: Props = $props();
</script>

<div class="job-card space-y-6 rounded-lg border bg-white p-6 print:border-0 print:p-0 print:shadow-none">
	<!-- Header -->
	<div class="flex items-start justify-between border-b pb-4">
		<div>
			<h1 class="text-2xl font-bold">{job.job_number}</h1>
			<p class="text-sm text-gray-500">{job.job_type === 'autobody' ? 'Autobody' : 'Mechanical'}</p>
		</div>
		<div class="text-right text-sm">
			{#if (job as any).date_in}
				<p>
					<span class="text-gray-500">Date In:</span>
					{new Date((job as any).date_in).toLocaleDateString('en-ZA', {
						day: 'numeric',
						month: 'short',
						year: 'numeric'
					})}
				</p>
			{/if}
			{#if job.date_promised}
				<p>
					<span class="text-gray-500">Promised:</span>
					{new Date(job.date_promised).toLocaleDateString('en-ZA', {
						day: 'numeric',
						month: 'short',
						year: 'numeric'
					})}
				</p>
			{/if}
		</div>
	</div>

	<!-- Customer & Vehicle -->
	<div class="grid grid-cols-2 gap-6 border-b pb-4 text-sm">
		<div>
			<h3 class="mb-1 font-semibold text-gray-700">Customer</h3>
			<p class="font-medium">{job.customer_name}</p>
			{#if job.shop_customers?.phone}
				<p class="text-gray-600">{job.shop_customers.phone}</p>
			{/if}
		</div>
		<div>
			<h3 class="mb-1 font-semibold text-gray-700">Vehicle</h3>
			<p class="font-medium">{job.vehicle_year ?? ''} {job.vehicle_make} {job.vehicle_model}</p>
			{#if job.vehicle_reg}
				<p class="text-gray-600">Reg: {job.vehicle_reg}</p>
			{/if}
			{#if job.vehicle_color}
				<p class="text-gray-600">Color: {job.vehicle_color}</p>
			{/if}
			{#if job.vehicle_vin}
				<p class="text-gray-600">VIN: {job.vehicle_vin}</p>
			{/if}
		</div>
	</div>

	<!-- Work Items Table -->
	<div>
		<h3 class="mb-2 font-semibold text-gray-700">Work Items</h3>
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b text-left text-xs font-semibold uppercase text-gray-500">
					<th class="pb-2 pr-2 w-8">#</th>
					<th class="pb-2 pr-2 w-16">Type</th>
					<th class="pb-2 pr-2">Description</th>
					<th class="pb-2 pr-2 w-16">Part</th>
					<th class="pb-2 pr-2 w-12 text-right">Qty</th>
					<th class="pb-2 w-14 text-right">Hours</th>
				</tr>
			</thead>
			<tbody>
				{#each lineItems as item, i}
					<tr class="border-b border-gray-100">
						<td class="py-2 pr-2 text-gray-400">{i + 1}</td>
						<td class="py-2 pr-2">
							<span
								class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium {getProcessTypeBadgeColor(item.process_type)}"
							>
								{item.process_type}
							</span>
						</td>
						<td class="py-2 pr-2 font-medium">{item.description || '-'}</td>
						<td class="py-2 pr-2 text-gray-600"
							>{item.process_type === 'N' ? (item.part_type ?? '-') : '-'}</td
						>
						<td class="py-2 pr-2 text-right text-gray-600">{(item as any).quantity ?? '-'}</td>
						<td class="py-2 text-right text-gray-600">
							{#if item.labour_hours}
								{item.labour_hours}
							{:else if item.strip_assemble_hours}
								{item.strip_assemble_hours}
							{:else if item.paint_panels}
								{item.paint_panels}
							{:else}
								-
							{/if}
						</td>
					</tr>
				{/each}

				{#if additionalLineItems.length > 0}
					<tr>
						<td colspan="6" class="pt-4 pb-1 text-xs font-semibold uppercase text-gray-500"
							>Additional Work</td
						>
					</tr>
					{#each additionalLineItems as item, i}
						<tr class="border-b border-gray-100">
							<td class="py-2 pr-2 text-gray-400">{lineItems.length + i + 1}</td>
							<td class="py-2 pr-2">
								<span
									class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium {getProcessTypeBadgeColor(item.process_type)}"
								>
									{item.process_type}
								</span>
							</td>
							<td class="py-2 pr-2 font-medium">{item.description || '-'}</td>
							<td class="py-2 pr-2 text-gray-600"
								>{item.process_type === 'N' ? (item.part_type ?? '-') : '-'}</td
							>
							<td class="py-2 pr-2 text-right text-gray-600">{(item as any).quantity ?? '-'}</td>
							<td class="py-2 text-right text-gray-600">
								{#if item.labour_hours}
									{item.labour_hours}
								{:else if item.strip_assemble_hours}
									{item.strip_assemble_hours}
								{:else if item.paint_panels}
									{item.paint_panels}
								{:else}
									-
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Damage Description / Complaint -->
	{#if job.damage_description || job.complaint}
		<div class="border-t pt-4">
			<h3 class="mb-1 font-semibold text-gray-700">
				{job.job_type === 'autobody' ? 'Damage Description' : 'Complaint'}
			</h3>
			<p class="text-sm text-gray-600">{job.damage_description || job.complaint}</p>
		</div>
	{/if}

	{#if job.diagnosis}
		<div>
			<h3 class="mb-1 font-semibold text-gray-700">Diagnosis</h3>
			<p class="text-sm text-gray-600">{job.diagnosis}</p>
		</div>
	{/if}

	{#if job.notes}
		<div>
			<h3 class="mb-1 font-semibold text-gray-700">Notes</h3>
			<p class="text-sm text-gray-600">{job.notes}</p>
		</div>
	{/if}
</div>

<style>
	@media print {
		:global(nav),
		:global(aside),
		:global(header),
		:global([data-sonner-toaster]),
		:global(.print\:hidden) {
			display: none !important;
		}
		:global(main) {
			padding: 0 !important;
			margin: 0 !important;
		}
	}
</style>
