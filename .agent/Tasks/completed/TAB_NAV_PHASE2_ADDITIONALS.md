# Tab Navigation — Phase 2: AdditionalsTab Always-Edit Cost Cells

**Created**: 2026-04-27
**Status**: In Progress
**Complexity**: Moderate (1 file, mirrors Phase 1 EstimateTab pattern)
**Branch**: `claude/confident-mendel`
**Phase 1 reference commit**: `933fa54` — apply the SAME pattern in AdditionalsTab.
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

Phase 1 (commit `933fa54`) converted EstimateTab cost cells to always-edit inputs. Engineers can now Tab through cost fields and type immediately — no extra Enter to "open" each cell.

This pass: do the same in AdditionalsTab. Same pattern, with two AdditionalsTab-specific nuances:

1. **Pending-vs-immutable swap**: AdditionalsTab cost cells already conditionally render Input vs `<span>` based on item status (`pending` → editable, others → read-only span). KEEP the outer conditional. Only convert the editable branch from edit-toggle to always-edit input.
2. **Mutation queue**: AdditionalsTab uses `updatePending()` (which routes through the serial queue from `998c584`). The new `commit*` functions must `await updatePending()` — same as the existing `handle*Save` did. Don't touch the queue.

---

## What's preserved

- `pending` items get always-edit input; `removed` / `reversal` / `reversed` / `declined` items render `<span>` text (read-only) — exactly as today
- Save on Enter / blur / Tab away (A3 + A4 patterns from `998c584`)
- Mutation queue serializes all writes (A5 from `998c584`) — `updatePending` calls still go through `enqueue()`
- Lifecycle handlers (approve, decline, delete, reverse, reinstate) — untouched
- Process-type-driven cell visibility — same `{#if}` guards
- AdditionalsTab pending-vs-immutable distinction — preserved
- Mobile cards (`AdditionalLineItemCard.svelte`) — completely untouched
- Bottom-sticky strip, Card layout, column widths — unchanged
- The non-pending `<span>` rendering for read-only items — unchanged

---

## What gets removed (in AdditionalsTab only)

- `editingPartPrice`, `editingSA`, `editingLabour`, `editingPaint`, `editingOutwork` (5 state vars)
- `tempPartPriceNett`, `tempSAHours`, `tempLabourHours`, `tempPaintPanels`, `tempOutworkNett` (5 buffers)
- `handlePartPriceClick`, `handleSAClick`, `handleLabourClick`, `handlePaintClick`, `handleOutworkClick` (5 funcs)
- `handlePartPriceCancel`, `handleSACancel`, `handleLabourCancel`, `handlePaintCancel`, `handleOutworkCancel` (5 funcs)
- `handlePartPriceSave`, `handleSASave`, `handleLabourSave`, `handlePaintSave`, `handleOutworkSave` (5 funcs — replaced by `commit*` functions)
- The `{#if editingX === item.id} <Input> {:else} <button> ... {/if}` toggle inside the `{#if pending}` branch (5 cells)

**IMPORTANT**: same as Phase 1, check whether mobile cards (`AdditionalLineItemCard.svelte`) reference these handlers via callbacks. If they do, KEEP the handlers (mobile is out of scope). The Phase 1 coder did exactly this for EstimateTab — mirror that decision here.

---

## Files to modify (1)

`src/lib/components/assessment/AdditionalsTab.svelte`

`parseLocaleNumber` already exists in `formatters.ts` from Phase 1 — just import it.

---

## Implementation pattern (mirror Phase 1)

### A. Imports

Add `parseLocaleNumber` to the existing formatters import:
```ts
import { formatCurrency, formatCurrencyValue, parseLocaleNumber } from '$lib/utils/formatters';
```
(If `formatCurrencyValue` isn't already in this file, the prior commits added it — verify.)

### B. Add `originalCostValue` state and 5 `commit*` functions

Near the top of `<script>`, add:
```ts
let originalCostValue = $state('');
```

Add 5 commit functions. They mirror the old `handle*Save` bodies (the `await updatePending(...)` call) but take `(itemId, parsedValue)` directly. Example for Part Price:

```ts
async function commitPartPrice(itemId: string, value: number | null) {
  const newNett = value ?? 0;
  const item = additionals?.line_items.find((i) => i.id === itemId);
  if (!item) return;
  if ((item.part_price_nett ?? 0) === newNett) return; // unchanged → no-op
  await updatePending(itemId, { part_price_nett: newNett });
}
```

Mirror for `commitSA(id, hours)`, `commitLabour(id, hours)`, `commitPaint(id, panels)`, `commitOutwork(id, nett)`. **Read the old `handle*Save` bodies first** to preserve any extra logic (e.g., recalculation steps the EstimateTab version did but Additionals might not, or vice versa).

For Additionals specifically: the existing `updatePending` patches a single field; markup recalculation happens server-side OR via a derived totals computation. So the Additionals `commit*` functions are simpler than EstimateTab's — they just patch the raw field via `updatePending`.

### C. Convert the 5 cost cells (inside the `{#if pending}` branch only)

Each cost cell currently has the structure:
```svelte
{#if !isRemoved && !isReversal && item.status === 'pending' && [process_type matches]}
  {#if editingPartPrice === item.id}
    <Input ... existing edit-mode input ... />
  {:else}
    <button onclick={() => handlePartPriceClick(...)}>{formatCurrencyValue(...)}</button>
  {/if}
{:else}
  <span class="...">{formatCurrencyValue(item.X || 0)}</span>
{/if}
```

Replace the inner `{#if editingX === item.id} ... {:else} <button> ... {/if}` with a single always-rendered Input:

```svelte
{#if !isRemoved && !isReversal && item.status === 'pending' && [process_type matches]}
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
  <span class="...">{formatCurrencyValue(item.X || 0)}</span>
{/if}
```

The outer `{#if pending}` `{:else} <span>` branches stay UNCHANGED — read-only items continue to render as text spans.

Apply to all 5 cost cells in the AdditionalsTab desktop table.

For display values:
- **Part Price**: `formatCurrencyValue(item.part_price_nett ?? 0)` (currency)
- **S&A**: `String(item.strip_assemble_hours ?? '')` (raw hours — same decision as Phase 1)
- **Labour**: `String(item.labour_hours ?? '')`
- **Paint**: `String(item.paint_panels ?? '')`
- **Outwork**: `formatCurrencyValue(item.outwork_charge_nett ?? 0)` (currency)

### D. Delete the dead state and functions (only if not used by mobile)

After conversion, search for usages of `editingPartPrice`, `editingSA`, `editingLabour`, `editingPaint`, `editingOutwork`, `tempPartPriceNett`, `tempSAHours`, etc.

- If ONLY referenced by the now-converted desktop cells → delete safely
- If ALSO referenced by mobile card callbacks (e.g., `AdditionalLineItemCard.svelte` via `onEdit*` props) → KEEP them and leave the handlers (mobile is out of scope, same as Phase 1's decision)

Same for `handle*Click`, `handle*Cancel`, `handle*Save`.

The Phase 1 coder's report noted: in EstimateTab, mobile keeps the click-to-edit pattern via `onEdit*` callbacks to `LineItemCard`. AdditionalsTab almost certainly has the same pattern with `AdditionalLineItemCard`. Verify and act accordingly.

---

## Files NOT to touch

- `src/lib/utils/formatters.ts` — `parseLocaleNumber` already exists from Phase 1, just import it.
- `EstimateTab.svelte` — Phase 1 already done.
- Mobile card layouts (`AdditionalLineItemCard.svelte`) — out of scope.
- Mutation queue (`enqueue`, `updatePending`) — unchanged.
- Lifecycle handlers (approve/decline/delete/reverse/reinstate) — unchanged.
- The `<span>` read-only rendering for non-pending items — unchanged.
- AdditionalsTab Card layout, column widths, bottom-sticky strip — unchanged.
- `package.json` — no new dependencies.

---

## Implementation steps

1. **Read the existing `handle*Save` functions** in AdditionalsTab (lines ~199-273) to understand exact body. Most just `await updatePending(id, { field: value })` — straightforward to mirror as `commit*`.

2. **Add the import** for `parseLocaleNumber`.

3. **Add `originalCostValue` state** and the 5 `commit*` functions.

4. **Convert the 5 cost cells** in the desktop table (inside the `{#if pending}` branch). Run svelte-check.

5. **Search for usages of `editing*`/`temp*`/`handle*Click/Cancel/Save`** in this file. Determine if the mobile card path uses them via `AdditionalLineItemCard` callbacks. If yes → KEEP. If no → DELETE.

6. **Final svelte-check**: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`. 0 errors required.

7. **STOP**. Do NOT commit, do NOT push, do NOT `git pull`.

---

## Verification (orchestrator + user, on Vercel preview)

1. **Pending line items** — Tab into the table. Cost cells are always-rendered inputs, value selected on focus, type immediately replaces. Same UX as EstimateTab now.
2. **Removed/reversed/declined items** — render as `<span>` text (read-only). Tab skips them naturally (no focusable input).
3. **Save on blur/Enter/Tab** — value commits via `updatePending` → goes through mutation queue → persists. Network tab shows debounced/serialized writes.
4. **Escape on a pending cell** — input reverts to original value, blur fires (no save since unchanged).
5. **Markup recalculation** — Additionals doesn't recalc client-side (server handles it). Verify totals reflect the change after save round-trip.
6. **Switching item status** (pending → approved via Approve button) — cell rendering switches from input to span. Existing lifecycle still works.
7. **Mobile cards** — unchanged.
8. **`svelte-check`** — 0 errors, no new warnings on touched file.

---

## Risks / things to watch

- **`updatePending` already routes through the queue** — `commit*` functions just `await updatePending(...)`. Don't add a separate queue wrapper.
- **`originalCostValue` shared across cells** — single variable, single focus at a time. Same approach as Phase 1.
- **Mobile handler references** — verify before deleting. The Phase 1 coder kept the EstimateTab handlers because mobile uses them. Mirror that decision.
- **Display value mismatch (hours vs cost)** — same Phase 1 decision: show RAW hours/panels for S&A/Labour/Paint, formatted currency for Part Price/Outwork.
- **Cross-device race** — orchestrator does `git fetch origin` immediately before push. Coder MUST NOT pull or rebase.

---

## Coder convention

- Touch ONLY `src/lib/components/assessment/AdditionalsTab.svelte`.
- No formatter sweeps, no "while I'm here" cleanups.
- No new dependencies.
- Stop after step 7. Orchestrator handles git.
