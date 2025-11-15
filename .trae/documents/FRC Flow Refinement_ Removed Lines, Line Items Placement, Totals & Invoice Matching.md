## Understanding
- Line composition merges original estimate lines with approved additionals; removals appear as negative additional lines and are flagged (removed_via_additionals).
- FRC shows “Agree/Adjust” decisions for all lines; removed lines are currently actionable though they represent non-work items.
- Aggregates compute quoted/actual for Estimate, Additionals, and Combined, including negative removals; VAT is derived per aggregate.
- Invoices are uploaded to FRC and listed; there is no automated invoice-to-line matching.

## Requested Behavior
- Move line items table above the quoted vs actual totals.
- Removed lines should display only as “Removed” and be read-only in FRC; no option to approve or adjust.
- New lines added in Additionals should contribute to totals; removed lines represent savings.
- Totals section should clearly show: Original Estimate, Additionals, Combined, and Delta (Combined − Original), indicating cost increase or savings.
- FRC’s purpose is reconciliation: show the revised state (Estimate + Additionals), and allow the engineer/admin to agree to totals, upload invoices, and match them to lines.

## Plan
1) Line Items Placement
- In `FRCTab.svelte`, render `FRCLinesTable` above totals cards. Keep sticky headers for clarity.
- Maintain a summary banner explaining FRC reconciliation and statuses.

2) Removed/Declined Lines Behavior
- In `FRCLinesTable.svelte`, detect `removed_via_additionals` or declined flags and:
  - Render a “Removed” badge and line-through styling from Additionals.
  - Disable decision actions (no Agree/Adjust); lines remain read-only.
- Exclude removed lines from “pending decisions” validations in `frc.service.ts:completeFRC`, while they still contribute as negative to totals.

3) Totals & Delta Presentation
- In `FRCTab.svelte` totals section:
  - Cards: Original Estimate (quoted), Additionals (quoted), Combined (quoted), and Delta (quoted_combined − quoted_estimate).
  - Mirror for actual if decisions entered: Original Estimate (actual), Additionals (actual), Combined (actual), and Delta (actual_combined − quoted_estimate) to highlight variance vs initial quote.
- Label delta as “Additional Cost” when positive and “Savings” when negative; show exact amount.
- Ensure sundries remain Estimate-only; Additionals exclude sundries by design. Combined and delta will naturally reflect this.

4) Invoice Matching UX
- Add line-level invoice attachment references in `FRCLinesTable`: per-line “Attach Invoice” button opens picker filtered to uploaded FRC documents.
- “Matched” toggle per line:
  - When toggled, show a small badge and optionally prefill actual component fields from an entered invoice summary (manual entry remains primary).
  - Persist via `frc.service.updateLineDecision` with `decision: 'agree'` or `decision: 'adjust'` depending on whether invoice exactly matches quoted.
- In `frc-documents.service.ts`, keep documents independent of lines; store linkage in FRC line model (e.g., `linked_document_id` or array) without changing storage.

5) Validation & Sign-off
- Update `completeFRC` to consider removed/declined lines auto-decided.
- Require all non-removed lines to be decided; if any “adjust”, require reason.
- Sign-off modal displays counts: decided/matched, adjustments, total delta.

6) Verification
- Remove an original estimate line in Additionals: FRC shows removed line read-only; Combined quoted decreases by negative removal; Delta shows savings.
- Add new Additional line: FRC shows new line; totals and delta increase accordingly.
- Upload invoice and match to a line: mark as “Matched”, persist decision; actual totals reflect invoice entry.

## Risks & Notes
- Read-only removed lines: ensure no edge case where a previously removed line can be reverted from FRC; reinstatement remains in Additionals.
- Delta clarity: clearly indicate baseline is Original Estimate quoted; document sundries difference to avoid confusion.
- Invoice linkage is light-touch to avoid schema churn; can be expanded later for multi-document per line.

## Deliverables
- Updated FRC UI: lines above totals, removed lines read-only, totals with delta, invoice matching affordances.
- Service tweaks: decision validation excludes removed lines; decisions persist invoice-linked metadata.
- Tests: scenarios covering removals, additions, matching and adjustments; delta correctness.