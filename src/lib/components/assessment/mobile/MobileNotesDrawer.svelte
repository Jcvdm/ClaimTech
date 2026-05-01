<script lang="ts">
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle
	} from '$lib/components/ui/sheet';
	import AssessmentNotes from '$lib/components/assessment/AssessmentNotes.svelte';
	import type { AssessmentNote } from '$lib/types/assessment';

	interface Props {
		open: boolean;
		onOpenChange: (v: boolean) => void;
		assessmentId: string;
		notes: AssessmentNote[];
		currentTab: string;
		onUpdate: () => void;
		lastSaved?: string | null;
	}

	let { open, onOpenChange, assessmentId, notes, currentTab, onUpdate, lastSaved = null }: Props = $props();
</script>

<Sheet {open} {onOpenChange}>
	<SheetContent side="bottom" class="max-h-[85vh] rounded-t-xl p-0">
		<div class="flex h-full flex-col">
			<SheetHeader class="px-4 pt-4 pb-2">
				<SheetTitle>Notes ({notes.length})</SheetTitle>
			</SheetHeader>
			<div class="flex-1 overflow-y-auto px-3 pb-4">
				<AssessmentNotes
					{assessmentId}
					{notes}
					{currentTab}
					{onUpdate}
					{lastSaved}
				/>
			</div>
		</div>
	</SheetContent>
</Sheet>
