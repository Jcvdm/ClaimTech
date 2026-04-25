<script lang="ts">
	import StepRailItem from './StepRailItem.svelte';

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
		onStepChange: (id: string) => void;
	}

	let { steps, currentStep, onStepChange }: Props = $props();

	// Keyboard navigation: ArrowDown / ArrowUp cycle, Enter activates
	function handleKeydown(event: KeyboardEvent) {
		const currentIndex = steps.findIndex((s) => s.id === currentStep);
		if (currentIndex === -1) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			const next = (currentIndex + 1) % steps.length;
			onStepChange(steps[next].id);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			const prev = (currentIndex - 1 + steps.length) % steps.length;
			onStepChange(steps[prev].id);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			onStepChange(steps[currentIndex].id);
		}
	}
</script>

<!--
  StepRail — vertical list of step rows with keyboard navigation.
  Wraps in a nav with role="tablist" for accessibility.
-->
<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<nav
	role="tablist"
	aria-label="Assessment sections"
	class="flex w-full flex-col gap-0.5 px-2 py-3"
	onkeydown={handleKeydown}
>
	{#each steps as step (step.id)}
		<StepRailItem
			id={step.id}
			label={step.label}
			status={step.status}
			progress={step.progress ?? 0}
			missingCount={step.missingCount ?? 0}
			isActive={step.id === currentStep}
			onclick={() => onStepChange(step.id)}
		/>
	{/each}
</nav>
