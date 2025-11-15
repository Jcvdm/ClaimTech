## Key Findings
- Report generation renders HTML templates, converts to PDF via `generatePDF()` using Puppeteer, uploads to storage, and returns a signed URL.
  - `src/lib/utils/pdf-generator.ts`: `generatePDF` defined at 30
  - Assessment route: `src/routes/api/generate-report/+server.ts` (notes formatting at 9; usage at 190)
  - Estimate route: `src/routes/api/generate-estimate/+server.ts`
  - FRC route: `src/routes/api/generate-frc-report/+server.ts`
- T&S (Terms & Conditions) text is stored at company-level with client overrides; sanitized and injected into templates before the footer.
  - Fallback logic:
    - Assessment: `generate-report/+server.ts` at 215 and injection at 226
    - Estimate: `generate-estimate/+server.ts` at 106 and injection at 117
    - FRC: `generate-frc-report/+server.ts` at 126 and injection at 139
  - Template insertion points:
    - Assessment: `src/lib/templates/report-template.ts` at 523–531 (content at 528)
    - Estimate: `src/lib/templates/estimate-template.ts` at 663–671 (content at 668)
    - FRC: `src/lib/templates/frc-report-template.ts` at 538–548 (content at 545)
  - Sanitization utilities: `src/lib/utils/sanitize.ts` (`escapeHtmlWithLineBreaks` at 46; `sanitizeInput` at 71)
- Layout highlights:
  - Assessment notes grouped and rendered via `formatAssessmentNotesBySection` in `generate-report/+server.ts` at 9; used at 190
  - Section styling uses inline HTML/CSS in templates with `page-break-inside: avoid` and `white-space: pre-wrap`

## Proposed Improvements (T&S Section)
- Unify T&S styling across templates: consistent heading weight/size, border/background, and spacing.
- Make T&S block consistently page-break-aware: wrap in a container with `page-break-before: auto` and `page-break-inside: avoid`.
- Support optional T&S visibility toggles per document type; hide block when empty.
- Normalize text rendering: apply `escapeHtmlWithLineBreaks` everywhere; ensure 9–10pt font and 1.5 line-height.
- Add optional signature line (e.g., “Authorized Representative”) for Estimate and FRC documents, behind a flag.

## Proposed Improvements (Overall Layout)
- Standardize section headers and spacing across Assessment, Estimate, FRC for visual consistency.
- Move repeated inline styles into a shared CSS block injected once per template to reduce duplication and improve maintainability.
- Ensure consistent margins for A4 and allow custom size via `generatePDFWithCustomSize` when needed.
- Verify notes grouping capitalization and remove residual timestamps/type indicators.

## Implementation Steps
1. Update templates for consistent T&S styling and behavior.
   - Edit `src/lib/templates/report-template.ts` at 523–531
   - Edit `src/lib/templates/estimate-template.ts` at 663–671
   - Edit `src/lib/templates/frc-report-template.ts` at 538–548
2. Centralize shared styles.
   - Create a small shared style snippet within each template or a helper function that returns a `<style>` block applied once.
3. Preserve and validate fallback logic in API routes.
   - Confirm at `generate-report/+server.ts` 215–226, `generate-estimate/+server.ts` 106–117, `generate-frc-report/+server.ts` 126–139
4. Keep sanitization intact.
   - Use `escapeHtmlWithLineBreaks` (46) and `sanitizeInput` (71)
5. Add optional per-document toggles to show/hide T&S (default on).
   - Wire through route handlers into template props; hide block when empty.

## Validation
- Generate sample PDFs for all three document types and visually inspect T&S and section spacing.
- Verify page-break behavior with long T&S content.
- Confirm signed URL generation and storage paths unchanged.

## Request for Confirmation
- Confirm the proposed T&S styling (heading, border/background, spacing) and the addition of optional signature lines.
- Confirm enabling per-document toggles to show/hide T&S and centralizing styles within templates.
- On approval, I will implement and provide the changes for review without committing.