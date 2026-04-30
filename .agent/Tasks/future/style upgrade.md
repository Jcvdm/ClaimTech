# ClaimTech — Design System Implementation Guide

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
	/* ── Radius ─────────────────────────────────────────── */
	--radius-sm: 0.25rem;   /* 4px — inputs, badges */
	--radius: 0.375rem;     /* 6px — cards, buttons */
	--radius-md: 0.5rem;    /* 8px — large cards */
	--radius-lg: 0.75rem;   /* 12px — sheets, dialogs */

	/* ── Surface ────────────────────────────────────────── */
	--background: #f6f6f4;          /* canvas */
	--card: #ffffff;                /* raised surface */
	--muted: #fafaf8;               /* subtle surface / table stripe */

	/* ── Ink (content scale) ────────────────────────────── */
	--foreground: #18181b;          /* body text */
	--muted-foreground: #71717a;    /* secondary text */
	--subtle-foreground: #a1a1aa;   /* tertiary (timestamps, counts) */

	/* ── Lines ──────────────────────────────────────────── */
	--border: #e7e7e3;              /* hairlines */
	--border-strong: #d4d4d0;       /* input borders, dividers */
	--input: #d4d4d0;

	/* ── Accent (affordance blue — use sparingly) ───────── */
	--primary: #1d4ed8;             /* working blue */
	--primary-foreground: #ffffff;
	--accent: #eef2ff;              /* selected-row tint */
	--accent-foreground: #1d4ed8;
	--ring: #1d4ed8;

	/* ── Brand (login only, not app chrome) ─────────────── */
	--brand: #e11d48;
	--brand-foreground: #ffffff;

	/* ── Semantic ───────────────────────────────────────── */
	--success: #15803d;
	--success-soft: #ecfdf5;
	--success-border: #bbf7d0;
	--warning: #b45309;
	--warning-soft: #fef3c7;
	--warning-border: #fde68a;
	--destructive: #b91c1c;
	--destructive-soft: #fee2e2;
	--destructive-border: #fecaca;

	/* ── Sidebar (desk) ─────────────────────────────────── */
	--sidebar: #ffffff;
	--sidebar-foreground: #18181b;
	--sidebar-muted: #71717a;
	--sidebar-accent: #fafaf8;
	--sidebar-border: #e7e7e3;
	--sidebar-ring: #1d4ed8;

	/* ── Field (touch) ──────────────────────────────────── */
	--touch-min: 2.75rem;           /* 44px */
	--touch-lg: 3.5rem;             /* 56px — field primaries */
	--touch-xl: 4.5rem;             /* 72px — field CTAs */

	/* ── Density ────────────────────────────────────────── */
	--density-row: 2.75rem;         /* 44px table row on desk */
	--density-row-field: 4rem;      /* 64px row on tablet */
}

.dark {
	--background: #09090b;
	--card: #18181b;
	--muted: #1c1c1f;
	--foreground: #fafafa;
	--muted-foreground: #a1a1aa;
	--subtle-foreground: #71717a;
	--border: #27272a;
	--border-strong: #3f3f46;
	--input: #3f3f46;
	--primary: #60a5fa;
	--accent: #1e2a54;
	--accent-foreground: #93c5fd;
	--ring: #60a5fa;
	--success-soft: #052e1a;
	--warning-soft: #2a1a05;
	--destructive-soft: #2a0808;
	--sidebar: #0d0d0f;
	--sidebar-foreground: #fafafa;
	--sidebar-accent: #1c1c1f;
	--sidebar-border: #27272a;
}

@theme inline {
	--color-background: var(--background);
	--color-foreground: var(--foreground);
	--color-card: var(--card);
	--color-card-foreground: var(--foreground);
	--color-muted: var(--muted);
	--color-muted-foreground: var(--muted-foreground);
	--color-subtle-foreground: var(--subtle-foreground);
	--color-border: var(--border);
	--color-border-strong: var(--border-strong);
	--color-input: var(--input);
	--color-primary: var(--primary);
	--color-primary-foreground: var(--primary-foreground);
	--color-accent: var(--accent);
	--color-accent-foreground: var(--accent-foreground);
	--color-ring: var(--ring);
	--color-brand: var(--brand);
	--color-brand-foreground: var(--brand-foreground);

	--color-success: var(--success);
	--color-success-soft: var(--success-soft);
	--color-success-border: var(--success-border);
	--color-warning: var(--warning);
	--color-warning-soft: var(--warning-soft);
	--color-warning-border: var(--warning-border);
	--color-destructive: var(--destructive);
	--color-destructive-soft: var(--destructive-soft);
	--color-destructive-border: var(--destructive-border);

	--color-sidebar: var(--sidebar);
	--color-sidebar-foreground: var(--sidebar-foreground);
	--color-sidebar-muted: var(--sidebar-muted);
	--color-sidebar-accent: var(--sidebar-accent);
	--color-sidebar-border: var(--sidebar-border);

	--radius-sm: var(--radius-sm);
	--radius-md: var(--radius);
	--radius-lg: var(--radius-md);
	--radius-xl: var(--radius-lg);
}

/* Utility classes used across the app */
@layer utilities {
	.font-mono-tabular { font-variant-numeric: tabular-nums; font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
	.tap-lg  { min-height: var(--touch-lg); }
	.tap-xl  { min-height: var(--touch-xl); }
	.field-row { min-height: var(--density-row-field); }
}
```

**Migration note for Claude Code:** every usage of `bg-rose-*`, `text-rose-*`, `border-rose-*`, and `text-primary` in the signed-in app (`src/routes/(app)/**`, not `/auth/**`) should be reviewed. Most "primary" usages become `text-foreground` / `bg-foreground text-background`, not the accent blue — the accent is reserved for **truly interactive** affordances, not decoration. The `/auth/**` pages can keep the brand color by using `bg-brand` / `text-brand`.

---

## 2 · Typography

No custom font needed yet — the system stack is fine, but be explicit:

```css
/* src/app.css — add to :root */
:root {
	--font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, system-ui, sans-serif;
	--font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

html { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
```

**Size scale** (use Tailwind defaults, committed):

| Role | Class | px |
| --- | --- | --- |
| Page H1 | `text-xl font-semibold tracking-tight` | 20 |
| Section title | `text-base font-semibold` | 16 |
| Body | `text-sm` | 14 |
| Dense body (tables, forms) | `text-[13.5px]` | 13.5 |
| Label / eyebrow | `text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground` | 11.5 |
| Numeric / code | `font-mono-tabular text-[12.5px]` | 12.5 |

**Rule:** any ID (claim refs, plate numbers, part codes, totals) uses `font-mono-tabular`. Never sans-serif for numbers that align in columns.

---

## 3 · Component conventions

All components follow shadcn-svelte structure (`$lib/components/ui/<name>`). Build or edit the ones below.

### 3.1 · Button — retune variants

`$lib/components/ui/button/button.svelte` — keep the API, change the variants:

```ts
// inside the tailwind-variants config
const buttonVariants = tv({
	base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
	variants: {
		variant: {
			// Use for the ONE primary CTA on a page. Dark, high contrast.
			default: 'bg-foreground text-background hover:bg-foreground/90',
			// Use for the accent path (submit, authorise, continue). Blue.
			accent: 'bg-primary text-primary-foreground hover:bg-primary/90',
			// Most buttons in the app. Outlined.
			outline: 'border border-border-strong bg-card hover:bg-muted',
			// Toolbar, nav, tertiary.
			ghost: 'hover:bg-muted text-muted-foreground hover:text-foreground',
			destructive: 'bg-destructive text-primary-foreground hover:bg-destructive/90',
			// Brand color — only on /auth pages.
			brand: 'bg-brand text-brand-foreground hover:bg-brand/90'
		},
		size: {
			sm: 'h-8 px-3 text-xs',
			default: 'h-[30px] px-3',      // desk default — compact
			lg: 'h-10 px-4',
			xl: 'h-11 px-5',               // field default — 44px
			touch: 'h-14 px-5 text-[15px]', // field primary — 56px
			icon: 'h-[30px] w-[30px]',
			'icon-lg': 'h-11 w-11'
		}
	},
	defaultVariants: { variant: 'outline', size: 'default' }
});
```

**Rule of one:** on any given page, exactly one button uses `variant="default"` or `variant="accent"`. Everything else is `outline` or `ghost`. If you find yourself with two filled buttons next to each other, one of them is wrong.

### 3.2 · Badge — rebuild

`$lib/components/ui/badge/badge.svelte` — rebuild variants around the status soft-colors. This becomes the single way to show stage / status chips.

```ts
const badgeVariants = tv({
	base: 'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11.5px] font-medium leading-[18px] whitespace-nowrap',
	variants: {
		tone: {
			muted: 'bg-muted border-border text-muted-foreground',
			info: 'bg-accent border-[color:var(--accent)] text-accent-foreground',
			success: 'bg-success-soft border-success-border text-success',
			warning: 'bg-warning-soft border-warning-border text-warning',
			destructive: 'bg-destructive-soft border-destructive-border text-destructive'
		}
	},
	defaultVariants: { tone: 'muted' }
});
```

Stage → tone mapping (encode in one place, e.g. `src/lib/stage.ts`):

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
	'Finalized': 'muted'
} as const;
```

### 3.3 · Card — keep, but standardise padding

shadcn `Card` is fine. Adopt these rules so every card in the app feels the same:

- `CardHeader`: `px-4 py-2.5` with a 1px bottom border (`border-b border-border`)
- `CardHeader` title: `text-[13px] font-semibold`
- `CardContent`: `p-4` (data cards) or `p-3` (dense list cards)
- No shadows on data cards. Shadows are reserved for modals, popovers, sheets.
- Border radius: `rounded-md` (6px). `rounded-lg` only on dialogs.

### 3.4 · Table — the workhorse

Most engineer time is spent here. The current table is fine structurally but needs layout rules.

- Header row: `bg-muted text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground h-9`
- Data row: `h-11 text-[13.5px] hover:bg-muted` (that's 44px — fits touch-min)
- First column for IDs: `font-mono-tabular text-primary` (the ID is clickable — blue signals that)
- Numeric columns: right-aligned, `font-mono-tabular`
- Progress column: 4px bar with a monospace percentage on the right
- Selected row: `bg-accent` (not rose)
- Zero row padding on mobile — tables get swapped for a card list at `< md`

Reference implementation in `$lib/components/ui/work-queue-table.svelte` (new file). Keep column defs in a prop so stages/columns are swappable per tab.

### 3.5 · Sidebar (desk shell) — restyle

Open `$lib/components/ui/sidebar` and change:

- Background: `bg-sidebar` (now white, not slate-900)
- 224px wide
- Group labels: `text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground px-2.5 pt-1 pb-1.5`
- Item row: `h-8 px-2.5 rounded-sm text-[13.5px]`, active state = `bg-sidebar-accent font-semibold` + a 2px left bar in `bg-foreground`
- Badge on the right: monospace count, `text-[11px] text-muted-foreground`

The dark slate sidebar was heavy and visually dominant. A light sidebar calms the whole page down and lets the data be the hero.

### 3.6 · Step rail — new component

Build `$lib/components/assessment/step-rail.svelte` for the 13-step assessment nav (Summary → Identification → ... → Audit). Not a shadcn primitive — it's specific to this product.

Spec:

- Fixed 232px column, sticky inside the page.
- Each step = row with [status ring SVG] · [label] · [% if partial].
- Status ring: 14px SVG. Complete = filled green circle with white tick. In progress = arc at `(pct/100) * 37.7` of the circumference. Not started = empty outline in `border-strong`.
- Active step: `bg-muted`, 2px left bar in `bg-foreground`, `font-semibold`.
- Reuse the status-ring SVG for the tablet pager dots — same visual language.

---

## 4 · Layout patterns

### 4.1 · Desk page skeleton

Every signed-in page uses the same three-zone layout. Enforce via a `(app)/+layout.svelte` that renders a `<Sidebar>` + `<Topbar>` and a slot.

```
┌─────────┬──────────────────────────────────────────────┐
│ Sidebar │ Topbar (44px: breadcrumb · search · help)    │
│ (224px) ├──────────────────────────────────────────────┤
│         │ Page header (72px: title · subtitle · CTAs)  │
│         ├──────────────────────────────────────────────┤
│         │ Filter/tab strip (optional, 40px)            │
│         ├──────────────────────────────────────────────┤
│         │ Content (gutter 24px)                        │
└─────────┴──────────────────────────────────────────────┘
```

No gradient backgrounds. No hero banners. No decorative SVG in the app chrome. The page earns visual interest from the content, not from the frame.

### 4.2 · Two-pane assessment layout

All assessment steps (Damage, Estimate, Tyres, etc.) share a two-pane body:

- Left (flex 1): the editable thing (schematic, line items, photo grid)
- Right (360px fixed): sticky sidebar with totals / policy checks / step-specific meta

Never fold the right pane into an accordion below on desktop — engineers need the totals in view while editing. On tablet it becomes a bottom sheet triggered from a floating "Totals" button.

### 4.3 · Field tablet skeleton

Separate layout: `src/routes/field/+layout.svelte`.

```
┌─────────────────────────────────────────────────────┐
│ Top bar (64px: back · title + subtitle · sync)      │
├─────────────────────────────────────────────────────┤
│ Content                                             │
├─────────────────────────────────────────────────────┤
│ Bottom bar (80px: prev · step pager · next)         │
└─────────────────────────────────────────────────────┘
```

- Top + bottom bars are `bg-card`.
- The 13-dot step pager (thin pills, 22×6) is the tablet's version of the step rail — all 13 always visible, the active one in `bg-primary`.
- Primary "Next" CTA always the right third of the bottom bar — thumb lands there naturally when holding the iPad.

### 4.4 · Field phone skeleton

`src/routes/field/phone/+layout.svelte` (or detect via `window.innerWidth < 640`).

- Top: 48px status spacer + 64px title zone (title + back).
- Content scrollable.
- Sticky bottom CTA bar when there's a primary action (`Save zone`, `Take photo`).
- Bottom tab nav (82px incl. home indicator) on top-level pages: Today · Queue · Capture · More.

---

## 5 · Offline / sync behaviour

Non-negotiable for the field. Engineering patterns, not design, but the UI must reflect them:

- Every write goes through a local queue first (IndexedDB via Dexie or similar — you already have `@vite-pwa/sveltekit`).
- Global sync state at `$lib/stores/sync.svelte.ts` exposing `{ online, queued, lastSync }`.
- Sync pill in the top bar:
	- `online && queued === 0` → `bg-success-soft` · green dot · "Synced"
	- `online && queued > 0` → `bg-warning-soft` · amber dot · "Syncing {queued}"
	- `!online` → `bg-warning-soft` · amber dot · "Offline · {queued} queued"
- Photo upload: compress with `browser-image-compression` client-side, store blob + metadata in the queue, upload when online, replace blob URL with the signed URL on success. Never block the user.

---

## 6 · Photos — the core interaction

Engineers take hundreds. Rules:

- **Guided capture** for the mandatory set (the 12-angle exterior 360°, VIN, odometer, licence disc). Built as a full-screen modal with one frame at a time + a frame-fill hint. Shutter → auto-advance to next required angle.
- **Free capture** for damage zones — tap-to-shoot, filmstrip at the bottom.
- Preview uses `bigger-picture` (already installed).
- Filmstrip thumbnails: 110×82 on tablet, 50×50 on phone. Selected has a 2px `border-primary`.
- Long-press to reorder. Swipe to delete (with undo toast).

Component: `$lib/components/field/photo-capture.svelte`. Props: `required: string[]` (angle labels), `captured: Photo[]`, `mode: 'guided' | 'free'`.

---

## 7 · Form density (desk)

The current forms are **spacious** — too much air between fields for an internal tool. Retune:

- Field height: `h-8` (32px) for desk, `h-11` (44px) for field.
- Label above input, `text-[11.5px] font-medium text-muted-foreground mb-1`.
- Two-up fields use `grid grid-cols-2 gap-2` — always an 8px gap, never 16px.
- Sections separated by a 1px border and 16px of padding, not by large margins.
- Autosave indicator ("Saved 4s ago") goes top-right of the page header, not inline with fields.

### Chips instead of selects

For enum fields with ≤ 7 options (damage condition, repair action, severity), render them as a row of chip buttons, not a `<Select>`. Faster on touch, avoids the picker modal, communicates the full option set at a glance.

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

---

## 8 · Iconography

Lucide only. Consistency rules:

- Default size: 14px in dense contexts (table cells, badges), 16px in buttons, 18px in page headers, 20px+ in field.
- `stroke-width={1.5}` always — never the default 2. Thinner strokes read as more precise, more technical, less childlike.
- No decorative icons. An icon next to a label must add information or be removed.
- Common mappings:
	- Success → `CheckCircle2`
	- Warning → `AlertTriangle`
	- Error → `XCircle`
	- Camera → `Camera`
	- Sync → `RefreshCw` (rotating when active)
	- Offline → `CloudOff`

---

## 9 · What to delete

In the current codebase, audit and remove:

- Any `rose-*` / `pink-*` / `fuchsia-*` utility class in `src/routes/(app)/**`. They stay in `/auth`.
- Gradient backgrounds on cards, buttons, page headers. Delete all `bg-gradient-to-*` usages in app pages.
- Decorative icons next to H1s, section titles, and label text.
- `shadow-lg` / `shadow-xl` on cards (keep only on dialogs, popovers, sheets).
- Large hero imagery inside the signed-in app. Photos render at their real size in content.
- Any custom `rounded-2xl` / `rounded-3xl`. Max is `rounded-lg` (12px) for dialogs.

These are all sources of the "crammed / over-decorated" feeling. Removing them is 60% of the redesign.

---

## 10 · Page-by-page migration priority

Do them in this order — each is independent and shippable.

1. **`src/app.css` tokens + button + badge** — ~1 day. Every page rerenders in the new palette. Expect some visual breakage; this is where you fix it wholesale.
2. **App shell** (sidebar + topbar + `(app)/+layout.svelte`) — ~1 day. Light sidebar, compact topbar with search.
3. **Work queue (`/work`)** — ~1 day. Dense table, stage tabs with counts, filter chips.
4. **Assessment shell** (step rail + two-pane + autosave) — ~1 day. Every step inherits.
5. **Damage step** — ~1 day. Schematic + zone table + photo grid.
6. **Estimate step** — ~1 day. Line-item table + sticky totals + policy checks.
7. **Auth screens** — 0.5 day. Restyle against the new tokens. Brand color lives here.
8. **Field tablet routes** (`/field/**`) — ~2 days. New layout, 64/80 bars, chip inputs, guided capture.
9. **Field phone routes** — ~1.5 days. Bottom-nav shell, camera screen, quick zone.
10. **Offline/sync state** — ~1 day. Global store, sync pill, queue UI.

Total: ~10 working days for one engineer to take the whole thing across.

---

## 11 · Prompt template for Claude Code

Paste this at the top of any Claude Code session where you're applying this spec to a specific page:

> You are migrating the ClaimTech Svelte 5 app to the design system in `docs/design-system.md`. The stack is Svelte 5 + SvelteKit + Tailwind v4 + shadcn-svelte (bits-ui) + Lucide. Use utility-first Tailwind only. Prefer editing existing `$lib/components/ui/*` components over creating new ones; if a pattern isn't in the guide, follow shadcn-svelte conventions. Keep Svelte 5 runes (`$props`, `$state`, `$derived`, `$bindable`) — no `export let`. Use `font-mono-tabular` for IDs and numerics, never sans. Reserve `bg-primary` / `text-primary` for interactive affordances (links, primary CTAs, selected rows). The brand rose color is allowed only in `/auth/**`. Page you're migrating: **[PAGE_PATH]**. Start by listing the files you'll edit, then show me the diffs.

Tell Claude Code the **one page** to migrate and let it pattern-match off the nearest already-migrated page. Don't ask it to do the whole app in one pass — it will miss nuance.

---

## 12 · Reference files

The wireframes you've been reviewing are the visual source of truth:

| Wireframe section | Spec reference |
| --- | --- |
| Work queue · dense table | §3.4, §4.1 |
| Assessment · Damage (light) | §3.5, §4.2, §6 |
| Assessment · Estimate (light) | §4.2, §7 |
| Field kit · tablet | §4.3, §7 (chips) |
| Field kit · phone | §4.4, §5, §6 |

When in doubt, open `Claimtech Restyle.html`, scroll to the relevant artboard, and read the structure there.
