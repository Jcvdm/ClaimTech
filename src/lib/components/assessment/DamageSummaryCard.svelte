<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, Circle, AlertTriangle } from 'lucide-svelte';
	import type { DamageType, DamageArea, DamageSeverity } from '$lib/types/assessment';

	interface Props {
		matchesDescription: boolean | null;
		severity: DamageSeverity | '';
		damageArea: DamageArea | '';
		damageType: DamageType | '';
		estimatedRepairDurationDays: number | null;
		mismatchNotes: string;
	}

	let {
		matchesDescription,
		severity,
		damageArea,
		damageType,
		estimatedRepairDurationDays,
		mismatchNotes
	}: Props = $props();

	// Severity tone map
	const severityTone = {
		minor: { tone: 'info', label: 'Minor' },
		moderate: { tone: 'warning', label: 'Moderate' },
		severe: { tone: 'destructive-soft', label: 'Severe' },
		total_loss: { tone: 'destructive-soft', label: 'Total Loss' }
	} as const;

	// Damage type labels
	const damageTypeLabel: Record<string, string> = {
		collision: 'Collision',
		fire: 'Fire',
		hail: 'Hail',
		theft: 'Theft',
		vandalism: 'Vandalism',
		weather: 'Weather',
		mechanical: 'Mechanical',
		other: 'Other'
	};

	// Required-field checklist
	const checklist = $derived([
		{
			label: 'Match check',
			done:
				matchesDescription !== null &&
				(matchesDescription === true || mismatchNotes.trim().length > 0)
		},
		{ label: 'Severity', done: severity !== '' }
	]);
</script>

<Card class="p-4">
	<h3 class="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
		Damage Summary
	</h3>

	<!-- Match status -->
	<div class="mb-3 flex items-center gap-2">
		{#if matchesDescription === true}
			<Badge variant="success">
				<Check class="size-3" strokeWidth={1.5} />
				Matches description
			</Badge>
		{:else if matchesDescription === false}
			<Badge variant="destructive-soft">
				<AlertTriangle class="size-3" strokeWidth={1.5} />
				Mismatch noted
			</Badge>
		{:else}
			<Badge variant="muted">Not yet checked</Badge>
		{/if}
	</div>

	<!-- Detail rows -->
	<dl class="space-y-2 text-[13.5px]">
		<div class="flex items-center justify-between gap-3">
			<dt class="text-muted-foreground">Severity</dt>
			<dd>
				{#if severity && severity in severityTone}
					{@const s = severityTone[severity as keyof typeof severityTone]}
					<Badge variant={s.tone}>{s.label}</Badge>
				{:else}
					<span class="text-muted-foreground">—</span>
				{/if}
			</dd>
		</div>

		<div class="flex items-center justify-between gap-3">
			<dt class="text-muted-foreground">Area</dt>
			<dd>
				{#if damageArea}
					<Badge variant="muted"
						>{damageArea === 'structural' ? 'Structural' : 'Non-Structural'}</Badge
					>
				{:else}
					<span class="text-muted-foreground">—</span>
				{/if}
			</dd>
		</div>

		<div class="flex items-center justify-between gap-3">
			<dt class="text-muted-foreground">Type</dt>
			<dd class="text-foreground">
				{damageType ? (damageTypeLabel[damageType] ?? damageType) : '—'}
			</dd>
		</div>

		<div class="flex items-center justify-between gap-3">
			<dt class="text-muted-foreground">Repair duration</dt>
			<dd class="font-mono-tabular text-foreground">
				{estimatedRepairDurationDays ? `${estimatedRepairDurationDays}d` : '—'}
			</dd>
		</div>
	</dl>

	<!-- Required-fields checklist -->
	<div class="mt-4 border-t border-border pt-3">
		<h4 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
			Required
		</h4>
		<ul class="space-y-1.5 text-[13px]">
			{#each checklist as item}
				<li class="flex items-center gap-2">
					{#if item.done}
						<Check class="size-3.5 shrink-0 text-success" strokeWidth={2} />
						<span class="text-foreground">{item.label}</span>
					{:else}
						<Circle class="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
						<span class="text-muted-foreground">{item.label}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</Card>
