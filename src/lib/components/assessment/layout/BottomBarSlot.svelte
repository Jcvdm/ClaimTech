<script lang="ts">
  import { getContext } from 'svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  const ctx = getContext<{
    set: (s: Snippet | null) => void;
    clear: () => void;
  } | undefined>('assessment-bottom-bar');

  $effect(() => {
    if (!ctx) return;
    ctx.set(children);
    return () => ctx.clear();
  });
</script>
