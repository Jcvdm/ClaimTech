<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  // Usage example:
  // <TotalsCard label="Totals" footnote="Incl. VAT">
  //   <Stat label="Retail" value="R 125 000" tone="inverse" size="lg" mono />
  //   <Stat label="Parts" value="R 48 200" tone="inverse" mono />
  //   <Stat label="Labour" value="R 12 800" tone="inverse" mono />
  // </TotalsCard>

  interface Props {
    label: string;
    footnote?: string;
    class?: string;
    children: Snippet;
  }

  let { label, footnote, class: className, children }: Props = $props();
</script>

<!-- TODO: dark-mode visual review when dark mode lands -->
<div class={cn('rounded-xl bg-foreground text-background p-4 space-y-3', className)}>
  <p class="text-[10px] font-semibold uppercase tracking-widest opacity-60">{label}</p>
  <div class="grid grid-cols-3 gap-3">
    {@render children()}
  </div>
  {#if footnote}
    <p class="text-[11px] opacity-60 pt-1">{footnote}</p>
  {/if}
</div>
