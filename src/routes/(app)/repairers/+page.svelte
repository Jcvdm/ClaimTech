<script lang="ts">
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Building2, Plus } from 'lucide-svelte';
	import type { PageData } from './$types';
	import type { Repairer } from '$lib/types/repairer';

	let { data }: { data: PageData } = $props();

	const columns: Array<{
		key: keyof Repairer;
		label: string;
		sortable: boolean;
		format?: (value: any) => string;
	}> = [
		{ key: 'name', label: 'Repairer Name', sortable: true },
		{ key: 'contact_name', label: 'Contact', sortable: true },
		{ key: 'city', label: 'City', sortable: true },
		{ key: 'province', label: 'Province', sortable: true },
		{ key: 'phone', label: 'Phone', sortable: true },
		{
			key: 'default_labour_rate',
			label: 'Labour Rate',
			sortable: true,
			format: (value: number) =>
				new Intl.NumberFormat('en-ZA', {
					style: 'currency',
					currency: 'ZAR'
				}).format(value || 0)
		}
	];

	function handleRowClick(repairer: Repairer) {
		goto(`/repairers/${repairer.id}`);
	}
</script>

<div class="flex-1 space-y-6 p-8">
	<PageHeader title="Repairers" description="Manage body shops and repair facilities">
		{#snippet actions()}
			<Button onclick={() => goto('/repairers/new')}>
				<Plus class="mr-2 h-4 w-4" />
				New Repairer
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{data.error}</p>
		</div>
	{/if}

	{#if data.repairers.length === 0}
		<EmptyState
			icon={Building2}
			title="No repairers yet"
			description="Get started by adding your first repairer."
			actionLabel="Add Repairer"
			onAction={() => goto('/repairers/new')}
		/>
	{:else}
		<DataTable data={data.repairers} {columns} onRowClick={handleRowClick} />
	{/if}
</div>

