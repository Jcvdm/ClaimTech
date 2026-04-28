# Tab Navigation — Phase 1: EstimateTab Always-Edit Cost Cells

**Created**: 2026-04-27
**Status**: In Progress
**Complexity**: Moderate (1 file + 1 helper, replaces edit-state machine with always-edit inputs)
**Branch**: `claude/confident-mendel`
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

User wants Tab to navigate between cost cells without an extra Enter press. Today's click-to-edit pattern means Tab lands on a `<button>`, not an editable input — so engineers have to press Enter to "open" the cell before typing. For fast data entry across hundreds of line items, that's 2× the keystrokes.

Solution: convert cost cells from click-to-edit to always-rendered inputs (`type="text" inputmode="decimal"` with locale formatting). Tab → input is focused, value is selected, ready to overwrite. Save on blur.

This pass: **EstimateTab only**. AdditionalsTab is Phase 2 (separate coder).

---

## What's preserved (no functional regression)

- Save on Enter → blur (A3 pattern from `998c584`)
- Save on Tab/blur (works natively — Tab triggers blur)
- Markup recalculation (nett × markup% = selling) — same logic, runs on blur via new `commit*` functions
- Hours × rate calculations (S&A / Labour / Paint) — same
- Number validation (min/step) — preserved on the input
- Process-type-driven cell visibility — same `{#if}` guards
- Formatted currency display when not focused — via `value={formatCurrencyValue(...)}`
- Escape to revert — restored via `originalValue` capture pattern (small addition)
- Mobile cards — completely untouched
- All save-safety, mutation queue, totals derivations, layout — unchanged

---

## What gets removed (dead internal state, no user-facing change)

- `editingPartPrice`, `editingSA`, `editingLabour`, `editingPaint`, `editingOutwork` (5 state vars)
- `tempPartPriceNett`, `tempSAHours`, `tempLabourHours`, `tempPaintPanels`, `tempOutworkNett` (5 buffers)
- `handlePartPriceClick`, `handleSAClick`, `handleLabourClick`, `handlePaintClick`, `handleOutworkClick` (5 funcs)
- `handlePartPriceCancel`, `handleSACancel`, `handleLabourCancel`, `handlePaintCancel`, `handleOutworkCancel` (5 funcs — Escape now handled inline)
- `handlePartPriceSave`, `handleSASave`, `handleLabourSave`, `handlePaintSave`, `handleOutworkSave` (5 funcs — replaced by `commit*` functions that take `(itemId, parsedValue)` directly)
- The `{#if editingX === item.id} <Input> {:else} <button> ... {/if}` toggles in the desktop table (5 cells)
- Same toggle pattern in the **skeleton row** (`skeletonEditingField`) — replaced by always-rendered inputs

---

## Files to modify (2)

### 1. `src/lib/utils/formatters.ts` — add helper

Add below the existing `formatCurrencyValue()`:

```ts
/**
 * Parse a locale-formatted number string back to a numeric value.
 * Handles ZA-style "1 500,00" (space thousands, comma decimal) AND
 * plain "1500", "1500.00", "1,500.00" — strips spaces, normalizes
 * commas to periods, parses.
 *
 * Returns null for empty / invalid input.
 */
export function parseLocaleNumber(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  // Strip spaces (locale thousands sep), normalize comma → period
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}
```

Don't modify any other helper.

### 2. `src/lib/components/assessment/EstimateTab.svelte` — convert cost cells

#### A. Imports

Add `parseLocaleNumber` to the formatters import:
```ts
import { formatCurrency, formatCurrencyValue, formatDate, parseLocaleNumber } from '$lib/utils/formatters';
```

#### B. Remove dead state and dead functions

Remove these declarations:
- `let editingSA = $state<string | null>(null);` and the 4 sibling editing flags
- `let tempSAHours = $state<number | null>(null);` and the 4 sibling temp values
- `let skeletonEditingField = $state<...>(null);` (skeleton's edit-mode flag)

Remove these functions entirely:
- `handleSAClick`, `handleLabourClick`, `handlePaintClick`, `handlePartPriceClick`, `handleOutworkClick`
- `handleSAClick`, `handleLabourCancel`, `handlePaintCancel`, `handlePartPriceCancel`, `handleOutworkCancel`
- `handleSASave`, `handleLabourSave`, `handlePaintSave`, `handlePartPriceSave`, `handleOutworkSave`
- `handleSkeletonCostBlur` if its only purpose was the skeleton edit-toggle (verify — it might also commit the skeleton row, in which case keep it but rename/refactor)

(Some of these may have already been removed in previous passes — double-check. Use grep before deleting.)

#### C. Add `originalValue` state + `commit*` functions

Near the top of `<script>` (after the imports, near other `$state` declarations):

```ts
// Captures the pre-edit value of whichever cost cell currently holds focus.
// Used to support Escape→revert (cell restores this value, then blurs).
let originalCostValue = $state('');
```

Add 5 `commit*` functions (replacing the 5 deleted `handle*Save` functions). Each takes `(itemId, parsedValue)` and does the same calculation the old handler did, then calls `scheduleSave()`. Example for Part Price:

```ts
function commitPartPrice(itemId: string, value: number | null) {
  if (!localEstimate) return;
  const item = localEstimate.line_items.find((i) => i.id === itemId);
  if (!item) return;
  const newNett = value ?? 0;
  if ((item.part_price_nett ?? 0) === newNett) return; // unchanged → no-op
  // Mirror the old handlePartPriceSave's markup math
  let markupPercentage = 0;
  if (item.part_type === 'OEM') markupPercentage = localEstimate.oem_markup_percentage;
  else if (item.part_type === 'ALT') markupPercentage = localEstimate.alt_markup_percentage;
  else if (item.part_type === '2ND') markupPercentage = localEstimate.second_hand_markup_percentage;
  const newSelling = Number((newNett * (1 + markupPercentage / 100)).toFixed(2));
  updateLocalItem(itemId, { part_price_nett: newNett, part_price: newSelling });
  scheduleSave();
}
```

Mirror the existing `handle*Save` logic for the other 4: `commitSA(itemId, hours)`, `commitLabour(itemId, hours)`, `commitPaint(itemId, panels)`, `commitOutwork(itemId, nett)`. **Read the old handler bodies before deleting them — preserve every calculation step exactly.** The unchanged-check at the top of each commit function is the new addition.

#### D. Convert the 5 cost cells in the desktop table to always-edit inputs

The pattern for each cost cell. Example for Part Price (find the existing `{#if item.process_type === 'N'}` block and replace its inner `{#if editingPartPrice === item.id} ... {:else} <button> ... {/if}`):

```svelte
{#if item.process_type === 'N'}
  <Input
    type="text"
    inputmode="decimal"
    value={formatCurrencyValue(item.part_price_nett ?? 0)}
    onfocus={(e) => { originalCostValue = (e.currentTarget as HTMLInputElement).value; (e.currentTarget as HTMLInputElement).select(); }}
    onblur={(e) => commitPartPrice(item.id!, parseLocaleNumber((e.currentTarget as HTMLInputElement).value))}
    onkeydown={(e) => {
      if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
      if (e.key === 'Escape') {
        (e.currentTarget as HTMLInputElement).value = originalCostValue;
        (e.currentTarget as HTMLInputElement).blur();
      }
    }}
    class="font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
  />
{:else}
  <span class="text-xs text-muted-foreground">-</span>
{/if}
```

Apply the equivalent change to:
- Part Price cell (process_type === 'N'): `commitPartPrice`, value source `item.part_price_nett`
- S&A cell (process_type in N/R/P/B): `commitSA`, value source `item.strip_assemble_hours`, but display `formatCurrencyValue(item.strip_assemble || 0)` (the COST not hours — verify by reading the old handler. If old handler took hours and computed cost, the input's display value may need to be hours not cost. Read carefully.)
- Labour cell (N/R/A): `commitLabour`, source `item.labour_hours`
- Paint cell (N/R/P/B): `commitPaint`, source `item.paint_panels`
- Outwork cell (process_type === 'O'): `commitOutwork`, source `item.outwork_charge_nett`

**CRITICAL**: For S&A / Labour / Paint, the EXISTING input took hours/panels (raw user input) and the cost display showed the calculated cost. Verify which value the user typed historically and which was displayed. The new always-edit input should show the SAME thing the user typed before (so they can edit it). If S&A's old click-to-edit input took hours but displayed cost, you might need TWO display modes — but more likely the existing `formatCurrency(item.strip_assemble || 0)` was the BUTTON display while editing showed raw hours. Re-read both branches of the old `{#if editingSA}` to confirm.

If the editable value (hours/panels) differs from the displayed value (cost), there's a subtle UX choice:
- Show the COST (formatted currency) — user has to mentally convert when editing. Bad.
- Show the HOURS/PANELS — clearer for editing but loses the at-a-glance cost view.
- Show one when focused (raw editable), the other when blurred (formatted cost). This is back to focus-driven swap — defeats the point.

**Recommended**: show the editable value (hours/panels) directly. So S&A cell shows `1.5` (hours), Labour shows `2` (hours), Paint shows `0.5` (panels). Cleaner for editing. The "cost" view is preserved in the bottom-sticky totals strip. If user wants the per-cell cost view back, that's a follow-up discussion.

If the cost-display preservation is critical to the user, use the focus-driven swap pattern (formatted span when blurred, raw input when focused). But that brings back complexity. **For first cut, raw editable values.**

#### E. Convert the 5 cost cells in the SKELETON ROW to always-edit inputs

The skeleton row currently uses `skeletonEditingField` to toggle between button/input per cell. Convert to always-rendered inputs bound to `skeletonPartPriceNett` etc.

Pattern:
```svelte
{#if skeletonProcessType === 'N'}
  <Input
    type="text"
    inputmode="decimal"
    value={skeletonPartPriceNett !== null ? formatCurrencyValue(skeletonPartPriceNett) : ''}
    onfocus={(e) => { originalCostValue = (e.currentTarget as HTMLInputElement).value; (e.currentTarget as HTMLInputElement).select(); }}
    onblur={(e) => { skeletonPartPriceNett = parseLocaleNumber((e.currentTarget as HTMLInputElement).value); }}
    onkeydown={(e) => {
      if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
      if (e.key === 'Escape') {
        (e.currentTarget as HTMLInputElement).value = originalCostValue;
        (e.currentTarget as HTMLInputElement).blur();
      }
    }}
    placeholder="0,00"
    class="font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
  />
{:else}
  <span class="text-muted-foreground text-xs">-</span>
{/if}
```

Same for the other 4 skeleton cost cells. The skeleton's commit happens via `commitSkeleton()` (triggered by description blur) — that flow is unchanged. Each cost input just maintains its bound `skeleton*Nett`/`skeleton*Hours`/`skeleton*Panels` value.

Remove `skeletonEditingField` state declaration entirely.

---

## Files NOT to touch

- `AdditionalsTab.svelte` — Phase 2 (separate coder dispatch).
- `formatCurrency`, `formatCurrencyValue` — unchanged. ONLY add `parseLocaleNumber`.
- Description textarea — already always-edit, untouched.
- Type / Part Type selects — untouched.
- Mobile card layouts (`LineItemCard.svelte`) — untouched.
- The bottom-sticky totals strip — untouched.
- Save plumbing (`saveAll`, `saveNow`, `scheduleSave`, `handleLocalUpdateRates`, `flushUpdate`) — untouched.
- Mutation queue, Card layout, column widths, `handle*Click` for non-cost cells (e.g. `handleBettermentClick`) — untouched.
- `package.json` — no new dependencies.

---

## Existing utilities to reuse

- **`formatCurrencyValue`** (`src/lib/utils/formatters.ts`) — for displaying cost cell values. EXCEPT for S&A/Labour/Paint where the display value is hours/panels (raw). Use `String(item.strip_assemble_hours ?? '')` for those, OR a small format helper that shows hours like "1.5" without thousands separator.
- **`updateLocalItem(itemId, patch)`** — already in EstimateTab, used by all cost commit functions to update local state.
- **`scheduleSave()`** — existing debounced save function, called at the end of each commit.
- **`saveNow()`** — existing flush function (used by `flushUpdate`, no need to call directly here).
- **`Input`** from `$lib/components/ui/input` — already imported.

---

## Implementation steps (in order)

1. **Add `parseLocaleNumber` to `formatters.ts`**. Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5` — must be clean.

2. **Read EXISTING `handle*Save` and `handle*Click` functions** in EstimateTab to understand:
   - What value each input took (hours/panels/nett price)
   - What calculation each save did
   - What `updateLocalItem` patch each generated
   - This is the spec the new `commit*` functions must match exactly.

3. **Add `originalCostValue` state and 5 `commit*` functions** in EstimateTab `<script>`. Don't delete anything yet.

4. **Convert the desktop table 5 cost cells** to always-edit inputs (Part Price, S&A, Labour, Paint, Outwork). Test with `svelte-check` after this step.

5. **Convert the 5 skeleton row cost cells** to always-edit inputs. Test.

6. **Delete the dead state and functions** (the 5 editing*, 5 temp*, skeletonEditingField, 5 handle*Click, 5 handle*Cancel, 5 handle*Save). Test.

7. **Final svelte-check**: `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`. 0 errors required. Report any new warnings.

8. **STOP**. Do NOT commit, do NOT push, do NOT `git pull`. Orchestrator handles git.

---

## Verification (orchestrator + user, on Vercel preview)

1. **Tab into the table** (e.g., from the description textarea) — focus moves to next focusable cell. Each cost cell input is focused with its value selected (blue selection highlight).
2. **Type a value, press Tab** — value commits, focus moves to next cell with its value selected. Continuous typing across 5 cost cells in 5 keystrokes (no extra Enters).
3. **Type a value, press Enter** — value commits, focus blurs (existing A3 pattern).
4. **Type a value, press Escape** — input reverts to original value, blur fires (no save since unchanged).
5. **Tab through a cell without typing** — focus passes through, no save call (unchanged-check guards).
6. **Click a cost cell** — focuses input, selects value, ready to type. Same UX as Tab arrival.
7. **Switch process_type N → A** — Part Price/S&A/Paint cells become `<span>-</span>` (non-applicable). Labour cell stays as input.
8. **Skeleton row** — type a description, press Tab → focus moves to Process Type select, then through cost cells (those that are visible per process type), finally Tab away → committSkeleton fires (description blur) → new line item created.
9. **Save behavior** — every blur with a changed value triggers `scheduleSave` (visible in network tab as a debounced save 1s later). Unchanged values don't save.
10. **Markup recalculation** — type "1500" in Part Price (nett) for an OEM part → blur → totals breakdown reflects 1500 × (1 + OEM markup%).
11. **`svelte-check`** — 0 errors, no new warnings on touched files.

---

## Risks / things to watch

- **Display value mismatch (S&A/Labour/Paint hours vs cost)** — see the "CRITICAL" note in step D. The first-cut decision is to show RAW hours/panels (the editable value). If user prefers cost display, that's a follow-up.
- **Unchanged-check with floating point** — `(item.part_price_nett ?? 0) === newNett` works for integer nett values (1500 === 1500). For decimals, `1.5 === 1.5` works in JS. Edge case: typed "1.50" parses to 1.5, compared to stored 1.5 — still strictly equal. Should be fine. If false-positives, switch to `Math.abs(a - b) < 0.01`.
- **Reactive prop override race** — if the parent's `estimate.line_items[i].part_price_nett` updates while user is mid-typing (e.g., from a save response), the input's `value` prop changes mid-type. In practice this only happens after a save (which only happens on blur), so the user can't be mid-typing during it. Real risk: very low. If surfaces, switch to a temp-state pattern per cell.
- **`originalCostValue` shared across cells** — single variable, captured per-focus. Two cells can't be focused simultaneously, so no contention. If focus moves before onblur fires (rare browser edge case), Escape would restore the wrong cell's original. Acceptable risk.
- **Number input quirks** — using `type="text" inputmode="decimal"` instead of `type="number"` means no spinner buttons. Mobile keyboards still show numeric pad via `inputmode`. Browser doesn't enforce numeric input — `parseLocaleNumber` validates on commit (returns null for non-numeric strings → unchanged-check skips save).
- **Cross-device race** — orchestrator does `git fetch origin` immediately before push. Coder MUST NOT pull or rebase.

---

## Coder convention

- Touch ONLY `src/lib/utils/formatters.ts` (add helper) and `src/lib/components/assessment/EstimateTab.svelte`.
- No formatter sweeps, no "while I'm here" cleanups.
- No new dependencies.
- Stop after step 8. Orchestrator handles git.
