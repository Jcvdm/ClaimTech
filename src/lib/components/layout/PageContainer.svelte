<script lang="ts">
  import { cn } from '$lib/utils';
  type Props = {
    class?: string;
    children: import('svelte').Snippet;
  };
  let { class: className = '', children }: Props = $props();
</script>

<div class={cn('mx-auto w-full min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8', className)}>
  {@render children()}
</div>
