<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	type Props = {
		primaryLabel?: string;
		secondaryLabel?: string;
		cancelLabel?: string;
		onPrimary?: () => void;
		onSecondary?: () => void;
		onCancel?: () => void;
		primaryDisabled?: boolean;
		secondaryDisabled?: boolean;
		loading?: boolean;
		class?: string;
	};

	let {
		primaryLabel = 'Save',
		secondaryLabel = '',
		cancelLabel = 'Cancel',
		onPrimary,
		onSecondary,
		onCancel,
		primaryDisabled = false,
		secondaryDisabled = false,
		loading = false,
		class: className = ''
	}: Props = $props();
</script>

<div class={cn('flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4', className)}>
	{#if onCancel}
		<Button variant="outline" onclick={onCancel} disabled={loading}>
			{cancelLabel}
		</Button>
	{/if}

	{#if secondaryLabel && onSecondary}
		<Button variant="outline" onclick={onSecondary} disabled={secondaryDisabled || loading}>
			{secondaryLabel}
		</Button>
	{/if}

	<Button type={onPrimary ? 'button' : 'submit'} onclick={onPrimary} disabled={primaryDisabled || loading}>
		{#if loading}
			<span class="mr-2">
				<svg
					class="h-4 w-4 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			</span>
		{/if}
		{primaryLabel}
	</Button>
</div>

