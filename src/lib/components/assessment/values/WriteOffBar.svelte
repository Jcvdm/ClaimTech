<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { cn } from '$lib/utils';

	interface Props {
		borderlinePct: number;
		writeoffPct: number;
		salvagePct: number;
		/** Repair cost as % of vehicle value. When null, bar shows thresholds only. */
		repairPct?: number | null;
		/** Status pill — when omitted, hidden. */
		status?: 'repairable' | 'borderline' | 'write-off' | null;
		class?: string;
	}

	const STATUS_META = {
		repairable: { label: 'Repairable', classes: 'bg-success/15 text-success' },
		borderline: { label: 'Borderline', classes: 'bg-warning/15 text-warning' },
		'write-off': { label: 'Write-off', classes: 'bg-destructive/15 text-destructive' },
	} as const;

	let {
		borderlinePct,
		writeoffPct,
		salvagePct,
		repairPct = null,
		status = null,
		class: className,
	}: Props = $props();
</script>

<Card class={cn('p-4', className)}>
	<h3 class="mb-1 text-base font-semibold text-foreground">Write-off thresholds</h3>
	<p class="mb-4 text-xs text-muted-foreground">
		Borderline {borderlinePct}% · Write-off {writeoffPct}% · Salvage {salvagePct}%
	</p>

	<!-- Bar viz -->
	<div class="relative h-3 w-full overflow-visible rounded-full bg-muted">
		<!-- Optional repair fill -->
		{#if repairPct != null && repairPct > 0}
			<div
				class="absolute left-0 top-0 h-full rounded-l-full bg-success/40"
				style="width: {Math.min(repairPct, 100)}%"
			></div>
		{/if}
		<!-- Borderline marker -->
		<div
			class="absolute bottom-[-3px] top-[-3px] w-0.5 bg-warning"
			style="left: {borderlinePct}%"
			aria-label="Borderline {borderlinePct}%"
		></div>
		<!-- Write-off marker -->
		<div
			class="absolute bottom-[-3px] top-[-3px] w-0.5 bg-destructive"
			style="left: {writeoffPct}%"
			aria-label="Write-off {writeoffPct}%"
		></div>
	</div>

	<!-- Salvage label below the bar -->
	<div class="relative mt-1 h-3 text-[10px] text-muted-foreground">
		<span class="absolute -translate-x-1/2" style="left: {salvagePct}%">↑ Salvage</span>
	</div>

	<!-- Status pill -->
	{#if status}
		{@const meta = STATUS_META[status]}
		<div
			class="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold {meta.classes}"
		>
			<span class="size-1.5 rounded-full bg-current"></span>
			{meta.label}
			{#if repairPct != null}
				· {repairPct.toFixed(1)}% of borderline
			{/if}
		</div>
	{/if}
</Card>
