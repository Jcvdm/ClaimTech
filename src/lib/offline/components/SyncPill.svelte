<!-- src/lib/offline/components/SyncPill.svelte -->
<script lang="ts">
  import { networkStatus } from '$lib/offline/network-status.svelte';
  import { syncManager } from '$lib/offline/services/sync-manager.svelte';
  import { CheckCircle2, RefreshCw, CloudOff } from 'lucide-svelte';

  // Derive state per spec
  const queued = $derived(syncManager.pendingCount);
  const online = $derived(networkStatus.isOnline);

  // Three states: synced / syncing / offline
  const state = $derived.by(() => {
    if (!online) return 'offline';
    if (queued > 0) return 'syncing';
    return 'synced';
  });

  const label = $derived.by(() => {
    if (state === 'offline') return `Offline · ${queued} queued`;
    if (state === 'syncing') return `Syncing ${queued}`;
    return 'Synced';
  });
</script>

<div
  class="flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-[11.5px] font-medium
         {state === 'synced'  ? 'bg-success-soft border-success-border text-success' : ''}
         {state === 'syncing' ? 'bg-warning-soft border-warning-border text-warning' : ''}
         {state === 'offline' ? 'bg-warning-soft border-warning-border text-warning' : ''}"
  role="status"
  aria-live="polite"
  aria-label={label}
>
  {#if state === 'synced'}
    <CheckCircle2 class="size-3.5" stroke-width={1.5} />
  {:else if state === 'syncing'}
    <RefreshCw class="size-3.5 animate-spin" stroke-width={1.5} />
  {:else}
    <CloudOff class="size-3.5" stroke-width={1.5} />
  {/if}
  <span>{label}</span>
</div>
