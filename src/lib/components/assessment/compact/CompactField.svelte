<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    required = false,
    hint,
    htmlFor,
    class: cls = '',
    children
  }: {
    label: string;
    required?: boolean;
    hint?: string;
    htmlFor?: string;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<div class="mb-3 {cls}">
  <label for={htmlFor} class="block text-[10px] font-bold uppercase tracking-[0.04em] text-slate-600 mb-1">
    {label}{#if required}<span class="text-red-600 ml-0.5">*</span>{/if}
  </label>
  {@render children()}
  {#if hint}
    <p class="mt-1 text-[10px] text-slate-400">{hint}</p>
  {/if}
</div>
