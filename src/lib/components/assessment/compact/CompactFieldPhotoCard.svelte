<script lang="ts">
  import type { Snippet } from 'svelte';
  import CompactCard from './CompactCard.svelte';
  import CompactCardHeader from './CompactCardHeader.svelte';

  let {
    title,
    required = false,
    subtitle,
    field,
    photo,
    class: cls = ''
  }: {
    title: string;
    required?: boolean;
    subtitle?: string;
    field: Snippet;
    photo: Snippet;
    class?: string;
  } = $props();
</script>

<CompactCard class={cls}>
  <CompactCardHeader {title} {required} {subtitle} />
  <div class="grid gap-3.5 md:grid-cols-[1fr_200px]">
    <div class="min-w-0">
      {@render field()}
    </div>
    <div class="md:max-w-[200px]">
      {@render photo()}
    </div>
  </div>
</CompactCard>
