<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    icon,
    count,
    right,
    subtitle,
    required = false
  }: {
    title: string;
    icon?: Snippet;
    count?: number;
    right?: Snippet;
    subtitle?: string;
    required?: boolean;
  } = $props();
</script>

<div class="flex items-center gap-2 mb-3">
  {#if icon}
    <span class="flex-shrink-0 w-[15px] h-[15px] flex items-center justify-center">
      {@render icon()}
    </span>
  {/if}
  <span class="text-[15px] font-extrabold text-slate-900">{title}</span>
  {#if required}
    <span class="text-red-600 ml-1">*</span>
  {/if}
  {#if count !== undefined}
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
      {count}
    </span>
  {/if}
  <div class="flex-1"></div>
  {#if right}
    {@render right()}
  {/if}
</div>
{#if subtitle}
  <p class="text-[12px] text-slate-600 mb-3 -mt-2">{subtitle}</p>
{/if}
