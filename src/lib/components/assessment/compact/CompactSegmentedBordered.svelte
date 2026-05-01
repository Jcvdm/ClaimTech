<script lang="ts">
  let {
    value,
    options,
    onChange,
    class: cls = ''
  }: {
    value: string;
    options: { value: string; label: string; tone?: 'green' | 'red' }[];
    onChange: (value: string) => void;
    class?: string;
  } = $props();

  function selectedClasses(tone?: 'green' | 'red'): string {
    if (tone === 'green') return 'border-2 border-green-600 bg-green-50 text-green-700';
    if (tone === 'red') return 'border-2 border-red-600 bg-red-50 text-red-700';
    return 'border-2 border-slate-900 bg-slate-50 text-slate-900';
  }
</script>

<div class="flex gap-2.5 {cls}">
  {#each options as opt (opt.value)}
    {@const active = value === opt.value}
    <button
      type="button"
      onclick={() => onChange(opt.value)}
      class="flex-1 px-3 py-3 text-[13px] font-bold rounded-md text-center cursor-pointer transition-colors {active ? selectedClasses(opt.tone) : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'}"
    >
      {opt.label}
    </button>
  {/each}
</div>
