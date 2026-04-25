# Style Upgrade — Cross-Device Handoff

**Purpose**: Portable resume doc. Checked into the repo so another Claude Code instance on another machine can pull this branch and pick up exactly where work stopped.

**Last updated**: 2026-04-25 (Windows session — 8a step rail + scroll fix + color cleanup + sync pill + damage two-pane all shipped)
**Active branch**: `claude/confident-mendel`
**Remote**: `origin` (github.com/Jcvdm/ClaimTech.git)
**HEAD**: `dd712b8`

---

## 🚀 How to resume on another device

```bash
# 1. Clone or pull
git clone https://github.com/Jcvdm/ClaimTech.git
cd ClaimTech
git fetch origin
git checkout claude/confident-mendel
git pull origin claude/confident-mendel

# 2. Install dependencies
npm install

# 3. Open in Claude Code / your editor

# 4. Point the new Claude instance at this file first:
#    .agent/Tasks/active/STYLE_UPGRADE_HANDOFF.md
```

Then tell the new Claude: **"Read `.agent/Tasks/active/STYLE_UPGRADE_HANDOFF.md` and resume the style upgrade work. Don't run `npm run dev` locally — user's local is slow. Push to `claude/confident-mendel` and review on Vercel preview."**

---

## 📍 Current commit chain on `claude/confident-mendel`

As of 2026-04-25 (Windows session):

```
dd712b8  style(damage): two-pane DamageTab + sticky DamageSummaryCard — Phase 8b   ← HEAD
8e3708a  feat(sync): compact topbar pill replaces full-width offline banner
0c1c5a2  style(badges): flip remaining raw-Tailwind status colors to tokens
5093618  docs(handoff): record scroll fix, move task to completed
27ddf43  fix(scroll): one natural page scroll on assessment routes
c062dcd  docs(handoff): mark Phase 8a shipped, move task to completed
e785468  style(assessment): Phase 8a — replace horizontal tabs with step rail
cefd93e  feat(validation): expose totalFields on TabValidation
72092ad  docs(handoff): update with Mac session — Phases 7a/7b, 8b, 8d, 8e + square + badge tokens
f1731ad  style(badges): process + part type badges to Phase 1 tone tokens
fd8a4f9  feat(estimate): permanent skeleton add row — Phase 8e
64a20b4  style(radius): square pass — tighten radius + drop card shadow
13f8f95  style(estimate): utilitarian retune on editable line tables — Phase 8d
466027d  style(estimate): two-pane layout + QuickAdd behind dialog — Phase 8b
3dce459  style(tabs): add done/pending step icons to assessment rail — Phase 7b   [SUPERSEDED by 8a]
4b776e8  style(tabs): assessment nav to utilitarian underline — Phase 7a           [SUPERSEDED by 8a]
14d0b37  docs(handoff): cross-device resume doc for style upgrade
35fdeb1  style(typography): Phase 5 — form density + mono-tabular
1889426  style(chrome): Phase 6 — sidebar + topbar compaction
2af6164  fix(scroll): disable View Transitions + reset body-style locks
ef9453f  style(tokens): Phase 1.5 monochrome retune + refs → brand
bb3d5bc  style(table): Phase 4 — ModernDataTable + TableCell migration
eb81479  style(badges): Phase 3 — deprecate GradientBadge → Badge tones
e5312bb  style(cleanup): Phase 2 decorative sweep — rose/gradient/shadow
411c967  style(tokens): Phase 1 token retune + Button/Badge variants
217d2c7  refactor(loading): Loading UX Modernization (on main)
```

Everything from 411c967 forward is the style upgrade. `origin/main` is at 217d2c7 — the style work lives on the preview branch, not production.

## What shipped in the 2026-04-25 Windows session (Phase 8a + scroll fix)

### Color leak cleanup — `0c1c5a2`
Cleans up the deferred raw-Tailwind leaks listed in this handoff. Mirrors Mac's `f1731ad` pattern (process/part-type badges → tokens):
- Status badges across `AdditionalsTab`, `FRCLinesTable`, `FRCLineCard`, `AdditionalLineItemCard`, `OriginalEstimateLinesPanel` → `Badge variant=success/warning/destructive-soft`.
- Card containers in `RatesAndRepairerConfiguration`, `RatesConfiguration`, `AssessmentNotes`, `OriginalEstimateLinesPanel` → token surfaces (`bg-muted border-border`, `bg-success-soft border-success-border`, `bg-warning-soft border-warning-border`).
- `AdditionalLineItemCard` card-state borders for removed/reversal/approved → `bg-destructive-soft border-destructive-border`, `bg-muted border-border-strong`, `bg-success-soft border-success-border`.
- Click-to-edit cells: `text-blue-600` → `text-foreground`/`text-muted-foreground`. Hover borders: `border-blue-300` → `border-border-strong`.
- `DocumentCard` print button: orange → `Button variant="outline"`. Info box: orange → muted.

Left intentionally alone (semantic, separate review needed): EstimateTab/FRCTab "Net Amount Payable" green + "Less: Excess" orange (money-in vs deduction signal); EstimateTab Total (Inc VAT) threshold-based colors (red/orange/yellow/green by assessment value); FRCTab status cards (multi-state); AdditionalsTab Rates Mismatch double-border yellow card (intentional visual weight); AdditionalLineItemCard process-type/part-type badge colors (semantic).

### Sync pill — `8e3708a`
Replaces the fixed full-width `OfflineIndicator` banner (mounted in root `+layout.svelte`) with a compact pill in the `(app)` topbar's right-side actions row. Three states per design-system §"Offline / sync":
- Online + 0 queued → `bg-success-soft` + green tick + "Synced"
- Online + N queued → `bg-warning-soft` + spinner + "Syncing N"
- Offline → `bg-warning-soft` + cloud-off + "Offline · N queued"

New `src/lib/offline/components/SyncPill.svelte` (~80 lines) reads existing reactive plumbing — `networkStatus.isOnline` (singleton runes class) + `syncManager.pendingCount`. No new state machinery. `OfflineIndicator.svelte` left on disk pending an audit of other consumers; `SyncStatus`/`SyncProgress` components untouched. Barrel export added to `$lib/offline`.

### DamageTab two-pane — `dd712b8`
Completes the Phase 8b two-pane intent that Mac applied to `EstimateTab` in `466027d`. Mirrors the same grid pattern: `lg:grid-cols-[minmax(0,1fr)_340px]`, `lg:sticky lg:top-24`, mobile stack via `mt-6 lg:mt-0`. DamageTab is a single-record form (not a line-item list), so the right pane isn't "totals" — it's a new compact `DamageSummaryCard.svelte` that mirrors what the engineer has filled in:
- Match status badge (success/destructive-soft/muted)
- Severity badge with tone per enum (info/warning/destructive-soft for minor/moderate/severe & total_loss)
- Damage area + type
- Estimated repair duration (mono-tabular)
- Required-fields checklist (Match check, Severity) with green ticks / hollow circles

Engineer sees state at-a-glance without scrolling back. Drafts, autosave, validation logic in DamageTab unchanged.

### Scroll fix — `27ddf43`
Users (especially on Firefox) reported assessment pages feeling stuck when wheeling over an inner panel. Root cause: global `.overflow-y-auto { overscroll-behavior: contain; }` rule in `src/app.css` blocked all scroll chaining, combined with 8 inner `max-h-... overflow-y-auto` regions inside assessment `<main>` (estimate table + parts pre, AssessmentNotes, 5 photo grids).

Fix:
- `src/app.css` — replaced the global rule with an opt-in `.scroll-isolate` utility.
- Stripped `max-h-...` + `overflow-y-auto` from EstimateTab desktop table (kept `overflow-x-auto` for wide tables), parts-list `<pre>`, AssessmentNotes list, and the 5 photo grids (Exterior360PhotosPanel, EstimatePhotosPanel, InteriorPhotosPanel, PreIncidentPhotosPanel, AdditionalsPhotosPanel). Panels grow inline; page handles scroll. `bigger-picture` still gives per-photo fullscreen on click.
- Applied `scroll-isolate` to 4 legitimate modal scroll containers (OriginalEstimateLinesPanel Dialog, RatesAndRepairer QuickAdd Dialog, FRC adjust Dialog, Finalize document DialogContent) plus the mobile StepRail SheetContent (bits-ui SheetContent doesn't set `overscroll-behavior` itself).

Scope: assessment routes only. `src/lib/components/assessment/*` + `src/app.css`. 14 files, all surgical 1–2 line edits per file.



User explicitly picked Phase 8a from the roadmap (the proper left-rail rebuild). The Mac session's `7a` underline + `7b` step icons on horizontal tabs were treated as the smaller-step version of the same intent and have been **superseded** by 8a. Mac's other work (8b two-pane EstimateTab, 8d editable table retune, square pass, 8e skeleton row, badge token migration) is unaffected — those touched different files.

### Phase 8a — Step rail (`e785468` + `cefd93e`)
- New components in `src/lib/components/ui/step-rail/`:
  - `StepRing.svelte` — pure SVG 14px ring, three states (complete = filled green + tick, in-progress = arc at proportional fill, not-started = empty `border-strong` outline). Geometry per design-system.md §Step rail (radius 6, circumference 37.7).
  - `StepRailItem.svelte` — row composing `StepRing` + label + optional muted mono missing-count chip; active state `bg-muted` + 2px `border-foreground` left bar.
  - `StepRail.svelte` — container with `role="tablist"` and ArrowDown/ArrowUp + Enter keyboard nav (replaces `Tabs` keyboard behavior we lose).
  - `index.ts` — barrel.
- `AssessmentLayout.svelte` restructured: outer `h-screen overflow-hidden`, sticky header on top (kept), inner flex-row with `<aside class="hidden lg:flex w-[232px]">` + `<main class="flex-1 overflow-y-auto">`. Added hamburger `<Button class="lg:hidden">` in the header actions row that opens a `<Sheet side="left" class="w-[280px]">` containing the same `<StepRail>` for `<lg`. Same `currentTab`/`onTabChange` API as before — parent `+page.svelte` untouched.
- `validation.ts` extended with optional `totalFields?: number` on `TabValidation` and per-validator counts (8 validators) so `StepRing`'s in-progress arc can show `(total - missing) / total`. Non-breaking — older consumers ignore the new field.
- Status derivation: no validation entry → `not-started`; `isComplete: true` → `complete`; otherwise `in-progress` with progress = `(total - missing) / total`.

Removed from AssessmentLayout: horizontal `<Tabs>`/`<TabsList>`/`<TabsTrigger>` block, the `<style>` `scrollbar-hide` global (no longer needed), the `getShortLabel` helper (rail shows full labels), and the destructive missing-count badge (replaced by ring state + muted chip).

Build: `svelte-check` 0 errors, no new warnings. `package.json` unchanged.

---

## What shipped in the 2026-04-23 Mac session (Phases 7 + 8)

Previous session left off at Phase 5 (form density). In this session we:

### Phase 7 — Tab rail upgrade (on-page, not a left rail per user preference)
- **7a** `4b776e8` — Assessment tabs restyled to utilitarian underline. Active tab: 2px foreground bottom border, no pill fill, no shadow. Replaces the filled black pill pattern.
- **7b** `3dce459` — Step icons on each tab: green `Check` (missingCount === 0) or muted `Circle` (pending). Dropped the `destructive-soft` missing-count badge since the icon conveys that.

### Phase 8b — Two-pane EstimateTab + QuickAdd in a dialog
- `466027d` — Line items card LEFT, sticky Totals Breakdown RIGHT at `lg:` and up. Grid cols `minmax(0,1fr) 340px`, sticky totals at `lg:top-24`. Mobile stacks cleanly.
- QuickAddLineItem (403-line card) moved into a `ResponsiveDialog` triggered from the header. Preserves photo capture workflow.

### Phase 8d — Editable table retune (style only)
- `13f8f95` — EstimateTab + PreIncidentEstimateTab + shared LineItemCard. Headers uppercase 11.5px tracking muted. Click-to-edit buttons drop blue → foreground + mono-tabular. Totals Breakdown all currency values mono-tabular. Unsaved pill → warning tokens. User-approved Option 3 (defer EditableLinesTable extraction until a 3rd editable table exists).

### Square pass — shape retune
- `64a20b4` — Card `rounded-xl` (12px) → `rounded-sm` (4px) + dropped `shadow-sm`. Input/Badge also dropped to `rounded-sm`. Cascades through 62 Card callsites. Status banner borders `border-2` → `border`. Matches the wireframe's sharper corners.

### Phase 8e — Permanent skeleton row (Solution D chosen)
- `fd8a4f9` — Replaces the two "+ Add line" buttons on the estimate with a persistent skeleton row at the bottom of the desktop table and a skeleton card on mobile. Type description + blur → row commits, new skeleton appears, focus returns to description (spreadsheet speed at 200-row scale). ResponsiveDialog preserved behind a small Camera icon button for photo-first entry. selectAll excludes skeleton.

### Badge color vocabulary — Phase 1 tone tokens
- `f1731ad` — `getProcessTypeBadgeColor()` flipped from raw `bg-blue-100/bg-green-100/bg-purple-100/bg-yellow-100/bg-orange-100` to token-driven: N/R/P/B → muted; A → warning-soft; O → destructive-soft. Exception process types stand out on review. Part-type badges (OEM/ALT/2ND) in EstimateTab + LineItemCard + skeleton row also flipped: OEM → muted, ALT → success-soft, 2ND → warning-soft. Betterment % button and LineItemCard selected ring also migrated.

## Outstanding work (deferred)

Remaining raw-Tailwind color leaks — same pattern, ready for a follow-up commit:
- `AdditionalsTab.svelte` — status Badges (bg-green-100 / bg-yellow-100 / bg-blue-100) + 5 click-to-edit cells still `text-blue-600`
- `FRCTab.svelte`, `FRCLinesTable.svelte`, `FRCLineCard.svelte` — status/stage badges
- `AdditionalLineItemCard.svelte` — type/status badges
- `OriginalEstimateLinesPanel.svelte` — diff badges (bg-blue-100 / bg-green-100)
- `RatesAndRepairerConfiguration.svelte`, `RatesConfiguration.svelte`, `AssessmentNotes.svelte` — hover states (bg-blue-100) and accent borders (border-blue-200)
- `DocumentCard.svelte` — print button (border-orange-300 bg-orange-50)
- `FRCTab.svelte` + `EstimateTab.svelte` — "Net Amount Payable" `text-green-800` / "Less: Excess" `text-orange-700` (semantic, may be intentional — review before flipping)

Other roadmap items still deferred:
- **8c work queue filter strip** above ModernDataTable (~0.5 day)
- **Sync pill** (OfflineIndicator → compact top-bar pill, ~0.5 day)
- **8g/h/i field routes** (tablet/phone shells + guided photo capture, ~5+ days, needs wireframes fleshed out — `wire/field.jsx` has references, `wire/ios-frame.jsx` too)
- **EditableLinesTable extraction** — ~1–2 days. Only revisit when a 3rd editable table appears or auto-save semantics change.
- **Auth pages dark treatment** — `wire/logins.jsx` is empty in the repo; needs wireframe sharing first.

## Environment notes for cross-device resume

- Repo is SvelteKit + Vite. `.env` required for Supabase. `PUBLIC_SUPABASE_MODE=main` for production DB.
- Dev: `npm install` then `npm run dev`. Server configs in `.claude/launch.json` support ports 5100/5101/5102/4173.
- Mac-specific this session: used `~/.nvm` (Node v24.15.0) + `~/.local/bin/gh` (cli 2.91.0). Windows machine uses its own toolchain — `.claude/launch.json` uses `runtimeExecutable: "npm"` which resolves from PATH on both platforms.
- Wireframe files live at `wire/` (user-local staging, gitignored informally) AND `.agent/Design/wireframes/` (committed copy). The .agent copy is the source of truth for future sessions.

Vercel preview URL: whatever GitHub-integrated URL your Vercel project generates for `claude/confident-mendel`. Check the Vercel dashboard for the exact URL.

---

## 🎯 What's the goal (1-paragraph TL;DR)

Move the ClaimTech app from its previous "crammed marketing-page slate + rose" look to a **utilitarian workshop-tool** direction matching the wireframes in `.agent/Design/wireframes/` (user's canvas). Monochrome-dominant palette with rose as an opt-in brand accent, dense tables, compact sidebar + topbar, mono-tabular numerals for IDs/currency. Spec source of truth: `.agent/Design/design-system.md`. User preference (supersedes spec where they conflict): "focus on black, accent with rose — not blue."

---

## ✅ What's shipped (Phases 1 → 1.5 → 2 → 3 → 4 → 6 → 5)

Note the nonlinear order — Phase 1.5 happened after Phase 4 when user feedback flipped primary blue → black. Phase 6 was done before Phase 5 because chrome compaction is more visible than typography polish.

### Phase 1 — `411c967`
Tokens + Button/Badge variants. `src/app.css` retune (warmer canvas, neutral ink scale), `button.svelte` added `brand` + `xl` + `touch` variants, `badge.svelte` added `muted`/`info`/`success`/`warning`/`destructive-soft` tones.

### Phase 2 — `e5312bb`
Decorative cleanup. Removed hardcoded `rose-*`/`pink-*`/`fuchsia-*` in `(app)` + `(shop)` routes. Removed `bg-gradient-to-*`, `shadow-lg/xl` on data cards, `rounded-2xl/3xl`. Sidebar line 413 slate contrast fix.

### Phase 3 — `eb81479`
GradientBadge deprecation. 49 callsites migrated to `Badge` tones. Photo panels' 28 rose progress bars updated to token-driven colors.

### Phase 4 — `bb3d5bc`
Table density. `ModernDataTable` + `TableCell` retune: header `bg-muted h-9` uppercase 11.5px, data row `h-11 text-[13.5px]`, mono-tabular IDs in first column, selected `bg-accent`.

### Phase 1.5 — `ef9453f`
Monochrome retune. `--primary` flipped from blue (`#1d4ed8`) to black (`#18181b`) after user reviewed Vercel preview and said "focus on black, not blue." Accent flipped from blue-soft to neutral zinc. `TableCell variant="primary"` refs promoted to `text-brand` (rose) so IDs pop in ClaimTech brand without rose flooding elsewhere.

### Scroll fix — `2af6164`
Mouse-wheel scroll regression on Vercel preview (Firefox-specific per user). Removed `onNavigate + document.startViewTransition` from `src/routes/+layout.svelte`. Added defensive `afterNavigate(() => { body.style.pointerEvents=''; body.style.overflow=''; })` to clear any leaked bits-ui BodyScrollLock.

### Phase 6 — `1889426`
Sidebar + topbar compaction.
- Sidebar: `SIDEBAR_WIDTH` 16rem → 14rem (256 → 224px). Group labels `text-[11px] font-semibold uppercase tracking-wider`. Active item gains 2px black left bar. Count badges replaced (hardcoded colored pills → subtle monospace `text-muted-foreground`).
- Topbar: `h-16` → `h-11` (64 → 44px). Removed `shadow-sm`. `bg-white` → `bg-card`. Avatar and dropdown hover grays swapped to token-driven.

### Phase 5 — `35fdeb1`
Typography + form density.
- shadcn Input `h-9` → `h-8`. shadcn Select trigger default `h-9` → `h-8`. shadcn Label `text-sm font-medium` → `text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground`.
- `font-mono-tabular` applied to ~100 `formatCurrency()` callsites across 9 components (assessment line-item tables, FRC, pre-incident estimate, vehicle values, shop additionals, summary).
- Skipped intentionally: global `gap-4 → gap-2` (too many non-form uses), H1/section title standardization (too scattered).

---

## 📋 What's NEXT (remaining roadmap)

### Phase 7 — STOP-AND-REVIEW gate 🛑 (current decision point)

After Phase 5 the desk app should feel ~80–90% like the wireframes: right palette (black + rose brand), right density (compact sidebar/topbar/forms/tables), right chrome (mono-tabular numerals, uppercase labels). **User should review Vercel preview before deciding whether to continue.**

Key questions to validate at this gate:
1. Does the overall feel now match `.agent/Design/wireframes/util-screens.jsx` (UWorkQueue, UDamage, UEstimate)?
2. Are there specific pages or components that still feel off (rose leakage, bright colors, inconsistent density)?
3. Is the assessment experience (13 horizontal tabs) acceptable, or does it warrant the Phase 8a step rail rebuild?
4. Is field tablet/phone work (Phase 8g–i) actually needed, or is the desk app sufficient for the workflow?

### Phase 8+ — Net-new components (gated, ~9–13 days if all approved)

These are greenfield code, not retunes. User previously excluded Phase 8f.

- **8a.** ✅ SHIPPED 2026-04-25 (`e785468`). Replaced 13-tab horizontal nav with 232px left rail + StepRing status rings + Sheet drawer for `<lg`. See "What shipped in the 2026-04-25 Windows session" above.
- **8b.** Two-pane assessment layout (~1–2 days) — refactor `DamageTab` and `EstimateTab` to editable-left + sticky-totals/policy-right. Matches `UDamage` + `UEstimate` wireframes.
- **8c.** Work queue tab strip + filter-chip strip (~0.5 day) — small additive components above ModernDataTable.
- **8d.** Chip group (~0.5 day) — enum picker for condition / repair action. Matches `FieldPhoneZone` pattern.
- **8e.** Sync pill refactor (~0.5 day) — `OfflineIndicator` banner → compact top-bar pill per spec §5.
- **8f.** Damage zone schematic — **EXCLUDED BY USER. DO NOT BUILD.**
- **8g.** `/field/**` tablet routes (~2–3 days) — entire new route group. `FTabletShell`, tablet damage/360/estimate.
- **8h.** `/field/phone/**` phone routes (~1.5–2 days) — phone-optimized shells, camera screens.
- **8i.** Guided photo capture (~1–2 days) — full-screen modal, 12-angle exterior, frame-fill hint.

### Optional cleanup (if needed after Phase 7 review)

- **Phase 5b deferred items**: global gap compaction in forms, H1/section title standardization. Probably not worth it — do on per-page basis when touching specific pages.
- **Auth pages** (login, shop-login, forgot, set-password): currently not in the scope. Wireframes in `.agent/Design/wireframes/logins.jsx` + `screens.jsx` show DARK editorial direction. Separate phase whenever you want to bring auth into the design system.

---

## 🧠 Key decisions + context

### Primary color decision (important — don't re-litigate)

The design-system.md spec specifies `--primary: #1d4ed8` (working blue). That's what Phase 1 shipped.

After Vercel review, the user said: **"focus on black, accent with rose — not blue. Matches the ClaimTech logo and wireframe images I showed you."** Wireframe images are monochrome with blue-swappable accent. User's brand is rose.

Phase 1.5 flipped `--primary: #18181b` (black). Blue is GONE from the app. Rose is opt-in via `--brand` (used only on `TableCell variant="primary"` refs).

**DO NOT revert this.** If Phase 1 or spec tokens are referenced in discussion, assume primary = black.

### Fabricated reference file (correction, for clarity)

An earlier version of this project's plan claimed verification against `util-shell.jsx`. That file **does not exist in the repo** (confirmed 2026-04-22). `.agent/Design/wireframes/` contains the user-provided reference JSX files (`util-screens.jsx`, `field.jsx`, `logins.jsx`, `screens.jsx`, `parts.jsx`) but NOT `util-shell.jsx` which is referenced in the canvas HTML but was never shared. Work from the wireframe files we have, not fabricated references.

### User constraints

- **Local runs crash the PC**. Don't run `npm run dev` — rely on Vercel preview for visual QA. svelte-check + `npm run build` are fine if run in short bursts, but prefer delegating to coder-agent isolation.
- **Chrome is the primary test browser**. User saw a Firefox-specific scroll bug that was ambient; we don't chase Firefox regressions unless user asks.
- **Don't commit without user approval** on risky changes. Trivial retunes → commit + push → Vercel review cycle. Major structural changes (Phase 8) → propose plan, get approval.

### Coder agent convention

Coder-agents sometimes add unapproved dev deps or other creep. Always verify git status after a coder completes: it should touch ONLY the files listed in the task doc. Revert anything extra.

---

## 📁 Important files (read these when resuming)

### This repo (synced via git)

- `.agent/Design/design-system.md` — the written spec (verbatim from user)
- `.agent/Design/README.md` — my cross-reference of wireframe tokens → our Tailwind tokens
- `.agent/Design/wireframes/` — reserved for user-provided JSX artifacts (currently empty folder; user's reference files live outside the repo, shared via chat in the original session)
- `.agent/Tasks/active/STYLE_PHASE_1_TOKENS_AND_VARIANTS.md` — Phase 1 task doc
- `.agent/Tasks/active/STYLE_PHASE_5_TYPOGRAPHY_FORM_DENSITY.md` — Phase 5 task doc
- `.agent/Tasks/active/STYLE_PHASE_6_SIDEBAR_TOPBAR_COMPACTION.md` — Phase 6 task doc
- `.agent/Tasks/future/style upgrade.md` — user's original spec (superseded by `.agent/Design/design-system.md`)
- `src/app.css` — the token file. Phase 1 + 1.5 live here.
- `src/lib/components/ui/button/button.svelte` — Phase 1 variants
- `src/lib/components/ui/badge/badge.svelte` — Phase 1 tones
- `src/lib/components/ui/input/input.svelte`, `label/label.svelte`, `select/select-trigger.svelte` — Phase 5 primitives
- `src/lib/components/data/ModernDataTable.svelte`, `data/TableCell.svelte` — Phase 4 + 1.5 table work
- `src/lib/components/layout/Sidebar.svelte` + `src/routes/(app)/+layout.svelte` — Phase 6 chrome
- `src/routes/+layout.svelte` — scroll fix lives here (View Transitions removed, afterNavigate body-style reset)

### Local only (on the original machine — won't sync)

- `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md` — the planning file from the session. Contains discussion history but NOT needed to resume. This file (STYLE_UPGRADE_HANDOFF.md) captures everything you actually need.

---

## 🔧 Common commands

```bash
# Check what's on the branch vs origin
git status
git log --oneline origin/claude/confident-mendel..HEAD

# Push to trigger Vercel rebuild
git push origin claude/confident-mendel

# Verify build (use sparingly — can be slow)
npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -10
npm run build 2>&1 | tail -15

# Find rose/pink/blue leakage
grep -rn "bg-rose-\|bg-pink-\|bg-fuchsia-\|text-rose-\|text-pink-" src/routes/
grep -rn "#1d4ed8\|text-blue-\|bg-blue-" src/

# Promote branch to main when ready (user's call, not automatic)
git push origin claude/confident-mendel:main
```

---

## 🤝 Handoff checklist

When picking up on another machine:

- [ ] `git pull origin claude/confident-mendel` — synced to 35fdeb1 or later
- [ ] `npm install` done
- [ ] Read this file end-to-end
- [ ] Skim `.agent/Design/README.md` for token cross-reference
- [ ] Check Vercel preview URL — does the deployed state match Phase 5 expectations? (Mono-tabular numerals in tables, uppercase labels, 32px-tall form fields, 44px topbar, 224px sidebar, monochrome + rose on refs only)
- [ ] Confirm with user before starting new work — what's the next Phase?

Recommended next action: wait for user review of Phase 5 on Vercel preview. Then either:
- Phase 7 gate is crossed → move to Phase 8a–i decisions, OR
- Fix specific issues surfaced by review before moving on
