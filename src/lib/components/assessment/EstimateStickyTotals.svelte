<script lang="ts">
  /**
   * EstimateStickyTotals — compact dark-surface totals bar for the Estimate tab.
   *
   * Usage example:
   * ```svelte
   * <EstimateStickyTotals
   *   totalIncVat={estimate.total_inc_vat}
   *   thresholdPct={threshold.pct ?? null}
   *   thresholdColor={getThresholdColorClasses(threshold.color).text}
   *   partsTotal={estimate.parts_total}
   *   labourTotal={estimate.labour_total}
   *   paintTotal={estimate.paint_total}
   *   vatAmount={estimate.vat_amount}
   * />
   * ```
   */
  import type { Snippet } from 'svelte';
  import TotalsCard from '$lib/components/ui/totals-card/TotalsCard.svelte';
  import { formatCurrency } from '$lib/utils/formatters';
  import { cn } from '$lib/utils';

  interface Props {
    totalIncVat: number;
    /** Percentage of borderline value (e.g. 10.1 = 10.1%). Pass null when no borderline is available. */
    thresholdPct: number | null;
    /** Tailwind text class for threshold colour, e.g. 'text-success' / 'text-warning' / 'text-destructive' */
    thresholdColor: string;
    partsTotal: number;
    labourTotal: number;
    paintTotal: number;
    vatAmount: number;
    class?: string;
  }

  let {
    totalIncVat,
    thresholdPct,
    thresholdColor,
    partsTotal,
    labourTotal,
    paintTotal,
    vatAmount,
    class: className
  }: Props = $props();
</script>

<TotalsCard label="TOTAL (incl. VAT)" class={cn(className)}>
  {#snippet children()}
    <div class="col-span-3 flex items-start justify-between gap-3">
      <span class="font-mono-tabular text-[22px] font-extrabold leading-tight {thresholdColor || 'text-success'}">
        {formatCurrency(totalIncVat)}
      </span>
      {#if thresholdPct != null}
        <div class="text-right">
          <div class="text-[9px] font-bold uppercase tracking-wide opacity-60">Threshold</div>
          <div class="text-[11px] font-bold {thresholdColor}">{thresholdPct.toFixed(1)}%</div>
        </div>
      {/if}
    </div>
    <div class="col-span-3 mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono-tabular text-[10px] opacity-70">
      <span>P {formatCurrency(partsTotal)}</span>
      <span>·</span>
      <span>L {formatCurrency(labourTotal)}</span>
      <span>·</span>
      <span>Pt {formatCurrency(paintTotal)}</span>
      <span>·</span>
      <span>VAT {formatCurrency(vatAmount)}</span>
    </div>
  {/snippet}
</TotalsCard>
