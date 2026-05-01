<script lang="ts">
  let {
    value,
    options,
    onChange,
    class: cls = ''
  }: {
    value: string;
    options: { value: string; label: string; sub?: string }[];
    onChange: (value: string) => void;
    class?: string;
  } = $props();
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 {cls}">
  {#each options as opt (opt.value)}
    {@const active = value === opt.value}
    <div
      role="radio"
      aria-checked={active}
      tabindex="0"
      onclick={() => onChange(opt.value)}
      onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(opt.value)}
      class="relative px-3.5 py-3.5 rounded-lg cursor-pointer transition-all flex items-start gap-2.5 {active ? 'border-[1.5px] border-green-600 bg-green-50' : 'border border-slate-200 bg-white hover:border-slate-400'}"
    >
      {#if active}
        <span class="absolute top-2 right-2.5 text-[9px] font-extrabold text-green-600 tracking-wider">SELECTED</span>
      {/if}
      <div
        class="flex-shrink-0 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center mt-0.5 {active ? 'bg-green-600 border-green-600' : 'border-slate-400 bg-white'}"
      >
        {#if active}
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        {/if}
      </div>
      <div>
        <div class="text-[14px] font-bold text-slate-900">{opt.label}</div>
        {#if opt.sub}
          <div class="text-[12px] text-slate-600 mt-0.5">{opt.sub}</div>
        {/if}
      </div>
    </div>
  {/each}
</div>
