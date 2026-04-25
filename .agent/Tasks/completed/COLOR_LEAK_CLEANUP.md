# Color Leak Cleanup — Assessment Routes

**Created**: 2026-04-25
**Status**: In Progress
**Complexity**: Moderate (~10 files, mostly mechanical 1-2 line edits)
**Branch**: `claude/confident-mendel`
**Reference pattern**: Mac's commit `f1731ad` (process/part-type badges in EstimateTab)
**Coder must NOT run any `git pull`/`git fetch --autostash`** — orchestrator handles git.

---

## Context

The style upgrade (Phase 1 → 8) replaced most hardcoded Tailwind colors with token-driven `Badge` variants and CSS variables. Mac's `f1731ad` migration covered process types and part types in EstimateTab, but several files still leak raw `bg-blue-100`, `text-blue-600`, `bg-green-100`, `bg-yellow-100`, `bg-orange-50`, `border-orange-300` etc. This sweep cleans the in-scope leaks listed in the handoff's "Outstanding work (deferred)" section.

---

## In scope — flip to tokens

| File | Pattern → Replacement |
|---|---|
| `src/lib/components/assessment/AdditionalsTab.svelte` | Status badge function (approved/pending/declined): `bg-green-100 text-green-800` → `<Badge variant="success">`, `bg-yellow-100 text-yellow-800` → `<Badge variant="warning">`, `bg-red-100 text-red-800` → `<Badge variant="destructive-soft">`. The 5 click-to-edit cells with `text-blue-600` → `text-foreground` (no longer blue) and `border-blue-300` (hover border) → `border-border-strong`. |
| `src/lib/components/assessment/FRCLinesTable.svelte` | Same status badge mapping (Agreed/Adjusted/Declined): green-100/yellow-100/red-100 → success/warning/destructive-soft Badge variants. |
| `src/lib/components/assessment/FRCLineCard.svelte` | Same status badge mapping. |
| `src/lib/components/assessment/AdditionalLineItemCard.svelte` | Same status badge mapping. Card state borders for "removed" / "reversal" / "approved" (`border-red-200 bg-red-50`, `border-blue-200 bg-blue-50`, `border-green-200 bg-green-50`) → keep the semantic intent but use tokens: removed → `border-destructive-border bg-destructive-soft`, reversal → `border-border-strong bg-muted` (info-soft is too blue), approved → `border-success-border bg-success-soft`. The click-to-edit `text-blue-600` → `text-foreground`. |
| `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte` | Diff badges: `bg-red-100 text-red-800` (removed) → `<Badge variant="destructive-soft">`; `bg-green-100 text-green-800` (added) → `<Badge variant="success">`. Container `bg-red-50 border-red-200` (removed section) → `bg-destructive-soft border-destructive-border`; `bg-blue-50 border-blue-200` (removed-total panel) → `bg-muted border-border-strong`. |
| `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte` | Container `border-blue-200 bg-blue-50` → `border-border bg-muted`. Hover `bg-blue-100` → `bg-accent`. Icon `text-blue-600` → `text-muted-foreground`. Success message `bg-green-50 border-green-200 text-green-800` → `bg-success-soft border-success-border text-success`. Warning message `bg-yellow-50 border-yellow-200 text-yellow-...` → `bg-warning-soft border-warning-border text-warning`. |
| `src/lib/components/assessment/RatesConfiguration.svelte` | Same patterns as RatesAndRepairerConfiguration. |
| `src/lib/components/assessment/AssessmentNotes.svelte` | Container `border-blue-200 bg-blue-50/50` → `border-border bg-muted`. Hover `bg-blue-100/50` → `bg-accent`. Icon `text-blue-600` → `text-muted-foreground`. |
| `src/lib/components/assessment/DocumentCard.svelte` | Print button `border-orange-300 bg-orange-50 hover:bg-orange-100` → `<Button variant="outline">` with default tokens. The "info" section `bg-orange-50 border-orange-200` → `bg-muted border-border-strong` (the print warning isn't important enough for warning amber). |

---

## NOT in scope (semantic, leave alone, or out-of-scope)

These intentionally use raw colors as semantic signals — DO NOT FLIP without user review:

- **`EstimateTab.svelte`** "Net Amount Payable" `text-green-800` / "Less: Excess" `text-orange-700` (lines ~1850-1851). Money-in / deduction signal.
- **`FRCTab.svelte`** "Net Amount Payable" `text-green-800` / "Less: Excess" `text-orange-700` (lines ~962-963). Same.
- **`EstimateTab.svelte`** Total (Inc VAT) row threshold-based colors (lines ~1732-1851) — `text-red-600` / `text-orange-600` / `text-yellow-600` / `text-green-600` / `text-blue-600` based on assessment value vs threshold. Semantic over/under signal — needs separate user review before any change.
- **`FRCTab.svelte`** status cards `bg-green-50 border-green-200`, `bg-blue-50 border-blue-200`, `bg-purple-50 border-purple-200` for FRC stages — multi-state semantic, leave alone in this sweep (separate "FRC color review" task if user wants).
- **`AdditionalsTab.svelte` line ~1223** Yellow configuration display text — pre-existing pattern, leave alone unless it's clearly a status badge.
- **`AdditionalsTab.svelte` lines ~782-1223** Error cards `bg-red-50 border-red-400`, info cards `bg-blue-50 border-blue-400` — these are Alert-style banners with thicker borders. Coder: REVIEW each callsite. If it's a generic "info" banner, flip to `bg-muted border-border-strong`. If it's an "error" banner, flip to `bg-destructive-soft border-destructive-border`. If unclear, leave alone and report back.
- **`EstimateTab.svelte`** Loading spinner `text-blue-600` — flip to `text-muted-foreground` (this IS in scope, just listed here as a callout in case the coder spots it).

---

## Files NOT to touch

- `src/app.css` — tokens already correct.
- Any file outside `src/lib/components/assessment/`.
- `package.json` / `package-lock.json` — no new dependencies.
- Files Mac already migrated in `f1731ad` (EstimateTab process/part-type badges, LineItemCard, processTypes.ts).

---

## Implementation steps

1. **Read each in-scope file** (10 files). For each, find the raw-color class strings via Grep + read the surrounding 3-5 lines for context.
2. **Apply the mappings** in the table above. Most edits are a single class-string swap or replacing inline `<span class="bg-X text-Y px-2 py-0.5 rounded">…</span>` patterns with `<Badge variant="…">`. Import `Badge` from `$lib/components/ui/badge` if not already imported.
3. **Spot-check the AdditionalsTab error/info cards** (lines ~782-1223) and decide per-callsite whether to flip or leave. Document any "left alone" decision in the coder's final report.
4. **Run `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`** — must be 0 errors. Report any new warnings on touched files.
5. **Verify `git diff --stat` touches ONLY the files listed above** + maybe the `Badge` import line being added in some files. No formatter sweeps.
6. **Report back** with: files modified, svelte-check tail, any "left alone" decisions, confirmation `package.json` is untouched.
7. **STOP** — no commit, no push, no `git pull`. Orchestrator handles git.

---

## Verification (orchestrator + user, on Vercel preview)

1. **Additionals tab** of an assessment: status badges (approved/pending/declined) use the design tokens (success/warning/destructive-soft) — no raw greens/yellows/reds.
2. **FRC tab**: status badges in the line table use tokens. "Net Amount Payable" stays green (semantic, intentional).
3. **Rates configuration / AssessmentNotes**: hover/borders are now neutral instead of light-blue.
4. **Document card**: print button is a plain outline button instead of orange.
5. **No regression**: every screen still readable, all state distinctions still visible.
