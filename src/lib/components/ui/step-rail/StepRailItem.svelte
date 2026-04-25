<script lang="ts">
	import StepRing from './StepRing.svelte';

	interface Props {
		id: string;
		label: string;
		status: 'complete' | 'in-progress' | 'not-started';
		progress?: number;       // 0-1, only when status === 'in-progress'
		missingCount?: number;   // shown as muted chip when > 0
		isActive: boolean;
		onclick: () => void;
	}

	let { id, label, status, progress = 0, missingCount = 0, isActive, onclick }: Props = $props();
</script>

<!--
  StepRailItem — single row in the step rail.
  Active:   bg-muted + bold + left border (2px border-l-foreground, pl adjusted so text doesn't shift)
  Inactive: hover:bg-sidebar-accent
  Missing-count chip: mono 11px muted-foreground on the right
-->
<button
	type="button"
	role="tab"
	aria-selected={isActive}
	data-step-id={id}
	class="
		flex w-full cursor-pointer items-center gap-2.5 rounded-sm text-[13.5px]
		transition-colors duration-100
		{isActive
			? 'h-8 border-l-2 border-foreground bg-muted pl-[0.375rem] pr-2.5 font-semibold text-foreground'
			: 'h-8 border-l-2 border-transparent px-2.5 font-normal text-foreground/70 hover:bg-sidebar-accent hover:text-foreground'}
	"
	{onclick}
>
	<StepRing {status} {progress} />

	<span class="min-w-0 flex-1 truncate text-left leading-none">{label}</span>

	{#if missingCount > 0 && !isActive}
		<span class="shrink-0 font-mono text-[11px] text-muted-foreground">
			{missingCount}
		</span>
	{/if}
</button>
