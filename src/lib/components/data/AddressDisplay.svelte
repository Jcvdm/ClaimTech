<script lang="ts">
	import { MapPin, Navigation } from 'lucide-svelte';
	import { addressService } from '$lib/services/address.service';
	import type { StructuredAddress } from '$lib/types/address';
	import { cn } from '$lib/utils';

	type Props = {
		address: StructuredAddress | null;
		format?: 'inline' | 'block' | 'compact';
		showIcon?: boolean;
		showMapLink?: boolean;
		class?: string;
	};

	let { address, format = 'block', showIcon = true, showMapLink = false, class: className = '' }: Props = $props();

	let displayLines = $derived(addressService.formatMultiLine(address));
	let hasCoordinates = $derived(addressService.hasCoordinates(address));

	function openInMaps() {
		if (!address) return;
		window.open(addressService.getGoogleMapsUrl(address), '_blank');
	}
</script>

{#if address}
	<div class={cn('flex items-start gap-2', className)}>
		{#if showIcon}
			<MapPin class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
		{/if}

		<div class="min-w-0 flex-1">
			{#if format === 'inline'}
				<span class="text-sm text-gray-700">
					{addressService.formatOneLine(address)}
				</span>
			{:else if format === 'compact'}
				<span class="text-sm text-gray-700">
					{address.city || address.suburb || address.formatted_address}
					{#if address.province}
						<span class="text-gray-500">, {address.province}</span>
					{/if}
				</span>
			{:else}
				<div class="space-y-0.5">
					{#each displayLines as line}
						<div class="text-sm text-gray-700">{line}</div>
					{/each}
				</div>
			{/if}
		</div>

		{#if showMapLink && hasCoordinates}
			<button type="button" onclick={openInMaps} class="shrink-0 rounded p-1 hover:bg-gray-100" title="Open in Google Maps">
				<Navigation class="h-4 w-4 text-gray-500" />
			</button>
		{/if}
	</div>
{:else}
	<span class="text-sm italic text-gray-400">No address provided</span>
{/if}
