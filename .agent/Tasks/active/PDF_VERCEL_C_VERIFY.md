# PDF on Vercel — Stream C: Verification & Smoke Endpoint

**Created**: 2026-04-12
**Status**: Blocked on Stream A
**Complexity**: Simple
**Branch**: `claude/fix-pdf-chrome-error-HwZOh`
**Parent plan**: `/root/.claude/plans/vivid-painting-teacup.md`

## Overview

Extend the existing `/api/test-puppeteer` route so it reports exactly which
Chromium binary was used — invaluable for debugging future regressions on
preview/production. Then run the manual verification sweep across every
PDF endpoint.

**Depends on**: Stream A (the core swap) must be merged first — this stream
depends on the `launchBrowser` helper existing.

## Files to Modify

- `src/routes/api/test-puppeteer/+server.ts` — extend response payload.

## Implementation Steps

1. **Extend test-puppeteer response**

   Currently `test-puppeteer/+server.ts` (line 62) calls `generatePDF` on a
   trivial HTML snippet. Replace that behaviour with a diagnostic endpoint
   that launches the browser directly and returns JSON:

   ```ts
   import chromium from '@sparticuz/chromium';
   import puppeteerCore from 'puppeteer-core';

   export const GET: RequestHandler = async () => {
     const start = Date.now();
     const isVercel = !!process.env.VERCEL_ENV;
     const executablePath = isVercel ? await chromium.executablePath() : 'local';
     const browser = isVercel
       ? await puppeteerCore.launch({
           args: chromium.args,
           defaultViewport: chromium.defaultViewport,
           executablePath: await chromium.executablePath(),
           headless: true,
         })
       : await (await import('puppeteer')).default.launch({ headless: true });
     try {
       const version = await browser.version();
       return json({
         ok: true,
         env: process.env.VERCEL_ENV ?? 'local',
         browserVersion: version,
         executablePath,
         durationMs: Date.now() - start,
       });
     } finally {
       await browser.close();
     }
   };
   ```
   Keep it GET-only, no auth required (or reuse whatever auth pattern the
   file already has — check the original).

2. **Run local verification** (document results in this task doc under a
   `## Results` heading):
   - `npm run dev` → `GET /api/test-puppeteer` → 200 with local Chrome version.
   - Generate a full assessment report via the UI → PDF downloads, opens correctly.
   - Generate an FRC report → PDF downloads.

3. **Preview-deploy verification** after pushing the branch:
   - Hit `/api/test-puppeteer` on the Vercel preview URL → 200 with a
     Chromium version string and a `/tmp/...` `executablePath`.
   - Exercise every PDF endpoint once on the preview deployment:
     - `/api/generate-report`
     - `/api/generate-frc-report`
     - `/api/generate-estimate`
     - `/api/generate-shop-estimate`
     - `/api/generate-shop-invoice`
     - `/api/generate-photos-pdf`
     - `/api/generate-additionals-letter`
     - `/api/generate-all-documents`
   - Check Vercel function logs for any remaining "Could not find Chrome"
     occurrences (there should be none).
   - Confirm Vercel dashboard function size < 250 MB.

## Verification Checklist

- [ ] `/api/test-puppeteer` works locally.
- [ ] `/api/test-puppeteer` works on Vercel preview.
- [ ] 8/8 PDF endpoints produce valid PDFs on preview.
- [ ] Zero "Could not find Chrome" errors in preview logs.
- [ ] Function bundle size < 250 MB.

## Notes for Coder Agent

- Do not change behaviour of any `/api/generate-*` endpoint; just exercise
  them and record results.
- If any endpoint fails, open a follow-up task in `.agent/Tasks/active/`
  rather than fixing in-place here.
- Commit with message:
  `test(pdf): extend test-puppeteer diagnostic endpoint with browser info`
