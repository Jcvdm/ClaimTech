# Mobile Responsiveness — Phase 3A: Assessment Tables

**Created**: 2026-04-17
**Status**: Planning → In Progress
**Complexity**: Moderate
**Source Plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md`
**Depends on**: Phase 1 (commit `f27ca67`) + Phase 2 (commit `2ef4ebd`)

## Overview

Fix the two remaining assessment-centric tables that overflow horizontally on mobile. Use the **same dual-layout pattern** `EstimateTab.svelte` already uses — it's the in-repo reference for how to do this correctly. Do NOT migrate to `ModernDataTable`; these tables have inline dialogs, click-to-edit inlines, stacked rendering, and process-type-driven column visibility that don't fit `ModernDataTable`'s simpler column model.

**The two targets:**
1. `src/lib/components/assessment/PreIncidentEstimateTab.svelte` — 843 lines, single table, NO mobile fallback.
2. `src/lib/components/frc/FRCLinesTable.svelte` — single-layout table with fixed widths and complex cells.

**Explicitly out of scope (don't touch):**
- `DamageTab.svelte` — already well-formed form with `grid md:grid-cols-2`.
- `EstimateTab.svelte` — **already** has mobile cards + desktop table. This is the reference pattern; leave it alone.
- `FRCTab.svelte` — covered transitively via FRCLinesTable.
- Wrapping form sections in `FieldGrid` — no measurable win, adds PR size. Defer to Phase 3B.
- Removing fixed column widths from desktop tables — those only apply at `md+` where there's space, and changing them alters desktop visuals. Leave alone.
- ModernDataTable forced migration — rejected; too risky.

## Reference Pattern (READ THIS FIRST)

`src/lib/components/assessment/EstimateTab.svelte` lines 921–1281. The structure is:

```svelte
<!-- Mobile: stacked cards -->
<div class="md:hidden space-y-3">
  {#each rows as row}
    <LineItemCard ... />
  {/each}
</div>

<!-- Desktop: full table -->
<div class="hidden md:block">
  <Table.Root> ... existing table ... </Table.Root>
</div>
```

**Before writing anything**, read:
1. `src/lib/components/assessment/EstimateTab.svelte` lines 921–948 — see exactly how `LineItemCard` is imported and what props it takes.
2. Find the `LineItemCard` component (likely `src/lib/components/assessment/LineItemCard.svelte` or similar — use Glob if not there). Understand its prop surface: it must handle the same inline-edit callbacks, badges, and metadata that the desktop table handles.
3. Note any bits-ui `Table` imports, helper functions (`showParts`, `showSA`, etc), and styling conventions used inside EstimateTab's mobile cards.

**Rule of thumb**: if EstimateTab's desktop table renders a feature (badge, delta, click-to-edit), the mobile card in the new target must render the same feature — either reusing `LineItemCard` if types align, or a parallel card component if they don't.

## Implementation

### 3A.1 — `PreIncidentEstimateTab.svelte`

**Current structure:**
- Single table at lines ~489–761 inside a `Card`.
- Fixed column widths: `w-[50px]`, `w-[120px]`, `w-[100px]`, `min-w-[200px]`, `w-[140px]`, `w-[150px]`, `w-[160px]`, `w-[70px]` (lines 493–511).
- Click-to-edit inlines: Part Price, S&A, Labour, Paint, Outwork.

**Changes:**
1. Wrap the existing table in a `<div class="hidden md:block">` — **leave the table contents entirely unchanged**.
2. Add a mobile `<div class="md:hidden space-y-3">` above it.
3. Populate the mobile div with one card per row. **Decision tree for the card component:**
   - **Preferred**: if the pre-incident estimate line items share the same TypeScript shape as EstimateTab's items (very likely — they're both "estimate line" records), REUSE `LineItemCard` directly. Read EstimateTab's imports to confirm the type matches.
   - **If types differ**: copy `LineItemCard.svelte` to a sibling `PreIncidentLineItemCard.svelte` and adapt prop names. Keep the visual structure identical so the UI feels consistent.
4. Make sure all click-to-edit callbacks and update handlers that the desktop table wires up also fire from the mobile card. Same behaviour, different chrome.
5. Do NOT add `overflow-x-auto` on the desktop `<div>` wrapper — the table is already fine on desktop; this change is strictly about mobile fallback.

**Constraints:**
- Do NOT remove the fixed widths on the desktop table. They're cosmetic and the mobile card handles narrow viewports now.
- Do NOT change any other layout outside the table swap (header, totals, buttons). One-purpose PR.

### 3A.2 — `FRCLinesTable.svelte`

**Current structure** (from Explore report):
- 7 columns at `xl`, 5 columns below (via `hidden xl:table-cell` / `xl:hidden`).
- Fixed widths: `w-[60px]`, `min-w-[220px]`, `w-[120px]` (×4), `w-[140px]`, `w-[180px]`.
- Click-to-open description dialog with agree/adjust/document-link actions.
- Process-type-driven column visibility (`showParts`, `showSA`, `showLabour`, `showPaint`).
- Four callback props: `onAgree`, `onAdjust`, `onLinkDocument`, `onToggleMatched`.

**Changes:**
1. Wrap the existing `<Table.Root>` (or equivalent) in `<div class="hidden md:block">` — **contents unchanged**.
2. Add `<div class="md:hidden space-y-3">` above it.
3. In the mobile div, render one card per FRC line item. **Build a new `FRCLineCard.svelte` component** in the same folder (`src/lib/components/frc/FRCLineCard.svelte`). Don't try to reuse `LineItemCard` — FRC has quoted-vs-actual stacked cells, deltas, removal/decline/deduction badges, and document linking that don't match the generic line-item shape.
4. **Minimum contents of each card (replicate what desktop columns show):**
   - Process type badge (N/R/P/B/A) — top-left of card.
   - Description — title of card, clickable to trigger the same dialog the desktop row triggers (reuse the `onAdjust` callback or whichever handler opens the dialog).
   - Status badges (matched, removed, declined, deduction, any other the desktop row shows in metadata area).
   - Parts, S&A, Labour, Paint rows — each showing **quoted → actual** and the delta, formatted exactly as the desktop cells format them. Gate each row behind the same `showParts`/`showSA`/... helper.
   - Total row — bold, at bottom of card.
   - Per-row actions (agree/adjust/link document) — rendered as buttons or icon buttons at the bottom of the card. These already have handlers; just wire them to the same callbacks.
5. Keep every existing callback prop working. The card is a view layer; the parent (`FRCTab.svelte`) should not need any changes.
6. Do NOT add pagination. The desktop table has none; adding it would change behaviour.

**Constraints:**
- Do NOT modify any logic inside `FRCLinesTable` beyond wrapping the existing table in `hidden md:block` and adding the mobile cards above it. All business logic (process-type filtering, delta calc, handler wiring) stays untouched.
- Do NOT remove the fixed column widths on the desktop table.
- Every click path that works on desktop must work on mobile.

## Files

**Modify:**
- `src/lib/components/assessment/PreIncidentEstimateTab.svelte` — wrap table, add mobile cards.
- `src/lib/components/frc/FRCLinesTable.svelte` — wrap table, add mobile cards.

**Create:**
- `src/lib/components/frc/FRCLineCard.svelte` — new mobile card component for FRC lines.
- Possibly `src/lib/components/assessment/PreIncidentLineItemCard.svelte` if `LineItemCard` can't be reused for pre-incident items.

## Implementation order

1. Read the EstimateTab reference section (lines 921–948) and locate/read the `LineItemCard` component.
2. Tackle `PreIncidentEstimateTab` first — simpler, likely direct `LineItemCard` reuse.
3. Then `FRCLinesTable` — build `FRCLineCard`, wire callbacks, render process-type-conditional rows inside the card.
4. Run verification.

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -120` — only NEW errors in files you touched are blockers. Pre-existing env-var errors in `src/lib/supabase.ts`, `src/lib/supabase-server.ts`, `src/hooks.server.ts`, `src/routes/+layout.ts` are environmental and not yours.
2. `npm run build 2>&1 | tail -40` — must succeed.
3. `grep -n 'md:hidden\|hidden md:block' src/lib/components/assessment/PreIncidentEstimateTab.svelte src/lib/components/frc/FRCLinesTable.svelte` — should match in both files.
4. Report summary: files changed, any component reuse vs new creation decisions, any deviations from the plan.

## Notes

- Branch: `claude/confident-mendel` — append commits here; do NOT create a new branch.
- Do NOT commit or push — orchestrator handles that after review.
- Do NOT wire any Phase 2 primitives into these files (no ResponsiveDialog/ResponsiveTabs/FieldGrid/ActionBar). Phase 3B and later handle those.
- iPad mini testing context: iPad mini portrait is 768×1024, exactly on the `md` breakpoint. `min-width: 768px` matches, so iPad mini portrait gets the **desktop** table. That's intentional. Real mobile testing happens at phone viewports.
- If `LineItemCard` reuse fails for pre-incident (type mismatch), document the exact type mismatch in the report so we can decide whether to unify the types in a follow-up Phase 3 sub-task.
