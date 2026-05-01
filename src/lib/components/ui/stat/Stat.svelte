<script lang="ts">
  import { cn } from '$lib/utils';

  // Usage example:
  // <Stat label="Retail Value" value="R 125 000" tone="success" size="lg" mono />
  // <Stat label="Excess" value="R 5 000" tone="destructive" size="md" />

  type StatTone = 'default' | 'success' | 'warning' | 'destructive' | 'inverse';
  type StatSize = 'sm' | 'md' | 'lg';

  interface Props {
    label: string;
    value: string;
    tone?: StatTone;
    mono?: boolean;
    size?: StatSize;
    class?: string;
  }

  let { label, value, tone = 'default', mono = false, size = 'md', class: className }: Props =
    $props();

  const labelColorMap: Record<StatTone, string> = {
    default: 'text-muted-foreground',
    inverse: 'opacity-70',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive'
  };

  const valueColorMap: Record<StatTone, string> = {
    default: 'text-foreground',
    inverse: 'text-background',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive'
  };

  const sizeMap: Record<StatSize, string> = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-2xl font-bold'
  };
</script>

<div class={cn('flex flex-col gap-0.5', className)}>
  <p class={cn('text-[11px] font-semibold uppercase tracking-wider', labelColorMap[tone])}>
    {label}
  </p>
  <p class={cn(sizeMap[size], valueColorMap[tone], mono && 'font-mono-tabular tabular-nums')}>
    {value}
  </p>
</div>
