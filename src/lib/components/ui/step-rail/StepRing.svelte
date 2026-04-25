<script lang="ts">
	import { Check } from 'lucide-svelte';

	interface Props {
		status: 'complete' | 'in-progress' | 'not-started';
		progress?: number; // 0-1, only meaningful when status === 'in-progress'
		size?: number;     // default 14
	}

	let { status, progress = 0, size = 14 }: Props = $props();

	// SVG geometry: 14px ring, radius 6, circumference ≈ 37.7
	const radius = 6;
	const circumference = 2 * Math.PI * radius; // ≈ 37.699

	// Arc length for the progress arc (clamp 0-1)
	const arc = $derived(Math.max(0, Math.min(1, progress)) * circumference);
</script>

<!--
  StepRing — 14px SVG status ring
  Three states:
    complete     → filled circle (--success) + white Check icon
    in-progress  → outline + progress arc, arc starts at 12-o'clock
    not-started  → outline only (--border-strong)
-->
<svg
	width={size}
	height={size}
	viewBox="0 0 14 14"
	aria-hidden="true"
	class="shrink-0"
>
	{#if status === 'complete'}
		<!-- Filled success circle -->
		<circle
			cx="7"
			cy="7"
			r="7"
			fill="var(--success)"
		/>
		<!-- White check mark via foreignObject so we can use the Lucide icon -->
		<!-- Using a polyline path instead to avoid foreignObject layout issues -->
		<polyline
			points="3.5,7 5.5,9.5 10.5,4.5"
			stroke="white"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		/>
	{:else if status === 'in-progress'}
		<!-- Background outline circle -->
		<circle
			cx="7"
			cy="7"
			r={radius}
			fill="none"
			stroke="var(--border)"
			stroke-width="1.5"
		/>
		<!-- Progress arc — starts at 12 o'clock (rotate -90deg around centre) -->
		<circle
			cx="7"
			cy="7"
			r={radius}
			fill="none"
			stroke="var(--foreground)"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-dasharray="{arc} {circumference}"
			transform="rotate(-90 7 7)"
		/>
	{:else}
		<!-- Not started: outline only -->
		<circle
			cx="7"
			cy="7"
			r={radius}
			fill="none"
			stroke="var(--border-strong)"
			stroke-width="1.5"
		/>
	{/if}
</svg>
