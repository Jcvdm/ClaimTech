## Scope and Goals
- Remove "N/A" placeholders from report PDFs and related generators.
- Prefer conditional rendering: omit rows/sections when data is missing, or use minimal neutral markers (e.g., "-" for table cells) where structure requires content.
- Keep company header defaults intact; focus on assessment-derived fields.

## Current Data Flow
- UI passes only `assessmentId` to generation:
  - Assessment page trigger: `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte:671`.
  - Service streaming: `src/lib/services/document-generation.service.ts:51-70` and batch `:172-196`.
- Server assembles `ReportData` and renders template:
  - API: `src/routes/api/generate-report/+server.ts:85-121, 176-237`.
  - Template: `src/lib/templates/report-template.ts`.

## Where "N/A" Appears (Key References)
- Report template fallbacks:
  - Vehicle label and fields: `src/lib/templates/report-template.ts:203, 282-307, 310`.
  - Claim/request/client: `:207, 259, 263, 271`.
  - Assessor and contact: `:244-249`.
  - Exterior/interior/mechanical: `:324, 345, 349, 353, 357`.
  - Tyres table cells: `:380-386`.
  - Warranty and period: `:433-440`.
- Date formatter returns "N/A" if missing: `src/lib/utils/formatters.ts:27-78`.

## Changes
- Replace "N/A" in report-template with conditional rows:
  - Only render a label/value row when the value exists; otherwise omit the row entirely.
  - For combined displays (e.g., vehicle `make model`), render the pieces that exist; omit the row if all are empty.
- Dates: check presence first, then `formatDateNumeric(date)`. If absent, omit the row.
- Tyres table: keep the table only when `tyres.length > 0` (already implemented). Within rows, replace "N/A" with `''` or `'-'` (prefer `'-'` for tabular readability).
- Warranty & vehicle values: conditionally render each row; omit when missing instead of "N/A".
- Avoid modifying shared formatters globally to prevent side-effects. Instead, apply presence checks in templates and only call formatters when values are present.

## Implementation Steps
1. Update `src/lib/templates/report-template.ts`:
   - Introduce a small local helper `row(label, value)` that returns the HTML for a row only when `value` is truthy; for arrays/strings, use `.trim()`; for numbers, accept `>= 0` where appropriate.
   - Refactor sections (Executive Summary, Report Information, Claim Information, Vehicle Information, Interior & Mechanical, Warranty & Vehicle Values) to use helper and remove direct `|| 'N/A'` fallbacks.
   - For dates, use `value ? formatDateNumeric(value) : ''` and render via `row` so missing dates are omitted.
   - In Tyres table, replace per-cell `|| 'N/A'` with `|| ''` and in cells that look odd empty, use `'-'`.
2. Leave `src/lib/utils/formatters.ts` unchanged to avoid cross-app ripple; the template will avoid calling it for missing values.
3. Verify other templates (estimate, photos, FRC) for consistency. Where they currently show "N/A", mirror the approach above. In tables, prefer `'-'` to maintain structure.

## Affected Files
- `src/lib/templates/report-template.ts`
- (Optional consistency) `src/lib/templates/estimate-template.ts`, `src/lib/templates/frc-report-template.ts`, `src/lib/templates/photos-template.ts`

## Testing
- Generate a report for an assessment with missing fields (e.g., no VIN, no engineer contact, no claim number) and confirm the PDF omits the rows instead of showing "N/A".
- Regression check with full data to ensure nothing is omitted when values exist.
- Visual check that tables remain aligned and readable when some cells are empty (`'-'` used where needed).

## Risks and Rollback
- Risk: Omitting rows may alter visual density; mitigate by preserving section headers and spacing.
- Rollback: Revert to previous template or selectively reintroduce placeholders if needed.

If you approve, I will implement the template refactor (no global formatter changes), run a local generation to verify, and align estimate/FRC/photos templates for consistency where they still show "N/A".