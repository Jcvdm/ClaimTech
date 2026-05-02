<script lang="ts">
  let {
    value,
    options,
    onChange,
    class: cls = ''
  }: {
    value: string;
    options: { value: string; label: string; tone?: 'green' | 'red' | 'amber' }[];
    onChange: (value: string) => void;
    class?: string;
  } = $props();
</script>

<div class="inline-flex bg-slate-100 rounded-lg p-[3px] {cls}" role="group">
  {#each options as opt (opt.value)}
    {@const active = value === opt.value}
    {@const toneText = active
      ? (opt.tone === 'green' ? 'text-green-600' : opt.tone === 'red' ? 'text-red-600' : opt.tone === 'amber' ? 'text-amber-600' : 'text-slate-900')
      : 'text-slate-600 hover:text-slate-900'}
    <button
      type="button"
      onclick={() => onChange(opt.value)}
      class="flex-1 px-2.5 py-2 text-[12px] font-bold rounded-md transition-colors {active ? `bg-white shadow-sm ${toneText}` : toneText}"
    >
      {opt.label}
    </button>
  {/each}
</div>
