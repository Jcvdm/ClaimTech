<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		form: Snippet;
		photos?: Snippet;
		photosWidth?: string;
		stickyPhotos?: boolean;
		splitFrom?: 'md' | 'lg';
		stickyTop?: string;
		class?: string;
	}

	let {
		form,
		photos,
		photosWidth = '440px',
		stickyPhotos = true,
		splitFrom = 'lg',
		stickyTop = 'top-4',
		class: className = ''
	}: Props = $props();

	let splitClass = $derived(
		photos
			? splitFrom === 'md'
				? 'md:grid md:grid-cols-[minmax(0,1fr)_var(--ph-w)] md:gap-6 md:items-start'
				: 'lg:grid lg:grid-cols-[minmax(0,1fr)_var(--ph-w)] lg:gap-6 lg:items-start'
			: ''
	);

	let stickyClass = $derived(
		stickyPhotos
			? splitFrom === 'md'
				? `md:sticky md:${stickyTop} md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto`
				: `lg:sticky lg:${stickyTop} lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`
			: ''
	);
</script>

<div class="{splitClass} {className}" style="--ph-w: {photosWidth}">
	{#if photos}
		<div class="min-w-0">
			{@render form()}
		</div>
		<div class={stickyClass}>
			{@render photos()}
		</div>
	{:else}
		<div class="min-w-0">
			{@render form()}
		</div>
	{/if}
</div>

<!--
  Tailwind safelist (kept by JIT scanning this file):
  lg:top-2 lg:top-4 lg:top-6 lg:top-16 lg:top-20 lg:top-24
  md:top-2 md:top-4 md:top-6 md:top-16 md:top-20 md:top-24
-->
