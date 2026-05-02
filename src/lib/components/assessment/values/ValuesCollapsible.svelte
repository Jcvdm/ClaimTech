<!-- Deprecated alias: use $lib/components/ui/collapsible-section directly. Kept for backward compatibility. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import CollapsibleSection from '$lib/components/ui/collapsible-section/CollapsibleSection.svelte';

  interface Props {
    title: string;
    summary: string;
    defaultOpen?: boolean;
    forceOpen?: boolean;
    class?: string;
    children: Snippet;
  }

  let { title, summary, defaultOpen, forceOpen, class: className, children }: Props = $props();
</script>

<CollapsibleSection {title} {summary} {defaultOpen} {forceOpen} class={className}>
  {@render children()}
</CollapsibleSection>
