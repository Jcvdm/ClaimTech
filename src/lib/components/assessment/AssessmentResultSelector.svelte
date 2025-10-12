<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle, AlertCircle, XCircle, Ban, Target } from 'lucide-svelte';
	import type { AssessmentResultType } from '$lib/types/assessment';
	import {
		getAllAssessmentResults,
		getAssessmentResultColorClasses
	} from '$lib/utils/assessmentResults';

	interface Props {
		assessmentResult?: AssessmentResultType | null;
		onUpdate: (result: AssessmentResultType | null) => void;
		disabled?: boolean;
	}

	let { assessmentResult = null, onUpdate, disabled = false }: Props = $props();

	const results = getAllAssessmentResults();

	// Get icon component based on icon name
	function getIconComponent(iconName: string) {
		switch (iconName) {
			case 'check':
				return CheckCircle;
			case 'alert':
				return AlertCircle;
			case 'x':
				return XCircle;
			case 'ban':
				return Ban;
			default:
				return CheckCircle;
		}
	}

	function handleSelect(value: AssessmentResultType) {
		if (!disabled) {
			onUpdate(value);
		}
	}

	function handleClear() {
		if (!disabled) {
			onUpdate(null);
		}
	}
</script>

<Card class="p-6">
	<div class="mb-4 flex items-center gap-2">
		<Target class="h-5 w-5 text-blue-600" />
		<h3 class="text-lg font-semibold text-gray-900">Assessment Result</h3>
	</div>

	<p class="mb-6 text-sm text-gray-600">
		Select the final outcome of this assessment:
	</p>

	<!-- Result Options Grid -->
	<div class="grid gap-4 sm:grid-cols-2 mb-4">
		{#each results as result}
			{@const isSelected = assessmentResult === result.value}
			{@const colorClasses = getAssessmentResultColorClasses(result.color)}
			{@const IconComponent = getIconComponent(result.icon)}

			<button
				type="button"
				onclick={() => handleSelect(result.value)}
				disabled={disabled}
				class="relative flex flex-col gap-3 rounded-lg border-2 p-4 text-left transition-all
					{isSelected
						? `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}`
						: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}
					{disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
					focus:outline-none focus:ring-2 focus:ring-offset-2
					{isSelected ? `focus:${colorClasses.ring}` : 'focus:ring-blue-500'}"
			>
				<!-- Radio Button Indicator -->
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<div
							class="flex h-5 w-5 items-center justify-center rounded-full border-2
								{isSelected
									? `${colorClasses.border} ${colorClasses.bg}`
									: 'border-gray-300 bg-white'}"
						>
							{#if isSelected}
								<div class="h-2.5 w-2.5 rounded-full {colorClasses.text} bg-current"></div>
							{/if}
						</div>
						<IconComponent
							class="h-5 w-5 {isSelected ? colorClasses.text : 'text-gray-400'}"
						/>
					</div>
					{#if isSelected}
						<span class="text-xs font-semibold uppercase tracking-wide {colorClasses.text}">
							Selected
						</span>
					{/if}
				</div>

				<!-- Label and Description -->
				<div class="ml-8">
					<div class="font-semibold {isSelected ? colorClasses.text : 'text-gray-900'}">
						{result.label}
					</div>
					<div class="mt-1 text-sm {isSelected ? colorClasses.text : 'text-gray-600'}">
						{result.description}
					</div>
				</div>
			</button>
		{/each}
	</div>

	<!-- Clear Selection Button -->
	{#if assessmentResult}
		<div class="flex justify-end">
			<Button
				variant="outline"
				size="sm"
				onclick={handleClear}
				disabled={disabled}
			>
				Clear Selection
			</Button>
		</div>
	{/if}
</Card>

