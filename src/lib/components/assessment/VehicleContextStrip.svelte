<script lang="ts">
	/**
	 * VehicleContextStrip — compact 1-row vehicle card for mobile tab headers.
	 *
	 * Usage example:
	 *   <VehicleContextStrip {vehicleDetails} />
	 *   <VehicleContextStrip {vehicleDetails} alwaysVisible />
	 *   <VehicleContextStrip {vehicleDetails} class="mb-4" />
	 */
	import { Car } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { VehicleDetails } from '$lib/utils/report-data-helpers';

	interface Props {
		vehicleDetails: VehicleDetails | null | undefined;
		/** When true, the strip renders at md+ too. Default: hidden on md+ (mobile only). */
		alwaysVisible?: boolean;
		class?: string;
	}

	let { vehicleDetails, alwaysVisible = false, class: className }: Props = $props();
</script>

{#if vehicleDetails}
	<div
		class={cn(
			'flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5',
			!alwaysVisible && 'md:hidden',
			className
		)}
	>
		<div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card">
			<Car class="size-4 text-muted-foreground" />
		</div>
		<div class="min-w-0 flex-1">
			<div class="truncate text-sm font-semibold text-foreground">
				{vehicleDetails.year || ''} {vehicleDetails.make || ''} {vehicleDetails.model || ''}
			</div>
			<div class="truncate font-mono-tabular text-[11px] text-muted-foreground">
				{vehicleDetails.registration || '–'}
				{#if vehicleDetails.mileage != null}
					· {vehicleDetails.mileage.toLocaleString()} km
				{/if}
			</div>
		</div>
	</div>
{/if}
