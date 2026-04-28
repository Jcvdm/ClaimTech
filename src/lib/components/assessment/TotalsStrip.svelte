<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import SaveIndicator from '$lib/components/ui/save-indicator/SaveIndicator.svelte';
  import { formatCurrency } from '$lib/utils/formatters';
  import { Check, Info } from 'lucide-svelte';

  /**
   * One label+value field rendered in the left side of the strip.
   * value is always a number — formatted with formatCurrency.
   */
  export interface StripField {
    label: string;
    value: number;
  }

  interface Props {
    /** Compact left-side fields (e.g. Parts, Markup, S&A, ...) */
    fields: StripField[];
    /** Optional Total label and value — rendered larger on the right */
    totalLabel?: string;
    totalValue?: number;
    /** Optional Tailwind class to color the Total value (e.g. threshold color) */
    totalColorClass?: string;
    /** Optional Details button click handler — if provided, renders the button */
    onDetailsClick?: () => void;
    /** Save state for the SaveIndicator next to the Save button */
    saving?: boolean;
    saved?: boolean;
    /** Save Progress button — if onSaveClick provided, button rendered */
    onSaveClick?: () => void;
    saveDisabled?: boolean;
    /** Complete button — if onCompleteClick provided, button rendered */
    onCompleteClick?: () => void;
    completeDisabled?: boolean;
    completeLabel?: string;
  }

  let {
    fields,
    totalLabel = 'Total',
    totalValue,
    totalColorClass = '',
    onDetailsClick,
    saving = false,
    saved = false,
    onSaveClick,
    saveDisabled = false,
    onCompleteClick,
    completeDisabled = false,
    completeLabel = 'Complete'
  }: Props = $props();
</script>

<div
  class="sticky bottom-0 z-20 -mx-2 mt-3 border-t border-border bg-card shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.1)] sm:-mx-3"
>
  <div class="px-3 py-2.5 sm:px-6">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
      {#each fields as field (field.label)}
        <span class="flex items-center gap-1.5">
          <span class="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground"
            >{field.label}</span
          >
          <span class="font-mono-tabular">{formatCurrency(field.value)}</span>
        </span>
      {/each}

      <span class="ml-auto flex items-center gap-3">
        {#if totalValue != null}
          <span class="flex items-center gap-2">
            <span class="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground"
              >{totalLabel}</span
            >
            <span class={`font-mono-tabular text-base font-bold ${totalColorClass}`}
              >{formatCurrency(totalValue)}</span
            >
          </span>
        {/if}

        {#if onDetailsClick}
          <Button size="sm" variant="outline" onclick={onDetailsClick}>
            <Info class="mr-1.5 h-3.5 w-3.5" />
            Details
          </Button>
        {/if}

        {#if onSaveClick}
          <SaveIndicator {saving} {saved} />
          <Button onclick={onSaveClick} size="sm" variant="outline" disabled={saveDisabled}>
            Save Progress
          </Button>
        {/if}

        {#if onCompleteClick}
          <Button onclick={onCompleteClick} size="sm" disabled={completeDisabled}>
            <Check class="mr-2 h-4 w-4" />
            {completeLabel}
          </Button>
        {/if}
      </span>
    </div>
  </div>
</div>
