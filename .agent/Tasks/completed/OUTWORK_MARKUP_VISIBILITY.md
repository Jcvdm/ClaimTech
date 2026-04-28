# Outwork Markup Visibility — Split per-category markup display

**Created**: 2026-04-28
**Status**: In Progress
**Complexity**: Small (3 files, display-only changes — math unchanged)
**Branch**: `claude/confident-mendel`
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

User reported "outwork markup is not calculated in the details panel." Investigation confirmed the math IS correct:
- Verified with concrete example: parts nett 4 250 × 28% = 1 190 markup; outwork nett 250 × 28% = 70 markup; total markup = 1 260 (matches displayed value exactly)
- Outwork markup IS bundled into `markupTotal`, but the breakdown isn't visible in the UI

**This is a visibility/transparency issue, not a calculation bug.** No math changes — just display.

User-confirmed direction: **split "Markup Total" into "Parts Markup" + "Outwork Markup"** for transparency.

---

## Files to modify (3)

1. `src/lib/components/assessment/EstimateTab.svelte` — primary
2. `src/lib/components/assessment/AdditionalsTab.svelte` — same pattern if applicable
3. `src/lib/components/assessment/CombinedTotalsSummary.svelte` — same pattern if applicable

---

## EstimateTab changes (REQUIRED)

### A. `categoryTotals` derived — expose `partsMarkup` and `outworkMarkup`

In `categoryTotals` (around line 802-869), the local consts `partsMarkup` (line 836) and `outworkMarkup` (line 840) are already computed but not exposed in the return object. Add them:

```ts
return {
  partsTotal: partsNett,
  partsMarkup,           // ← NEW (was: only inside markupTotal sum)
  saTotal,
  labourTotal,
  paintTotal,
  outworkTotal: outworkNett,
  outworkMarkup,         // ← NEW
  markupTotal,           // KEEP for backwards-compat (sum of partsMarkup + outworkMarkup)
  bettermentTotal,
  subtotalExVat,
  // ... rest unchanged
};
```

**No new computation. No math change.** Just expose what's already calculated locally.

### B. Details dialog (around lines 1840-1900)

Find the existing Markup Total block (around line 1850-1855) and the Outwork Total block (around line 1878-1883). Restructure:

```svelte
<!-- BEFORE -->
<div class="flex items-center justify-between py-2">
  <span class="text-sm text-muted-foreground">Parts Total</span>
  <span class="font-mono-tabular text-sm font-medium">{formatCurrency(totals?.partsTotal || 0)}</span>
</div>

<div class="flex items-center justify-between py-2">
  <span class="text-sm text-muted-foreground">Markup Total</span>
  <span class="font-mono-tabular text-sm font-medium text-green-600">{formatCurrency(totals?.markupTotal || 0)}</span>
</div>

<div class="flex items-center justify-between py-2">
  <span class="text-sm text-muted-foreground">S&A Total</span>
  ...
```

```svelte
<!-- AFTER -->
<div class="flex items-center justify-between py-2">
  <span class="text-sm text-muted-foreground">Parts Total</span>
  <span class="font-mono-tabular text-sm font-medium">{formatCurrency(totals?.partsTotal || 0)}</span>
</div>

<div class="flex items-center justify-between py-2">
  <span class="text-sm text-muted-foreground">Parts Markup</span>
  <span class="font-mono-tabular text-sm font-medium text-green-600">{formatCurrency(totals?.partsMarkup || 0)}</span>
</div>

<div class="flex items-center justify-between py-2">
  <span class="text-sm text-muted-foreground">S&A Total</span>
  ...
```

And after the Outwork Total line (around line 1878-1883), insert Outwork Markup:

```svelte
<div class="flex items-center justify-between border-b py-2">
  <span class="text-sm text-muted-foreground">Outwork Total</span>
  <span class="font-mono-tabular text-sm font-medium">{formatCurrency(totals?.outworkTotal || 0)}</span>
</div>

<!-- NEW: Outwork Markup line, mirrors Parts Markup styling -->
<div class="flex items-center justify-between py-2">
  <span class="text-sm text-muted-foreground">Outwork Markup</span>
  <span class="font-mono-tabular text-sm font-medium text-green-600">{formatCurrency(totals?.outworkMarkup || 0)}</span>
</div>
```

**Result in the dialog:**
```
Parts Total       4 250,00
Parts Markup      1 190,00   ← NEW (green text, mirrors old Markup Total styling)
S&A Total           725,00
Labour Total      3 045,00
Paint Total       4 255,00
Outwork Total       250,00
Outwork Markup       70,00   ← NEW
─────────────────────────
Subtotal Ex VAT  13 785,00   (unchanged)
```

Net: REMOVE the standalone "Markup Total" line. ADD per-category markup lines next to their respective category totals.

### C. Bottom-sticky strip (around lines 1780-1820)

The bottom strip currently shows: Parts | Markup | S&A | Labour | Paint | VAT | Total. **No Outwork line at all** (which is part of why the user couldn't see outwork being counted).

Add an "Outwork" line between Paint and VAT. Use the same compact pattern as the other strip values:

```svelte
<!-- Find the Paint strip line, add Outwork right after it, before VAT -->
<span class="flex items-center gap-1.5">
  <span class="text-muted-foreground uppercase text-[10.5px] font-semibold tracking-wide">Outwork</span>
  <span class="font-mono-tabular">{formatCurrency(totals?.outworkTotal || 0)}</span>
</span>
```

**Strip Markup line stays as `markupTotal` (combined)** — keeps the strip compact. The breakdown is in the Details dialog.

---

## AdditionalsTab + CombinedTotalsSummary (READ AND VERIFY first)

The user approved extending the change to AdditionalsTab + CombinedTotalsSummary "for consistency." Before editing, **investigate**:

1. Open `CombinedTotalsSummary.svelte` and find any "Markup" or "Outwork" display lines. Does it show a combined Markup line that hides outwork markup?
2. Open `AdditionalsTab.svelte` and find the Details dialog section (rendered via the Details button). Does it use `CombinedTotalsSummary` or have its own breakdown?
3. The AdditionalsTab bottom strip shows `Original | Removed | Added Approved | Combined` — different semantics from EstimateTab. Probably no markup line to split there.

**If CombinedTotalsSummary shows a single "Markup" line that hides outwork markup**, apply the same split pattern (add Outwork Markup line). The exact totals to expose depend on whether CombinedTotalsSummary computes its own markup or pulls from a server-provided value.

**If CombinedTotalsSummary doesn't show markup separately at all** (just shows combined totals), no change needed.

Document your finding in the report. If there's nothing to change in AdditionalsTab/CombinedTotalsSummary, that's a valid outcome — just say so.

---

## Files NOT to touch

- `src/lib/utils/estimateCalculations.ts` — math is correct, leave alone
- `src/lib/utils/formatters.ts` — `formatCurrency` is correct
- The `partsMarkup` / `outworkMarkup` computation logic in `categoryTotals` — already correct, just expose
- All save/edit/lifecycle logic — unchanged
- Mobile cards — unchanged
- `package.json` — no new dependencies

---

## Implementation steps

1. **EstimateTab `categoryTotals`** — expose `partsMarkup` and `outworkMarkup` in the return object (2 lines added).
2. **EstimateTab Details dialog** — restructure markup display (remove "Markup Total" standalone, add "Parts Markup" after Parts Total, add "Outwork Markup" after Outwork Total).
3. **EstimateTab bottom strip** — add "Outwork" line between Paint and VAT.
4. **Run svelte-check after EstimateTab changes** — must be 0 errors.
5. **Investigate CombinedTotalsSummary + AdditionalsTab** — read the relevant sections. Determine if same markup-hidden issue exists. If yes, apply same split pattern. If no, document and move on.
6. **Final svelte-check** — 0 errors required.
7. **STOP**. Do NOT commit, do NOT push, do NOT `git pull`. Orchestrator handles git.

---

## Verification (orchestrator + user, on Vercel preview after push)

1. **Open the Details dialog on EstimateTab** → see:
   - "Parts Total" → "Parts Markup" (green) → S&A → Labour → Paint → "Outwork Total" → "Outwork Markup" (green) → Subtotal
   - No standalone "Markup Total" line (it's split into the two per-category markup lines)
2. **Verify math reconciles**:
   - For your test estimate (4 250 parts nett @ 28% + 250 outwork nett @ 28%): Parts Markup = 1 190, Outwork Markup = 70, Subtotal = 13 785 (unchanged)
3. **Bottom strip shows Outwork line** between Paint and VAT.
4. **Strip Markup value stays combined** (1 260) — breakdown is in Details.
5. **AdditionalsTab/CombinedTotalsSummary** — verify per coder's findings (no change OR consistent split).
6. **`svelte-check`** — 0 errors, no new warnings on touched files.

---

## Risks / things to watch

- **`markupTotal` field stays in the return object** — any other consumer of `categoryTotals.markupTotal` continues to work. We only add new fields and remove the UI display.
- **Color styling** — old "Markup Total" line had `text-green-600`. Apply same green to both new "Parts Markup" and "Outwork Markup" lines.
- **CombinedTotalsSummary investigation** — if you find it doesn't show markup separately at all, that's fine. Don't invent a new pattern. Match what's there.
- **Cross-device race** — orchestrator does `git fetch origin` immediately before push.

---

## Coder convention

- Touch ONLY the 3 files listed (EstimateTab, AdditionalsTab, CombinedTotalsSummary). Don't touch utilities, services, or other components.
- No formatter sweeps, no "while I'm here" cleanups.
- No new dependencies.
- Stop after step 7. Orchestrator commits + pushes in ONE commit.
