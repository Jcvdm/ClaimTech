<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    tone = 'gray',
    mono = false,
    class: cls = '',
    children
  }: {
    tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'dark';
    mono?: boolean;
    class?: string;
    children: Snippet;
  } = $props();

  const toneClasses: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-600',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    dark: 'bg-slate-900 text-white'
  };
</script>

<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold {toneClasses[tone]} {mono ? 'font-mono' : ''} {cls}">
  {@render children()}
</span>
