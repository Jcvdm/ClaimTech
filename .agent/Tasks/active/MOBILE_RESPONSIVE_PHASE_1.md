# Mobile Responsiveness — Phase 1: Foundation

**Created**: 2026-04-17
**Status**: Planning → In Progress
**Complexity**: Moderate
**Source Plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md` (user-approved)

## Overview

Invisible scaffolding PR. No visual redesign. Establishes the responsive contract the rest of the phases depend on. Ships atomically so later work rebases on stable foundations.

**Root cause being fixed**: `SidebarInset`'s main content wrapper lacks `min-w-0`, allowing children with `min-w-[...]` to push content over the sidebar on zoom. Plus assorted safety nets (iOS zoom-on-focus, overscroll hijack, dynamic viewport units, touch-target defaults).

## Files to Modify

### 1. `src/app.css` — add safety CSS + design tokens
Under `@layer base` (after existing rules):
```css
html, body {
  overflow-x: clip;
}

input, select, textarea {
  font-size: max(16px, 1rem);
}

.overflow-y-auto, .overflow-auto, .overflow-y-scroll {
  overscroll-behavior: contain;
}
```

Add to `:root` (top block, near `--radius`):
```css
--touch-target-min: 2.75rem;
--page-px: 1rem;
--page-px-sm: 1.5rem;
--page-px-lg: 2rem;
```

### 2. `src/routes/(app)/+layout.svelte` line 130
**Current:** `<div class="flex flex-1 flex-col gap-4 p-4 pt-0">`
**Change to:** `<div class="flex min-w-0 flex-1 flex-col gap-4 p-4 pt-0">`

### 3. `src/lib/components/ui/button/button.svelte`
Current `size` variants (inspected at lines 19–26):
- `default: "h-9 px-4 py-2 has-[>svg]:px-3"` → change height to `h-10`
- `icon: "size-9"` → change to `size-10`
- Leave `sm`, `lg`, `icon-sm`, `icon-lg` alone (they're deliberate density variants)

### 4. Dynamic viewport units — `h-screen` / `min-h-screen` → `h-dvh` / `min-h-dvh`
Files confirmed to contain these classes (verify with `grep -n` and replace):
- `src/routes/+page.svelte`
- `src/routes/auth/login/+page.svelte`
- `src/routes/auth/shop-login/+page.svelte`
- `src/routes/auth/forgot-password/+page.svelte`
- `src/routes/auth/auth-code-error/+page.svelte`
- `src/routes/account/set-password/+page.svelte`
- `src/lib/components/forms/PdfUpload.svelte` (verify — may be intentional inside a dialog)

**Do NOT touch** the PDF template files (`src/lib/templates/*.ts`) — they're HTML-to-PDF, `100vh` is correct there.

**Prefer `h-dvh`** (dynamic) over `h-svh` (small) for full-page chrome — `dvh` shrinks with mobile browser chrome, which is what users want for login pages.

## Files to Create

### 5. `src/lib/components/layout/PageContainer.svelte`
```svelte
<script lang="ts">
  import { cn } from '$lib/utils';
  type Props = {
    class?: string;
    children: import('svelte').Snippet;
  };
  let { class: className = '', children }: Props = $props();
</script>

<div class={cn('mx-auto w-full min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8', className)}>
  {@render children()}
</div>
```

### 6. `.agent/System/responsive_design.md`
Short one-pager documenting the contract:
- **Sidebar breakpoint**: `lg` (1024px) — below = bits-ui Sheet. Tablets in portrait get the mobile sidebar (intentional).
- **Layout breakpoint**: `md` (768px) for grids, dialogs-vs-sheets, form columns. Decoupled from sidebar mode.
- Every page should sit inside `PageContainer` (or `AssessmentLayout`, which has its own container).
- Any `min-w-[Npx]` or `w-[Npx]` outside a narrow allowlist = mobile bug.
- Minimum interactive touch target: 44×44 CSS px. Use `var(--touch-target-min)` or `min-h-11 min-w-11`.
- Full-height chrome uses `h-dvh`/`min-h-dvh`, never `h-screen`/`100vh`.
- Scrollable regions use `overscroll-behavior: contain` (global default applied in `app.css`).

## Implementation Steps

1. Edit `src/app.css` (global CSS + tokens).
2. Edit `src/routes/(app)/+layout.svelte` line 130 (add `min-w-0`).
3. Edit `src/lib/components/ui/button/button.svelte` (bump `default` + `icon` sizes).
4. Create `src/lib/components/layout/PageContainer.svelte`.
5. Create `.agent/System/responsive_design.md`.
6. Sweep `h-screen`/`min-h-screen` in the 7 listed files, replacing with `h-dvh`/`min-h-dvh`.
7. Run `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -80` — only new errors from the files you touched are blockers. Pre-existing env-var errors (`PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are environmental to the worktree and NOT your responsibility.
8. Run `npm run build 2>&1 | tail -40` to confirm no build regressions.
9. Report: files changed, build result, any deviations from the plan with justification.

## Verification

- **TypeScript check**: no NEW errors in the files you touched (the 4 env-var errors in `src/lib/supabase.ts`, `src/lib/supabase-server.ts`, `src/hooks.server.ts`, `src/routes/+layout.ts` are pre-existing and unrelated).
- **Build**: `npm run build` succeeds.
- **Manual sanity**: after changes, the only visible delta to a user should be (a) slightly taller default buttons, (b) taller icon buttons. Everything else is invisible.

## Notes

- This is the `claude/confident-mendel` worktree branch. Do NOT commit or push yet — the orchestrator will verify first.
- Button size change is intentionally narrow: only `default` and `icon` variants. Don't touch `sm` (dense toolbars still need it).
- `PageContainer` is not yet wired anywhere — that's Phase 3. Just create it.
- The `overflow-x: clip` global uses `clip`, not `hidden`, so `position: sticky` keeps working. This matters for the sidebar and any future sticky headers.
