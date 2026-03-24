<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchValue = $state(data.search ?? '');

	function handleSearch(event: Event) {
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const search = formData.get('search') as string;
		const url = new URL($page.url);
		if (search.trim()) {
			url.searchParams.set('search', search.trim());
		} else {
			url.searchParams.delete('search');
		}
		goto(url.toString(), { keepFocus: true });
	}
</script>

<div class="space-y-6 pt-4">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Customers</h1>
			<p class="mt-1 text-sm text-gray-500">Manage customer records and contact information.</p>
		</div>
		<a
			href="/shop/customers/new"
			class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
		>
			+ Add Customer
		</a>
	</div>

	<!-- Search -->
	<form onsubmit={handleSearch} class="flex gap-2">
		<input
			type="text"
			name="search"
			bind:value={searchValue}
			placeholder="Search by name, phone, email..."
			class="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
		/>
		<button
			type="submit"
			class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
		>
			Search
		</button>
		{#if data.search}
			<a
				href="/shop/customers"
				class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
			>
				Clear
			</a>
		{/if}
	</form>

	<div class="rounded-2xl border border-gray-200 bg-white shadow-sm">
		{#if data.customers.length === 0}
			<div class="py-16 text-center">
				{#if data.search}
					<p class="text-sm text-gray-500">No customers found for "{data.search}".</p>
				{:else}
					<p class="text-sm text-gray-500">No customers yet. Add your first customer to get started.</p>
				{/if}
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
						<tr>
							<th class="px-4 py-3">Name</th>
							<th class="px-4 py-3">Phone</th>
							<th class="px-4 py-3">Email</th>
							<th class="px-4 py-3">City</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.customers as customer}
							<tr
								class="cursor-pointer transition-colors hover:bg-gray-50"
								onclick={() => goto(`/shop/customers/${customer.id}`)}
							>
								<td class="px-4 py-3">
									<p class="font-medium text-gray-900">{customer.name}</p>
									{#if customer.company_name}
										<p class="text-xs text-gray-500">{customer.company_name}</p>
									{/if}
								</td>
								<td class="px-4 py-3 text-gray-600">{customer.phone ?? '-'}</td>
								<td class="px-4 py-3 text-gray-600">{customer.email ?? '-'}</td>
								<td class="px-4 py-3 text-gray-600">{customer.city ?? '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
