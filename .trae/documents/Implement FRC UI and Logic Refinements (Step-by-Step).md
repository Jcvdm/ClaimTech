## Phase 1: Context Confirmation
- Confirm line composition sources (estimate + approved additionals) and flags (`removed_via_additionals`, `declined_via_additionals`).
- Validate aggregate totals functions: Estimate, Additionals, Combined; ensure removals are negative and included.
- Files: `src/lib/components/assessment/FRCTab.svelte`, `src/lib/components/assessment/FRCLinesTable.svelte`, `src/lib/services/frc.service.ts`, `src/lib/utils/frcCalculations.ts`.

## Phase 2: Line Items Above Totals
- Update FRCTab layout to render `FRCLinesTable` before totals cards.
- Keep sticky table header and a short explanatory banner about reconciliation.
- Files: `FRCTab.svelte`.

## Phase 3: Removed/Declined Lines Read-Only
- In `FRCLinesTable.svelte`, detect `removed_via_additionals` or `declined_via_additionals` and:
  - Show a “Removed” badge (line-through) or “Declined” badge as applicable.
  - Disable decision actions (Agree/Adjust) for these lines (render read-only state).
- In `frc.service.ts:completeFRC`, exclude removed/declined lines from “must be decided” validation; still include them in aggregates.
- Files: `FRCLinesTable.svelte`, `frc.service.ts`.

## Phase 4: Totals and Delta Cards
- Totals section shows:
  - Quoted: Original Estimate, Additionals, Combined, Delta (Combined − Original). Label Delta as “Additional Cost” (positive) or “Savings” (negative).
  - Actual (when decisions exist): Original Estimate (actual), Additionals (actual), Combined (actual), Delta (Actual Combined − Quoted Original).
- Clarify sundries difference (Estimate-only) via a small note; Combined inherently reflects the distinction.
- Files: `FRCTab.svelte` and any helper to compute deltas.

## Phase 5: Invoice Matching UX
- Add per-line controls in `FRCLinesTable`:
  - “Attach Invoice” selector listing uploaded FRC documents.
  - “Matched” toggle; when matched exactly, set decision to Agree; when not, open Adjust modal with invoice-derived actuals (manual entry remains primary).
- Persist linkage in line item model (e.g., `linked_document_id`); update `updateLineDecision` to accept an optional linkage.
- Files: `FRCLinesTable.svelte`, `frc.service.ts`, `src/lib/services/frc-documents.service.ts`, `src/lib/types/assessment.ts` (line item interface update).

## Phase 6: Verification
- Scenario A (Removal): remove original line in Additionals → FRC shows read-only removed line; Combined decreases; Delta shows savings.
- Scenario B (Addition): add new line in Additionals → FRC reflects increase; Delta positive.
- Scenario C (Invoices): upload invoice, attach to line, set Agree/Adjust, verify actual totals and persistence; sign-off requires all non-removed lines decided.

## Notes & Risks
- Keep reinstatement of removed lines in Additionals only; FRC remains read-only for removed lines.
- Ensure role-based access (engineer/admin) continues to work for decisions and sign-off.
- Avoid schema-heavy changes; start with a single `linked_document_id` per line, expand to multiple later if needed.