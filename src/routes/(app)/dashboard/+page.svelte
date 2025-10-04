<script lang="ts">
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import { Card } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Plus } from 'lucide-svelte';

  export let data: { groups: { type: string; items: { id: string; title: string; updated_at: string }[] }[] };

  const typeLabels: Record<string, string> = {
    requests: 'Requests',
    inspections: 'Inspections',
    frc: 'Final Costings',
    additionals: 'Additionals'
  };
</script>

<div class="space-y-6">
  <PageHeader
    title="Dashboard"
    description="Overview of pending work and recent activity"
  >
    {#snippet actions()}
      <Button href="/quotes/new" class="gap-2">
        <Plus class="h-4 w-4" />
        New Quote
      </Button>
    {/snippet}
  </PageHeader>

  <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {#each data.groups as group}
      <Card class="p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-medium text-gray-600">{typeLabels[group.type] || group.type}</h2>
          <Badge variant="secondary" class="rounded-full">
            {group.items.length}
          </Badge>
        </div>
        <div class="mb-4">
          <div class="text-3xl font-bold text-gray-900">{group.items.length}</div>
          <p class="text-xs text-gray-500">pending items</p>
        </div>
        <a
          href={'/work/' + group.type}
          class="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          View all →
        </a>
      </Card>
    {/each}
  </div>

  <!-- Recent Activity -->
  <div>
    <h2 class="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
    <Card class="divide-y">
      {#each data.groups.flatMap(g => g.items).slice(0, 10) as item}
        <div class="flex items-center justify-between p-4 hover:bg-gray-50">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">{item.title}</p>
            <p class="text-xs text-gray-500">
              Updated {new Date(item.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      {/each}
    </Card>
  </div>
</div>

