<script lang="ts">
  import type { Snippet } from 'svelte';
  import CompactCard from './CompactCard.svelte';
  import CompactCardHeader from './CompactCardHeader.svelte';

  let {
    title,
    required = false,
    subtitle,
    photo,
    class: cls = ''
  }: {
    title: string;
    required?: boolean;
    subtitle?: string;
    photo: Snippet;
    class?: string;
  } = $props();
</script>

<CompactCard class={cls}>
  <CompactCardHeader {title} {required} {subtitle} />
  {@render photo()}
</CompactCard>
