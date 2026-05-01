# Desktop Layout v2 — Staged Implementation Plan

**Branch**: `claude/desktop-layout-v2`
**Base**: `claude/confident-mendel`
**Approach**: Staged rollout. Each stage is independently mergeable, has a test gate, and can be reverted on its own. User runs and tests in browser between stages before approving the next.

**Design sources**:
- `C:\Users\Jcvdm\AppData\Local\Temp\ctli\` — V05 (persistent right Notes panel)
- `C:\Users\Jcvdm\AppData\Local\Temp\ctli2\` — 01a 60/40 split, top tab strip, Desktop form layout spec (compact tokens)

---

## Goal in one paragraph

Adopt the designer's **"Estimate-page" aesthetic across every form tab**: top stepper instead of a left rail, persistent Notes panel on the right, 60/40 form/photos split inside form-heavy tabs, and a new compact component family (cards, fields, segments, chips, buttons) sized to the spec's tokens. Functionality stays identical — this is layout + visual density only. Each stage is small, testable, and independent so we can run, click around, sanity-check, then approve the next stage. **No hallucinated components** — only the building blocks the spec actually defines and that we already need.

## User direction (this turn, verbatim)

> *"one adjsutment to make it the stepper should be ontop and recreate a component that matches wha tthe deigner did --- we can plan to recreate a the componetns to match the current estiamte page style -- smaller more comp[act components -- so plan the whole implementation is stages with test in ebwteen we will then run and test as we go"*

Translation:
1. **Top stepper** replaces the existing left vertical rail.
2. **Recreate components** to match the designer's compact aesthetic (smaller padding, smaller fonts, the specific tokens from `Desktop form layout spec.html`).
3. **Stages with tests in between** so we can run / click / approve before moving on.

## Reusability principle (non-negotiable per user)

Every change lands as a **named, scoped, reusable component**, not as ad-hoc edits scattered across each tab. Two new directories will hold the new family:

- `src/lib/components/assessment/layout/` — chrome and shell primitives (top-tabs, side panel, form/photos split).
- `src/lib/components/assessment/compact/` — compact field family (card, banner, field, input, select, textarea, segmented, radio cards, photo grid, chip, button).

The existing shadcn-svelte primitives in `src/lib/components/ui/` are **not modified** — they continue to power non-assessment pages.

---

## Spec tokens (source of truth — copy-paste from `Desktop form layout spec.html`)

These are the values every new compact primitive uses. Exposed as Tailwind utility classes via project config or as inline CSS variables on a wrapper.

| Token | Value | Used by |
|---|---|---|
| `--ink` | `#0f172a` | Primary text, dark surfaces |
| `--ink2` | `#475569` | Body / secondary text |
| `--ink3` | `#94a3b8` | Captions, placeholders |
| `--line` | `#e2e8f0` | Borders |
| `--lineSoft` | `#f1f5f9` | Soft surface, segmented track |
| `--soft` | `#f8fafc` | Page bg, composer bg |
| `--primary` | `#dc2626` | Required mark, primary CTA |
| `--green` | `#16a34a` | Done / approved |
| `--amber` | `#d97706` | Warning / pending |
| `--blue` | `#2563eb` | Info, current-section chip |
| Card radius | 8px | All cards |
| Input radius | 6px | All inputs |
| Card padding | 16px (14px tight) | All cards |
| Card v-gap | 14px | Stack of cards |
| Field v-gap | 12px | Stack of fields |
| 2-col grid gap | 14px | Form 2-col grid |
| Photo grid gap | 10px | Photo grids |
| Notes panel width | 320px | Right side panel |
| Header bar padding | 10px 20px | Top header |
| Title bar padding | 12px 20px | ASM-ID title bar |
| Tab item padding | 10px 13px | Top stepper buttons |
| Field label | 10px / 700 / ink2 / uppercase / letter-spacing 0.4 | Every field |
| Card title | 15px / 800 / ink | Card header |
| Body / inputs | 13px / 400-500 / ink | Inputs |
| Sub-caption | 12px / ink2 | Secondary |
| Hint | 10px / ink3 | Field hint |
| Chip | 11px / 600 (9px in dense rows) | All chips |
| Tab label | 12.5px / 500 (700 active) | Stepper tabs |
| Btn primary | bg `--primary` / fg white / 7px 12px / 13px / 6px radius | Primary |
| Btn ghost | bg white / fg ink / 1px line border | Ghost |
| Btn small | 5px 10px / 12px | Compact CTAs |

---

# STAGES

Each stage:
- **Output** — what files are created/changed.
- **Acceptance criteria** — the click-through the user runs to approve.
- **Risk** — what could break.
- **Revert** — how to undo if it goes sideways.

User runs `npm run dev` and `npm run check` after each stage; merges to `claude/desktop-layout-v2` only when criteria pass.

---

## Stage 0 — Branch + scaffolding (no behavior change)

**Output**:
- Create branch `claude/desktop-layout-v2` from current `claude/confident-mendel`.
- Create empty directories `src/lib/components/assessment/layout/` and `src/lib/components/assessment/compact/` with a `.gitkeep` each.
- Copy this plan file to `.agent/Tasks/active/DESKTOP_LAYOUT_V2_TASK.md` (the task doc the Coder reads each stage).

**Acceptance**:
- [ ] `npm run check` passes (no-op).
- [ ] App runs unchanged on `npm run dev`.

**Risk**: zero.

---

## Stage 1 — Top stepper replaces left rail

**Goal**: Move tab navigation from the left vertical rail to a horizontal top tab strip matching the wireframe spec's `TabStrip`.

**Output**:
- **NEW** `src/lib/components/assessment/layout/AssessmentTopTabs.svelte` (~80 lines):
  - Props: `tabs: { id, label, done, current }[]`, `currentTab: string`, `onTabChange: (id) => void`, `class?: string`.
  - Outer: `<nav class="flex overflow-x-auto bg-white border-b border-line shrink-0 px-4">`.
  - Per tab: `<button class="flex items-center gap-1.5 px-3.5 py-3 whitespace-nowrap border-b-2" data-active={…}>`. Active gets `border-primary` (red bottom indicator per spec) + `font-bold`. Inactive `border-transparent` + `text-ink2`.
  - Done circle: 14px round, `bg-green border-green` with `✓` if `done`, hollow `border-ink3` otherwise.
  - Label: 12.5px / 500 (700 active).
  - Horizontal scroll on small viewports (the strip itself handles narrow screens — no hamburger needed).
- **EDIT** `src/lib/components/assessment/AssessmentLayout.svelte`:
  - Remove the left `<aside>` block at lines 281-287 (StepRail vertical rail).
  - Insert `<AssessmentTopTabs … />` BETWEEN the existing header (line 209) and the body row (line 281).
  - Body row simplifies to just `<main … >` (no left aside sibling).
  - Remove the mobile drawer / `Sheet` block (lines 308-320) and the hamburger trigger that opens it — the new top strip works on every viewport.
  - Keep `StepRail.svelte` as a file (don't delete) — it might be reused inside a future `<AssessmentSidePanel>` snippet (e.g., a compact step list inside the right panel). Just stop importing it here.

**Acceptance**:
- [ ] `npm run check` clean.
- [ ] On `npm run dev`, open any in-progress assessment.
- [ ] Top of page shows: header bar → top tab strip with all 12 tabs → main content fills width.
- [ ] Clicking each tab navigates correctly; URL `?tab=…` updates.
- [ ] Done tabs show a filled green circle; current tab is bold with a red bottom border.
- [ ] On a narrow viewport (<lg), the strip scrolls horizontally; current tab still readable.
- [ ] Browser back/forward still moves between tabs.
- [ ] No console errors.

**Risk**: medium — `AssessmentLayout` is the entry chrome. Mitigation: small surgical diff; `StepRail` not deleted; clear revert path.

**Revert**: `git revert` the stage commit.

---

## Stage 2 — Compact primitives (no usage yet, just the library)

**Goal**: Build the new compact component family in isolation. They are not wired into any tab yet — this stage adds the building blocks only.

**Output (all NEW under `src/lib/components/assessment/compact/`)**:

| File | Purpose | Props |
|---|---|---|
| `CompactCard.svelte` | Standard card chrome (white bg, 1px line, 8px radius, 16px or 14px tight padding) | `tight?: boolean`, `class?: string`, `children: Snippet` |
| `CompactCardHeader.svelte` | Card header row with optional icon, title (15/800), count chip, spacer, header buttons slot | `title: string`, `icon?: Snippet`, `count?: number`, `right?: Snippet` |
| `CompactBanner.svelte` | Tinted callout (warranty / borderline / removed) — bg / border by `tone` | `tone: 'red' \| 'green' \| 'amber' \| 'blue'`, `icon?: Snippet`, `children: Snippet` |
| `CompactField.svelte` | Field wrapper: 10px tracked uppercase label + slot + optional hint | `label: string`, `required?: boolean`, `hint?: string`, `children: Snippet` |
| `CompactInput.svelte` | Text/number input — 8px 10px padding, 6px radius, 13px ink, mono variant for numbers | `type?, value, mono?: boolean, placeholder?, …` |
| `CompactSelect.svelte` | Native or shadcn `<Select>` styled to compact spec with `⌄` chevron | `value, options, placeholder?, …` |
| `CompactTextarea.svelte` | Min-height 60px, resize-vertical | `value, placeholder?, rows?` |
| `CompactSegmented.svelte` | Pill segmented (compact, in-card) — track `bg-lineSoft rounded-lg p-[3px]`, buttons `flex-1 px-2.5 py-2 text-xs font-bold`, active = white bg + tone fg | `value, options: {value,label,tone?:'green'\|'red'\|'amber'}[], onChange` |
| `CompactSegmentedBordered.svelte` | Bordered segmented (decision-prominent, e.g. damage match) — side-by-side, gap 10, padding 12, 13px / 700, selected = 2px solid + tinted bg | `value, options, onChange` |
| `CompactRadioCards.svelte` | 2-col grid radio (Assessment Result pattern) | `value, options: {value,label,sub}[], onChange` |
| `CompactPhotoGrid.svelte` | 3-col grid; first cell is the dashed "+ Add" tile | `photos: {url, name}[]`, `onAdd?, onRemove?` |
| `CompactChip.svelte` | Pill chip with tone variants (gray/green/amber/red/blue/dark) | `tone?, mono?: boolean, children: Snippet` |
| `CompactButton.svelte` | Primary / ghost / danger; default + small sizes | `variant?, size?, icon?, children: Snippet` |

Total: 13 small components, each ≤ ~60 lines.

**No tab consumes these yet.** Stage 2 is pure library work.

**Verification page (optional but recommended)**: add a hidden dev route `src/routes/(dev)/compact-preview/+page.svelte` rendering one of each primitive so visual regressions are testable independent of the assessment shell. Gate behind `import.meta.env.DEV` or just a route the user knows about.

**Acceptance**:
- [ ] `npm run check` clean.
- [ ] On `/dev/compact-preview` (or wherever), each primitive renders to spec — eyeball comparison vs `Desktop form layout spec.html` §5–§7.
- [ ] All assessment tabs still render unchanged (we haven't wired anything in yet).

**Risk**: low — additive only.

**Revert**: delete the directory.

---

## Stage 3 — Persistent right Notes panel

**Goal**: Dock `<AssessmentNotes>` as a 320px right column at `xl:` (≥1280px). Below `xl`, fall back to today's collapsible card under the content.

**Output**:
- **NEW** `src/lib/components/assessment/layout/AssessmentSidePanel.svelte` (~40 lines):
  - Props: `children: Snippet`, `width?: number = 320`, `hideBelow?: 'md'|'lg'|'xl' = 'xl'`, `class?: string`.
  - Outer: `<aside class="hidden xl:flex flex-col overflow-hidden border-l border-sidebar-border bg-sidebar shrink-0 w-[var(--side-w)]" style="--side-w: {width}px">`.
  - Knows nothing about notes — generic right-column shell.
- **EDIT** `AssessmentLayout.svelte`:
  - Add `rightPanel?: Snippet` prop.
  - Render `{#if rightPanel}{@render rightPanel()}{/if}` after the closing `</main>` inside the body row.
- **EDIT** `AssessmentNotes.svelte`:
  - Add `inSidebar?: boolean = false` prop.
  - When true: outer becomes `flex flex-col h-full`, header + composer become `shrink-0`, list becomes `flex-1 min-h-0 overflow-y-auto`, no auto-collapse on small viewports.
  - When false: byte-for-byte equivalent to today.
- **EDIT** `+page.svelte`:
  - Hoist the existing `onUpdate` arrow at lines 1145-1151 into a named `refreshNotes` function.
  - Define `{#snippet rightPanel()} {#if currentTab !== 'finalize'} <AssessmentSidePanel> <AssessmentNotes inSidebar … /> </AssessmentSidePanel> {/if} {/snippet}`.
  - Pass `{rightPanel}` to `<AssessmentLayout>`.
  - Wrap the existing below-content `<AssessmentNotes>` block (lines 1138-1154) in `<div class="xl:hidden mt-6">` so it only renders on smaller viewports.

**Acceptance**:
- [ ] `npm run check` clean.
- [ ] At ≥1280px: every tab except Finalize shows a 320px right column; the column scrolls independently.
- [ ] Add / edit / delete a note from the side panel — persists; updates live; no page reload.
- [ ] At <1280px: legacy collapsible-card notes appear below content. No double-render at any viewport.
- [ ] On Finalize tab, no side panel.
- [ ] No regressions on tab body content.

**Risk**: low — backward compatible, single mount-site change.

**Revert**: `git revert` stage commit.

---

## Stage 4 — `TabFormSplit` primitive + Exterior360 as proof

**Goal**: Build the 60/40 form/photos split primitive, mirroring the gold-standard pattern already in `DamageTab.svelte:194` and `:355-364`. Apply to ONE tab (Exterior360) as the proof case before rolling out.

**Output**:
- **NEW** `src/lib/components/assessment/layout/TabFormSplit.svelte` (~50 lines):
  - Props: `form: Snippet`, `photos?: Snippet`, `photosWidth?: string = '380px'`, `stickyPhotos?: boolean = true`, `splitFrom?: 'md'|'lg' = 'lg'`, `class?: string`.
  - Outer: `<div class="lg:grid lg:grid-cols-[minmax(0,1fr)_var(--ph-w)] lg:gap-6 lg:items-start" style="--ph-w: {photosWidth}">`.
  - Right wrapper: applies `lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto` when `stickyPhotos`.
  - Below `lg`, plain block — children stack — preserves today's mobile behavior exactly.
- **EDIT** `Exterior360Tab.svelte`: wrap the form-fields block (lines 226-261) and `<Exterior360PhotosPanel>` (265-269) inside `<TabFormSplit>` with `form` and `photos` snippets. Accessories Card (272-349) stays inside the `form` snippet so it scrolls with the form.

**Acceptance**:
- [ ] `npm run check` clean.
- [ ] On the 360° Exterior tab at ≥1024px: form on the left, `Exterior360PhotosPanel` on the right, sticky as the form scrolls.
- [ ] At ≥1280px: above + Notes panel on the far right (Stage 3 behavior preserved).
- [ ] At <1024px: form and photos stack just like today.
- [ ] No visual or functional regression on any other tab.
- [ ] Photo upload / delete / reorder still works.

**Risk**: low — limited to one tab.

**Revert**: `git revert` stage commit.

---

## Stage 5 — Roll `TabFormSplit` to the rest of the form-heavy tabs

**Goal**: Apply the primitive to the remaining tabs that have a separate photos panel.

**Output**:
- **EDIT** `InteriorMechanicalTab.svelte` — wrap form (199-310 + 352-406) and `<InteriorPhotosPanel>` (314-318) in `<TabFormSplit>`.
- **EDIT** `PreIncidentEstimateTab.svelte` — wrap the form/table content and `<PreIncidentPhotosPanel>` (1464-1469). The split engages above `lg`; below `lg` the existing mobile/desktop branches inside the form continue to work because the primitive degrades to a plain block.
- **EDIT** (consistency only) `DamageTab.svelte` — replace the inline grid at line 194 + sticky wrapper at 355-364 with `<TabFormSplit form photos stickyPhotos photosWidth="340px">`. Visual output identical.
- **SKIP** `VehicleIdentificationTab.svelte` — photos are inline in form grids, not a separate panel.
- **SKIP** `TyresTab.svelte` — already does per-tyre 2-col split, structurally different.
- **SKIP** `VehicleValuesTab.svelte`, `SummaryTab.svelte` — no photos panel.
- **SKIP** `EstimateTab.svelte`, `AdditionalsTab.svelte`, `FinalizeTab.svelte`, `AuditTab.svelte` — these have intentional vertical section flows.

**Acceptance**:
- [ ] All four edited tabs render the split correctly at lg+, stack at <lg.
- [ ] No regression on the skipped tabs.
- [ ] Photos in each split tab are sticky as the form scrolls.

**Risk**: medium — touches one large file (PreIncident, 1471 lines). Careful insertion needed.

**Revert**: per-file revert.

---

## Stage 6 — Migrate ONE form tab to the compact primitives (proof)

**Goal**: Pick the smallest split tab (360° Exterior, ~400 lines) and migrate its form fields to the new compact family. Visual goal: looks like the spec's mock; behavior unchanged.

**Output**:
- **EDIT** `Exterior360Tab.svelte`:
  - Replace shadcn-svelte `<Card>` wrappers around form sections with `<CompactCard>` + `<CompactCardHeader>`.
  - Replace each form field with `<CompactField label …>` containing `<CompactInput>` / `<CompactSelect>` / `<CompactTextarea>`.
  - Replace any binary toggles with `<CompactSegmented>` (yes/no, with green/red tones per spec §6.3).
  - Replace any banner cards (warranty, etc., if present) with `<CompactBanner tone …>`.
  - All bind: / on*: handlers preserved exactly.

**Acceptance**:
- [ ] Visual: side-by-side comparison vs the wireframe — paddings, label sizes, input chrome match the spec tokens.
- [ ] Functional: every field still saves and validates exactly as before. Auto-save on blur / debounce still fires.
- [ ] Photo panel still works.
- [ ] No regression on other tabs (we haven't touched them yet).

**Risk**: medium — this is where behavior parity matters most. User will click through every field on the tab to confirm.

**Revert**: per-file revert.

---

## Stages 7a–7e — Migrate the remaining form tabs to compact primitives

One stage per tab, in this order (smallest → largest, lowest risk first):

| Stage | Tab | Approx field count | Notes |
|---|---|---|---|
| 7a | `InteriorMechanicalTab.svelte` | ~25 fields | Replace cards + 2/3/4-col grids with CompactCard + CompactField |
| 7b | `TyresTab.svelte` | per-tyre, 4 tyres | Each tyre Card → CompactCard; tyre fields → CompactField; segmented condition → CompactSegmented |
| 7c | `DamageTab.svelte` | ~15 fields | Damage description match → CompactSegmentedBordered (the prominent variant) |
| 7d | `VehicleValuesTab.svelte` | ~30 fields, no photos | Single-column compact stack |
| 7e | `VehicleIdentificationTab.svelte` | ~20 fields with inline photos | Photos stay inline (no TabFormSplit); fields use CompactField |
| 7f | `PreIncidentEstimateTab.svelte` | ~40 fields, mobile/desktop branches | Largest file — careful diff, branch-by-branch |

Each stage repeats the Stage 6 acceptance pattern: visual + functional click-through on the affected tab; smoke check of unchanged tabs.

**Risk**: medium per stage, low cumulative because each stage is small.

---

## Stage 8 — Header bar + title bar restyling

**Goal**: Match the wireframe's compact header chrome — brand mark, breadcrumb, sync chip, Save / Exit buttons, and a Title bar showing ASM-ID + vehicle subtitle on the row below.

**Output**:
- **EDIT** `AssessmentLayout.svelte` header section (lines 209-280):
  - Replace existing header markup with the wireframe's two-row pattern: HeaderBar (logo · breadcrumb · sync · Save · Exit) + TitleBar (ASM-ID · subtitle · status chips on the right).
  - Use `CompactButton` and `CompactChip` from Stage 2.
  - All existing handlers (save, exit, sync indicator) wired through.

**Acceptance**:
- [ ] Header matches the spec visually.
- [ ] Save / Exit buttons fire the same handlers as today.
- [ ] Sync chip reflects the same state as today.

**Risk**: low–medium — chrome only.

**Revert**: per-file revert.

---

## Stage 9 — Move plan doc to completed; final QA

**Output**:
- Move `.agent/Tasks/active/DESKTOP_LAYOUT_V2_TASK.md` → `.agent/Tasks/completed/`.
- Update `.agent/README.md` changelog with a one-line entry.
- Update relevant docs in `.agent/System/` if any architecture sections are now stale (e.g., assessment shell description).

**Acceptance**:
- [ ] Full smoke test across every tab at three viewport widths (1024, 1440, 1920).
- [ ] No console errors.
- [ ] No broken links / TODOs left in code.

---

## What's deferred (explicitly NOT in this plan)

These are real features but out of scope so we don't get distracted:

- Filter toggle on Notes panel (All / This page).
- Wide-mode (320 ⇄ 640) Notes expand.
- Per-line-item notes (📝 marker, "re: {line}" prefill) — needs schema work.
- Section pills inside `NoteBubble` highlighted when `source_tab === currentTab`.
- "Save & Continue" stepped footer / "Step N of 11" caption.
- "Required missing" / "photos pending" rolling chips in chrome.
- Side-rail save bar variant.
- Section reorder inside `EstimateTab` (already correct).
- Additionals tab restructuring.
- Mobile/tablet redesign.

Each of these can drop in later — the primitives are already there.

---

## Delegation pattern (Coder + Reviewer per stage)

For each stage:

1. Orchestrator copies the stage section from this plan into `.agent/Tasks/active/STAGE_N_<NAME>.md`.
2. Dispatch a **Sonnet `coder-agent`** with the stage doc reference. Prompt includes: branch, stage scope, acceptance criteria, do-not-touch list.
3. Coder commits + pushes.
4. Orchestrator dispatches a **Sonnet reviewer** to audit the diff against the stage's acceptance criteria.
5. On reviewer-clean, user runs the acceptance click-through in browser.
6. On user approval, orchestrator marks stage done and moves to the next.

**No skipping stages.** Each one stands on its own and must pass its acceptance gate.

---

## Width math (reference)

```
Viewport   Top tabs strip   Main column   Notes panel    60/40 split inside main
1024 (lg)  full-width       1024          —              614 / 410   ✅
1280 (xl)  full-width       960           320            576 / 384   ✅
1440       full-width       1120          320            672 / 448   ✅
1536       full-width       1216          320            730 / 486   ✅
1920       full-width       1600          320            960 / 640   ✅
```

(Removing the 232px left rail in Stage 1 buys back significant width across all viewports — this is why moving the stepper to the top makes the right Notes panel viable at xl without cramping the form/photos split.)
