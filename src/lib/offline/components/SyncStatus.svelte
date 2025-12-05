<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '../db';
	import { networkStatus } from '../network-status.svelte';
	import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-svelte';

	// Props
	interface Props {
		showDetails?: boolean;
		compact?: boolean;
	}

	let { showDetails = false, compact = false }: Props = $props();

	// State
	let pendingCount = $state(0);
	let failedCount = $state(0);
	let isSyncing = $state(false);
	let lastChecked = $state<Date | null>(null);

	// Derived states
	const hasUnsyncedData = $derived(pendingCount > 0 || failedCount > 0);

	const statusColor = $derived(() => {
		if (!networkStatus.isOnline) return 'text-gray-400';
		if (failedCount > 0) return 'text-red-500';
		if (pendingCount > 0) return 'text-amber-500';
		return 'text-green-500';
	});

	const statusText = $derived(() => {
		if (!networkStatus.isOnline) return 'Offline';
		if (isSyncing) return 'Syncing...';
		if (failedCount > 0) return `${failedCount} failed`;
		if (pendingCount > 0) return `${pendingCount} pending`;
		return 'Synced';
	});

	// Check sync status
	async function checkSyncStatus(): Promise<void> {
		try {
			pendingCount = await db.syncQueue.where('status').equals('pending').count();
			failedCount = await db.syncQueue.where('status').equals('failed').count();
			lastChecked = new Date();
		} catch (error) {
			console.error('Failed to check sync status:', error);
		}
	}

	// Mount
	onMount(() => {
		checkSyncStatus();

		// Recheck periodically
		const interval = setInterval(checkSyncStatus, 10000);

		return () => clearInterval(interval);
	});
</script>

{#if compact}
	<!-- Compact view (icon only) -->
	<div class="flex items-center gap-1 {statusColor()}" title={statusText()}>
		{#if !networkStatus.isOnline}
			<CloudOff class="h-4 w-4" />
		{:else if isSyncing}
			<RefreshCw class="h-4 w-4 animate-spin" />
		{:else if failedCount > 0}
			<AlertCircle class="h-4 w-4" />
		{:else if pendingCount > 0}
			<Cloud class="h-4 w-4" />
		{:else}
			<Check class="h-4 w-4" />
		{/if}
		{#if hasUnsyncedData}
			<span class="text-xs font-medium">{pendingCount + failedCount}</span>
		{/if}
	</div>
{:else}
	<!-- Full view -->
	<div class="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
		{#if !networkStatus.isOnline}
			<CloudOff class="h-5 w-5 {statusColor()}" />
		{:else if isSyncing}
			<RefreshCw class="h-5 w-5 animate-spin {statusColor()}" />
		{:else if failedCount > 0}
			<AlertCircle class="h-5 w-5 {statusColor()}" />
		{:else if pendingCount > 0}
			<Cloud class="h-5 w-5 {statusColor()}" />
		{:else}
			<Check class="h-5 w-5 {statusColor()}" />
		{/if}
		<div class="flex flex-col">
			<span class="text-sm font-medium {statusColor()}">{statusText()}</span>
			{#if showDetails && hasUnsyncedData}
				<span class="text-xs text-slate-500">
					{pendingCount} pending, {failedCount} failed
				</span>
			{/if}
		</div>
	</div>
{/if}
