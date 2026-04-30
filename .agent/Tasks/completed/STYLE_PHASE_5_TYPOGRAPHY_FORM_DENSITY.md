# Style Upgrade — Phase 5: Typography + Form Density

**Created**: 2026-04-23
**Status**: In Progress
**Complexity**: Moderate (3 shadcn primitives + ~8 targeted callsite wraps). Retune only.
**Source spec**: `.agent/Design/design-system.md` §Typography + §Form density
**Prior phases shipped**: 1, 2, 3, 4, 1.5, scroll-fix, 6.

---

## Goal

Two simultaneous sweeps:

1. **Form density + label typography** via shadcn primitives (Input / Label / Select trigger). Global impact, low callsite churn — edit the primitives, every consumer inherits.
2. **Mono-tabular on currency/plates** via targeted callsite updates. Scoped to the highest-visibility places (line item tables, estimate totals, vehicle identification). Not a global sweep — if we miss a few, Phase 7 review will surface them.

**Out of scope**:
- Global `gap-4` → `gap-2` replacement. Too many non-form uses; risk of regression.
- H1 / section title standardization across all pages. Scattered; tackled per-page when needed.
- Creating a new `<Currency>` wrapper component. Could be Phase 5.5; for now just add classes inline.
- Textarea height changes. `min-h-[80px]` is a floor, not fixed — leave as-is.

---

## Design decisions (locked)

1. **Input height**: `h-9` (36px) → **`h-8`** (32px). Affects both file and text variants in `input.svelte`.
2. **Select trigger default size**: `data-[size=default]:h-9` → **`data-[size=default]:h-8`**. Keep `data-[size=sm]:h-8` unchanged.
3. **Label default style**: `text-sm font-medium` → **`text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground`**. This is a significant visual change — every form field label flips to uppercase 11.5px semibold gray. Callsites that need a different style can override via `className`. If dialog/checkbox labels look wrong after, we'll fix those individually.
4. **Mono-tabular** applied via `class="font-mono-tabular"` (utility already exists in `src/app.css:232`). Wrapping currency/plate/VIN values in `<span class="font-mono-tabular">{value}</span>` — or adding the class to the existing wrapper span if one's there.

**NOT changing**:
- Button heights (Phase 1 already set these)
- Textarea height
- Checkbox / Radio label sizing (inherit Label global change but with flex-items-center gap, should still be legible)
- Any layout grids / gaps
- Badge sizing

---

## Files to modify

### File 1 — `src/lib/components/ui/input/input.svelte`

Two `h-9` → `h-8` replacements, both in long class strings:

```ts
// Line 28 — file input variant
// BEFORE: "... shadow-xs flex h-9 w-full min-w-0 rounded-md ..."
// AFTER:  "... shadow-xs flex h-8 w-full min-w-0 rounded-md ..."

// Line 43 — text input variant
// BEFORE: "... shadow-xs flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base ..."
// AFTER:  "... shadow-xs flex h-8 w-full min-w-0 rounded-md border px-3 py-1 text-base ..."
```

Don't touch anything else in the file. Preserve the adaptive `text-base md:text-sm` (responsive font sizing — do not remove).

---

### File 2 — `src/lib/components/ui/label/label.svelte`

One class string replacement on line 16:

```ts
// BEFORE
"flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50"

// AFTER
"flex select-none items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50"
```

Changes: `text-sm font-medium` → `text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground`.

---

### File 3 — `src/lib/components/ui/select/select-trigger.svelte`

One change in the class string on line 22:

```ts
// BEFORE: "... data-[size=default]:h-9 data-[size=sm]:h-8 ..."
// AFTER:  "... data-[size=default]:h-8 data-[size=sm]:h-8 ..."
```

Both sizes now resolve to h-8. If you want a tighter small variant (h-7), leave that for a future phase.

---

### File 4 — `src/lib/components/assessment/LineItemCard.svelte`

Apply `font-mono-tabular` to every `formatCurrency(...)` output. There are 13 such calls per the grep.

Approach: each currency display is probably already inside a `<span>` or `<div>` with a class. Add `font-mono-tabular` to that class. If a currency is rendered bare (`{formatCurrency(x)}` with no wrapper), wrap it: `<span class="font-mono-tabular">{formatCurrency(x)}</span>`.

Do this for ALL occurrences in this file. Do not rename, do not change data flow, do not restructure.

---

### File 5 — `src/lib/components/assessment/FRCLinesTable.svelte`

Same pattern as File 4. 17 `formatCurrency` calls — wrap them all with `font-mono-tabular`.

---

### File 6 — `src/lib/components/assessment/FRCLineCard.svelte`

Same. 14 calls.

---

### File 7 — `src/lib/components/assessment/VehicleValuesTab.svelte`

Same. 18 calls.

---

### File 8 — `src/lib/components/assessment/VehicleValueExtrasTable.svelte`

Same. Multiple calls per grep. Apply to all.

---

### File 9 — `src/lib/components/assessment/PreIncidentEstimateTab.svelte`

Same. 15 calls.

---

### File 10 — `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte`

Same. 3 calls.

---

### File 11 — `src/lib/components/shared/SummaryComponent.svelte`

Same. 13 calls.

---

### File 12 — `src/lib/components/shop/ShopAdditionalsTab.svelte`

Same. 9 calls.

---

### File 13 — `src/lib/components/assessment/VehicleIdentificationTab.svelte`

Apply `font-mono-tabular` to the rendering of:
- `registration_number` (or `.reg` / `.plate` — whatever the field is)
- `vin_number`
- `engine_number`

If these fields are rendered as Input values (user-editable), DO NOT add the class to the Input — the Input primitive font changes via Phase 5's Input height update are enough. Only add mono-tabular to **display-only** renderings (read-only spans / data rows).

---

## Verification

1. **svelte-check** (in Coder's isolated sandbox): `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5` — expect 0 errors, 29 pre-existing warnings (baseline).
2. **Build**: `npm run build 2>&1 | tail -10` — expect exit 0.
3. **Grep sanity**:
   - `grep -rn "h-9" src/lib/components/ui/input/input.svelte src/lib/components/ui/select/select-trigger.svelte` → 0 matches (h-9 replaced).
   - `grep -rn "text-sm font-medium" src/lib/components/ui/label/label.svelte` → 0 matches.
   - `grep -c "font-mono-tabular" src/lib/components/assessment/LineItemCard.svelte` → at least 1 match (ideally near the currency displays).

## What the user should see

**Forms feel tighter**:
- Form fields shrink from 36px → 32px tall
- Select triggers same
- Labels become small uppercase gray caps (11.5px) — looks like engineering drawings / spec sheets, matches the workshop-tool direction

**Numbers line up properly**:
- Currency columns in line-item tables (estimate / FRC / additionals / vehicle values) render in monospace. Digits align vertically in columns — "R 12,345.67" stacks cleanly above "R 1,234.56"
- Vehicle registration / VIN display in monospace (where read-only)

**Nothing structurally changed** — this is pure typography + density.

---

## Known risks / watchouts

1. **Label uppercase is aggressive**. Some form labels may look weird uppercased (e.g., "OK BUTTON" instead of "OK button"). If a specific label looks bad after, fix with `className` override at the callsite. No global opt-out — we're committing to the spec.
2. **h-8 might clip some input content**. Placeholder text or number spinners. If visible issue in review, bump back to h-9 for that specific callsite via `className="h-9"`. Not expected to be an issue.
3. **Mono font width is different from sans**. Currency columns might shift width slightly. Layouts with fixed-width columns may need adjustment in follow-up if visibly off.
4. **formatCurrency calls in table rows**: if a row has `<td class="text-right">{formatCurrency(x)}</td>`, adding `font-mono-tabular` on the td is fine. Don't wrap the td content in an extra span — just add the class to the existing element.

---

## Rollback

Revert the 13 files:
```bash
git checkout HEAD -- src/lib/components/ui/input/input.svelte src/lib/components/ui/label/label.svelte src/lib/components/ui/select/select-trigger.svelte src/lib/components/assessment/LineItemCard.svelte src/lib/components/assessment/FRCLinesTable.svelte src/lib/components/assessment/FRCLineCard.svelte src/lib/components/assessment/VehicleValuesTab.svelte src/lib/components/assessment/VehicleValueExtrasTable.svelte src/lib/components/assessment/PreIncidentEstimateTab.svelte src/lib/components/assessment/OriginalEstimateLinesPanel.svelte src/lib/components/shared/SummaryComponent.svelte src/lib/components/shop/ShopAdditionalsTab.svelte src/lib/components/assessment/VehicleIdentificationTab.svelte
```

All changes are CSS classes only. No logic, no state, no props.

---

## Coder execution notes

- 13 files total. 3 shadcn primitives + 10 callsite updates.
- DO NOT add new dependencies.
- DO NOT create any new files (no wrapper components).
- For the mono-tabular sweep (files 4–13), the goal is every `formatCurrency(...)` in those files ends up rendered with `font-mono-tabular` on some wrapper. Use judgement: if there's already a span wrapping it, add the class; if there isn't, add a minimal span; if it's on a table cell `<td>`, add the class to the td.
- For File 13 (VehicleIdentificationTab): ONLY apply mono-tabular to display-only / read-only renderings of reg/VIN/engine number. Do NOT add it to `<Input>` bindings (those are editable form fields — the Input itself handles font).
- Preserve all logic, props, bindings, imports.
- Run svelte-check + build in your isolated sandbox. Report both results. DO NOT commit.
