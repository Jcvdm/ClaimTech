# DamageTab Two-Pane Layout — Phase 8b extension

**Created**: 2026-04-25
**Status**: In Progress
**Complexity**: Moderate (1 file restructure + 1 new sub-component)
**Branch**: `claude/confident-mendel`
**Reference pattern**: Mac's commit `466027d` (EstimateTab two-pane)
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

Phase 8b applied the two-pane layout (editable left + sticky-right meta) to `EstimateTab.svelte`. `DamageTab.svelte` was on the same Phase 8b roadmap item but never got the treatment. This completes that intent.

---

## What two-pane should mean for DamageTab

DamageTab is a single-record form (350 lines), not a list of items like EstimateTab. So the right pane isn't "totals" — it's a **Damage Summary** card that mirrors what the engineer has filled in, so they see the state at a glance without scrolling back.

Right-pane content (compact, sticky):
- **Match status** — "✓ Matches description" (success tone) or "✗ Mismatch noted" (destructive-soft tone)
- **Severity** — colored badge: minor=info, moderate=warning, severe=destructive-soft, total_loss=destructive-soft + bold
- **Damage area** — "Structural" or "Non-Structural" (muted badge)
- **Damage type** — text label (collision/fire/hail/etc.)
- **Estimated repair duration** — "5 days" or "—" if unset
- **Required-fields checklist** — small list with green ticks (filled) and hollow circles (empty), mirrors the StepRail's per-tab status idea but at field granularity for THIS tab. Just the 2 required fields: Damage Description Match (matches_description), Severity. Optional: also show Mismatch Notes if matches_description=false.

The engineer can see "did I fill in everything" without scrolling, and the severity is visible while they're editing the location/description fields below.

---

## Reference pattern (Mac's EstimateTab, commit `466027d`)

Read `src/lib/components/assessment/EstimateTab.svelte:998-999` and `:1717` for the two-pane grid structure:

```svelte
<!-- Line 998-999: outer two-pane grid -->
<div class="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">

  <!-- Left pane: line items card (existing content) -->

  <!-- Line 1717: right pane sticky totals -->
  <div class="lg:sticky lg:top-24 lg:self-start mt-6 lg:mt-0">
    <Card class="p-6">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">Totals Breakdown</h3>
      ...
    </Card>
  </div>
</div>
```

**Key rules from the Mac pattern**:
- `lg:grid` activates only at ≥1024px; below that the right pane stacks underneath the left (mobile fallback).
- `lg:grid-cols-[minmax(0,1fr)_340px]` — left pane flexes, right pane is exactly 340px (matches design-system §"Two-pane assessment").
- `lg:sticky lg:top-24` — right pane stays visible as user scrolls left pane content. `top-24` = 96px (clears the 44px topbar + Phase 8a header at the top of `<main>`).
- `lg:self-start` — sticky element aligns to top, doesn't stretch.
- `mt-6 lg:mt-0` — vertical gap on mobile (when stacked), no gap on desktop (grid-gap handles it).

Mirror this pattern in DamageTab — same grid, same sticky offset, same mobile stacking.

---

## Files to create

| Path | Purpose | ~Lines |
|---|---|---|
| `src/lib/components/assessment/DamageSummaryCard.svelte` | Right-pane summary card. Reads the damage state values via props, renders status badges + checklist. | ~120 |

## Files to modify

| Path | Change |
|---|---|
| `src/lib/components/assessment/DamageTab.svelte` | Wrap the existing two `<Card>` blocks (Damage Match Check at line 194-240 + Damage Details at line 242-347) in the two-pane grid. Add `<DamageSummaryCard>` as the right pane. Pass the local state values (matchesDescription, severity, damageArea, damageType, estimatedRepairDurationDays, mismatchNotes) as props. |

## Files NOT to touch

- `validation.ts` — already has `validateDamage` returning `missingFields[]`; we'll consume it via the existing `validation` derived in DamageTab.
- `Card`, `Badge` primitives — use as-is.
- `package.json` — no new dependencies.
- Any other assessment tab component.

---

## DamageSummaryCard component contract

```svelte
<!-- src/lib/components/assessment/DamageSummaryCard.svelte -->
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
    collision: 'Collision', fire: 'Fire', hail: 'Hail',
    theft: 'Theft', vandalism: 'Vandalism', weather: 'Weather',
    mechanical: 'Mechanical', other: 'Other'
  };

  // Required-field checklist
  const checklist = $derived([
    {
      label: 'Match check',
      done: matchesDescription !== null && (matchesDescription === true || mismatchNotes.trim().length > 0)
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
        <Check class="size-3" stroke-width={1.5} />
        Matches description
      </Badge>
    {:else if matchesDescription === false}
      <Badge variant="destructive-soft">
        <AlertTriangle class="size-3" stroke-width={1.5} />
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
          <Badge variant="muted">{damageArea === 'structural' ? 'Structural' : 'Non-Structural'}</Badge>
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
            <Check class="size-3.5 text-success shrink-0" stroke-width={2} />
            <span class="text-foreground">{item.label}</span>
          {:else}
            <Circle class="size-3.5 text-muted-foreground shrink-0" stroke-width={1.5} />
            <span class="text-muted-foreground">{item.label}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</Card>
```

---

## Layout integration in DamageTab.svelte

Current (line 185-349):
```svelte
<div class="space-y-6">
  <RequiredFieldsWarning ... />
  {#if !damageRecord}
    <Card>Loading...</Card>
  {:else}
    <Card>Damage Match Check ...</Card>
    <Card>Damage Details ...</Card>
  {/if}
</div>
```

After:
```svelte
<div class="space-y-6">
  <RequiredFieldsWarning ... />
  {#if !damageRecord}
    <Card>Loading...</Card>
  {:else}
    <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
      <!-- Left: editable forms -->
      <div class="space-y-6">
        <Card>Damage Match Check ...</Card>
        <Card>Damage Details ...</Card>
      </div>

      <!-- Right: sticky summary -->
      <div class="lg:sticky lg:top-24 lg:self-start mt-6 lg:mt-0">
        <DamageSummaryCard
          {matchesDescription}
          {severity}
          {damageArea}
          {damageType}
          {estimatedRepairDurationDays}
          {mismatchNotes}
        />
      </div>
    </div>
  {/if}
</div>
```

The `RequiredFieldsWarning` stays at the top — it's not part of the two-pane (it's a full-width banner). The `Loading...` card stays at the top too.

---

## Implementation steps

1. **Create `DamageSummaryCard.svelte`** at the path above with the contract.

2. **Edit `DamageTab.svelte`**:
   - Add `import DamageSummaryCard from './DamageSummaryCard.svelte';` to the script section.
   - Wrap the two existing `<Card>` blocks (Damage Match Check + Damage Details) with the new two-pane grid markup.
   - Pass the local state values to `<DamageSummaryCard>` as props.
   - Do NOT change any other logic (drafts, validation, autosave, debounced handlers).

3. **Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`** — must be 0 errors.

4. **Spot-check the layout works** by reading the full diff. The grid wrapper should be ABOVE the left-pane `<div class="space-y-6">` and the right-pane sticky div, NOT inside one of them.

5. **Report back** with files modified, svelte-check tail, confirmation `package.json` is unchanged.

6. **STOP** — no commit, no push, no `git pull`. Orchestrator handles git.

---

## Verification (orchestrator + user, on Vercel preview)

1. **Desktop (≥1024px) Damage tab**: editable forms on the left (~60% width), summary card on the right (340px). Summary card stays visible as you scroll.
2. **Edit a field** (e.g. set severity to "Severe"): the summary card updates instantly with a red-soft "Severe" badge.
3. **Set match to "No, Does Not Match"**: summary card shows red-soft "Mismatch noted" badge. Mismatch notes textarea appears below.
4. **Tab to "minor" severity**: summary card severity badge switches to info-blue "Minor".
5. **Required checklist**: green ticks appear next to "Match check" and "Severity" once filled.
6. **Mobile (<lg)**: summary card stacks UNDERNEATH the editable forms. Engineer scrolls past the forms to see the summary at the bottom (acceptable mobile fallback).
7. **Top sticky offset**: summary card top edge sits below the assessment header (no overlap with the assessment number bar at the top).

---

## Risks / things to watch

- **DamageRecord nullable**: when `damageRecord === null` the layout shows a Loading card. The two-pane wrapper is INSIDE the `{:else}` branch, so it only renders when damageRecord exists. Confirm this in the diff.
- **Sticky offset `lg:top-24`** = 96px. The Phase 8a layout is `h-screen overflow-hidden` outer + sticky header (~64px tall — assessment number + actions) + main scrolls. The 96px offset assumes the sticky element sticks within `<main>`, not within the viewport. That should be correct because `<main>` is the scroll container; sticky is relative to its scroll context. If the summary card overlaps the header at the top of scroll, adjust to `lg:top-0`.
- **Severity 'total_loss' label**: spec says "Total Loss" with bold. Already handled by `severityTone.total_loss = { tone: 'destructive-soft', label: 'Total Loss' }`. The bolding is implicit in the `Badge` variant — if user wants extra emphasis, that's a follow-up.
- **No new dependencies.** All imports come from existing `$lib/components/ui/*`, `$lib/types/assessment`, and `lucide-svelte`.
