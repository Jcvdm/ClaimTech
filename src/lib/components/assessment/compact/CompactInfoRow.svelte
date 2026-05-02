<script lang="ts">
  let {
    label,
    value,
    placeholder = 'N/A',
    mono = false,
    class: cls = ''
  }: {
    label: string;
    value?: string | number | null | undefined;
    placeholder?: string;
    mono?: boolean;
    class?: string;
  } = $props();

  const display = $derived(
    value === null || value === undefined || value === '' ? placeholder : value
  );
  const isPlaceholder = $derived(display === placeholder);
</script>

<div class="flex flex-col gap-0.5 {cls}">
  <dt class="text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500">{label}</dt>
  <dd class="text-[13px] {mono ? 'font-mono' : ''} {isPlaceholder ? 'text-slate-400' : 'text-slate-900'}">
    {display}
  </dd>
</div>
