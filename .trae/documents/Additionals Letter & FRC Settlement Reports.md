## Overview
- Enable report generation from `Additionals` and `FRC` tabs, surfaced in `Finalize` tab alongside other documents.
- Add an "Additionals Letter" PDF (approved/declined summary, notes, totals, assessor/engineer/client details, disclaimer).
- Enhance/standardize the FRC report to show agreed items, removed/declined items, cost breakdowns, and the settlement total to the repairer, with a dedicated disclaimer.

## Current Workflows
- Additionals
  - Appears after estimate finalization; manages `pending → approved/declined` lines, reversals for removed originals, photos panel, approved-only totals.
  - Core: `src/lib/services/additionals.service.ts` computes approved totals; UI in `src/lib/components/assessment/AdditionalsTab.svelte`.
- FRC
  - Merges original estimate with approved additionals using fingerprint mapping; tracks per-line decisions `pending|agree|adjust` and recomputes quoted/actual breakdowns and VAT/total.
  - Core: `src/lib/services/frc.service.ts` and `src/lib/utils/frcCalculations.ts`; UI in `src/lib/components/assessment/FRCTab.svelte`.
- Finalize Document Generation
  - Buttons in `FinalizeTab.svelte` call `document-generation.service.ts` which hits API endpoints using Puppeteer; URLs stored on `assessments`.

## Requirements
- Additionals Letter
  - Content: assessor/engineer details, client/insurer details, approved items list with totals, declined items list with decline notes, grand totals (subtotal, VAT, total), disclaimer.
  - Totals: use approved-only totals; present declined sections with itemized amounts but excluded from payable total.
- FRC Settlement Report
  - Content: engineer details, client/insurer details, agreed items list, adjusted items list with reasons and actuals, removed/deductions as declined items, quoted vs actual breakdowns, settlement (actual total) to repairer, disclaimer.
  - Totals: show baseline (quoted), new/actual, and deltas; emphasize settlement figure.

## Data Sources
- Additionals
  - Approved/declined lines and `decline_reason` from `additionals.service.ts`; approved totals from `calculateApprovedTotals(...)`.
- FRC
  - Line decisions from `assessment_frc_line_items` via `frc.service.ts`; breakdowns and aggregates from `frcCalculations.ts` (`calculateFRCAggregateTotals`, `calculateFRCNewTotals`, `calculateDeltas`).
- Shared
  - Assessment, vehicle, client/insurer, engineer metadata from existing report generators.

## Templates & Disclaimers
- Create `src/lib/templates/additionals-letter-template.ts` rendering:
  - Header with assessor/engineer/user and client/insurer; approved table with component costs; declined table with notes; totals summary; terms block.
- FRC template
  - Reuse `frc-report-template.ts`; ensure sections for agreed, adjusted, removals, quoted/actual/deltas, and settlement to repairer.
- Disclaimers
  - Add `additionals_terms_and_conditions` to `company_settings` with UI field under Settings (same pattern as `estimate_terms_and_conditions`/`frc_terms_and_conditions`).
  - Resolution order: client override → company setting → empty.

## API & Services
- Endpoints
  - `src/routes/api/generate-additionals-letter/+server.ts` using Puppeteer to produce PDF; inject `companySettings.additionals_terms_and_conditions`.
  - Ensure/extend `src/routes/api/generate-frc-report/+server.ts` to persist URL and reflect settlement data.
- Service integration
  - Extend `document-generation.service.ts` with `type: 'additionals_letter' | 'frc_report'` handlers, `getPrintUrl(...)`, and storage upload.
  - Add fields on `assessments`: `additionals_letter_pdf_url`, `frc_report_pdf_url`, and include in `getGenerationStatus(...)`.

## UI Integration
- Additionals Tab
  - Add "Generate Additionals Letter (PDF)" button; progress/status inline and in `FinalizeTab.svelte`.
- FRC Tab
  - Add "Generate FRC Settlement Report" button; display settlement number prominently; progress/status inline and in `FinalizeTab.svelte`.
- Finalize Tab
  - Show both new documents with download links and generation timestamp; include in "Generate All".

## Calculations & Presentation
- Additionals
  - Approved totals: `subtotal_approved`, `vat_amount_approved`, `total_approved`.
  - Declined section: list item amounts and `decline_reason`; excluded from payable totals.
- FRC
  - Quoted vs actual breakdowns; deltas; settlement equals `actual_total` (incl. VAT) to repairer.
  - Adjusted items show actuals and reasons; removals presented in a "Deductions/Declined" section.

## Security, Permissions, Audit
- Respect RLS for engineer access; generate only for authorized users.
- Log generation actions to audit log; avoid embedding secrets in templates.
- Store PDFs in Supabase Storage under assessment-specific path; URLs persisted to `assessments`.

## Milestones
- Phase 1: Schema/Settings additions for `additionals_terms_and_conditions` and document URL fields; update Settings UI.
- Phase 2: Implement Additionals Letter endpoint, template, service wiring; add UI button; surface in Finalize.
- Phase 3: Enhance FRC report template, endpoint persistence, service wiring; add UI button; surface in Finalize.
- Phase 4: Extend "Generate All" flow; add SSE progress; unit tests for totals/sections and snapshot tests for templates.

## Notes
- FRC already has generation scaffolding (`frc-report-template.ts`, `api/generate-frc-report`); plan focuses on content completeness and persistence.
- Additionals is net-new document type and mirrors existing patterns for report/estimate generation.