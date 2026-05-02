<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import {
		getProcessTypeBadgeColor,
		getPartTypeBadgeClass,
		getPartTypeIcon
	} from '$lib/constants/processTypes';
	import { cn } from '$lib/utils';

	interface Props {
		/** Process type code: N (New), R (Repair), P (Paint), B (Blend), A (Align), O (Outwork) */
		processType: string;
		/** Optional part type shown below the process badge (OEM / ALT / 2ND) */
		partType?: string | null;
		/** Optional process change handler — renders an invisible <select> overlay for click-to-edit */
		onChangeProcess?: (v: string) => void;
		/** Optional part-type change handler */
		onChangePartType?: (v: string) => void;
		/** When true, renders without click-to-edit affordance */
		readonly?: boolean;
		class?: string;
	}

	let {
		processType,
		partType = undefined,
		onChangeProcess,
		onChangePartType,
		readonly = false,
		class: className
	}: Props = $props();

	const processColor = $derived(getProcessTypeBadgeColor(processType as any));
	const partColor = $derived(getPartTypeBadgeClass(partType));
	const PartIcon = $derived(getPartTypeIcon(partType));
</script>

<div class={cn('flex flex-col items-center gap-0.5', className)}>
	<!-- Process type badge -->
	<div class="relative">
		<Badge class="w-7 justify-center font-bold {processColor}">{processType}</Badge>
		{#if onChangeProcess && !readonly}
			<select
				value={processType}
				onchange={(e) => onChangeProcess!(e.currentTarget.value)}
				class="absolute inset-0 cursor-pointer opacity-0"
				aria-label="Process type"
			>
				<option value="N">N - New Part</option>
				<option value="R">R - Repair</option>
				<option value="P">P - Paint</option>
				<option value="B">B - Blend</option>
				<option value="A">A - Align</option>
				<option value="O">O - Outwork</option>
			</select>
		{/if}
	</div>

	<!-- Part type badge (shown only when partType prop is provided) -->
	{#if partType !== undefined}
		<div class="relative">
			<Badge class="gap-1 {partColor}">
				{#if PartIcon}
					<PartIcon class="h-3 w-3" />
				{/if}
				{partType || 'OEM'}
			</Badge>
			{#if onChangePartType && !readonly}
				<select
					value={partType ?? ''}
					onchange={(e) => onChangePartType!(e.currentTarget.value)}
					class="absolute inset-0 cursor-pointer opacity-0"
					aria-label="Part type"
				>
					<option value="OEM">OEM</option>
					<option value="ALT">ALT</option>
					<option value="2ND">2ND</option>
				</select>
			{/if}
		</div>
	{/if}
</div>
