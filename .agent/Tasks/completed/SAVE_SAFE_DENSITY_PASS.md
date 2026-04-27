# Save-Safe Line Items Density Pass

**Created**: 2026-04-27
**Status**: In Progress
**Complexity**: Moderate (2 files, save-state-machine work + density tighten)
**Branch**: `claude/confident-mendel`
**Approved plan**: `C:\Users\Jcvdm\.claude\plans\lets-take-it-step-witty-glacier.md`
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

Five verified bugs in `EstimateTab.svelte` and `AdditionalsTab.svelte` (post `9e1abbf`):

1. Per-row cost cell double-save (`onkeydown` Enter AND `onblur` both call `handle*Save`)
2. `flushUpdate` is a misnomer in EstimateTab (identical to `scheduleUpdate`, both just queue debounce)
3. `handleLocalUpdateRates` clears `dirty` without flushing pending edits → data loss possible
4. AdditionalsTab cost handlers clear temp state AFTER `await updatePending()` → race
5. AdditionalsTab lifecycle handlers (approve/decline/delete/reverse/reinstate) have no concurrency guard

Plus: long descriptions truncate inside the single-line `<Input>` cell.

**User-locked decisions** (from clarification questions during planning):
- **Cost cells** → mirror skeleton-row pattern (Enter triggers `e.currentTarget.blur()`, blur is single save handler). Same as Excel/Sheets/Notion.
- **Description** → fix `flushUpdate` AND switch Input → Textarea (`rows={2}`).
- **AdditionalsTab race** → small serial mutation queue.

**NOT changing**: bottom-sticky strip, mobile cards, services, AdditionalsTab pending-vs-span swap, formatters.

---

## Files to modify (2)

- `src/lib/components/assessment/EstimateTab.svelte`
- `src/lib/components/assessment/AdditionalsTab.svelte`

---

## Phase A — Save-safety (commit 1)

### A1. EstimateTab — `flushUpdate` actually flushes

`EstimateTab.svelte:578-583` currently has `flushUpdate` identical to `scheduleUpdate` (both call `handleUpdateLineItem` which schedules debounce). Change to:

```ts
async function flushUpdate(id: string, field: keyof EstimateLineItem, value: any) {
  handleUpdateLineItem(id, field, value);
  await saveNow();   // saveNow() at line 189 already clears the debounce + awaits saveAll
}
```

`scheduleUpdate` stays as-is.

### A2. EstimateTab — `handleLocalUpdateRates` flushes pending edits first

In `handleLocalUpdateRates()` at lines 890-928, add `await saveNow()` at the very top before any rate mutation. Pending debounced line edits flush first; rate change applies on a clean baseline.

### A3. EstimateTab cost cells — Enter triggers blur, blur is single save handler

5 cost cells (Part Price ~1356, S&A ~1386, Labour ~1415, Paint ~1444, Outwork ~1473). Currently:
```svelte
onkeydown={(e) => {
  if (e.key === 'Enter') handlePartPriceSave(item.id!, item);   // path 1
  if (e.key === 'Escape') handlePartPriceCancel();
}}
onblur={() => handlePartPriceSave(item.id!, item)}              // path 2 — race
```

Change every cost cell's `onkeydown` Enter branch to:
```svelte
onkeydown={(e) => {
  if (e.key === 'Enter') e.currentTarget.blur();   // Enter triggers blur
  if (e.key === 'Escape') handlePartPriceCancel();
}}
onblur={() => handlePartPriceSave(item.id!, item)}              // single save path
```

Apply to ALL 5 cost cells (each has its own `handle*Save` and `handle*Cancel`). Esc still cancels (synchronous, no save).

This mirrors the proven pattern at `EstimateTab.svelte:1576-1578` (skeleton row).

### A4. AdditionalsTab cost cells — same Enter→blur + temp-state-before-await

5 cost cells in AdditionalsTab desktop table (around lines 1068-1182). Same Enter→blur change as A3.

PLUS: since the AdditionalsTab handlers `await updatePending()` (real async work), update each handler at lines 199-273 to clear temp state at the TOP, before the await:

```ts
async function handleSASave(id: string) {
  if (tempSAHours === null) return;
  const valueToSave = tempSAHours;
  editingSA = null;     // clear FIRST so a re-entry is a no-op
  tempSAHours = null;
  await updatePending(id, { strip_assemble_hours: valueToSave });
}
```

Apply to all 5 (`handlePartPriceSave`, `handleSASave`, `handleLabourSave`, `handlePaintSave`, `handleOutworkSave`).

### A5. AdditionalsTab — serial mutation queue

Add at top of `<script>`:
```ts
// Serial queue — guarantees Additionals service writes happen in click order
let mutationQueue: Promise<void> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(fn);
  mutationQueue = result.then(() => undefined, () => undefined); // catch keeps queue alive
  return result;
}
```

Wrap calls into `additionalsService.*`:
- `updatePending` body — wrap in `enqueue(...)`
- `handleApprove` — wrap the approve service call
- `handleDecline` — wrap the decline service call
- `handleDelete` — wrap the delete service call
- The reverse/reinstate modal-confirm callback — find it (search for `additionalsService.reverseLineItem` / `reinstateLineItem`) and wrap
- `handleAddLineItem` (quick-add) — wrap

**Critical**: errors must still bubble to callers. The internal `.catch(() => undefined)` is for KEEPING THE QUEUE ALIVE across failures — the original returned promise still rejects normally. The existing `error` $state banner UI must continue working. Verify by reasoning: `enqueue(fn)` returns `result = mutationQueue.then(fn)` — the .catch happens on a DIFFERENT promise (`mutationQueue = ...`), so `result` rejects normally if `fn` throws.

---

## Phase B — Description multi-line + Card density (commit 2)

### B1. EstimateTab — description Input → Textarea

`EstimateTab.svelte:1331-1340`:
```svelte
<Table.Cell class="px-3 py-2 align-top">
  <Textarea
    placeholder="Description"
    value={item.description}
    oninput={(e) => scheduleUpdate(item.id!, 'description', e.currentTarget.value)}
    onblur={(e) => flushUpdate(item.id!, 'description', e.currentTarget.value)}
    rows={2}
    class="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-pre-wrap break-words text-sm"
  />
</Table.Cell>
```

Apply same change to skeleton row description input at line ~1570 (bound to `skeletonDescInput`). Keep its existing `onkeydown` (Enter→blur) which now matches A3.

Add import: `import { Textarea } from '$lib/components/ui/textarea';`. Verify path with `ls src/lib/components/ui/textarea/` first. If missing, fall back to native `<textarea>` with the same classes — but it should exist (standard shadcn).

### B2. AdditionalsTab — description Input → Textarea (pending branch only)

In the conditional swap, the `pending` branch renders `<Input>`; change ONLY that branch to `<Textarea>` with the same props as B1. The non-pending `<span>` branch stays unchanged (already wraps via normal text rendering).

### B3. Card density tighten — both files

Both files have `<Card class="p-2 sm:p-3">` wrapping the line items table (post `cf5f321`). Change to `<Card class="p-0">` with header-only padding so the table sits edge-to-edge:

```svelte
<Card class="p-0">
  <!-- Header: title + count + buttons (gets its own padding) -->
  <div class="px-3 sm:px-4 py-3 border-b border-border">
    <h3 ...>Line Items <span class="font-mono-tabular ...">({count})</span></h3>
    <div class="flex flex-wrap gap-2"> ...buttons... </div>
  </div>

  <!-- Mobile cards: keep p-3 inside so cards aren't flush -->
  <div class="space-y-3 md:hidden p-3"> ...mobile cards... </div>

  <!-- Desktop table: edge-to-edge inside Card border -->
  <div class="hidden md:block">
    <Table.Root class="table-fixed"> ... </Table.Root>
  </div>
</Card>
```

### B4. Column width rebalance — both files

EstimateTab desktop columns (post `cf5f321`): Checkbox 40 + Type/Part 112 + Description (flex) + Costs 380 + Betterment 44 + Total 96 + Action 52.

Tighten:
- Type/Part: `w-[112px]` → `w-[96px]`
- Costs: `w-[380px]` → `w-[340px]`
- Total: `w-[96px]` → `w-[88px]`
- Action: `w-[52px]` → `w-[44px]`

Net: ~80px more for Description column.

**Verify the inner 5-cell Costs grid still fits** — each cell needs ~60px minimum (mono-tabular 6-7-digit number + 1-2px borders + 1px gap). 5×60 + 4×4 gap + 2×6 padding ≈ 328px. Should fit at 340. If visually cramped, fall back to `w-[360px]`.

Apply matching widths in AdditionalsTab equivalent columns.

---

## Files NOT to touch

- `src/lib/utils/formatters.ts` — unchanged.
- The bottom-sticky totals strip — exactly as-is.
- `CombinedTotalsSummary.svelte` — unchanged.
- `additionalsService` and any service layer — unchanged. Mutation queue is UI-level.
- Mobile card layouts (`LineItemCard.svelte`, `AdditionalLineItemCard.svelte`) — desktop-focused pass.
- AdditionalsTab pending-vs-span swap (lifecycle-state driven, intentional).
- `package.json` — no new dependencies.

---

## Existing utilities to reuse

- **`saveNow()`** at `EstimateTab.svelte:189` — flush function for A1, A2.
- **Skeleton row Enter→blur pattern** at `EstimateTab.svelte:1576-1578` — proven model for A3, A4.
- **`Textarea`** from `$lib/components/ui/textarea` — standard shadcn primitive for B1, B2.

---

## Implementation order

1. **Phase A first.** All 5 fixes (A1-A5). Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -10` after each file.
2. **Phase B second.** B1+B2 (Textarea swap), then B3 (Card padding), then B4 (column rebalance).
3. **Mid-phase svelte-check** between A and B is optional but recommended.
4. **STOP after Phase B is complete.** Do NOT commit, do NOT push. Orchestrator will commit Phase A + Phase B as TWO separate commits.

---

## Verification (orchestrator + user, on Vercel preview after push)

### Phase A — save-safety

1. **EstimateTab cost cell** — focus a cost cell, type a value, press Enter. Network tab shows ONE save request, not two. Same on Tab away (blur).
2. **EstimateTab description blur** — edit a description, immediately Tab away. Refresh. Value persists.
3. **EstimateTab description + rate change** — edit a description, immediately open Rates dialog, change labour rate, save. Refresh. Both persist.
4. **AdditionalsTab cost cell Enter+blur** — same as #1 in Additionals.
5. **AdditionalsTab rapid lifecycle spam** — approve A, decline B, delete C in rapid succession. All complete in click order.
6. **AdditionalsTab cost edit + immediate approve** — edit a pending line, immediately click Approve on the same item. Both persist.

### Phase B — density

7. **Long description visibility** — "Rear bumper assembly with mounting brackets" wraps to 2 lines.
8. **Short description** — 1-word description fits without absurd row height.
9. **Card density** — table sits edge-to-edge inside the Card border; only header bar above has padding.
10. **No horizontal table scroll** — at 1920×1080, both Estimate and Additionals fit.
11. **Mobile card view** — unchanged.
12. **`svelte-check`** — 0 errors, no new warnings on touched files.

---

## Risks / things to watch

- **`flushUpdate` becomes async** — adds <100ms wait on description blur. If feels bad, swap `await saveNow()` for `void saveNow()` (fire-and-forget — debounce still cleared, just no UI wait).
- **Mutation queue error handling** — see A5 critical note. Original returned promise must still reject; `error` $state banner must still work.
- **Textarea Enter behavior** — Enter inserts a newline by default. If user reports they want Enter to commit instead, add `onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}` so Enter blurs (commits) and Shift+Enter inserts a newline.
- **Skeleton row Textarea ref** — `bind:ref={skeletonDescInput}` should work on Textarea (Svelte refs are element-agnostic), but verify.
- **Card `p-0`** — may surface previously-hidden border alignment. Check on Vercel.
- **Cross-device race** — orchestrator handles `git fetch` immediately before push. Coder MUST NOT pull or rebase.

---

## Coder convention

- Touch ONLY the 2 files: `src/lib/components/assessment/EstimateTab.svelte`, `src/lib/components/assessment/AdditionalsTab.svelte`.
- No formatter sweeps, no "while I'm here" cleanups.
- No new dependencies.
- Stop after Phase B. Orchestrator handles git in two commits.
