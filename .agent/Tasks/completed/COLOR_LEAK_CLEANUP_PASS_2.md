# Color Leak Cleanup — Pass 2 (action buttons + small text spans)

**Created**: 2026-04-27
**Status**: In Progress
**Complexity**: Tactical (2 files, 8 small edits)
**Branch**: `claude/confident-mendel`
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

The first color cleanup pass (`0c1c5a2`) flipped status badges and container backgrounds in Additionals/FRC/Rates/Notes/DocumentCard. It explicitly left action-button text colors and a few inline text spans alone because they weren't on the original list. The recent `a0b03f0` "widen line items workbench" commit didn't touch these either.

This pass cleans up the remaining action-button + inline-text raw colors in `EstimateTab` and `AdditionalsTab` to make those two components fully token-driven, matching the rest of the assessment routes.

**NOT in scope** — the same semantic colors flagged in pass 1 stay alone:
- "Net Amount Payable" `text-green-600/800`, "Less: Excess" `text-orange-600/700` (money-in vs deduction)
- EstimateTab Total (Inc VAT) threshold-based colors (red/orange/yellow/green/blue based on assessment value vs retail threshold)
- AdditionalsTab Rates Mismatch yellow warning card (intentional `border-2` visual weight, lines 647-732)
- The big colored "Total" 2xl number at EstimateTab:1857 — semantic call needed before flipping

---

## Files to modify (2)

### `src/lib/components/assessment/EstimateTab.svelte` (2 edits)

| Line | Current | Replace with | Why |
|---|---|---|---|
| 1500 | `class="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"` (Delete line item button, ghost variant) | `class="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"` | Action-button color → token. `hover:bg-destructive/10` is a 10% opacity destructive wash, gives the same "light red on hover" feel without raw colors. |
| 1917 | `<RefreshCw class="h-6 w-6 animate-spin text-blue-600" />` (loading overlay spinner) | `<RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />` | Spinner shouldn't carry semantic meaning; muted-foreground is the standard "decorative spinner" tone. |

### `src/lib/components/assessment/AdditionalsTab.svelte` (6 edits)

| Line | Current | Replace with | Why |
|---|---|---|---|
| 992 | `? 'text-red-600 line-through'` (removed item description) | `? 'text-destructive line-through'` | Removed = destructive token; line-through preserved. |
| 1011 | `<p class="mt-1 text-xs text-red-600">Declined: {item.decline_reason}</p>` | `<p class="mt-1 text-xs text-destructive">Declined: {item.decline_reason}</p>` | Decline reason text → destructive token. |
| 1203 | `class="h-7 px-2 text-red-600"` (Delete button, ghost variant) | `class="h-7 px-2 text-destructive hover:bg-destructive/10"` | Delete action → destructive token. Adds the matching hover wash to keep the ghost variant feeling responsive. |
| 1210 | `class="h-7 px-2 text-orange-600"` (Reverse button, outline variant) | `class="h-7 px-2 text-warning hover:bg-warning/10"` | Reverse = warning token (amber, "are you sure" energy). |
| 1217 | `class="h-7 px-2 text-green-600"` (Reinstate-declined button, outline variant) | `class="h-7 px-2 text-success hover:bg-success/10"` | Reinstate = success token (green, positive action). |
| 1224 | `class="h-7 px-2 text-green-600"` (Reinstate-original button, outline variant) | `class="h-7 px-2 text-success hover:bg-success/10"` | Same — reinstate = success. |

---

## Files NOT to touch

- `src/app.css` — no token changes needed; using existing `--destructive`, `--warning`, `--success`, `--muted-foreground` vars.
- `package.json` / `package-lock.json` — no new dependencies.
- Any other assessment file — out of scope for this pass.
- Lines/regions explicitly listed in the "NOT in scope" section above — leave them alone.

---

## Implementation steps

1. **Open `EstimateTab.svelte`**, navigate to lines 1500 and 1917, apply the two edits per the table.
2. **Open `AdditionalsTab.svelte`**, apply the 6 edits per the table. Note: line numbers may drift slightly between read and edit; use the exact `class="..."` strings from the "Current" column to find the targets.
3. **Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`** — must be 0 errors. Report any new warnings on touched files.
4. **Verify `git diff --stat`** touches ONLY the 2 files listed above (plus possibly `.claude/settings.local.json` which is pre-existing modified).
5. **Report back** with: every file modified, svelte-check tail, confirmation `package.json` is unchanged.
6. **STOP** — no commit, no push, no `git pull`. Orchestrator handles git.

---

## Verification (orchestrator + user, on Vercel preview)

After commit + push, on the Vercel preview URL for `claude/confident-mendel`:

1. **Estimate tab**:
   - Hover the per-row delete (trash) button on the right of any line — light destructive wash, icon stays in destructive token color.
   - Trigger a save/recalculate to see the loading overlay spinner — should be neutral muted-foreground, no longer blue.

2. **Additionals tab** (needs an assessment with a finalized estimate + some additional line items):
   - Removed original line — description text shows in destructive color with strikethrough (was red, looks the same — just token-driven now).
   - Declined line with reason — "Declined: {reason}" text in destructive color.
   - Per-row buttons on the right:
     - **Delete** (trash icon, on pending lines) — destructive color + soft hover wash
     - **Reverse** (undo icon, on approved lines) — warning amber + soft hover wash
     - **Reinstate** (rotate-ccw icon, on declined lines OR removed-original lines) — success green + soft hover wash

3. **No regression** — all existing approve/decline/reverse/reinstate workflows still function. Status badges (set in pass 1) untouched. The Rates Mismatch yellow warning banner still has its full yellow treatment intact.

---

## Risks / things to watch

- **`text-destructive` is a foreground token, NOT a background**. The `hover:bg-destructive/10` syntax uses Tailwind's slash-opacity feature on the `--destructive` CSS var — should resolve correctly in Tailwind v4 with `@theme inline`. If for any reason the slash-opacity doesn't compute on a CSS var, the fallback is `hover:bg-destructive-soft` (which is a defined token in app.css). Coder: if the slash-opacity syntax produces a build error or visually doesn't render, switch to `hover:bg-destructive-soft` / `hover:bg-warning-soft` / `hover:bg-success-soft` and report.
- **Reinstate vs. Reverse semantics** — Reverse undoes a prior decision (warning amber, "this needs attention"); Reinstate restores something that was declined or removed (success green, "back to good"). The mapping above respects this semantic split — don't accidentally swap them.
- **Line numbers may drift** between the `Read` you do at the start and the `Edit` you apply. Use the exact `class="..."` string matching from the table above; the surrounding context (`Delete`/`Reverse`/`Reinstate` titles, button variant, button content) makes the targets unambiguous.
- **Cross-device race** — orchestrator handles `git fetch` immediately before push. Coder MUST NOT pull or rebase.
