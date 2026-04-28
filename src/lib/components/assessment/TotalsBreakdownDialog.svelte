<script lang="ts">
  import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog';
  import { formatCurrency } from '$lib/utils/formatters';

  /**
   * One row in the breakdown.
   * - `value` accepts a number (component formats with formatCurrency) OR a pre-formatted string.
   * - `color` controls the value text color (matches existing tokens).
   * - `emphasis` controls the value's font-weight + size + label-weight:
   *     normal — text-sm font-medium
   *     bold — text-sm font-semibold
   *     subtotal — label semibold text-base, value font-mono-tabular text-lg font-semibold (use border-b-2 above)
   *     total — label semibold text-base, value font-mono-tabular text-lg font-bold
   * - `border` controls the divider line on this row:
   *     none — no border
   *     bottom — border-b (default for most rows)
   *     top — border-t-2 border-gray-200 (for sundries / VAT separation)
   */
  export interface BreakdownRow {
    label: string;
    value: number | string;
    color?: 'default' | 'success' | 'warning' | 'destructive';
    emphasis?: 'normal' | 'bold' | 'subtotal' | 'total';
    border?: 'none' | 'bottom' | 'top';
  }

  interface Props {
    rows: BreakdownRow[];
    title: string;
    description?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Optional max-width class for ResponsiveDialog.Content. Defaults to sm:max-w-2xl. */
    contentClass?: string;
  }

  let {
    rows,
    title,
    description = '',
    open = $bindable(),
    onOpenChange,
    contentClass = 'sm:max-w-2xl'
  }: Props = $props();

  function colorClass(color: BreakdownRow['color']) {
    switch (color) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'destructive': return 'text-red-600';
      default: return '';
    }
  }

  function labelClass(emphasis: BreakdownRow['emphasis']) {
    switch (emphasis) {
      case 'subtotal':
      case 'total': return 'text-base font-semibold text-gray-700';
      default: return 'text-sm text-muted-foreground';
    }
  }

  function valueClass(emphasis: BreakdownRow['emphasis']) {
    switch (emphasis) {
      case 'subtotal': return 'font-mono-tabular text-lg font-semibold';
      case 'total': return 'font-mono-tabular text-lg font-bold';
      case 'bold': return 'font-mono-tabular text-sm font-semibold';
      default: return 'font-mono-tabular text-sm font-medium';
    }
  }

  function borderClass(border: BreakdownRow['border']) {
    switch (border) {
      case 'top': return 'border-t-2 border-gray-200';
      case 'none': return '';
      default: return 'border-b';
    }
  }

  function renderValue(value: number | string): string {
    if (typeof value === 'number') return formatCurrency(value);
    return value;
  }
</script>

<ResponsiveDialog.Root bind:open onOpenChange={onOpenChange}>
  <ResponsiveDialog.Content class={contentClass}>
    <ResponsiveDialog.Header>
      <ResponsiveDialog.Title>{title}</ResponsiveDialog.Title>
      {#if description}
        <ResponsiveDialog.Description>{description}</ResponsiveDialog.Description>
      {/if}
    </ResponsiveDialog.Header>

    <div class="space-y-2 p-6">
      {#each rows as row (row.label)}
        <div class="flex items-center justify-between py-2 {borderClass(row.border)}">
          <span class={labelClass(row.emphasis)}>{row.label}</span>
          <span class={`${valueClass(row.emphasis)} ${colorClass(row.color)}`}>
            {renderValue(row.value)}
          </span>
        </div>
      {/each}
    </div>
  </ResponsiveDialog.Content>
</ResponsiveDialog.Root>
