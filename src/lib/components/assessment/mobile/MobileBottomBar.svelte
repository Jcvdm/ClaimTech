<script lang="ts">
	import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import LoadingButton from '$lib/components/ui/button/LoadingButton.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		onPrev: () => void;
		onNext: () => void;
		onNotesClick: () => void;
		notesCount: number;
		prevDisabled?: boolean;
		nextDisabled?: boolean;
		saving?: boolean;
		nextLabel?: string;
		nextStepLabel?: string;
		class?: string;
	}

	let {
		onPrev,
		onNext,
		onNotesClick,
		notesCount,
		prevDisabled = false,
		nextDisabled = false,
		saving = false,
		nextLabel = 'Save & Next',
		nextStepLabel = undefined,
		class: className
	}: Props = $props();
</script>

<div
	class={cn(
		'fixed bottom-0 inset-x-0 z-30 border-t bg-card px-3 py-2',
		'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
		className
	)}
>
	<div class="grid grid-cols-[auto_auto_1fr] gap-2 items-center">
		<!-- Prev button -->
		<Button
			variant="outline"
			size="sm"
			onclick={onPrev}
			disabled={prevDisabled}
			class="flex items-center gap-1"
		>
			<ChevronLeft class="size-4" />
			Prev
		</Button>

		<!-- Notes button with badge -->
		<div class="relative">
			<Button
				variant="ghost"
				size="sm"
				onclick={onNotesClick}
				class="flex items-center justify-center"
				aria-label="Notes"
			>
				<MessageSquare class="size-4" />
			</Button>
			{#if notesCount > 0}
				<span
					class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
				>
					{notesCount}
				</span>
			{/if}
		</div>

		<!-- Save & Next CTA -->
		<LoadingButton
			variant="default"
			size="sm"
			loading={saving}
			onclick={onNext}
			disabled={nextDisabled}
			class="w-full justify-center"
		>
			{nextLabel}{#if nextStepLabel}: {nextStepLabel}{/if}
			<ChevronRight class="ml-1.5 size-4" />
		</LoadingButton>
	</div>
</div>
