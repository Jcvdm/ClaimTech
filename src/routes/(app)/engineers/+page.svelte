<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Users, Plus } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const engineersWithDetails = data.engineers.map((engineer) => ({
		...engineer,
		province_display: engineer.province || '-',
		company_display: engineer.company_name || '-',
		type_display: engineer.company_type || '-',
		status_display: engineer.is_active ? 'Active' : 'Inactive'
	}));

	const columns = [
		{
			key: 'name',
			label: 'Name',
			sortable: true
		},
		{
			key: 'email',
			label: 'Email',
			sortable: true
		},
		{
			key: 'phone',
			label: 'Phone',
			sortable: false,
			render: (value: string | null) => value || '-'
		},
		{
			key: 'province_display',
			label: 'Province',
			sortable: true
		},
		{
			key: 'company_display',
			label: 'Company',
			sortable: true
		},
		{
			key: 'company_type',
			label: 'Type',
			sortable: true,
			render: (value: string | null) => {
				if (!value) return '-';
				const className =
					value === 'internal'
						? 'inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800'
						: 'inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800';
				return `<span class="${className}">${value}</span>`;
			}
		},
		{
			key: 'is_active',
			label: 'Status',
			sortable: true,
			render: (value: boolean) => {
				const className = value
					? 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
					: 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800';
				const label = value ? 'Active' : 'Inactive';
				return `<span class="${className}">${label}</span>`;
			}
		}
	];

	function handleRowClick(engineer: (typeof engineersWithDetails)[0]) {
		goto(`/engineers/${engineer.id}`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="Engineers" description="Manage engineers and assessors">
		{#snippet actions()}
			<Button href="/engineers/new">
				<Plus class="mr-2 h-4 w-4" />
				New Engineer
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{data.error}</p>
		</div>
	{/if}

	{#if engineersWithDetails.length === 0}
		<EmptyState
			icon={Users}
			title="No engineers yet"
			description="Get started by adding your first engineer or assessor"
			actionLabel="New Engineer"
			onAction={() => goto('/engineers/new')}
		/>
	{:else}
		<div class="rounded-lg border bg-white">
			<DataTable
				data={engineersWithDetails}
				{columns}
				onRowClick={handleRowClick}
				emptyMessage="No engineers found"
			/>
		</div>

		<div class="flex items-center justify-between text-sm text-gray-500">
			<p>
				Showing <span class="font-medium text-gray-900">{engineersWithDetails.length}</span>
				{engineersWithDetails.length === 1 ? 'engineer' : 'engineers'}
			</p>
		</div>
	{/if}
</div>

