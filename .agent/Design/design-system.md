# ClaimTech — Design System Implementation Guide

**Source**: user-provided spec (2026-04-23). Verbatim copy saved here as the written source of truth for future phases.

**For Claude Code.** Written against the actual stack: Svelte 5 + SvelteKit + Tailwind v4 + shadcn-svelte + bits-ui + Lucide.

This is the spec to move the app from "crammed marketing-page slate + rose" to the **utilitarian workshop-tool** direction the wireframes are in. It changes tokens, adds a few component patterns, and establishes layout rules — it is not a rewrite.

---

## 0 · Mental model

Two contexts, one token system:

| Context | Where it's used | Feel |
| --- | --- | --- |
| **Desk** | `/work`, assessments, admin — 1280px+ monitors | Dense, calm, monochrome, data-first |
| **Field** | Anything an engineer touches on an iPad or phone on site | Big hit targets (≥44px, ideally 56px for primaries), offline-aware, camera-first, chip-based inputs |

Same tokens. Different density. **Never** reuse a desktop page on a tablet by just shrinking it — that's what's painful today. Tablet-specific routes live in `/field/**` (or behind a responsive breakpoint fork), never at the same layout as `/work/**`.

---

## 1 · Token changes — `src/app.css`

Replace the current `:root` block. Keep the existing structure (you're already using `@theme inline` + CSS vars), but **retune the values**. The big moves:

- Drop rose as the primary for the app chrome. Keep it available as `--brand` for the login/marketing moment only.
- Introduce a neutral ink scale + a single working-blue accent used **only for affordances** (selected rows, focus rings, primary CTAs).
- Status colors (ok / warn / err) get proper soft-background variants so badges don't need custom classes.

```css
/* src/app.css — REPLACE the :root + .dark blocks */

:root {
	/* — Radius */
	--radius-sm: 0.25rem;   /* 4px */
	--radius: 0.375rem;     /* 6px */
	--radius-md: 0.5rem;    /* 8px */
	--radius-lg: 0.75rem;   /* 12px */

	/* — Surface */
	--background: #f6f6f4;
	--card: #ffffff;
	--muted: #fafaf8;

	/* — Ink */
	--foreground: #18181b;
	--muted-foreground: #71717a;
	--subtle-foreground: #a1a1aa;

	/* — Lines */
	--border: #e7e7e3;
	--border-strong: #d4d4d0;
	--input: #d4d4d0;

	/* — Accent (spec says blue; user's direction: neutral/rose) */
	--primary: #1d4ed8;
	--primary-foreground: #ffffff;
	--accent: #eef2ff;
	--accent-foreground: #1d4ed8;
	--ring: #1d4ed8;

	/* — Brand (login only, not app chrome) */
	--brand: #e11d48;
	--brand-foreground: #ffffff;

	/* — Semantic */
	--success: #15803d;
	--success-soft: #ecfdf5;
	--success-border: #bbf7d0;
	--warning: #b45309;
	--warning-soft: #fef3c7;
	--warning-border: #fde68a;
	--destructive: #b91c1c;
	--destructive-soft: #fee2e2;
	--destructive-border: #fecaca;

	/* — Sidebar (desk) */
	--sidebar: #ffffff;
	--sidebar-foreground: #18181b;
	--sidebar-muted: #71717a;
	--sidebar-accent: #fafaf8;
	--sidebar-border: #e7e7e3;
	--sidebar-ring: #1d4ed8;

	/* — Touch */
	--touch-min: 2.75rem;   /* 44px */
	--touch-lg: 3.5rem;     /* 56px — field primaries */
	--touch-xl: 4.5rem;     /* 72px — field CTAs */

	/* — Density */
	--density-row: 2.75rem;
	--density-row-field: 4rem;
}
```

### Button variants (from spec section 3.1)

```ts
variants: {
  variant: {
    // ONE primary CTA — DARK, high contrast. bg-foreground text-background.
    default: 'bg-foreground text-background hover:bg-foreground/90',
    // Accent path — submit/authorise/continue. BLUE in spec.
    accent:  'bg-primary text-primary-foreground hover:bg-primary/90',
    // Most buttons — outlined.
    outline: 'border border-border-strong bg-card hover:bg-muted',
    ghost:   'hover:bg-muted text-muted-foreground hover:text-foreground',
    destructive: 'bg-destructive text-primary-foreground hover:bg-destructive/90',
    // Brand — /auth only.
    brand:   'bg-brand text-brand-foreground hover:bg-brand/90',
  },
  size: {
    sm: 'h-8 px-3 text-xs',
    default: 'h-[30px] px-3',       // desk default — compact
    lg: 'h-10 px-4',
    xl: 'h-11 px-5',                // field default — 44px
    touch: 'h-14 px-5 text-[15px]', // field primary — 56px
    icon: 'h-[30px] w-[30px]',
    'icon-lg': 'h-11 w-11',
  },
}
```

**Rule of one**: on any given page, exactly one button uses `variant="default"` or `variant="accent"`. Everything else is `outline` or `ghost`.

### Badge tones

```ts
variant: {
  muted: 'bg-muted border-border text-muted-foreground',
  info: 'bg-accent border-accent text-accent-foreground',
  success: 'bg-success-soft border-success-border text-success',
  warning: 'bg-warning-soft border-warning-border text-warning',
  destructive: 'bg-destructive-soft border-destructive-border text-destructive',
}
```

### Stage → tone map (src/lib/stage.ts)

```ts
export const stageTone = {
  'In progress': 'info',
  'Started': 'info',
  'Waiting photos': 'warning',
  'Additionals': 'warning',
  'FRC pending': 'warning',
  'Quoted': 'success',
  'Authorised': 'success',
  'Invoiced': 'muted',
  'Finalized': 'muted',
} as const;
```

---

## Typography

```css
--font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, system-ui, sans-serif;
--font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
```

| Role | Class | px |
| --- | --- | --- |
| Page H1 | `text-xl font-semibold tracking-tight` | 20 |
| Section title | `text-base font-semibold` | 16 |
| Body | `text-sm` | 14 |
| Dense body | `text-[13.5px]` | 13.5 |
| Label / eyebrow | `text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground` | 11.5 |
| Numeric / code | `font-mono-tabular text-[12.5px]` | 12.5 |

**Rule**: any ID (claim refs, plates, part codes, totals) uses `font-mono-tabular`. Never sans-serif for column-aligned numbers.

---

## Table

- Header row: `bg-muted h-9 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground`
- Data row: `h-11 text-[13.5px] hover:bg-muted`
- First column (IDs): `font-mono-tabular text-primary` — spec says blue; user's direction may prefer `text-brand` (rose) for ClaimTech identity
- Numeric columns: right-aligned, `font-mono-tabular`
- Progress column: 4px bar, monospace %
- Selected row: `bg-accent`
- Mobile: swap table for card list at `< md`

## Sidebar (desk)

- `bg-sidebar` (white)
- 224px wide
- Group labels: `text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground px-2.5 pt-1 pb-1.5`
- Item row: `h-8 px-2.5 rounded-sm text-[13.5px]`
- Active: `bg-sidebar-accent font-semibold` + 2px left bar in `bg-foreground`
- Right badge: monospace count, `text-[11px] text-muted-foreground`

## Step rail (new component)

13-step assessment nav. Fixed 232px column, sticky.

- Each step = `[status ring SVG] · [label] · [% if partial]`
- Status ring 14px SVG:
  - Complete = filled green circle + white tick
  - In progress = arc at `(pct/100) * 37.7` circumference
  - Not started = empty outline `border-strong`
- Active step: `bg-muted`, 2px left bar `bg-foreground`, `font-semibold`
- Same ring used in tablet 13-dot pager — same visual language

---

## Desk page skeleton

```
┌─────────┬──────────────────────────────────────────────┐
│ Sidebar │ Topbar (44px: breadcrumb · search · help)    │
│ 224px   ├──────────────────────────────────────────────┤
│         │ Page header (72px: title · subtitle · CTAs)  │
│         ├──────────────────────────────────────────────┤
│         │ Filter/tab strip (optional, 40px)            │
│         ├──────────────────────────────────────────────┤
│         │ Content (gutter 24px)                        │
└─────────┴──────────────────────────────────────────────┘
```

No gradient backgrounds. No hero banners. No decorative SVG in app chrome.

## Two-pane assessment

- Left (flex 1): editable area (schematic, line items, photo grid)
- Right (360px fixed): sticky totals / policy checks / step meta
- Desktop never folds right pane into accordion — engineers need totals in view
- Tablet: right pane becomes bottom sheet from floating "Totals" button

## Field tablet skeleton

```
┌─────────────────────────────────────────────────────┐
│ Top bar (64px: back · title + subtitle · sync)      │
├─────────────────────────────────────────────────────┤
│ Content                                             │
├─────────────────────────────────────────────────────┤
│ Bottom bar (80px: prev · step pager · next)         │
└─────────────────────────────────────────────────────┘
```

13-dot step pager (22×6 thin pills). Primary Next CTA = right third of bottom bar.

## Field phone skeleton

- Top 48px status spacer + 64px title zone
- Content scrollable
- Sticky bottom CTA bar for primary action
- Bottom tab nav 82px (incl. home indicator): Today · Queue · Capture · More

---

## Offline / sync

- Local queue via IndexedDB (Dexie or similar — `@vite-pwa/sveltekit` already installed)
- `$lib/stores/sync.svelte.ts` → `{ online, queued, lastSync }`
- Sync pill in topbar:
  - Online + queued 0 → `bg-success-soft` · green dot · "Synced"
  - Online + queued > 0 → `bg-warning-soft` · amber · "Syncing {n}"
  - Offline → `bg-warning-soft` · amber · "Offline · {n} queued"
- Photo upload: compress client-side (`browser-image-compression`), queue blob, upload on reconnect, swap blob URL for signed URL

## Photos

- **Guided capture**: 12-angle exterior 360° + VIN/odometer/licence disc. Full-screen modal, one frame + fill hint, shutter auto-advances.
- **Free capture**: damage zones, tap-to-shoot, filmstrip at bottom.
- Preview: `bigger-picture` (already installed)
- Filmstrip: 110×82 tablet, 50×50 phone. Selected 2px `border-primary`
- Long-press to reorder. Swipe-delete with undo toast.
- Component: `$lib/components/field/photo-capture.svelte` — props `required: string[]`, `captured: Photo[]`, `mode: 'guided' | 'free'`

## Form density

- Field height: `h-8` (32px) desk, `h-11` (44px) field
- Label above, `text-[11.5px] font-medium text-muted-foreground mb-1`
- Two-up: `grid grid-cols-2 gap-2` (8px, not 16px)
- Section separators: 1px border + 16px padding (not large margins)
- Autosave indicator: top-right of page header, not inline

### Chip group for enums ≤ 7 options

```svelte
<!-- src/lib/components/ui/chip-group.svelte -->
<script lang="ts">
  let { options, value = $bindable() }: { options: string[]; value: string } = $props();
</script>

<div class="flex flex-wrap gap-1.5">
  {#each options as opt}
    <button
      type="button"
      onclick={() => (value = opt)}
      class="h-10 rounded-md border px-3.5 text-sm font-medium transition-colors {value === opt
        ? 'bg-foreground text-background border-foreground'
        : 'bg-card text-foreground border-border-strong hover:bg-muted'}"
    >
      {opt}
    </button>
  {/each}
</div>
```

## Iconography

Lucide only. `stroke-width={1.5}` always. No decorative icons.

- Dense contexts (tables, badges): 14px
- Buttons: 16px
- Page headers: 18px
- Field: 20px+

Common: `CheckCircle2`, `AlertTriangle`, `XCircle`, `Camera`, `RefreshCw` (sync), `CloudOff` (offline).

---

## What to delete

- `rose-*` / `pink-*` / `fuchsia-*` in `src/routes/(app)/**` (keep in `/auth`)
- `bg-gradient-to-*` in app chrome
- Decorative icons next to H1s / section titles
- `shadow-lg` / `shadow-xl` on data cards (keep on dialogs/popovers/sheets)
- Large hero imagery inside signed-in app
- `rounded-2xl` / `rounded-3xl` — max is `rounded-lg`

---

## Migration priority (spec's original order)

1. `src/app.css` tokens + button + badge — ~1 day
2. App shell (sidebar + topbar + `(app)/+layout.svelte`) — ~1 day
3. Work queue (`/work`) — ~1 day
4. Assessment shell (step rail + two-pane + autosave) — ~1 day
5. Damage step — ~1 day
6. Estimate step — ~1 day
7. Auth screens — 0.5 day
8. Field tablet routes (`/field/**`) — ~2 days
9. Field phone routes — ~1.5 days
10. Offline/sync — ~1 day

Total: ~10 days.
