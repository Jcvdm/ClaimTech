<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    tight = false,
    class: cls = '',
    children
  }: {
    tight?: boolean;
    class?: string;
    children: Snippet;
  } = $props();
</script>

<div class="bg-white border border-slate-200 rounded-lg {tight ? 'p-3.5' : 'p-4'} {cls}">
  {@render children()}
</div>
