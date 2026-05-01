<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		form: Snippet;
		photos?: Snippet;
		photosWidth?: string;
		stickyPhotos?: boolean;
		splitFrom?: 'md' | 'lg';
		class?: string;
	}

	let {
		form,
		photos,
		photosWidth = '380px',
		stickyPhotos = true,
		splitFrom = 'lg',
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
				? 'md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto'
				: 'lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto'
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
