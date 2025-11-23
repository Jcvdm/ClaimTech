## Overview
- Objective: Replace ad‑hoc button and tab markup with reusable shadcn‑svelte components using `cn` and Tailwind Variants, unified across Request, Inspection, Assessments (open/finalized), and Archive.
- Scope: Top action bars, in‑page action buttons, and tab headers; preserve existing app look while modernizing markup.
- Dependencies: Existing `Button`, `Tabs`, `Badge`, `Card` components in `$lib/components/ui/*`; lucide icons; Tailwind Variants.

## UI Components
### Buttons
- Keep `$lib/components/ui/button/button.svelte` as the single source of truth.
- Add a lightweight wrapper API (optional) for common icon spacing and loading state:
```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Loader2 } from 'lucide-svelte';
  export let loading = false;
  export let variant: 'default'|'outline'|'destructive'|'secondary'|'ghost'|'link' = 'default';
  export let size: 'sm'|'default'|'lg'|'icon'|'icon-sm'|'icon-lg' = 'default';
</script>
<Button {variant} {size} disabled={loading}>
  {#if loading}<Loader2 class="mr-2 animate-spin" />{/if}
  {@render children?.()}
</Button>
```
- Usage rules:
  - Primary actions: `variant="default"`, size `default|lg`.
  - Secondary actions: `variant="outline"`.
  - Destructive: `variant="destructive"`.
  - Icon‑only: `size="icon"` with accessible `aria-label`.

### Tabs (top navigation)
- Use shadcn `Tabs`, `TabsList`, `TabsTrigger` uniformly.
- For underline style consistent with app:
```svelte
<Tabs bind:value={currentTab} onValueChange={(v)=>onTabChange(v)} class="w-full">
  <TabsList class="flex w-full flex-wrap items-center gap-1 rounded-none border-b border-border bg-white p-0">
    {#each tabs() as tab}
      <TabsTrigger
        value={tab.id}
        class="relative flex items-center gap-1 sm:gap-2 rounded-none border-none border-b-2 border-transparent px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm font-medium data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
      >
        {#if tab.icon}{@const Icon = tab.icon}<Icon class="h-3 w-3 sm:h-4 sm:w-4" />{/if}
        <span class="hidden sm:inline">{tab.label}</span>
        <span class="sm:hidden">{getShortLabel(tab.label)}</span>
        {#if getMissingFieldsCount(tab.id) > 0}
          <Badge variant="destructive" class="ml-1 h-4 min-w-4 px-1 text-[10px] font-bold">
            {getMissingFieldsCount(tab.id)}
          </Badge>
        {/if}
      </TabsTrigger>
    {/each}
  </TabsList>
</Tabs>
```
- Key overrides: add `border-none h-auto` for triggers to eliminate extra borders/height from defaults; keep active bottom border color per section.

## Pages To Update
- Assessments detail: replace custom `<button>` tab markup with `Tabs` (as above); use `Button` for Save/Cancel/Exit.
- Archive: normalize its tab header classes to the same underline pattern.
- Requests list/detail: ensure action buttons import `Button` and follow variant rules.
- Inspections list/detail: same consolidation for buttons; any inline `<button>` with Tailwind classes should be replaced.
- Finalized Assessments and Additionals: use `Button` for actions; avoid per‑page ad‑hoc button classes.

## Layout Spacing and Overlap Fix
- Header and tabs area:
  - Make header bar `bg-white border-b` with `sticky top-0 z-30` if needed.
  - Place `Tabs` in a separate `bg-white border-b` container with `z-20`.
  - Content wrapper: `pt-2 sm:pt-3 lg:pt-4` to avoid overlap on small screens.
- Tabs triggers: remove `h-[calc(100%-1px)]` via `h-auto` and `border-none` as shown.

## Implementation Sequence
1. Create a small `LoadingButton` wrapper (optional) to standardize loading states.
2. Refactor Assessments top tabs to `Tabs` with underline style and spacing fixes.
3. Align Archive page tabs to the same pattern.
4. Audit codebase for raw `<button>` with long Tailwind class chains; replace with `Button` variants and sizes.
5. Standardize action bars in Request/Inspection/Assessments list pages to use `Button` consistently.

## Testing Strategy
- Visual: Compare before/after on desktop and mobile for each updated page, focusing on icon alignment, spacing, hover/active states, and tab active indicator.
- Accessibility: Verify `role="tab"`/`aria-selected` on tabs; `aria-label` for icon buttons.
- E2E smoke: Navigate between tabs; ensure `onTabChange` still saves and updates state; confirm no `net::ERR_ABORTED` during normal navigation.

## Risk Mitigation
- Keep variants identical to current `Button` API; avoid breaking changes.
- Make tab class overrides local to page wrappers to isolate CSS impacts.
- Stage updates page‑by‑page; rollback is straightforward since changes are declarative.

## Deliverables
- Unified tabs markup on Assessments and Archive with non‑overlapping header.
- Button usage standardized across pages with clear variant/size rules.
- Optional `LoadingButton` wrapper for consistent loading UX.
