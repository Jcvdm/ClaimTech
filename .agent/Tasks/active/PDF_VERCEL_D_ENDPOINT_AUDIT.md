# PDF on Vercel — Stream D: Endpoint Hardening

**Created**: 2026-04-12
**Status**: In Progress
**Complexity**: Moderate
**Branch**: `claude/fix-pdf-chrome-error-HwZOh`
**Parent plan**: `/root/.claude/plans/vivid-painting-teacup.md`

## Overview

Explore of the PDF endpoints surfaced two pre-existing inconsistencies that
the Sparticuz migration **amplifies** (cold-start adds ~2–5 s to the first
PDF generation on a warm function). Fix the highest-value one now while we're
in this area; document the others as follow-ups.

Can run in parallel with Stream A (different files).

## Files to Modify

- `src/routes/api/generate-photos-pdf/+server.ts` (around line 465) —
  add keep-alive SSE pings around the `generatePDF` call.
- `src/routes/api/generate-all-documents/+server.ts` (lines 121–212) —
  **read-only audit** + add a comment documenting the duration budget.

## Implementation Steps

### 1. Photos PDF keep-alive (primary change)

Background: `generate-frc-report`, `generate-estimate`, and
`generate-additionals-letter` wrap their `generatePDF` call in a
`Promise.race([pdfPromise, pingInterval])` loop that emits an SSE progress
ping every 2 s. `generate-photos-pdf` does **not** — it calls `generatePDF`
directly (line 465) despite producing the largest documents (8–20 pages).
Without pings, slow renders risk client-side timeouts.

**Pattern to copy** — see `generate-frc-report/+server.ts` in the 60–80%
progress band. Structure:

```ts
const pdfPromise = generatePDF(html, { /* opts */ });
const pingInterval = setInterval(() => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 70, message: 'Rendering PDF...' })}\n\n`));
}, 2000);
try {
  const pdfBuffer = await pdfPromise;
  clearInterval(pingInterval);
  // continue...
} catch (err) {
  clearInterval(pingInterval);
  throw err;
}
```

Apply the same pattern around line 465 of `generate-photos-pdf/+server.ts`.
Preserve existing progress values and message strings — just wrap the
`generatePDF` await with a ping-emitting `setInterval`.

### 2. all-documents duration audit (documentation only)

Background: `generate-all-documents/+server.ts` sequentially calls:
report → estimate → photos-pdf → photos-zip via internal fetch.
With Sparticuz cold-start ~3 s per sub-invocation and each PDF taking
15–60 s depending on size, worst-case total is ~3 minutes. `svelte.config.js`
declares `maxDuration: 300` (5 min), so there is headroom, but it is
narrower than before.

**Action**: add a top-of-file comment in
`src/routes/api/generate-all-documents/+server.ts` noting:
```ts
// NOTE: Sequential generation. With Sparticuz cold-starts and photos-pdf
// renders, worst-case total ~3 min. Stays within maxDuration=300s but
// parallelisation should be considered if timeouts appear. See
// .agent/Tasks/active/PDF_VERCEL_D_ENDPOINT_AUDIT.md.
```

**Do not parallelise** in this task — that's a separate piece of work that
needs careful handling of shared progress state.

## Verification

- [ ] `generate-photos-pdf` emits SSE progress pings every ~2 s during the
      `generatePDF` await (verify in local dev by watching the network tab
      during a photos PDF generation).
- [ ] `npm run check` passes.
- [ ] All-documents route carries the duration comment.

## Follow-ups (out of scope — flag in commit message)

- Shop endpoints (`generate-shop-estimate`, `generate-shop-invoice`) use
  bespoke `ReadableStream` + `controller.enqueue()` instead of the shared
  `createStreamingResponse()` helper used by the other endpoints. Candidate
  for a future consistency pass.
- Parallelising `generate-all-documents` (launch report / estimate /
  photos-pdf concurrently instead of sequentially) would cut total time by
  ~60 % at the cost of 3× peak memory.

## Notes for Coder Agent

- Do **not** touch `pdf-generator.ts` (that's Stream A).
- Do **not** refactor the shop endpoints — documented as a follow-up.
- Commit with message:
  `feat(pdf): add keep-alive pings to photos-pdf endpoint; document all-docs budget`
