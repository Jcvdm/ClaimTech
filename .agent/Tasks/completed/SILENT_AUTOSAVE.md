# Silent Autosave — Drop Full-Tab Blur for Routine Line-Item Saves

**Created**: 2026-04-27
**Status**: In Progress
**Complexity**: Small (1 file, ~6 edits)
**Branch**: `claude/confident-mendel`
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

`EstimateTab.svelte` has two blocking overlays gated on `recalculating || saving`:
- Line 958 — outer wrapper `pointer-events-none space-y-6 blur-sm` blurs the whole tab
- Lines 1983-1994 — centered "Saving…/Recalculating…" modal with `bg-white/40 backdrop-blur-sm`

Both fire on **every debounced save** because `saving = true` is set on every `saveAll()` call. When engineers type fast in description fields, the 1s debounce triggers a save → full tab blurs and locks for the network round-trip → fast-typing workflow is interrupted.

`AdditionalsTab.svelte` has no blur overlays — already silent. Don't touch it.

The fix: drop the blur for routine `saving`, keep it only for `recalculating` (rates change → all line-item totals recompute, brief, deliberate, justified). Drop in the existing `SaveIndicator` component for subtle inline feedback.

---

## Files to modify (1)

`src/lib/components/assessment/EstimateTab.svelte`

---

## Edits (6 total)

### 1. Drop blur on routine save (line 958)

```svelte
<!-- BEFORE -->
<div class={recalculating || saving ? 'pointer-events-none space-y-6 blur-sm' : 'space-y-6'}>

<!-- AFTER -->
<div class={recalculating ? 'pointer-events-none space-y-6 blur-sm' : 'space-y-6'}>
```

### 2. Drop centered overlay on routine save (line 1983)

```svelte
<!-- BEFORE -->
{#if recalculating || saving}
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
    <div class="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow">
      <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
      <span class="text-sm font-medium text-gray-700">{saving ? 'Saving…' : 'Recalculating…'}</span>
    </div>
  </div>
{/if}

<!-- AFTER -->
{#if recalculating}
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
    <div class="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow">
      <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
      <span class="text-sm font-medium text-gray-700">Recalculating…</span>
    </div>
  </div>
{/if}
```

(Drop the ternary — only one label needed now.)

### 3. Add SaveIndicator import (top of `<script>`)

Add to existing imports:
```ts
import SaveIndicator from '$lib/components/ui/save-indicator/SaveIndicator.svelte';
```

(Verify path with `ls src/lib/components/ui/save-indicator/` — `SaveIndicator.svelte` and `index.ts` both exist. The `index.ts` may export it, in which case `import { SaveIndicator } from '$lib/components/ui/save-indicator';` works too. Use whichever style matches the rest of the file's imports.)

### 4. Add `justSaved` state + effect to drive the "Saved" tick

In the `<script>` near the other `let *= $state(...)` declarations:
```ts
let justSaved = $state(false);
let justSavedTimeout: number | null = null;

$effect(() => {
  // Trigger "Saved" tick when saving transitions true → false (success path)
  // Note: saveAll throws on error and skips dirty=false, so the "saved → !dirty" combo
  //       only happens on successful saves
  if (!saving && !dirty && justSavedTimeout === null) {
    // Only show "Saved" if we WERE saving recently — otherwise it'd flash on initial mount
    // Use a small flag set inside saveAll() success path, OR check via a savedAt timestamp
  }
});
```

Actually use a simpler approach: hook into the save success path directly. Find `saveAll()` (around line 198). After the existing `dirty = false;` line (around 230), add:
```ts
justSaved = true;
if (justSavedTimeout) clearTimeout(justSavedTimeout);
justSavedTimeout = window.setTimeout(() => {
  justSaved = false;
  justSavedTimeout = null;
}, 2000);
```

And in the existing `onDestroy` / cleanup effect (around line 932), clear the timeout:
```ts
if (justSavedTimeout) {
  clearTimeout(justSavedTimeout);
  justSavedTimeout = null;
}
```

### 5. Render SaveIndicator in the line-items header

Find the line-items Card header where the `Unsaved` pill is rendered. Pattern is:
```svelte
{#if dirty}
  <span class="ml-2 inline-flex items-center rounded-full border border-warning-border bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
    Unsaved
  </span>
{/if}
```

Add right after the `{/if}` closing the Unsaved pill:
```svelte
<SaveIndicator {saving} saved={justSaved} class="ml-2" />
```

`SaveIndicator` already handles its own visibility — renders nothing when `!saving && !saved && !error`. So when neither flag is true, it's invisible. Good.

### 6. Verify the manual "Save Progress" button still works

The "Save Progress" button at line 1878 currently has `disabled={saving || !dirty}` and shows `{saving ? 'Saving...' : 'Save Progress'}`. KEEP this — the button-level loading is correct for a deliberate user action. Do NOT change.

---

## Files NOT to touch

- `AdditionalsTab.svelte` — already silent, no blur to remove.
- `SaveIndicator.svelte` — use as-is.
- The Save Progress button — its existing button-level loading is correct.
- The Rates dialog flow — `recalculating` overlay stays (heavy operation, justified).
- Document generation modal — its own thing, unchanged.
- `package.json` — no new dependencies.

---

## Existing utilities to reuse

- **`SaveIndicator`** (`src/lib/components/ui/save-indicator/SaveIndicator.svelte`) — already supports `saving`/`saved`/`error` props and renders nothing in idle state.
- **Existing `Unsaved` pill** in the line-items header — keep as-is, just add SaveIndicator next to it.
- **Existing `saving` flag** + **`saveAll()`** function — drive SaveIndicator's `saving` prop directly.

---

## Implementation steps (in order)

1. Apply edit 1 (line 958 — drop blur on routine save).
2. Apply edit 2 (line 1983 — drop centered overlay on routine save, simplify label).
3. Apply edit 3 (import SaveIndicator).
4. Apply edit 4 (add `justSaved` state + timer in saveAll success path + cleanup).
5. Apply edit 5 (render SaveIndicator in header next to Unsaved pill).
6. Verify edit 6 (Save Progress button untouched).
7. Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -10`. Must be 0 errors.
8. **STOP.** Do NOT commit. Do NOT push. Do NOT `git pull`. Orchestrator handles git.

---

## Verification (orchestrator + user, on Vercel preview)

1. **Type fast in description fields** — type continuously across multiple line items. Tab never blurs. No focus interruption. Engineers can type at "spreadsheet speed."
2. **Watch the header** during a save — `Unsaved` pill visible while typing, `⟳ Saving...` indicator appears briefly, then `✓ Saved` for ~2s, then idle.
3. **Trigger a rates change** (open Rates dialog → change labour rate → apply) — full tab blurs briefly with "Recalculating…" overlay (this is the kept behavior, expected).
4. **Save Progress button** — still works as today, button shows "Saving..." spinner during click.
5. **Network failure** — disable network in DevTools, edit a line, wait for debounce. SaveIndicator should show "Save failed" in red. (May require also passing `error` prop — check existing error handling in `saveAll`.)
6. **`svelte-check`** — 0 errors, no new warnings on touched file.

---

## Risks / things to watch

- **`justSaved` 2s timer flicker** — if user saves twice in quick succession (rapid debounces), the "Saved" indicator may flash twice. The `clearTimeout` in step 4 handles this — second save resets the 2s window.
- **Initial mount** — on first render, `saving=false` and `dirty=false`. No `justSaved=true`. SaveIndicator renders nothing. Good.
- **Save error** — currently `saveAll()` throws on error, so `dirty` stays true and `saving` returns to false. SaveIndicator's `error` prop isn't currently driven. Optional polish: track `saveError = $state(false)` and pass `error={saveError}`. Skip for first cut — the `Unsaved` pill staying visible is already a signal.
- **The `aria-busy={recalculating || saving}`** at line 957 — leaving as-is is OK (more conservative for screen readers). Optional: change to `recalculating` only for consistency.
- **Cross-device race** — orchestrator does `git fetch origin` immediately before push. Coder MUST NOT pull or rebase.

---

## Coder convention

- Touch ONLY `src/lib/components/assessment/EstimateTab.svelte`.
- No formatter sweeps, no "while I'm here" cleanups.
- No new dependencies.
- Stop after step 8. Orchestrator handles git.
