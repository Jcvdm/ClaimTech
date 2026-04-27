# Line Items Workbench — Bottom-Sticky Totals + Density Tighten

**Created**: 2026-04-27
**Status**: In Progress
**Complexity**: Significant (4 files, structural layout change in 2 of them — moves the right-pane Totals into a sticky bottom strip + Details dialog)
**Branch**: `claude/confident-mendel`
**Approved plan**: `C:\Users\Jcvdm\.claude\plans\lets-take-it-step-witty-glacier.md`
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context (concise — full plan has the full version)

After commit `a0b03f0` widened the line-items workbench, three real UX problems surfaced on Vercel preview:
1. `formatCurrency()` emits "R 3 250,00" in every cost cell — visual noise.
2. Description column squeezed to ~150-180px on common viewports because Costs (455) + Total (118) + right-pane Totals (340) eat too much horizontal space.
3. 96px of stacked padding (`<main> lg:p-6` + `<Card> p-3 sm:p-6`) is dead space.

User picked: **bottom-sticky totals + tighten columns/padding**. Move Totals out of the right pane into a sticky strip at the bottom of `<main>`. Recovers all 340px for Description. Strip stays visible while scrolling line items, preserving the "engineer always sees totals" intent. Diverges from `design-system.md` "no accordion" guidance — that's intentional, the spec was written before the description squeeze became visible.

---

## Files to modify (4)

### 1. `src/lib/utils/formatters.ts` — ADD ONLY (do not modify formatCurrency)

Add this function below the existing `formatCurrency()`:

```ts
/**
 * Format a numeric value as a localized number (no currency symbol).
 * Use in dense data tables where the column already implies "money".
 * Use formatCurrency() for summary panels where the symbol adds context.
 */
export function formatCurrencyValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0,00';
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}
```

**DO NOT** change `formatCurrency()` itself — used in 100+ callsites across the codebase.

---

### 2. `src/lib/components/assessment/EstimateTab.svelte` — five categories

#### A. Imports
- Update the formatters import: `import { formatCurrency, formatCurrencyValue, formatDate } from '$lib/utils/formatters';`

#### B. Swap `formatCurrency()` → `formatCurrencyValue()` in line-item table cells ONLY

In the desktop table rendering, swap these specific callsites:
- 5 cost sub-cells (Part Price button, S&A button, Labour button, Paint button, Outwork button) — search for the pattern `>{formatCurrency(item.part_price_nett || 0)}</button` etc.
- 5 cost sub-cells inside the SKELETON row (same 5 fields) — they currently render `formatCurrency(0)` placeholders
- 1 row Total cell — search for `<Table.Cell ... font-mono-tabular ... font-bold>{formatCurrency(item.total)}` pattern

**Keep `formatCurrency()` everywhere else in this file** — Totals Breakdown values (which will move into the Details dialog), the new bottom strip values, betterment notes, etc. Only the dense table cells get the no-symbol helper.

#### C. Tighten table column widths

In the `<Table.Header>` block (around line 1207-1242):
- `Costs` head: `class="w-[455px] ..."` → `class="w-[380px] ..."` (~75px freed for Description)
- `Total` head: `class="w-[118px] ..."` → `class="w-[96px] ..."` (~22px freed for Description)

#### D. Reduce Card padding

- `<Card class="p-3 sm:p-6">` (line ~1060, the line-items Card wrapper) → `<Card class="p-2 sm:p-3">` (~48px freed at sm+)

#### E. Restructure: drop two-pane grid, add single-column line items + bottom-sticky strip + Details dialog

**Current structure** (lines ~997-1717):
```svelte
<div class="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
  <Card>...Line items table (the big block)...</Card>
  <div class="lg:sticky lg:top-24 lg:self-start mt-6 lg:mt-0">
    <Card>...Totals Breakdown (200+ lines: Parts/Markup/SA/Labour/Paint/Outwork totals,
      Subtotal, Sundries, VAT, Less Excess, Total Inc VAT with threshold color,
      Net Amount Payable, threshold message banner, assessment_result picker, etc.)...</Card>
  </div>
</div>
```

**Target structure**:
```svelte
<!-- Single-column, full-width line items -->
<Card class="p-2 sm:p-3">
  ...header + table (same content, just no longer wrapped in the lg:grid)...
</Card>

<!-- Bottom-sticky compact totals strip -->
<div class="sticky bottom-0 z-20 -mx-2 sm:-mx-3 mt-3 border-t border-border bg-card shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.1)]">
  <div class="px-3 sm:px-6 py-2.5">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
      <!-- Compact horizontal totals row (uses formatCurrency, NOT formatCurrencyValue) -->
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Parts</span>
        <span class="font-mono-tabular">{formatCurrency(totals.partsNett)}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Markup</span>
        <span class="font-mono-tabular">{formatCurrency(totals.markupTotal)}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">S&A</span>
        <span class="font-mono-tabular">{formatCurrency(totals.saTotal)}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Labour</span>
        <span class="font-mono-tabular">{formatCurrency(totals.labourTotal)}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Paint</span>
        <span class="font-mono-tabular">{formatCurrency(totals.paintTotal)}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">VAT</span>
        <span class="font-mono-tabular">{formatCurrency(totals.vatAmount)}</span>
      </span>

      <!-- Right-aligned: Less Excess (if any) + Net Payable + Details button -->
      <span class="ml-auto flex items-center gap-3">
        {#if excessAmount && excessAmount > 0}
          <span class="flex items-center gap-1.5">
            <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Less Excess</span>
            <span class="font-mono-tabular text-warning">−{formatCurrency(excessAmount)}</span>
          </span>
        {/if}
        <span class="flex items-center gap-2">
          <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Net Payable</span>
          <span class="font-mono-tabular text-base font-bold {thresholdColorClass}">{formatCurrency(totals.netPayable)}</span>
        </span>
        <Button size="sm" variant="outline" onclick={() => totalsDetailsOpen = true}>
          <Info class="h-3.5 w-3.5 mr-1.5" />
          Details
        </Button>
      </span>
    </div>
  </div>
</div>

<!-- Details dialog: contains the FULL existing Totals Breakdown content -->
<ResponsiveDialog.Root bind:open={totalsDetailsOpen}>
  <ResponsiveDialog.Content class="sm:max-w-2xl">
    <ResponsiveDialog.Header>
      <ResponsiveDialog.Title>Totals Breakdown</ResponsiveDialog.Title>
      <ResponsiveDialog.Description>
        Full breakdown including threshold check and assessment result.
      </ResponsiveDialog.Description>
    </ResponsiveDialog.Header>
    ...all the existing breakdown content here, unchanged from today's right-pane Card...
  </ResponsiveDialog.Content>
</ResponsiveDialog.Root>
```

**State:**
Add at the top of `<script>` (near the other `let *Open = $state(false)` declarations):
```ts
let totalsDetailsOpen = $state(false);
```

**`thresholdColorClass`:**
The existing `getThresholdColorClasses()` function in this file produces tone classes. Reuse the same call that the OLD Totals Breakdown's "Total (Inc VAT)" row uses (currently around lines 1815-1822 — `text-red-600`/`text-orange-600`/`text-yellow-600`/`text-green-600`/`text-blue-600` based on threshold). Bind that result to a derived value:
```ts
const thresholdColorClass = $derived.by(() => {
  // mirror the existing logic from the Total (Inc VAT) row
  // (look up exactly what the current row does and replicate)
});
```
Or simpler: just inline the same ternary expression that's used in the OLD row, in the new strip's Net Payable color slot. Pick whichever the coder finds cleaner — both produce identical output.

**`Info` icon:**
Already imported in this file (used elsewhere). If not, add to the existing `lucide-svelte` import block.

**Implementation order for E:**
1. Add `let totalsDetailsOpen = $state(false);` to script
2. Locate the OLD `<div class="lg:grid lg:grid-cols-[minmax(0,1fr)_340px]...">` wrapper
3. Locate the OLD right-pane `<div class="lg:sticky lg:top-24...">` wrapper containing the Totals Breakdown Card
4. Cut the entire Totals Breakdown Card content
5. Paste it inside a new `<ResponsiveDialog>` block placed after the line-items Card
6. Replace the `lg:grid` wrapper with just the line-items `<Card>` directly (no grid wrapper needed)
7. Insert the new bottom-sticky strip immediately AFTER the line-items Card, BEFORE the new ResponsiveDialog
8. Verify the strip's totals references (`totals.partsNett`, etc.) match the names returned by the `categoryTotals` derived in this file (look at the OLD Totals Breakdown to see exact field names)

---

### 3. `src/lib/components/assessment/AdditionalsTab.svelte` — same five categories, Additionals-flavored totals

#### A. Imports
- Update: `import { formatCurrency, formatCurrencyValue } from '$lib/utils/formatters';`
- Add `Info` from `lucide-svelte` if not present (check existing import block)
- Add `import * as ResponsiveDialog from '$lib/components/ui/responsive-dialog';` if not present (was added in `ea8e5ef` for Quick Add modal — likely already there)

#### B. Swap `formatCurrency()` → `formatCurrencyValue()` in line-item desktop table cells ONLY
Same pattern: 5 cost sub-cells (Part / S&A / Lab / Paint / Out buttons) + 1 row Total cell.
Keep `formatCurrency()` everywhere else (rates mismatch banner, Original Estimate Lines panel, Decline reason text, etc.).

#### C. Tighten table column widths
In the `<Table.Header>` block (around lines 893-940):
- `Costs` head `w-[455px]` → `w-[380px]`
- Look for the `Total` head — confirm its width is ~118px and reduce to `w-[96px]`

#### D. Reduce Card padding
- `<Card class="p-4 md:p-6">` (line ~808) → `<Card class="p-2 sm:p-3">`

#### E. Restructure with Additionals-flavored bottom strip + Details dialog

`AdditionalsTab` currently renders `<CombinedTotalsSummary>` as a separate component-card inline in the page (NOT in a two-pane grid with line items — verify this on read). The line items Card is a separate `<Card>` further down. Find both.

**Target:**
- Move the `<CombinedTotalsSummary>` Card out of the inline page flow, into a `<ResponsiveDialog>` triggered by a "Details" button in the new bottom strip.
- Add the new bottom-sticky strip with **Additionals-specific totals** (NOT Estimate's Parts/Markup/Labour/etc.):

```svelte
<div class="sticky bottom-0 z-20 -mx-2 sm:-mx-3 mt-3 border-t border-border bg-card shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.1)]">
  <div class="px-3 sm:px-6 py-2.5">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Original</span>
        <span class="font-mono-tabular">{formatCurrency(originalTotal)}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Removed</span>
        <span class="font-mono-tabular text-destructive">−{formatCurrency(removedTotal)}</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Added (Approved)</span>
        <span class="font-mono-tabular text-success">+{formatCurrency(addedItemsTotal)}</span>
      </span>

      <span class="ml-auto flex items-center gap-3">
        <span class="flex items-center gap-2">
          <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Combined</span>
          <span class="font-mono-tabular text-base font-bold">{formatCurrency(combinedTotal)}</span>
        </span>
        <Button size="sm" variant="outline" onclick={() => totalsDetailsOpen = true}>
          <Info class="h-3.5 w-3.5 mr-1.5" />
          Details
        </Button>
      </span>
    </div>
  </div>
</div>

<!-- Details dialog: contains the existing CombinedTotalsSummary unchanged -->
<ResponsiveDialog.Root bind:open={totalsDetailsOpen}>
  <ResponsiveDialog.Content class="sm:max-w-2xl">
    <ResponsiveDialog.Header>
      <ResponsiveDialog.Title>Additionals Totals</ResponsiveDialog.Title>
      <ResponsiveDialog.Description>
        Combined totals including original estimate, removed lines, and approved additions.
      </ResponsiveDialog.Description>
    </ResponsiveDialog.Header>
    <CombinedTotalsSummary
      {estimate}
      {additionals}
    />
  </ResponsiveDialog.Content>
</ResponsiveDialog.Root>
```

**State:** Add `let totalsDetailsOpen = $state(false);`

**Variable references for the strip:**
- `originalTotal` — likely `estimate.total_inc_vat` or similar; check `CombinedTotalsSummary.svelte` for the same value it computes
- `removedTotal` — from CombinedTotalsSummary's `removedTotal` derived
- `addedItemsTotal` — already exists in CombinedTotalsSummary as a derived (commit `136a9ec` added the reversal-aware version)
- `combinedTotal` — likely `additionals.combined_total` or computed from the others; mirror what CombinedTotalsSummary uses

If these values aren't exposed in `AdditionalsTab.svelte`'s scope, lift them out of `CombinedTotalsSummary.svelte` into the parent — OR add the derivations to AdditionalsTab itself (mirror the CombinedTotalsSummary computations). Coder picks the cleaner path; ideally lifting up so we don't duplicate the math.

**CombinedTotalsSummary embedded check** — when rendered inside the ResponsiveDialog, the Card border/shadow it has internally may double-up with the Dialog's Content border. If the visual is awkward (after the coder spot-checks it via `npm run build` if needed, NOT `npm run dev`), follow the pattern from `RatesAndRepairerConfiguration.svelte` (commit `ea8e5ef`): add an `embedded?: boolean` prop that bypasses the outer Card. Defer if the visual is fine without it.

---

### 4. `src/lib/components/assessment/AssessmentLayout.svelte` — conditional main padding

Current `<main>` (line ~299):
```svelte
<main class="flex-1 overflow-y-auto p-2 pt-2 sm:p-3 sm:pt-3 md:p-4 lg:p-6 lg:pt-4">
```

Replace with:
```svelte
<main class={[
  'flex-1 overflow-y-auto pt-2 sm:pt-3',
  ['estimate', 'additionals'].includes(currentTab)
    ? 'px-1 sm:px-2 lg:px-3 pb-0'
    : 'p-2 sm:p-3 md:p-4 lg:p-6'
].join(' ')}>
```

- For estimate/additionals: tight horizontal padding, zero bottom padding so the new sticky strip sits flush at the bottom edge of `<main>`.
- For all other tabs: original padding preserved exactly (note: the conditional wraps everything except `pt-*` which is shared).

---

## Files NOT to touch

- `formatCurrency()` itself in `formatters.ts` — only ADD `formatCurrencyValue` alongside.
- `CombinedTotalsSummary.svelte` component — only its container changes (in AdditionalsTab). Don't add `embedded` prop unless visually needed.
- `getThresholdColorClasses()` and threshold logic — reused as-is.
- Costs sub-cell label structure ("PART", "S&A", "LAB", "PAINT", "OUT") — keep the inner labels.
- StepRail, `<aside>`, mobile drawer — unchanged.
- All other route trees and assessment tabs.
- `package.json` — no new dependencies.

---

## Implementation steps (in order)

1. **`formatters.ts`** — add `formatCurrencyValue()`. Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5` to confirm clean.

2. **`EstimateTab.svelte`**:
   - Update formatters import (Step A).
   - Apply Step B (swap to `formatCurrencyValue` in 11 cell sites).
   - Apply Step C (column widths).
   - Apply Step D (Card padding).
   - Apply Step E (single-column + sticky strip + Details dialog). This is the biggest change — work carefully:
     - Add `let totalsDetailsOpen = $state(false);`
     - Find the `lg:grid lg:grid-cols-[minmax(0,1fr)_340px]` wrapper
     - Cut the entire right-pane `<div class="lg:sticky...">` block (it contains the Totals Breakdown Card)
     - Replace the grid wrapper with just the line-items Card (drop the grid)
     - Build the new sticky strip immediately AFTER the line-items Card
     - Build the new ResponsiveDialog containing the cut Totals Breakdown content
     - Verify the threshold color logic is preserved on Net Payable
   - Run svelte-check after this file.

3. **`AdditionalsTab.svelte`** — same shape as EstimateTab but with Additionals values:
   - Imports update.
   - Cell swap to `formatCurrencyValue` (5 cost cells + Total).
   - Column width tighten.
   - Card padding.
   - Sticky strip (Additionals values) + Details dialog containing `<CombinedTotalsSummary>`.
   - Run svelte-check.

4. **`AssessmentLayout.svelte`** — conditional main padding.

5. **Final svelte-check** — `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`. 0 errors required. Report any new warnings on touched files.

6. **Spot-check 2 heavier tabs** (DamageTab.svelte, FRCTab.svelte) by reading their wrappers — confirm they still use the original padding via the conditional. Don't edit them.

7. **Stop. Report back.** Do NOT commit, do NOT push, do NOT `git pull` or `git fetch --autostash`.

---

## Verification (orchestrator + user, on Vercel preview)

After commit + push, on Vercel preview URL for `claude/confident-mendel`:

1. **Estimate tab on a wide viewport (≥1920px)**:
   - Line items workbench fills the full width minus the left rail. No right Totals pane visible.
   - Description column comfortable (~600-700px). "Rear bumper assembly with mounting brackets" fits without truncation.
   - Cost sub-cells show `"3 250,00"` format (no R prefix). Row Total shows `"6 130,00"` (no R).
   - Bottom of viewport: a sticky horizontal strip showing Parts, Markup, S&A, Labour, Paint, VAT on the left; Net Payable (with threshold color) and a "Details" button on the right.
   - Scroll the line items: strip stays pinned to the bottom of `<main>`.

2. **Estimate tab on a ~1500px viewport** (the user's screen):
   - Description column ~270-310px (legible).
   - Strip wraps to 2 lines if needed (`flex-wrap` handles it).

3. **Click "Details" in the strip** → ResponsiveDialog opens with the FULL Totals Breakdown (subtotal, sundries, VAT, threshold message banner, assessment_result Repair/Total Loss picker, etc.). All existing affordances available.

4. **Net Payable color in the strip** changes when crossing threshold boundaries (red/orange/yellow/green/blue per existing threshold logic). Engineers see the over-write-off signal.

5. **Same UX on Additionals tab** — bottom strip shows Original/Removed/Added (Approved)/Combined; Details dialog opens with the existing `<CombinedTotalsSummary>` unchanged.

6. **Other tabs** (Damage, Tyres, Vehicle ID, etc.) — completely unchanged. Same `mx-auto w-[98%] max-w-[1600px]` cap, same padding (verify Damage+FRC look identical to before).

7. **Mobile (<lg)**:
   - Line items table is hidden, mobile cards render as today.
   - Bottom strip still appears (works at all breakpoints — `flex-wrap` makes it tolerant).
   - If the strip occupies more than ~30% of phone viewport, document as a follow-up.

8. **Build** — svelte-check passes 0 errors, no new warnings on touched files.

---

## Risks / things to watch (full version in plan)

- **Sticky bottom + scroll context** — `bottom-0` is relative to `<main class="overflow-y-auto">` which is the scroll container per Phase 8a. Should work.
- **Z-index** — sticky table header is `z-10`, bottom strip is `z-20`. Dialog uses bits-ui higher stack. No conflicts expected.
- **Threshold color readability on `bg-card`** — yellow/orange/red/green all readable on near-white. Verify on Vercel.
- **CombinedTotalsSummary inside dialog** — Card border may double-up. If visually awkward, mirror the `embedded?: boolean` prop pattern from `RatesAndRepairerConfiguration.svelte`.
- **`pb-0` on `<main>`** — eliminates gap below sticky strip. Strip's own `py-2.5` provides breathing room. If too tight when scrolled fully, swap `pb-0` for `pb-2`.
- **Cross-device race** — orchestrator handles `git fetch` immediately before push. Coder MUST NOT pull or rebase.

---

## Coder convention

- Touch ONLY the 4 files listed above.
- No new dependencies (`Info` icon, `ResponsiveDialog` already imported in both files; verify).
- No formatter sweeps over unrelated files.
- No "while I'm here" cleanups.
- Stop after step 7. Orchestrator commits and pushes.
