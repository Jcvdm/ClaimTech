<script lang="ts">
	import { RefreshCw, Check, AlertCircle, X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	// Props
	interface Props {
		isSyncing: boolean;
		currentItem?: string | null;
		progress: number;
		pendingCount: number;
		failedCount: number;
		onRetry?: () => void;
		onDismiss?: () => void;
	}

	let {
		isSyncing,
		currentItem = null,
		progress,
		pendingCount,
		failedCount,
		onRetry,
		onDismiss
	}: Props = $props();

	// Show the component when syncing or has failed items
	const show = $derived(isSyncing || failedCount > 0);
</script>

{#if show}
	<div
		class="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800"
	>
		<!-- Header with close button -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				{#if isSyncing}
					<RefreshCw class="h-5 w-5 animate-spin text-blue-500" />
					<span class="text-sm font-medium text-slate-900 dark:text-slate-100">Syncing...</span>
				{:else if failedCount > 0}
					<AlertCircle class="h-5 w-5 text-red-500" />
					<span class="text-sm font-medium text-red-600 dark:text-red-400">Sync failed</span>
				{:else}
					<Check class="h-5 w-5 text-green-500" />
					<span class="text-sm font-medium text-green-600 dark:text-green-400">Sync complete</span>
				{/if}
			</div>
			{#if onDismiss && !isSyncing}
				<button
					onclick={onDismiss}
					class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<!-- Progress bar -->
		{#if isSyncing}
			<div class="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
				<div
					class="h-full rounded-full bg-blue-500 transition-all duration-300"
					style="width: {progress}%"
				></div>
			</div>
			<p class="text-xs text-slate-500 dark:text-slate-400">
				{#if currentItem}
					Syncing {currentItem}...
				{:else}
					{Math.round(progress)}% complete
				{/if}
				{#if pendingCount > 0}
					({pendingCount} remaining)
				{/if}
			</p>
		{/if}

		<!-- Failed items -->
		{#if failedCount > 0 && !isSyncing}
			<p class="text-xs text-slate-500 dark:text-slate-400">
				{failedCount} item{failedCount > 1 ? 's' : ''} failed to sync
			</p>
			{#if onRetry}
				<Button size="sm" variant="outline" onclick={onRetry}>
					<RefreshCw class="mr-1 h-3 w-3" />
					Retry
				</Button>
			{/if}
		{/if}
	</div>
{/if}
