<script lang="ts">
  import type { Snippet } from 'svelte';
  import CompactCard from './CompactCard.svelte';
  import CompactCardHeader from './CompactCardHeader.svelte';
  import CompactInfoRow from './CompactInfoRow.svelte';

  type Row = { label: string; value?: string | number | null; mono?: boolean };

  let {
    title,
    subtitle,
    cols = 3,
    tone = 'info',
    rows,
    children,
    class: cls = ''
  }: {
    title?: string;
    subtitle?: string;
    cols?: 2 | 3 | 4;
    tone?: 'default' | 'info';
    rows?: Row[];
    children?: Snippet;
    class?: string;
  } = $props();

  const toneClass = $derived(
    tone === 'info' ? 'bg-blue-50/40 border-blue-100' : ''
  );
  const colsClass = $derived(
    cols === 2 ? 'grid-cols-1 sm:grid-cols-2' :
    cols === 4 ? 'grid-cols-2 md:grid-cols-4' :
                 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
  );
</script>

<CompactCard class="{toneClass} {cls}">
  {#if title}
    <CompactCardHeader {title} {subtitle} />
  {/if}
  {#if rows}
    <dl class="grid gap-3.5 {colsClass}">
      {#each rows as row, i (row.label + i)}
        <CompactInfoRow label={row.label} value={row.value} mono={row.mono} />
      {/each}
    </dl>
  {:else if children}
    {@render children()}
  {/if}
</CompactCard>
