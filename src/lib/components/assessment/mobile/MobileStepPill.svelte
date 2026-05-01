<script lang="ts">
	import { ChevronUp } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Step {
		id: string;
		label: string;
		status: 'complete' | 'in-progress' | 'not-started';
		progress?: number;
		missingCount?: number;
	}

	interface Props {
		steps: Step[];
		currentStep: string;
		onClick: () => void;
		class?: string;
	}

	let { steps, currentStep, onClick, class: className }: Props = $props();

	const currentIndex = $derived.by(() => {
		const idx = steps.findIndex((s) => s.id === currentStep);
		return idx === -1 ? 0 : idx;
	});

	const currentLabel = $derived(steps.find((s) => s.id === currentStep)?.label ?? steps[0]?.label ?? '');

	const progressPercent = $derived((currentIndex / Math.max(steps.length - 1, 1)) * 100);
</script>

<button
	type="button"
	onclick={onClick}
	class={cn(
		'relative h-12 w-full overflow-hidden border-b bg-card px-3 text-left',
		'flex items-center gap-3',
		className
	)}
>
	<!-- Left: step counter + label -->
	<div class="min-w-0 flex-1">
		<span class="block text-[10px] font-semibold uppercase text-muted-foreground">
			Step {currentIndex + 1} of {steps.length}
		</span>
		<span class="block truncate text-sm font-semibold text-foreground">
			{currentLabel}
		</span>
	</div>

	<!-- Right: chevron icon -->
	<ChevronUp class="size-4 shrink-0 text-muted-foreground" />

	<!-- Bottom progress bar -->
	<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
		<div class="h-full bg-primary" style="width: {progressPercent}%"></div>
	</div>
</button>
