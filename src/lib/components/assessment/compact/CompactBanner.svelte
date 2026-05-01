<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    tone,
    icon,
    children
  }: {
    tone: 'red' | 'green' | 'amber' | 'blue';
    icon?: Snippet;
    children: Snippet;
  } = $props();

  const toneClasses: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700'
  };
</script>

<div class="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border {toneClasses[tone]}">
  {#if icon}
    <span class="flex-shrink-0 mt-0.5">
      {@render icon()}
    </span>
  {/if}
  <div class="flex-1 text-[13px] leading-snug">
    {@render children()}
  </div>
</div>
