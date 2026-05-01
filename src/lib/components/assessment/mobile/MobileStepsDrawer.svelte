<script lang="ts">
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle
	} from '$lib/components/ui/sheet';
	import { StepRail } from '$lib/components/ui/step-rail';

	interface Step {
		id: string;
		label: string;
		status: 'complete' | 'in-progress' | 'not-started';
		progress?: number;
		missingCount?: number;
	}

	interface Props {
		open: boolean;
		steps: Step[];
		currentStep: string;
		onStepChange: (id: string) => void;
		onOpenChange: (v: boolean) => void;
	}

	let { open, steps, currentStep, onStepChange, onOpenChange }: Props = $props();
</script>

<Sheet {open} {onOpenChange}>
	<SheetContent side="bottom" class="max-h-[80vh] rounded-t-xl p-0">
		<SheetHeader class="px-4 pt-4 pb-2">
			<SheetTitle>Assessment Steps</SheetTitle>
		</SheetHeader>
		<div class="overflow-y-auto px-2 pb-4">
			<StepRail
				{steps}
				{currentStep}
				onStepChange={(id) => {
					onStepChange(id);
					onOpenChange(false);
				}}
			/>
		</div>
	</SheetContent>
</Sheet>
