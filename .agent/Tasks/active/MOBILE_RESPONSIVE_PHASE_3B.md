# Mobile Responsiveness — Phase 3B: Page Shells

**Created**: 2026-04-17
**Status**: Planning → In Progress
**Complexity**: Simple
**Source Plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md`
**Depends on**: Phase 1 (`f27ca67`) + Phase 2 (`2ef4ebd`) + Phase 3A (`b3be12a`)

## Overview

Wrap four top-level routes in `PageContainer` for consistent max-width + responsive horizontal padding, and migrate the request-detail header action buttons to `ActionBar` so they collapse into a "More" dropdown on mobile.

**NOT in scope for this batch** (based on Explore findings):
- Collapsible metric-card sections on `/dashboard` and `/work` — the existing grids (`sm:grid-cols-2 lg:grid-cols-4`) already stack cleanly on mobile. Adding `<details>` accordions would reduce density without a real mobile win.
- `/requests` `mobileCardConfig` audit — Explore confirmed it's already populated with primaryField, secondaryField, bodyFields, footerField. No fidelity gap found.
- `ActivityTimeline` mobile treatment — it's a component with its own internal scroll handling; no horizontal overflow leaks up to the page. Revisit only if testing reveals an issue.
- Phase 2 primitives (ResponsiveDialog, ResponsiveTabs, FieldGrid) — these four pages don't need them.

## Critical rule: padding-layer hygiene

The `(app)` layout (commit `f27ca67`, Phase 1) wraps children in:
```html
<div class="flex min-w-0 flex-1 flex-col gap-4 p-4 pt-0">
```

That's the **outer page padding**. All four target pages currently layer their OWN `p-4 md:p-8` or `p-8` on top. Stacking `PageContainer`'s `px-4 sm:px-6 lg:px-8` on top of that gives **three layers of horizontal padding** at md+.

**The rule for this batch**:
> When wrapping a page in `PageContainer`, REMOVE the page's own outer `p-*` classes. The layout owns vertical padding (`p-4 pt-0`); `PageContainer` owns responsive horizontal padding. Don't double up.

If the page's outer div has other layout classes (`flex-1`, `space-y-6`), move them to `PageContainer`'s `class` prop.

**Example transformation:**

Before:
```svelte
<div class="flex-1 space-y-6 p-8">
  <PageHeader ... />
  <Card>...</Card>
</div>
```

After:
```svelte
<PageContainer class="flex-1 space-y-6">
  <PageHeader ... />
  <Card>...</Card>
</PageContainer>
```

`space-y-6` attaches to `PageContainer`'s internal div and spaces its immediate children correctly.

## Reference files (read before editing)

1. `src/lib/components/layout/PageContainer.svelte` — confirm the `class` prop forwards, confirm its base classes are `mx-auto w-full min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8`.
2. `src/lib/components/ui/action-bar/action-bar.svelte` + `index.ts` — confirm the `Action` type shape and the `actions`, `inlineCount`, `class` props shipped in Phase 2.
3. `src/routes/(app)/+layout.svelte` line 130 — confirm the outer layout padding for context (don't edit).

## Files to modify

### 3B.1 — `src/routes/(app)/requests/+page.svelte`

Current outer wrapper (line ~106):
```svelte
<div class="flex-1 space-y-4 p-4 md:space-y-6 md:p-8">
```

Change to:
```svelte
<PageContainer class="flex-1 space-y-4 md:space-y-6">
```

Drop the `p-4 md:p-8`. Close with `</PageContainer>`. Add the import: `import PageContainer from '$lib/components/layout/PageContainer.svelte';`.

No ActionBar — the single "New Request" button doesn't meet the 2+ threshold.

### 3B.2 — `src/routes/(app)/requests/[id]/+page.svelte`

Two changes:

**A. PageContainer wrap.** Current outer (line ~156):
```svelte
<div class="flex-1 space-y-6 p-8">
```
Change to:
```svelte
<PageContainer class="flex-1 space-y-6">
```

**B. ActionBar migration.** Header actions snippet at ~161–201 renders 3–4 conditional buttons (Back + Accept/Reactivate + Edit + Cancel). Structure them as an `Action[]`:

1. Read the current snippet first to see exact button props, labels, handlers, and conditional guards.
2. Build an `actions` array **inside the script section** (likely a `$derived` so it updates with status changes). Pattern:
   ```ts
   import type { Action } from '$lib/components/ui/action-bar';
   import { Check, Pencil, X, RotateCcw } from 'lucide-svelte';
   // ...
   const actions = $derived<Action[]>(() => {
     const list: Action[] = [];
     if (canAccept) list.push({ label: 'Accept', icon: Check, onclick: handleAccept, variant: 'default' });
     if (canReactivate) list.push({ label: 'Reactivate', icon: RotateCcw, onclick: handleReactivate, variant: 'default' });
     list.push({ label: 'Edit', icon: Pencil, onclick: handleEdit, variant: 'outline' });
     if (canCancel) list.push({ label: 'Cancel', icon: X, onclick: handleCancel, variant: 'destructive' });
     return list;
   });
   ```
3. **Keep the Back button OUTSIDE the ActionBar.** It's navigation, not an action — it should stay visible on both mobile and desktop. Render it inline before `<ActionBar {actions} />`.
4. Replace the existing button cluster inside the PageHeader `actions` snippet with:
   ```svelte
   <div class="flex items-center gap-2">
     <Button variant="ghost" onclick={handleBack}>
       <ChevronLeft class="size-4" />
       <span class="hidden sm:inline">Back</span>
     </Button>
     <ActionBar actions={actions()} inlineCount={2} />
   </div>
   ```
   (`actions()` because `$derived` of a function wrapper; if you use plain `$derived` of the array without the function wrapper, drop the parens.)
5. Use the lucide icons that match the existing button icons — read the current snippet to see which ones are already imported; reuse them to avoid duplicate imports.
6. Verify the ActionBar variant types (`'default' | 'outline' | 'destructive' | 'ghost' | ...`) match what your action buttons use. If the existing buttons use a variant the `Action` type doesn't accept, either cast or widen — but first look at what `ButtonVariant` actually resolves to in `$lib/components/ui/button`.

### 3B.3 — `src/routes/(app)/dashboard/+page.svelte`

Current structure (line ~102):
```svelte
<div class="space-y-6">
```

Change to:
```svelte
<PageContainer class="space-y-6">
```

The Explore report shows the dashboard doesn't have an outer `p-*` (content starts with `space-y-6`). That means PageContainer just adds the max-width centering + horizontal padding on top — no padding class needed to remove. Good.

No ActionBar. No collapsible sections. Just the wrap.

### 3B.4 — `src/routes/(app)/work/+page.svelte`

Current outer (line ~90):
```svelte
<div class="flex-1 space-y-6 p-8">
```

Change to:
```svelte
<PageContainer class="flex-1 space-y-6">
```

Drop the `p-8`. Import `PageContainer`.

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -120` — only NEW errors in the 4 edited files are blockers. Pre-existing env-var errors in `src/lib/supabase.ts` etc. and the 29 pre-existing `$state` warnings on shop-jobs and assessment tabs are not yours.
2. `npm run build 2>&1 | tail -30` — must succeed.
3. Quick visual sanity on each route at 375 / 768 / 1440:
   - Content stays inside the `max-w-[1600px]` container — at very wide viewports you should see whitespace at the sides. That's the container working.
   - No double padding (content doesn't feel cramped toward the sidebar or overly spaced from it).
   - On `/requests/[id]`: on a narrow viewport, header actions should collapse to "Back" + first 2 inline + "More" three-dots. Tapping "More" opens the dropdown with the remaining actions. Each conditional status action (Accept/Reactivate/Cancel) appears or hides correctly based on status.
4. `grep -n 'PageContainer' src/routes/\(app\)/requests/+page.svelte src/routes/\(app\)/requests/\[id\]/+page.svelte src/routes/\(app\)/dashboard/+page.svelte src/routes/\(app\)/work/+page.svelte` — should find at least 1 match per file (the import, plus the JSX usage).
5. `grep -n 'ActionBar' src/routes/\(app\)/requests/\[id\]/+page.svelte` — should find the import + usage.

## Report back

Tight summary (<350 words):
- Which files changed, with line counts of the change.
- Exact shape of the `Action[]` built for `/requests/[id]` — which actions, which status guards.
- Any issues encountered with the `Action.variant` type vs the page's button variants.
- Build + svelte-check result (NEW errors only).
- Any deviations from the spec with justification.

## Notes

- Branch: `claude/confident-mendel`. Append commits. Do NOT create a new branch.
- Do NOT commit or push — orchestrator handles review + commit.
- If the PageContainer import path isn't what this spec says, use whatever `src/lib/components/layout/PageContainer.svelte` actually exports (check the file; Phase 1 might have default-exported it from a different path).
- iPad mini testing context: iPad mini portrait (768×1024) sits on the `md` breakpoint. ActionBar's `md:flex`/`md:hidden` switch will put it on the desktop side (all buttons inline). That's intentional — to see the "More" dropdown you need a phone-width viewport.
