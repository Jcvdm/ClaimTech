# Mobile Responsiveness — Phase 2: Responsive Primitives

**Created**: 2026-04-17
**Status**: Planning → In Progress
**Complexity**: Moderate
**Source Plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md` (user-approved)
**Depends on**: Phase 1 (commit `f27ca67` on `claude/confident-mendel`)

## Overview

Deliver 4 reusable responsive primitives + a demo route + a legacy-table deprecation JSDoc + a Playwright screenshot baseline. **One PR for the whole phase**. No page refactors yet — that's Phase 3.

**Branch**: `claude/confident-mendel` (this worktree). Do NOT open a new branch — append to the existing preview branch.

## Verified building blocks (DO NOT duplicate)

All confirmed to exist in the repo — use them directly, do not re-implement:

- `$lib/components/ui/sheet` — supports `side="bottom"` slide-in. Dual export (`Sheet`/`Root`, `SheetContent`/`Content`, etc).
- `$lib/components/ui/dialog` — bits-ui wrapper. Dual export.
- `$lib/components/ui/tabs` — bits-ui wrapper. Exports `Root`/`Tabs`, `List`/`TabsList`, `Trigger`/`TabsTrigger`, `Content`/`TabsContent`.
- `$lib/components/ui/dropdown-menu` — full set with dual export.
- `$lib/hooks/is-mobile.svelte.ts` — `class IsMobile extends MediaQuery`. Constructor takes a breakpoint number (default 1024). **Pass `768` explicitly** for the dialog/sheet switch — this is the md (layout) breakpoint, NOT the sidebar breakpoint.
- `src/lib/components/data/ModernDataTable.svelte` — reference pattern for responsive tables. **Note: lives under `data/`, not `ui/`.**

**`ScrollArea` does NOT exist.** The snap-scroll pattern is pure Tailwind — no JS component needed.

## Files to Create

### 2.1 `ResponsiveDialog` — `src/lib/components/ui/responsive-dialog/`

Follow shadcn folder-with-index convention. Switches internally between Dialog (md+) and Sheet `side="bottom"` (<md) using `new IsMobile(768)`.

**Files:**
1. `responsive-dialog.svelte` — Root wrapper. Accepts `bind:open`, `onOpenChange`, `children`. Forwards to Dialog.Root AND Sheet.Root (pick one at render time based on `IsMobile(768).current`).
2. `responsive-dialog-content.svelte` — Content. At md+, renders `<Dialog.Content class={cn('...', className)}>`. At <md, renders `<Sheet.Content side="bottom" class={cn('...', className)}>`. Accept `class` prop for consumer overrides like `sm:max-w-md`.
3. `responsive-dialog-header.svelte` — Thin pass-through. Use `Dialog.Header` at md+, `Sheet.Header` at <md.
4. `responsive-dialog-title.svelte` — Thin pass-through.
5. `responsive-dialog-description.svelte` — Thin pass-through.
6. `responsive-dialog-footer.svelte` — Thin pass-through. Class: `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2` (primary CTA on top on mobile, thumb-reachable).
7. `index.ts` — Barrel, **dual export** matching sheet/dialog convention:
   ```ts
   import Root from './responsive-dialog.svelte';
   import Content from './responsive-dialog-content.svelte';
   import Header from './responsive-dialog-header.svelte';
   import Title from './responsive-dialog-title.svelte';
   import Description from './responsive-dialog-description.svelte';
   import Footer from './responsive-dialog-footer.svelte';

   export {
     Root, Content, Header, Title, Description, Footer,
     Root as ResponsiveDialog,
     Content as ResponsiveDialogContent,
     Header as ResponsiveDialogHeader,
     Title as ResponsiveDialogTitle,
     Description as ResponsiveDialogDescription,
     Footer as ResponsiveDialogFooter,
   };
   ```

**Breakpoint switch pattern inside every content-bearing file:**
```svelte
<script lang="ts">
  import { IsMobile } from '$lib/hooks/is-mobile.svelte';
  const isMobile = new IsMobile(768);
  // then $derived / #if isMobile.current
</script>
```

**Public API (drop-in replacement for Dialog):**
```svelte
<ResponsiveDialog bind:open>
  <ResponsiveDialogContent class="sm:max-w-md">
    <ResponsiveDialogHeader>
      <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
      <ResponsiveDialogDescription>Optional</ResponsiveDialogDescription>
    </ResponsiveDialogHeader>
    <!-- body content -->
    <ResponsiveDialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </ResponsiveDialogFooter>
  </ResponsiveDialogContent>
</ResponsiveDialog>
```

### 2.2 `ResponsiveTabs` — `src/lib/components/ui/responsive-tabs/`

Extract the snap-scroll pattern from `AssessmentLayout.svelte:274–297`. Pure Tailwind — no JS breakpoint logic.

**Files:**
1. `responsive-tabs.svelte` — Pass-through over `<Tabs.Root bind:value>`.
2. `responsive-tabs-list.svelte` — TabsList with parameterised `cols` prop.
3. `responsive-tabs-trigger.svelte` — TabsTrigger with touch-compliant height.
4. `responsive-tabs-content.svelte` — Pass-through.
5. `index.ts` — barrel with dual export.

**`cols` prop** (type `3 | 4 | 6`, default `4`). Use a **static class lookup map** so Tailwind JIT picks up all candidates:

```ts
const gridCols: Record<3 | 4 | 6, string> = {
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  6: 'sm:grid-cols-6',
};
```

**TabsList class (template):**
```
flex h-auto w-full snap-x snap-mandatory gap-1.5 overflow-x-auto bg-transparent p-0 pb-2 scrollbar-hide
sm:grid sm:snap-none sm:gap-2 sm:overflow-visible sm:pb-0 {gridCols[cols]}
```

**TabsTrigger base class:**
```
relative flex h-9 min-w-[4.5rem] shrink-0 snap-start items-center justify-center gap-1 rounded-md
border border-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground transition-all
hover:bg-muted hover:text-foreground
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:pointer-events-none disabled:opacity-50
data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm
sm:h-10 sm:min-w-0 sm:shrink sm:gap-2 sm:px-3 sm:py-2 sm:text-sm
```

**Touch-target note**: base bumped from `h-8` → `h-9`, `sm:h-9` → `sm:h-10` to satisfy the Phase 1 touch-target contract. AssessmentLayout keeps its current heights for now — Phase 3 migrates it.

Active state uses `primary` tokens (not hardcoded `rose-500`). Callsites can override via `class`.

### 2.3 `FieldGrid` — `src/lib/components/ui/field-grid/`

Single component file + barrel. Dumb container.

**`field-grid.svelte`:**
```svelte
<script lang="ts" module>
  export type FieldGridCols = 1 | 2 | 3 | 4;
</script>
<script lang="ts">
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';
  let {
    cols = 2,
    class: className = '',
    children,
  }: { cols?: FieldGridCols; class?: string; children: Snippet } = $props();

  const colClass: Record<FieldGridCols, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
</script>
<div class={cn('grid gap-4', colClass[cols], className)}>
  {@render children()}
</div>
```

**`index.ts`:**
```ts
import Root from './field-grid.svelte';
export { Root, Root as FieldGrid };
export type { FieldGridCols } from './field-grid.svelte';
```

### 2.4 `ActionBar` — `src/lib/components/ui/action-bar/` (Option A — actions array)

**Files:**
1. `action-bar.svelte` — renders all actions. Desktop (`md+`): all inline. Mobile (`<md`): first `inlineCount` inline, rest in DropdownMenu "More".
2. `index.ts` — barrel exports `ActionBar` and the `Action` type.

**Action type** (exported from `action-bar.svelte` module script):
```ts
import type { Component } from 'svelte';
import type { VariantProps } from 'tailwind-variants';
import { buttonVariants } from '$lib/components/ui/button';
export type Action = {
  label: string;
  icon?: Component;
  onclick: () => void;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  disabled?: boolean;
};
```
If `buttonVariants` isn't exported or has a different shape, fall back to a string-literal union for variant (mirror what `src/lib/components/ui/button/index.ts` exports). Do NOT introduce tailwind-variants if button uses a different abstraction — read `src/lib/components/ui/button/button.svelte` first and match its actual `variant` prop typing.

**Markup pattern:**
```svelte
<!-- Desktop: all inline -->
<div class={cn('hidden items-center gap-2 md:flex', className)}>
  {#each actions as a}
    <Button variant={a.variant ?? 'default'} onclick={a.onclick} disabled={a.disabled}>
      {#if a.icon}{@const Icon = a.icon}<Icon class="size-4" />{/if}
      {a.label}
    </Button>
  {/each}
</div>

<!-- Mobile: first N + dropdown -->
<div class={cn('flex items-center gap-2 md:hidden', className)}>
  {#each inlineMobile as a}
    <Button variant={a.variant ?? 'default'} onclick={a.onclick} disabled={a.disabled}>
      {#if a.icon}{@const Icon = a.icon}<Icon class="size-4" />{/if}
      {a.label}
    </Button>
  {/each}
  {#if overflowMobile.length > 0}
    <DropdownMenu>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon" aria-label="More actions">
            <MoreHorizontal class="size-4" />
          </Button>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {#each overflowMobile as a}
          <DropdownMenuItem onclick={a.onclick} disabled={a.disabled}>
            {#if a.icon}{@const Icon = a.icon}<Icon class="mr-2 size-4" />{/if}
            {a.label}
          </DropdownMenuItem>
        {/each}
      </DropdownMenuContent>
    </DropdownMenu>
  {/if}
</div>
```

Use the `{#snippet child({ props })}` pattern for DropdownMenuTrigger to get asChild-like behaviour — this is the bits-ui v2 convention used elsewhere in the repo (verify against an existing usage if unsure).

Import `MoreHorizontal` from `@lucide/svelte` or `lucide-svelte` (check other components in repo for the convention).

## Files to Create (Demo + Deprecation)

### 2.5 Legacy DataTable deprecation — `src/lib/components/ui/DataTable.svelte`

Add JSDoc at the top of the file (above `<script>` or inside module script, whichever matches the file's convention):

```ts
/**
 * @deprecated Use `ModernDataTable` from `$lib/components/data/ModernDataTable.svelte` instead.
 * `ModernDataTable` has a responsive mobile-card fallback via the `mobileCardConfig` prop.
 * This legacy table has no mobile layout and will be removed after Phase 3 migration.
 */
```

Do NOT migrate any callsites — that's Phase 3.

### 2.6 Demo route — `src/routes/dev/primitives/+page.svelte`

Single showcase page, no auth, no data. Sections:

1. **ResponsiveDialog**: a `Button` that toggles `open = true`; dialog contains a title, description, a paragraph of lorem, and a Cancel/Confirm footer. Resize across 768px to see the dialog↔sheet swap.
2. **ResponsiveTabs**: 6 tabs (Tab A…Tab F) with trivial content in each. `cols={6}`. On mobile the list should snap-scroll horizontally; on desktop it should grid.
3. **FieldGrid**: a `cols={3}` grid with 8 labelled inputs (name, email, phone, address, city, state, zip, country). Each input is a shadcn Input. Wrap each Label+Input in a simple `<div class="space-y-2">`.
4. **ActionBar**: pass 5 actions (Save, Edit, Share, Archive, Delete) with lucide icons. At `md+` all show inline; below md, first 2 inline + 3 in the "More" dropdown.

Each section heading is `<h2 class="mb-4 text-lg font-semibold">`. Wrap the page in a simple container: `<div class="mx-auto max-w-4xl space-y-12 p-6">`.

**Do NOT add this route to any navigation** — it's a dev/preview URL only, accessed directly.

### 2.7 Playwright visual baseline — `tests/visual/pre-phase-3.spec.ts`

**Goal**: seed baseline screenshots before Phase 3 refactors so diffs are meaningful.

**Before writing the test**: check if `playwright.config.ts` already has an auth `storageState` fixture. If yes, reuse it. If not, **stop and add a note to this task doc** asking for direction on auth — do NOT invent an auth flow on your own. (If the config has no auth and the test can't run, still commit the test file — marked `.skip` with a comment explaining the missing auth — so the scaffold exists.)

**Routes to capture** (first ID needs a DB lookup — if the Supabase MCP is available, use it; otherwise stub a placeholder ID and leave a TODO comment):
- `/dashboard`
- `/requests`
- `/requests/[id]` — pick a real id (`select id from requests limit 1` via Supabase MCP)
- `/work/assessments/[appointment_id]` — pick a real one from DB
- `/work`

**Viewports**: `{ name: 'mobile', width: 375, height: 812 }`, `{ name: 'tablet', width: 768, height: 1024 }`, `{ name: 'desktop', width: 1440, height: 900 }`.

**Test structure**:
```ts
import { expect, test } from '@playwright/test';

const routes = [
  { name: 'dashboard', url: '/dashboard' },
  { name: 'requests', url: '/requests' },
  // ...
];
const viewports = [ /* as above */ ];

for (const { name: vpName, width, height } of viewports) {
  test.describe(`viewport ${vpName}`, () => {
    test.use({ viewport: { width, height } });
    for (const { name, url } of routes) {
      test(`${name}`, async ({ page }) => {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot(`${name}-${vpName}.png`, { fullPage: true });
      });
    }
  });
}
```

First run creates baselines under `tests/visual/pre-phase-3.spec.ts-snapshots/` — these MUST be committed.

**If Playwright cannot run in this worktree** (no dev server, auth missing, etc.): commit the spec file (even if skipped) and document the blocker in the task doc. Phase 2 is not blocked by baseline creation — the spec scaffold is the deliverable.

## Implementation Order

1. Read the following files first (don't just skim — understand the actual prop conventions):
   - `src/lib/components/ui/sheet/sheet-content.svelte` — confirm `side="bottom"` is already wired.
   - `src/lib/components/ui/dialog/dialog-content.svelte` — see what props/classes it accepts.
   - `src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte` — confirm `{#snippet child({ props })}` pattern.
   - `src/lib/components/ui/button/index.ts` and `button.svelte` — see exact variant typing to mirror in Action type.
   - `src/lib/components/assessment/AssessmentLayout.svelte` lines ~270–300 — reference snap-scroll classes.
   - Two or three existing callsites for shadcn dialogs (grep `DialogContent`) — confirm import style.
2. Implement in this order: FieldGrid (simplest) → ResponsiveTabs → ResponsiveDialog → ActionBar.
3. Add the `@deprecated` JSDoc to DataTable.
4. Build the demo route at `/dev/primitives`.
5. Write the Playwright spec.
6. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -120` — only NEW errors in files you created are blockers. Pre-existing env-var errors in `src/lib/supabase.ts`, `src/lib/supabase-server.ts`, `src/hooks.server.ts`, `src/routes/+layout.ts` are environmental and NOT your responsibility.
7. `npm run build 2>&1 | tail -40` — must succeed.
8. Report: files changed, build result, any deviations from the plan with justification, any blockers on the Playwright baseline.

## Verification

- **TypeScript check**: no NEW errors attributable to the files you created. Pre-existing env-var errors are not your problem.
- **Build**: `npm run build` succeeds.
- **Grep checks**:
  - `grep -n '@deprecated' src/lib/components/ui/DataTable.svelte` returns the JSDoc line.
  - `ls src/lib/components/ui/responsive-dialog/ src/lib/components/ui/responsive-tabs/ src/lib/components/ui/field-grid/ src/lib/components/ui/action-bar/` — all four folders exist with at least an `index.ts`.
  - `ls src/routes/dev/primitives/+page.svelte` exists.
- **Manual (post-deploy)**: open the Vercel preview URL + `/dev/primitives` on a phone AND a desktop. Resize the desktop across 768px to watch ResponsiveDialog swap and ResponsiveTabs grid-lock.

## Notes & Constraints

- This is the `claude/confident-mendel` worktree branch. Append commits here; do NOT create a new branch.
- Do NOT commit or push — the orchestrator will verify and commit after review.
- All four primitives should export from their `index.ts` using the dual-export convention that every other `src/lib/components/ui/*` folder uses. Grep `export.*as` inside a few existing `index.ts` files (e.g. `src/lib/components/ui/dialog/index.ts`) to match style exactly.
- If the actual bits-ui or existing-repo API differs from what's described here (e.g. snippet `child` pattern for DropdownMenuTrigger differs), **match the repo's actual convention** — this spec describes intent; the local source is the source of truth.
- Do NOT wire any of these primitives into existing pages. Phase 3 does that.
- If the Playwright spec can't run cleanly, commit it with `.skip` and note the blocker. The scaffold is still valuable; the baseline can be seeded in a follow-up.
