# Svelte 5 Upgrade & Legacy Component Audit

Last updated: 2025-11-21

## 1. Framework Snapshot

- **Svelte**: `^5.0.0`
- **SvelteKit**: `^2.22.0`
- **bits-ui**: `^2.11.4` (designed for Svelte 4)
- **UI kit**: shadcn-style wrappers in `src/lib/components/ui` built on `bits-ui` v2

### High-level status

- Most **UI primitives** in `src/lib/components/ui` are already Svelte 5–aware (using `$props`, `$bindable`, snippets).
- The project still depends on **bits-ui v2**, which is a legacy dependency for Svelte 5 and has known edge cases (e.g. DatePicker trigger issues).
- Only **one route page** still uses pre-Runes Svelte 4-style props (`export let data`).

---

## 2. Legacy / Risky Areas by Category

### 2.1 bits-ui v2–based primitives (compat layer)

These components are structurally Svelte 5–compatible (runes, `$props`, `$bindable`), but they wrap **bits-ui v2** and may require updates when you move to bits-ui v3 or shadcn-svelte v2.

> **Key risk**: internal event/state handling changes between bits-ui v2 and Svelte 5 can surface as subtle bugs (e.g. popovers not opening, value desyncs).

**Dialog**
- `src/lib/components/ui/dialog/dialog-content.svelte`
- `src/lib/components/ui/dialog/dialog-overlay.svelte`
- `src/lib/components/ui/dialog/dialog-trigger.svelte`
- `src/lib/components/ui/dialog/dialog-title.svelte`
- `src/lib/components/ui/dialog/dialog-description.svelte`
- `src/lib/components/ui/dialog/dialog-close.svelte`
- `src/lib/components/ui/dialog/dialog-footer.svelte`
- `src/lib/components/ui/dialog/dialog-header.svelte`
- `src/lib/components/ui/dialog/index.ts`

**Sheet (Drawer)**
- `src/lib/components/ui/sheet/sheet-content.svelte`
- `src/lib/components/ui/sheet/sheet-overlay.svelte`
- `src/lib/components/ui/sheet/sheet-header.svelte`
- `src/lib/components/ui/sheet/sheet-title.svelte`
- `src/lib/components/ui/sheet/sheet-description.svelte`
- `src/lib/components/ui/sheet/sheet-close.svelte`
- `src/lib/components/ui/sheet/sheet-trigger.svelte`
- `src/lib/components/ui/sheet/index.ts`

**Popover**
- `src/lib/components/ui/popover/popover-trigger.svelte`
- `src/lib/components/ui/popover/popover-content.svelte`
- `src/lib/components/ui/popover/index.ts`

**Tooltip**
- `src/lib/components/ui/tooltip/tooltip-trigger.svelte`
- `src/lib/components/ui/tooltip/tooltip-content.svelte`
- `src/lib/components/ui/tooltip/index.ts`

**Dropdown Menu**
- `src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-item.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-radio-item.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-group.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-group-heading.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-shortcut.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-sub-trigger.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-sub-content.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-group.svelte`
- `src/lib/components/ui/dropdown-menu/dropdown-menu-radio-group.svelte`
- `src/lib/components/ui/dropdown-menu/index.ts`

**Select**
- `src/lib/components/ui/select/select-trigger.svelte`
- `src/lib/components/ui/select/select-content.svelte`
- `src/lib/components/ui/select/select-item.svelte`
- `src/lib/components/ui/select/select-group.svelte`
- `src/lib/components/ui/select/select-group-heading.svelte`
- `src/lib/components/ui/select/select-label.svelte`
- `src/lib/components/ui/select/select-separator.svelte`
- `src/lib/components/ui/select/select-scroll-up-button.svelte`
- `src/lib/components/ui/select/select-scroll-down-button.svelte`
- `src/lib/components/ui/select/index.ts`

**Tabs**
- `src/lib/components/ui/tabs/tabs.svelte`
- `src/lib/components/ui/tabs/tabs-list.svelte`
- `src/lib/components/ui/tabs/tabs-trigger.svelte`
- `src/lib/components/ui/tabs/tabs-content.svelte`

**Calendar & Date Picker**
- `src/lib/components/ui/calendar/calendar.svelte`
- `src/lib/components/ui/calendar/calendar-*.svelte` (caption, cell, day, grid, header, heading, month, months, month-select, nav, next/prev-button, year-select, etc.)
- `src/lib/components/ui/date-picker/date-picker.svelte`

> **Note:** `date-picker.svelte` has already been patched for Svelte 5 reactivity loops. It still sits on top of bits-ui v2 calendar primitives.

**Other wrappers**
- `src/lib/components/ui/label/label.svelte` (bits-ui `Label`)
- `src/lib/components/ui/separator/separator.svelte` (bits-ui `Separator`)
- `src/lib/components/ui/avatar/*.svelte` (bits-ui `Avatar`)

### 2.2 App-level legacy Svelte 4–style page

These use `export let` and classic prop syntax instead of Svelte 5 runes. They still work, but are **not following the new project standard**.

- `src/routes/(app)/work/[type]/+page.svelte`
  - Uses `export let data` instead of `let { data } = $props();`.
  - No `$state`/`$derived` runes; state is derived with plain JS only.

Recommendation:
- Migrate this page to runes (`$props`, `$state`, `$derived`) when you next touch it, for consistency with other modernized routes like `src/routes/(app)/requests/+page.svelte`.

---

## 3. Recommended Updates by Priority

### 3.1 Short Term (Svelte 5 stability)

**Goal:** Eliminate Svelte 5 interop bugs while still on bits-ui v2.

1. **Audit interactive flows using bits-ui primitives**
   - Focus on components where we have had issues already:
     - Date picker / calendar:
       - `src/lib/components/ui/date-picker/date-picker.svelte`
       - `src/lib/components/ui/calendar/calendar.svelte`
     - Popovers around complex content (forms, tables).
     - Dropdown menus and sheets used in navigation.
   - Add targeted tests or manual QA around:
     - Trigger click behaviour (opens/closes correctly).
     - Value binding (`bind:value`) and `onValueChange` events.
     - Keyboard navigation and focus handling.

2. **Document the current Svelte 5 shims**
   - Capture patterns already used in your wrappers:
     - `$props()` + `$bindable()` for props.
     - `data-slot` attributes for styling hooks.
   - Use these patterns consistently in any new wrappers.

3. **Migrate the remaining legacy page to runes**
   - For `src/routes/(app)/work/[type]/+page.svelte`:
     - Replace `export let data` with `let { data } = $props();`.
     - If you add local state, use `$state` / `$derived` for consistency with other pages.

### 3.2 Medium Term (bits-ui v3 / shadcn-svelte v2 migration)

**Goal:** Get off bits-ui v2, align fully with Svelte 5–native shadcn-svelte.

1. **Plan bits-ui upgrade path**
   - Target: bits-ui v3 (or shadcn-svelte v2 templates that depend on it).
   - Review migration guides from bits-ui / shadcn-svelte for:
     - Prop name changes.
     - Event signatures (`onValueChange`, `onOpenChange`, etc.).
     - Differences in slot names or `data-*` attributes.

2. **Component group migration order**
   - Recommended order (least cross-cutting first):
     1. **Label / Separator / Avatar**
     2. **Tooltip / Popover**
     3. **Dropdown Menu / Select**
     4. **Tabs**
     5. **Dialog / Sheet**
     6. **Calendar / Date Picker**
   - For each group:
     - Re-generate components from the latest shadcn-svelte Svelte 5 templates where possible.
     - Replace local wrappers file-by-file, preserving your Tailwind variants and `cn` usage.

3. **Deprecate / remove bits-ui v2**
   - Once all wrappers are updated, remove the `bits-ui` v2 dependency from `package.json`.
   - Run `npm run check`, `npm run lint`, and app smoke tests.

### 3.3 Long Term (Consistency & DX)

1. **Ensure all new components follow Svelte 5 runes**
   - Always use `$props`, `$state`, `$derived`, `$effect`, `$bindable` for new components.
   - Avoid mixing `export let`/old patterns with runes in the same file.

2. **Create a "Svelte 5 Patterns" guide in this folder**
   - Document:
     - How to define UI primitives.
     - How to expose controlled/uncontrolled state (e.g. `bind:value`, `onValueChange`).
     - How to integrate with forms and server actions in SvelteKit 2.

---

## 4. Quick Checklist

- [ ] Date picker & calendar flows verified in Svelte 5.
- [ ] All dialog/sheet/popover/tooltip/select wrappers confirmed working with runes.
- [ ] `(app)/work/[type]/+page.svelte` migrated to `$props`.
- [ ] Migration plan drafted for bits-ui v3 / shadcn-svelte v2.
- [ ] New components follow Svelte 5 rune patterns by default.
