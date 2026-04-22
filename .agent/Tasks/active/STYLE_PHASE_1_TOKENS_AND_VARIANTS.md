# Style Upgrade — Phase 1: Token Retune + Button/Badge Variants

**Created**: 2026-04-22
**Status**: In Progress
**Complexity**: Moderate (3 files, ~150 lines changed, zero callsite churn required)
**Source spec**: `.agent/Tasks/future/style upgrade.md` (full design system guide)
**Scope**: Phase 1 only — tokens + component variants. NO new components, NO layout changes, NO `/field` routes, NO step rail, NO chip group, NO damage zone work.

---

## Goal

Retune the ClaimTech design system's base tokens + add new Button/Badge variants so the user can see the new workshop-tool feel with zero callsite churn. Every existing `bg-primary`, `bg-card`, etc. still works — it just renders in the new palette.

Three files change. No existing components break. Fully reversible by reverting the three files.

---

## Design decisions (locked)

1. **`--primary` changes from rose (`#e11d48`) to working blue (`#1d4ed8`)**. This means every existing `bg-primary` / `text-primary` callsite automatically shifts to blue. That's intentional — it's how the user will "see the feel" without touching 100+ callsites.
2. **Rose is preserved as `--brand`** (new token) for auth pages + any intentionally-branded moments.
3. **Button + Badge changes are ADDITIVE** — existing variants keep working. We add `brand` to Button, `touch`/`xl` sizes to Button, and soft-tone variants (`muted`/`info`/`success`/`warning`) to Badge.
4. **Dark mode retunes in parallel**. Not pristine — Phase 1 target is "looks reasonable", full dark-mode polish later.
5. **Radius tightens** from `0.75rem` base → `0.5rem` base. `rounded-lg` goes from 12px → 8px. More utilitarian, less "marketing site".

---

## Files to modify

### File 1 — `src/app.css` (replace `:root` + `.dark` + `@theme inline` blocks)

Preserve:
- `@import` statements (lines 1–5)
- `@custom-variant dark` (line 7)
- Z-index comment block (lines 48–54)
- `@layer base` block (lines 128–148)

**New `:root` block** — add tokens below, keep variable names backwards-compatible where shadcn depends on them:

```css
:root {
  /* Radius */
  --radius-sm: 0.25rem;         /* 4px — inputs, badges */
  --radius: 0.375rem;           /* 6px — buttons */
  --radius-md: 0.5rem;          /* 8px — cards */
  --radius-lg: 0.75rem;         /* 12px — sheets, dialogs */

  /* Page layout (preserve existing usage) */
  --touch-target-min: 2.75rem;
  --page-px: 1rem;
  --page-px-sm: 1.5rem;
  --page-px-lg: 2rem;

  /* Surface */
  --background: #f6f6f4;
  --card: #ffffff;
  --card-foreground: #18181b;
  --popover: #ffffff;
  --popover-foreground: #18181b;
  --muted: #fafaf8;

  /* Ink */
  --foreground: #18181b;
  --muted-foreground: #71717a;
  --subtle-foreground: #a1a1aa;

  /* Lines */
  --border: #e7e7e3;
  --border-strong: #d4d4d0;
  --input: #d4d4d0;

  /* Accent (affordance blue) */
  --primary: #1d4ed8;
  --primary-foreground: #ffffff;
  --secondary: #f4f4f2;
  --secondary-foreground: #18181b;
  --accent: #eef2ff;
  --accent-foreground: #1d4ed8;
  --ring: #1d4ed8;

  /* Brand (auth/marketing only) */
  --brand: #e11d48;
  --brand-foreground: #ffffff;

  /* Semantic */
  --success: #15803d;
  --success-soft: #ecfdf5;
  --success-border: #bbf7d0;
  --warning: #b45309;
  --warning-soft: #fef3c7;
  --warning-border: #fde68a;
  --destructive: #b91c1c;
  --destructive-soft: #fee2e2;
  --destructive-border: #fecaca;

  /* Charts (retuned to match palette) */
  --chart-1: #1d4ed8;
  --chart-2: #15803d;
  --chart-3: #b45309;
  --chart-4: #71717a;
  --chart-5: #e11d48;

  /* Sidebar (light, workshop-tool) */
  --sidebar: #ffffff;
  --sidebar-foreground: #18181b;
  --sidebar-primary: #1d4ed8;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #fafaf8;
  --sidebar-accent-foreground: #18181b;
  --sidebar-border: #e7e7e3;
  --sidebar-ring: #1d4ed8;

  /* Touch targets */
  --touch-min: 2.75rem;
  --touch-lg: 3.5rem;
  --touch-xl: 4.5rem;

  /* Density */
  --density-row: 2.75rem;
  --density-row-field: 4rem;

  /* Typography */
  --font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, system-ui, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
```

**New `.dark` block** — retune to match:

```css
.dark {
  --background: #09090b;
  --card: #18181b;
  --card-foreground: #fafafa;
  --popover: #18181b;
  --popover-foreground: #fafafa;
  --muted: #1c1c1f;
  --foreground: #fafafa;
  --muted-foreground: #a1a1aa;
  --subtle-foreground: #71717a;
  --border: #27272a;
  --border-strong: #3f3f46;
  --input: #3f3f46;
  --secondary: #1c1c1f;
  --secondary-foreground: #fafafa;
  --primary: #60a5fa;
  --primary-foreground: #0b1220;
  --accent: #1e2a54;
  --accent-foreground: #93c5fd;
  --ring: #60a5fa;
  --brand: #fb7185;
  --brand-foreground: #2d0a12;
  --success: #86efac;
  --success-soft: #052e1a;
  --success-border: #14532d;
  --warning: #fbbf24;
  --warning-soft: #2a1a05;
  --warning-border: #713f12;
  --destructive: #fca5a5;
  --destructive-soft: #2a0808;
  --destructive-border: #7f1d1d;
  --chart-1: #60a5fa;
  --chart-2: #86efac;
  --chart-3: #fbbf24;
  --chart-4: #a1a1aa;
  --chart-5: #fb7185;
  --sidebar: #0d0d0f;
  --sidebar-foreground: #fafafa;
  --sidebar-primary: #60a5fa;
  --sidebar-primary-foreground: #0b1220;
  --sidebar-accent: #1c1c1f;
  --sidebar-accent-foreground: #fafafa;
  --sidebar-border: #27272a;
  --sidebar-ring: #60a5fa;
}
```

**New `@theme inline` block** — expose all tokens to Tailwind. Replace the calc-based radius with direct tokens, add the new color mappings:

```css
@theme inline {
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius);
  --radius-lg: var(--radius-md);
  --radius-xl: var(--radius-lg);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-subtle-foreground: var(--subtle-foreground);

  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-input: var(--input);

  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
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

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}
```

**Add utility classes** — new `@layer utilities` block AFTER the existing `@layer base`:

```css
@layer utilities {
  .font-mono-tabular {
    font-variant-numeric: tabular-nums;
    font-family: var(--font-mono);
  }
  .tap-min { min-height: var(--touch-min); }
  .tap-lg  { min-height: var(--touch-lg); }
  .tap-xl  { min-height: var(--touch-xl); }
  .field-row { min-height: var(--density-row-field); }
}
```

---

### File 2 — `src/lib/components/ui/button/button.svelte`

**Preserve** all existing variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`). **Add** `brand`. Preserve all existing sizes (`default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg`). **Add** `xl` (44px touch) and `touch` (56px field).

Inside `buttonVariants.variants`:

```ts
variant: {
  default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  destructive:
    "bg-destructive shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white",
  outline:
    "bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border",
  secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
  brand: "bg-brand text-brand-foreground shadow-xs hover:bg-brand/90", // NEW — auth pages only
},
size: {
  default: "h-10 px-4 py-2 has-[>svg]:px-3",
  sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
  xl: "h-11 rounded-md px-5 has-[>svg]:px-4",         // NEW — 44px touch
  touch: "h-14 rounded-md px-5 text-[15px] has-[>svg]:px-4", // NEW — 56px field primary
  icon: "size-10",
  "icon-sm": "size-8",
  "icon-lg": "size-10",
},
```

Everything else in the file stays the same.

---

### File 3 — `src/lib/components/ui/badge/badge.svelte`

**Preserve** existing variants (`default`, `secondary`, `destructive`, `outline`). **Add** soft-tone variants for status semantics.

Inside `badgeVariants.variants.variant`:

```ts
variant: {
  default:
    "bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent",
  secondary:
    "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent",
  destructive:
    "bg-destructive [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70 border-transparent text-white",
  outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
  // NEW soft-tone variants (spec-aligned):
  muted: "bg-muted text-muted-foreground border-border",
  info: "bg-accent text-accent-foreground border-accent",
  success: "bg-success-soft text-success border-success-border",
  warning: "bg-warning-soft text-warning border-warning-border",
  "destructive-soft": "bg-destructive-soft text-destructive border-destructive-border",
},
```

Everything else in the file stays the same.

---

## Verification

1. **svelte-check passes** with 0 new errors (baseline: 0 errors, 29 pre-existing warnings).
   ```bash
   npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40
   ```
2. **Build succeeds**.
   ```bash
   npm run build 2>&1 | tail -15
   ```
3. **Grep check** — confirm new tokens resolvable:
   ```bash
   grep -c "color-brand\|color-success-soft\|color-warning-soft" src/app.css
   # should be > 0
   ```
4. **Dev server loads** — manual check by user at http://localhost:5173 after.

## What the user should see (expectations)

- **All existing `bg-primary` / `text-primary` usage** renders as working blue (`#1d4ed8`) instead of rose (`#e11d48`). Includes: primary buttons, active tab indicators, selected row accents, primary links.
- **Page background** warmer off-white (`#f6f6f4`) instead of cool slate (`#f8fafc`).
- **Sidebar** flips from dark slate (`#0f172a` background, light text) to LIGHT (white bg, dark text) — this is a large visual change, verify it doesn't break the Sidebar component's text contrast.
- **Rose remains visible** only anywhere that explicitly uses `bg-rose-*` / `text-rose-*` Tailwind utility classes (NOT through the `--primary` token). Those stay rose.
- **Rounded corners tighter**: `rounded-md` ~6px, `rounded-lg` ~8px.
- **Badges look the same** until code starts using the new `muted`/`info`/`success`/`warning` variants. Existing `default`/`secondary`/`destructive` badges unchanged.
- **Buttons look the same** except existing `default`/`link` buttons are now blue (via `--primary` retune). Adding new variants doesn't change old usage.

---

## What the user will NOT see yet (out of scope for Phase 1)

- No changes to GradientBadge — keeps its 8 hardcoded gradients.
- No changes to dashboard's hardcoded `bg-rose-50` data structures.
- No changes to photo panels' 28 rose progress bars.
- No changes to sidebar structure — only colors flip via tokens. If the Sidebar component has any hardcoded dark-mode text colors that aren't token-driven, contrast may need follow-up.
- No step rail, no chip group, no field routes, no two-pane layout.

---

## Rollback

If the look isn't right, revert the three files:

```bash
git checkout HEAD -- src/app.css src/lib/components/ui/button/button.svelte src/lib/components/ui/badge/badge.svelte
```

No migrations, no state, no callsite changes — it's purely visual.

---

## Commit message

```
style(tokens): Phase 1 token retune + Button/Badge variant additions

- src/app.css: retune :root + .dark + @theme inline. Primary shifts from
  rose → working blue (#1d4ed8). Rose preserved as new --brand token for
  auth/marketing. Add soft-tone tokens (success/warning/destructive
  soft + border). Add touch-target + density tokens. Sidebar flips
  dark → light. Radius tightens from 0.75rem → 0.375rem base.
- button.svelte: add `brand` variant (rose, auth-only) and `xl`/`touch`
  sizes. Existing variants unchanged.
- badge.svelte: add `muted`/`info`/`success`/`warning`/`destructive-soft`
  tone variants. Existing variants unchanged.

Zero callsite churn — every existing bg-primary / text-primary call
now renders blue through token indirection. Phase 1 of the style
upgrade plan (.agent/Tasks/active/STYLE_PHASE_1_TOKENS_AND_VARIANTS.md).

Reversible by reverting the three files.
```

Do NOT commit automatically — Orchestrator handles commits after user review.

---

## Coder execution notes

- Three file changes, no new files.
- DO NOT add any new dev dependencies.
- DO NOT modify any other file. If svelte-check surfaces an error referencing a missing token, that's expected on some shadcn components — flag it in your report, don't patch.
- Preserve ALL existing variant/size names — this is strictly additive.
- Run the two verification commands (svelte-check, build) and report results.
- Return when done — do not commit.
