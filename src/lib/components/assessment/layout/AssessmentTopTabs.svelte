<script lang="ts">
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
		class?: string;
	}

	let { steps, currentStep, onStepChange, class: className = '' }: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		const currentIndex = steps.findIndex((s) => s.id === currentStep);
		if (currentIndex === -1) return;

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			const next = (currentIndex + 1) % steps.length;
			onStepChange(steps[next].id);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			const prev = (currentIndex - 1 + steps.length) % steps.length;
			onStepChange(steps[prev].id);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			onStepChange(steps[currentIndex].id);
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<nav
	role="tablist"
	aria-label="Assessment sections"
	class="flex overflow-x-auto bg-white border-b shrink-0 px-4 {className}"
	onkeydown={handleKeydown}
>
	{#each steps as step (step.id)}
		{@const isActive = step.id === currentStep}
		<button
			role="tab"
			aria-selected={isActive}
			class="flex items-center gap-1.5 px-3.5 py-3 whitespace-nowrap border-b-2 -mb-px transition-colors {isActive
				? 'border-red-600'
				: 'border-transparent'}"
			onclick={() => onStepChange(step.id)}
		>
			<!-- Status indicator -->
			{#if step.status === 'complete'}
				<span
					class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-green-600 text-white text-[9px] font-bold"
				>
					&#10003;
				</span>
			{:else if step.status === 'in-progress'}
				<span class="inline-flex w-3.5 h-3.5 rounded-full border-[1.5px] border-amber-500"></span>
			{:else}
				<span class="inline-flex w-3.5 h-3.5 rounded-full border-[1.5px] border-slate-300"></span>
			{/if}

			<!-- Label -->
			<span
				class="text-[12.5px] {isActive
					? 'font-bold text-slate-900'
					: 'font-medium text-slate-600 hover:text-slate-900'}"
			>
				{step.label}
			</span>

			<!-- Missing count chip (in-progress only) -->
			{#if step.status === 'in-progress' && (step.missingCount ?? 0) > 0}
				<span class="ml-1 text-[10px] font-semibold text-amber-700">{step.missingCount}</span>
			{/if}
		</button>
	{/each}
</nav>
