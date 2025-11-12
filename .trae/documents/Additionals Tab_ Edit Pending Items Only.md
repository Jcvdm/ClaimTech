**Context**
- Current `AdditionalsTab.svelte` shows line items read-only with approve/decline/delete and reversal flows; no inline editing for pending items (`src/lib/components/assessment/AdditionalsTab.svelte:530–716`).
- Estimate tab implements robust click-to-edit for description, S&A hours, labour hours, paint panels, part nett, outwork nett, with local buffering (`src/lib/components/assessment/EstimateTab.svelte:781–1112`).
- Types define statuses and actions for additionals, including `pending`, `approved`, `declined`, `removed`, `reversal` (`src/lib/types/assessment.ts:761–778`).
- Additionals service supports add/approve/decline/delete/reversal, but no update for pending item values (`src/lib/services/additionals.service.ts`).
- Immutability docs establish that approved/declined/removed/reversal entries are immutable; pending deletion is allowed. Editing pending values fits this model.

**Desired Behavior**
- Pending additional items are editable inline, matching Estimate tab interactions: click-to-edit inputs, on blur/Enter save.
- Once an item is approved, declined, or marked as removed/reversal, all values become read-only.

**UI Changes (AdditionalsTab)**
- Add click-to-edit controls for pending rows only:
  - Description: editable `Input` like Estimate tab.
  - Process type select and Part type select (when `process_type==='N'`).
  - Part price nett (N), S&A hours (N/R/P/B), Labour hours (N/R/A), Paint panels (N/R/P/B), Outwork nett (O).
- Reuse the Estimate tab’s editing state pattern (`editingSA`, `editingLabour`, `editingPaint`, `editingPartPrice`, `editingOutwork`, temp values) and handlers, scoped to additionals.
- Gate editing by `item.status === 'pending' && item.action === 'added'` and skip for `removed`/`reversal`.
- On save/blur, call service update (see below) and assign returned `additionals` back to local state.
- Keep existing action buttons logic; editing surfaces only for pending rows (actions at `src/lib/components/assessment/AdditionalsTab.svelte:646–707`).

**Service Changes (Additionals Service)**
- Add `updatePendingLineItem(assessmentId: string, lineItemId: string, patch: Partial<AdditionalLineItem>): Promise<AssessmentAdditionals>`.
  - Load current additionals (`getByAssessment`).
  - Find the item; validate `status==='pending'` and `action==='added'`; throw otherwise.
  - Merge patch and recalculate derived fields using additionals’ locked rates/markups:
    - `strip_assemble = strip_assemble_hours × labour_rate`
    - `labour_cost = labour_hours × labour_rate`
    - `paint_cost = paint_panels × paint_rate`
    - `part_price = calculatePartSellingPrice(part_price_nett, markup by part_type)`
    - `outwork_charge = calculateOutworkSellingPrice(outwork_charge_nett, outwork_markup_percentage)`
    - `betterment_total = calculateBetterment(updatedItem)` (keeps parity with Estimate)
    - `total = calculateLineItemTotal(updatedItem, labour_rate, paint_rate)`
  - Update `assessment_additionals.line_items` array and `updated_at`; do NOT touch approved totals (pending not counted).
  - Log audit: action `additionals_line_item_updated_pending` with old/new totals.

**Implementation Notes**
- UI references for gating and where to integrate: `src/lib/components/assessment/AdditionalsTab.svelte:570–716` (table body), actions at `:646–707`.
- Mirror Estimate handlers with additionals rates, not estimate rates.
- Keep reversal/removed rows immutable and styled (blue/red rows already handled at `src/lib/components/assessment/AdditionalsTab.svelte:571–575`).

**Validation**
- Edit pending values and verify row totals update; approved totals card remains unchanged until approval.
- Attempt editing approved/declined/removed/reversal rows: inputs absent/disabled.
- Approve a pending item and confirm editing disappears; approved totals card updates.
- Regression: QuickAdd still adds pending items; delete pending still works; reversal flows unchanged.

**Files to Update**
- `src/lib/components/assessment/AdditionalsTab.svelte` — add click-to-edit UI and handlers; call new service.
- `src/lib/services/additionals.service.ts` — add `updatePendingLineItem` with recalculation using `src/lib/utils/estimateCalculations.ts`.

**Risks & Alignment**
- Aligns with immutability: only pending items editable; all other states immutable and adjusted via reversal.
- Uses existing utilities; no schema changes; minimal surface area.
