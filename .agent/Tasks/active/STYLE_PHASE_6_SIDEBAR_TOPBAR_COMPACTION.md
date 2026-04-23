# Style Upgrade — Phase 6: Sidebar + Topbar Compaction

**Created**: 2026-04-23
**Status**: In Progress
**Complexity**: Moderate (5 files, retune only — no new features)
**Source spec**: `.agent/Design/design-system.md` §3.5 + §4.1, `.agent/Design/README.md`
**Prior phases**: Phase 1 (tokens) → Phase 2 (decorative cleanup) → Phase 3 (GradientBadge) → Phase 4 (table density) → Phase 1.5 (monochrome + refs→brand) → scroll fix. Already shipped.

---

## Goal

Compact the desk chrome to match the wireframe's utilitarian feel:
- Sidebar: 256px → **224px wide**, tighter group labels, active 2px left bar, subtle monospace count badges (no colored pills)
- Topbar: 64px → **44px** height, token-driven avatar/hover styles (no hardcoded grays), no shadow

**Out of scope**:
- Adding ⌘K search or Help button (net-new functionality — a separate phase)
- Rewriting sidebar structure (we keep the current 8 groups / current items)
- Any logic changes (only CSS classes + one constant)

---

## Design decisions (locked)

1. **Sidebar width**: `SIDEBAR_WIDTH` constant changes from `16rem` (256px) to `14rem` (224px). Affects all layouts using the shadcn sidebar. No callsite changes.
2. **Group labels**: go from `text-xs font-medium` (12px medium) to `text-[11px] font-semibold uppercase tracking-wider` per spec. Padding changes from `h-8 px-2` (fixed 32px height) to `h-auto px-2.5 pt-3 pb-1.5` (tighter, variable height).
3. **Active-item left bar**: add via `border-l-2` with transparent default + `data-[active=true]:border-l-foreground`. Prevents layout shift — all items have 2px left border, active ones just become visible.
4. **Active font weight**: `font-medium` → `font-semibold`.
5. **Badges**: replace 7 hardcoded colored pill spans (`bg-red-600`, `bg-blue-600`, etc.) with subtle monospace counts: `ml-auto font-mono-tabular tabular-nums text-[11px] text-muted-foreground`. No background, no border, no rounded pill. Pure text.
6. **Topbar height**: `h-16` (64px) → `h-11` (44px). Sidebar-collapsed variant: `h-12` → `h-10` (keeping the proportional shrink).
7. **Topbar hardcoded grays**: `bg-gray-200` / `text-gray-700` on Avatar.Fallback → `bg-muted` / `text-muted-foreground`. `hover:bg-gray-100` on dropdown trigger → `hover:bg-muted`.
8. **Topbar shadow**: drop `shadow-sm`. Spec says no shadows on data chrome — the `border-b` is sufficient separator. `bg-white` → `bg-card` while we're there (token-driven).

---

## Files to modify

### File 1 — `src/lib/components/ui/sidebar/constants.ts`

```ts
// BEFORE
export const SIDEBAR_WIDTH = "16rem";

// AFTER
export const SIDEBAR_WIDTH = "14rem";
```

Change only this line. Other constants (`SIDEBAR_WIDTH_MOBILE`, `SIDEBAR_WIDTH_ICON`) stay as-is.

---

### File 2 — `src/lib/components/ui/sidebar/sidebar-group-label.svelte`

Replace the class string in `mergedProps.class`:

```ts
// BEFORE (line 18)
"text-sidebar-foreground/70 ring-sidebar-ring outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",

// AFTER
"text-subtle-foreground ring-sidebar-ring outline-hidden flex h-auto shrink-0 items-center rounded-md px-2.5 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
```

Changes: `text-sidebar-foreground/70` → `text-subtle-foreground` (tertiary ink), `h-8` → `h-auto`, `px-2` → `px-2.5 pt-3 pb-1.5`, `text-xs font-medium` → `text-[11px] font-semibold uppercase tracking-wider`.

Keep the second line (`group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0`) unchanged.

---

### File 3 — `src/lib/components/ui/sidebar/sidebar-menu-button.svelte`

Modify the base class string on line 5. Target: add `border-l-2 border-l-transparent` always; `data-[active=true]:border-l-foreground`; upgrade `data-[active=true]:font-medium` to `data-[active=true]:font-semibold`.

```ts
// BEFORE (line 5 base class — abbreviated for the parts that change)
"... data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground ... rounded-md p-2 text-left text-sm ... data-[active=true]:font-medium ..."

// AFTER (same base, additions shown)
"... data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground border-l-2 border-l-transparent data-[active=true]:border-l-foreground ... rounded-md p-2 text-left text-sm ... data-[active=true]:font-semibold ..."
```

Concretely, the easiest edit is the single-string replacement:
- Replace `data-[active=true]:font-medium` → `data-[active=true]:font-semibold`
- Insert `border-l-2 border-l-transparent data-[active=true]:border-l-foreground` somewhere in the base class (e.g. right after `data-[active=true]:text-sidebar-accent-foreground`)

The full line 5 should end up looking like (with additions in context):

```ts
base: "peer/menu-button outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground border-l-2 border-l-transparent data-[active=true]:border-l-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-semibold [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
```

---

### File 4 — `src/lib/components/layout/Sidebar.svelte`

**Lines 341–389**: replace all 7 hardcoded colored pill badges with subtle monospace counts.

Every occurrence of:
```svelte
<span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white">
```
(and the `bg-blue-600` / `bg-green-600` / `bg-purple-600` / `bg-orange-600` variants)

becomes:

```svelte
<span class="ml-auto font-mono-tabular tabular-nums text-[11px] text-muted-foreground">
```

7 total replacements (Requests, Inspections, Appointments, Assessments, Finalized Assessments, FRC, Additionals). The `{count}` content inside each span stays unchanged. Remove the `flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-medium text-white` — that's pill styling we no longer want.

**Do not touch**: line 413 `text-muted-foreground hover:bg-muted hover:text-foreground` — already token-driven. Keep as-is.

---

### File 5 — `src/routes/(app)/+layout.svelte`

**Line 47** (topbar `<header>`):

```svelte
<!-- BEFORE -->
<header
    class="flex h-16 shrink-0 items-center gap-2 border-b bg-white px-4 shadow-sm transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
>

<!-- AFTER -->
<header
    class="flex h-11 shrink-0 items-center gap-2 border-b bg-card px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-10"
>
```

Changes: `h-16` → `h-11`, `bg-white` → `bg-card`, drop `shadow-sm`, collapsed-state `h-12` → `h-10`.

**Line 81** (Avatar.Fallback):

```svelte
<!-- BEFORE -->
<Avatar.Fallback class="bg-gray-200 text-gray-700">

<!-- AFTER -->
<Avatar.Fallback class="bg-muted text-muted-foreground">
```

**Line 78** (dropdown trigger hover):

```svelte
<!-- BEFORE -->
class="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-gray-100"

<!-- AFTER -->
class="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-muted"
```

**Line 85-86** (username text):

```svelte
<!-- BEFORE -->
<span class="hidden text-sm font-medium text-gray-700 sm:inline-block"

<!-- AFTER -->
<span class="hidden text-sm font-medium text-foreground sm:inline-block"
```

---

## Verification

1. **svelte-check**: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5` — expect 0 errors, 29 pre-existing warnings (baseline).
2. **Build**: `npm run build 2>&1 | tail -10` — expect exit 0.
3. **Grep checks**:
   - `grep -rn "bg-red-600\|bg-blue-600\|bg-green-600\|bg-purple-600\|bg-orange-600" src/lib/components/layout/Sidebar.svelte` → 0 matches after edits.
   - `grep -rn "bg-gray-\|text-gray-" src/routes/\(app\)/+layout.svelte` → 0 matches after edits.
   - `grep -rn "16rem\|h-16\|shadow-sm" src/lib/components/ui/sidebar/constants.ts src/routes/\(app\)/+layout.svelte` → the specific places we're changing should return no matches.

## What the user should see

- **Sidebar narrower**: 256px → 224px. Content reflows slightly.
- **Group labels smaller + uppercase**: "Work" becomes `WORK` in 11px semibold gray.
- **Active item gets 2px black left bar**: sharper active indicator, paired with bolder text.
- **Count badges become subtle gray monospace**: red/blue/green/purple/orange pills gone; just `12` in muted-foreground monospace, right-aligned. Quieter, more tool-like.
- **Topbar ~30% shorter**: 64px → 44px. More content visible. No shadow below.
- **Avatar fallback + dropdown hover**: neutral gray tones instead of slate/bluish grays.

## What should NOT change

- Nav structure, items, icons, routes — all unchanged.
- Sidebar behavior: collapse, hover, mobile sheet — unchanged.
- Topbar functionality: breadcrumb generation, user dropdown, logout — unchanged.
- Any other files.

---

## Rollback

Revert the 5 files:
```bash
git checkout HEAD -- src/lib/components/ui/sidebar/constants.ts src/lib/components/ui/sidebar/sidebar-group-label.svelte src/lib/components/ui/sidebar/sidebar-menu-button.svelte src/lib/components/layout/Sidebar.svelte src/routes/\(app\)/+layout.svelte
```

All changes are CSS class / constant only. No logic, no state, no migrations.

---

## Coder execution notes

- 5 file edits, no new files.
- DO NOT add dependencies.
- Preserve all logic, props, imports.
- Keep the 7 `{#if item.href === '/requests' && newRequestCount > 0}` conditions in Sidebar.svelte — only the inner `<span class=...>` changes.
- Preserve all other classes on the topbar header (`flex shrink-0 items-center gap-2 border-b ... px-4 transition-[width,height] ease-linear group-has-[...]:...`).
- Run svelte-check + build, report both results.
- DO NOT commit — Orchestrator handles commits.
