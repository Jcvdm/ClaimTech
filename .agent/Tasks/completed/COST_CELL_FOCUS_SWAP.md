# Cost Cell Focus-Driven Swap — Restore Calculation Display

**Created**: 2026-04-27
**Status**: In Progress
**Complexity**: Moderate (2 files, mostly cell rendering revert + small `handle*Save` refactor)
**Branch**: `claude/confident-mendel`
**Triggering commits to fix**: `933fa54` + `32b2e3a` (Phase 1/2 always-edit conversions)
**Approved plan**: `C:\Users\Jcvdm\.claude\plans\lets-take-it-step-witty-glacier.md`
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

Phase 1/2 converted cost cells to always-edit inputs to enable Tab navigation. Two regressions surfaced:

1. **Calculation display lost** — S&A/Labour/Paint cells now show raw hours/panels instead of the calculated cost (`R1 500,00`). The math still happens (`paint_cost = panels × paint_rate` in commit functions), just isn't visible in the cell.
2. **Spacing feels cramped** — 5 always-rendered inputs per row feel denser than the OLD compact text buttons.

**Fix**: revert to the OLD click-to-edit pattern (button when not focused, input when focused) AND add `onfocus={() => handle*Click(...)}` to each button. This makes Tab→focus trigger edit mode → input opens with autofocus. Same Tab UX as Phase 1/2, plus calc display restored, plus better spacing.

The OLD `editing*`/`temp*`/`handle*Click/Cancel/Save` state vars and functions are STILL in both files (Phase 1/2 coders kept them because mobile cards use them via `onEdit*` callbacks). We just stop rendering the always-edit input and re-render the toggle pattern.

---

## Files to modify (2)

- `src/lib/components/assessment/EstimateTab.svelte`
- `src/lib/components/assessment/AdditionalsTab.svelte`

---

## What changes per cost cell (5 cells × 2 files = 10 cells total)

### EstimateTab desktop table — convert each cost cell from always-edit Input → click-to-edit toggle WITH onfocus on button

**Pattern (Part Price example)** — same shape for all 5:

```svelte
<!-- BEFORE (Phase 1 always-edit, current state on disk) -->
{#if item.process_type === 'N'}
  <Input
    type="text"
    inputmode="decimal"
    value={formatCurrencyValue(item.part_price_nett ?? 0)}
    onfocus={(e) => { originalCostValue = (e.currentTarget as HTMLInputElement).value; (e.currentTarget as HTMLInputElement).select(); }}
    onblur={(e) => commitPartPrice(item.id!, parseLocaleNumber((e.currentTarget as HTMLInputElement).value))}
    onkeydown={(e) => {
      if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
      if (e.key === 'Escape') { (e.currentTarget as HTMLInputElement).value = originalCostValue; (e.currentTarget as HTMLInputElement).blur(); }
    }}
    class="..."
  />
{:else}
  <span class="text-xs text-muted-foreground">-</span>
{/if}
```

```svelte
<!-- AFTER (focus-driven swap — click-to-edit toggle + onfocus on button) -->
{#if item.process_type === 'N'}
  {#if editingPartPrice === item.id}
    <Input
      type="number"
      min="0"
      step="0.01"
      bind:value={tempPartPriceNett}
      onkeydown={(e) => {
        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
        if (e.key === 'Escape') handlePartPriceCancel();
      }}
      onblur={() => handlePartPriceSave(item.id!, item)}
      autofocus
      class="font-mono-tabular h-7 border-0 p-0 text-right text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
    />
  {:else}
    <button
      onclick={() => handlePartPriceClick(item.id!, item.part_price_nett ?? null)}
      onfocus={() => handlePartPriceClick(item.id!, item.part_price_nett ?? null)}
      class="font-mono-tabular w-full text-right text-xs font-medium hover:text-foreground/70"
      title="Click or Tab to edit nett price"
    >
      {formatCurrencyValue(item.part_price_nett ?? 0)}
    </button>
  {/if}
{:else}
  <span class="text-xs text-muted-foreground">-</span>
{/if}
```

**The key differences from the pre-Phase-1 OLD pattern**:
- Added `onfocus={() => handle*Click(...)}` to the button — this is the NEW addition that makes Tab work.
- Everything else is the same as before Phase 1 (you can `git show 933fa54^` to see the EXACT OLD pattern that worked).

### Display values per cell button (when not focused)

| Cell | Process types | Display value (regression fix) |
|---|---|---|
| Part Price | N | `formatCurrencyValue(item.part_price_nett ?? 0)` |
| S&A | N/R/P/B | `formatCurrencyValue(item.strip_assemble ?? 0)` ← **calc cost, not hours** |
| Labour | N/R/A | `formatCurrencyValue(item.labour_cost ?? 0)` ← **calc cost, not hours** |
| Paint | N/R/P/B | `formatCurrencyValue(item.paint_cost ?? 0)` ← **calc cost, not panels** |
| Outwork | O | `formatCurrencyValue(item.outwork_charge_nett ?? 0)` |

**Critical**: for S&A/Labour/Paint, the button display uses the CALCULATED cost field (`strip_assemble`, `labour_cost`, `paint_cost`), NOT the editable raw value (`strip_assemble_hours`, `labour_hours`, `paint_panels`). This is the regression fix.

The input (when focused) edits the RAW value via `bind:value={tempXHours}` etc. — unchanged from the OLD pattern.

---

## Tiny refactor — `handle*Save` delegates to `commit*` (DRY + unchanged-check)

When user Tab-pass-through a cell, button focus → onfocus → handle*Click → input opens → input blurs immediately → handle*Save fires with the unchanged value. Without an unchanged-check, this is a redundant save.

The `commit*` functions added in Phase 1 already have the unchanged-check. Refactor `handle*Save` to delegate:

```ts
// BEFORE — duplicates the markup math + updateLocalItem + scheduleSave
async function handlePartPriceSave(itemId: string, item: ...) {
  if (tempPartPriceNett !== null) {
    const valueToSave = tempPartPriceNett;
    editingPartPrice = null;
    tempPartPriceNett = null;
    // ... markup math ...
    updateLocalItem(itemId, { part_price_nett: valueToSave, part_price: ... });
    scheduleSave();
  }
}

// AFTER — delegates to commit* (single source of truth, unchanged-check inside)
async function handlePartPriceSave(itemId: string, item: ...) {
  if (tempPartPriceNett !== null) {
    const valueToSave = tempPartPriceNett;
    editingPartPrice = null;
    tempPartPriceNett = null;
    commitPartPrice(itemId, valueToSave);
  }
}
```

Apply to all 5 `handle*Save` functions in EstimateTab.

For AdditionalsTab, same refactor — `handle*Save` delegates to `commit*` (which calls `updatePending` through the queue).

**Before delegating**: read both `handle*Save` and `commit*` side-by-side and CONFIRM they compute identical results. If there's any subtle calculation difference (rounding, field naming, extra side effects), reconcile by aligning the math (`commit*` is the new single source of truth).

---

## Files NOT to touch

- **Skeleton row in EstimateTab** — stays always-edit. The skeleton row's cost cells don't have the regression (skeleton values are pre-commit, no "cost" to display). Don't revert skeleton.
- **Mobile cards** (`LineItemCard.svelte`, `AdditionalLineItemCard.svelte`) — completely untouched. Click-to-edit via `onEdit*` callbacks already.
- **Description textarea** — untouched.
- **Type / Part Type selects** — untouched.
- **`formatters.ts`** — `parseLocaleNumber` stays, no other change.
- **Mutation queue, save plumbing, lifecycle handlers** — unchanged.
- **Bottom-sticky strip, Card layout, column widths, totals** — unchanged.
- **`commit*` and `parseLocaleNumber`** — kept (used by skeleton row and the delegated `handle*Save`).
- **`originalCostValue`** state — can stay (harmless, may not be used after this revert) or be removed if you want extra cleanup.
- **`package.json`** — no new dependencies.

---

## Existing utilities to reuse

- **`handle*Click`** functions (already in file): set `editingX = item.id` and `tempX = currentValue`. Now triggered by both `onclick` AND `onfocus` on the button.
- **`handle*Cancel`** functions (already in file): clear `editingX` and `tempX`. Triggered by Escape in the input.
- **`handle*Save`** functions: small refactor to delegate to `commit*`.
- **`commit*`** functions (added in Phase 1, ~770 in EstimateTab and ~215 in AdditionalsTab): single source of truth for the actual save. Has unchanged-check guard.
- **`tempPartPriceNett`/`tempSAHours`/etc.** state vars: bound to inputs via `bind:value`.
- **`editingPartPrice`/`editingSA`/etc.** state vars: drives the `{#if editingX === item.id}` toggle.
- **`formatCurrencyValue`**: button display.

---

## Implementation steps (in order)

1. **Read EXISTING `handle*Save` and `commit*` functions** in EstimateTab + AdditionalsTab side-by-side. Confirm they compute identical results (same fields updated, same math, same scheduleSave/updatePending call). Document any discrepancy. If equivalent → safe to delegate.

2. **EstimateTab — convert 5 cost cells** from Phase 1 always-edit Input → focus-driven swap (button-when-not-focused / input-when-focused). For each cell:
   - Display value uses CALCULATED cost field (per the table above)
   - Add `onfocus={() => handle*Click(...)}` to button (the NEW bit)
   - Input branch identical to pre-Phase-1 (you can git show `933fa54^` for reference)

3. **EstimateTab — refactor 5 `handle*Save` to delegate to `commit*`** (DRY save path, gain unchanged-check).

4. **Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -10`**. Must be clean.

5. **AdditionalsTab — same conversion** for the 5 cost cells. KEY: only inside the existing `{#if !isRemoved && !isReversal && item.status === 'pending' && [process_type matches]}` branch. Non-pending items keep their existing `<span>` read-only text.

6. **AdditionalsTab — same `handle*Save` → `commit*` delegation**.

7. **Final svelte-check**: 0 errors required.

8. **STOP**. Do NOT commit, do NOT push, do NOT `git pull`. Orchestrator handles git in ONE commit.

---

## Verification (orchestrator + user, on Vercel preview after push)

1. **Cost cells show calculated cost when not focused**: Paint cell with `paint_panels=1` and `paint_rate=1500` shows `R1 500,00`. Same for S&A (hours × labour_rate) and Labour. ✅ regression fix.
2. **Tab to a cost cell**: button focuses → `onfocus` triggers edit mode → input renders with autofocus → value selected, ready to type.
3. **Type, Tab away**: input commits via `handle*Save` → `commit*` (unchanged-check passes if value differs) → button re-renders with new calculated cost.
4. **Type, Enter**: same as Tab away (Enter→blur from A3 pattern).
5. **Type, Escape**: `handle*Cancel` clears edit state, button re-renders with ORIGINAL cost (no save).
6. **Tab through without typing**: button focuses → input opens briefly (visible flicker) → input blurs → `handle*Save` → `commit*` unchanged-check returns early → button re-renders. No network call.
7. **Click a cell**: existing onclick still works.
8. **Spacing**: most cells render as compact button text. Closer to pre-Phase-1 visual density.
9. **Skeleton row**: still always-edit, unchanged.
10. **AdditionalsTab pending items**: focus-driven swap, calc display restored.
11. **AdditionalsTab non-pending items** (removed/declined/reversed): still render as `<span>` text. Tab skips them.
12. **Mobile cards**: completely unchanged.
13. **`svelte-check`**: 0 errors, no new warnings on touched files.

---

## Risks / things to watch

- **Tab-through visual flicker** — button → input → button briefly visible when Tab passes through. <50ms, should be imperceptible. If user reports it, we can mitigate later via `e.relatedTarget` detection in onfocus, but most spreadsheet apps just accept this.
- **`handle*Save` → `commit*` calculation drift** — step 1 of implementation explicitly verifies parity. If the delegation would change behavior, reconcile by aligning the math in `commit*` (single source of truth).
- **Programmatic focus opening edit mode unexpectedly** — if some other code focuses a cost-cell button, edit mode opens. The unchanged-check guard prevents redundant saves; only visual side effect.
- **Cross-device race** — orchestrator does `git fetch origin` immediately before push. Coder MUST NOT pull or rebase.

---

## Coder convention

- Touch ONLY the 2 files: `src/lib/components/assessment/EstimateTab.svelte`, `src/lib/components/assessment/AdditionalsTab.svelte`.
- No formatter sweeps, no "while I'm here" cleanups.
- No new dependencies.
- Stop after step 8. Orchestrator handles git in ONE commit.
