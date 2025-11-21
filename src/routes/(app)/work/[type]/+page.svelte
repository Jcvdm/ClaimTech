<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import DataTable from '$lib/components/data/DataTable.svelte';
	import EmptyState from '$lib/components/data/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus, FileText } from 'lucide-svelte';

	let {
		data
	}: {
		data: { type: string; items: { id: string; title: string; updated_at: string }[] };
	} = $props();

	const LABELS: Record<string, string> = {
		requests: 'Requests',
		inspections: 'Inspections',
		frc: 'Final Costings',
		additionals: 'Additionals'
	};

	// Add mock status and formatted date for demo
	const itemsWithStatus = $derived(
		data.items.map((item, i) => ({
			...item,
			status: ['draft', 'pending', 'sent', 'approved'][i % 4],
			date: new Date(item.updated_at).toLocaleDateString()
		}))
	);

	function handleRowClick(row: any) {
		console.log('Clicked row:', row);
		// Navigate to detail page
	}
</script>

<div class="space-y-6">
  <PageHeader
    title={LABELS[data.type] ?? data.type}
    description="Manage and track all {LABELS[data.type]?.toLowerCase() ?? data.type}"
  >
    {#snippet actions()}
      <Button class="gap-2">
        <Plus class="h-4 w-4" />
        New {LABELS[data.type]?.slice(0, -1) ?? 'Item'}
      </Button>
    {/snippet}
  </PageHeader>

  {#if itemsWithStatus.length === 0}
    <EmptyState
      title="No {LABELS[data.type]?.toLowerCase() ?? 'items'} found"
      description="Get started by creating your first {LABELS[data.type]?.toLowerCase().slice(0, -1) ?? 'item'}"
      icon={FileText}
      actionLabel="Create New"
      onAction={() => console.log('Create new')}
    />
  {:else}
    <div class="rounded-lg border bg-white shadow-sm">
      <DataTable
        data={itemsWithStatus}
        columns={[
          {
            key: 'title' as const,
            label: 'Title',
            sortable: true,
            class: 'w-[40%]'
          },
          {
            key: 'status' as const,
            label: 'Status',
            sortable: true,
            class: 'w-[20%]'
          },
          {
            key: 'date' as const,
            label: 'Last Updated',
            sortable: true,
            class: 'w-[20%]'
          },
          {
            key: 'id' as const,
            label: 'ID',
            sortable: false,
            class: 'w-[20%]'
          }
        ]}
        onRowClick={handleRowClick}
        pageSize={15}
      />
    </div>
  {/if}
</div>

