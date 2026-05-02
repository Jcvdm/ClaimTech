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
    tone?: 'dark' | 'light';
    class?: string;
    children: Snippet;
  }

  let { label, footnote, tone = 'dark', class: className, children }: Props = $props();
</script>

<!-- TODO: dark-mode visual review when dark mode lands -->
<div class={cn(
  'rounded-xl p-4 space-y-3',
  tone === 'dark' ? 'bg-foreground text-background' : 'bg-card text-foreground border',
  className
)}>
  <p class={cn(
    'text-[10px] font-semibold uppercase tracking-widest',
    tone === 'dark' ? 'opacity-60' : 'text-muted-foreground'
  )}>{label}</p>
  <div class="grid grid-cols-3 gap-3">
    {@render children()}
  </div>
  {#if footnote}
    <p class={cn(
      'text-[11px] pt-1',
      tone === 'dark' ? 'opacity-60' : 'text-muted-foreground'
    )}>{footnote}</p>
  {/if}
</div>
