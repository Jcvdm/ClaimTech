# Style Upgrade — Cross-Device Handoff

**Purpose**: Portable resume doc. Checked into the repo so another Claude Code instance on another machine can pull this branch and pick up exactly where work stopped.

**Last updated**: 2026-04-23 (session paused for device switch)
**Active branch**: `claude/confident-mendel`
**Remote**: `origin` (github.com/Jcvdm/ClaimTech.git)

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

As of the last push (2026-04-23):

```
35fdeb1  style(typography): Phase 5 — form density + mono-tabular        ← HEAD
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

- **8a.** Step rail for assessment (~1 day) — replaces the 13-tab horizontal nav at the top of the assessment detail page with a 232px left rail + status rings. Matches wireframe's `UAssessSidebar`. Materially changes assessment UX.
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
