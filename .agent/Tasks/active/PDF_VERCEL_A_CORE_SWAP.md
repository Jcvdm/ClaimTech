# PDF on Vercel — Stream A: Core Puppeteer Swap

**Created**: 2026-04-12
**Status**: In Progress
**Complexity**: Moderate
**Branch**: `claude/fix-pdf-chrome-error-HwZOh`
**Parent plan**: `/root/.claude/plans/vivid-painting-teacup.md`

## Overview

Production PDF generation on Vercel fails with "Could not find Chrome
(ver. 141.0.7390.76) ... cache path /home/sbx_user1051/.cache/puppeteer".
Root cause: the full `puppeteer` package tries to load Chrome from
`$HOME/.cache/puppeteer`, which Vercel's Lambda bundle does not ship and which
would exceed the 250 MB function size limit even if it did. Fix is to swap
`puppeteer` → `puppeteer-core` + `@sparticuz/chromium` (Lambda-optimised ~50 MB
Chromium that decompresses into `/tmp` on cold start).

This is the critical-path stream. Streams B and D can run in parallel (they
touch different files). Stream C (verification) runs after A.

## Files to Modify

- `package.json` — dependency swap.
- `src/lib/utils/pdf-generator.ts` — replace puppeteer import + both
  `puppeteer.launch({...})` call sites (lines 1, 85, 244) with a
  `launchBrowser()` helper that branches on `process.env.VERCEL_ENV`.

## Implementation Steps

1. **Dependency swap**
   ```bash
   npm uninstall puppeteer
   npm install puppeteer-core @sparticuz/chromium
   npm install --save-dev puppeteer
   ```
   - Pick a matched pair: `@sparticuz/chromium` major must line up with
     `puppeteer-core` major. Check npm for the current compatible versions
     (at time of planning: `puppeteer-core@^24` with a compatible
     `@sparticuz/chromium` release).
   - Keep `puppeteer` in **devDependencies only** for local dev ergonomics.

2. **Add `.npmrc`** (or update existing) with:
   ```
   puppeteer_skip_download=true
   ```
   so CI doesn't waste time pulling Chrome for the dev dep.

3. **Refactor `src/lib/utils/pdf-generator.ts`**

   Replace the single-line `import puppeteer from 'puppeteer'` with:
   ```ts
   import chromium from '@sparticuz/chromium';
   import puppeteerCore, { type Browser } from 'puppeteer-core';

   const isVercel = !!process.env.VERCEL_ENV;

   async function launchBrowser(timeoutMs: number): Promise<Browser> {
     if (isVercel) {
       return puppeteerCore.launch({
         args: chromium.args,
         defaultViewport: chromium.defaultViewport,
         executablePath: await chromium.executablePath(),
         headless: true,
         timeout: timeoutMs,
       });
     }
     const puppeteer = await import('puppeteer');
     return puppeteer.default.launch({
       headless: true,
       timeout: timeoutMs,
       args: [
         '--no-sandbox',
         '--disable-setuid-sandbox',
         '--disable-dev-shm-usage',
         '--disable-gpu',
         '--disable-software-rasterizer',
         '--disable-extensions',
       ],
     }) as unknown as Browser;
   }
   ```

   Replace both `puppeteer.launch({...})` blocks (lines 85 and 244) with
   `await launchBrowser(BROWSER_LAUNCH_TIMEOUT)`. Preserve the existing
   `Promise.race([launchPromise, timeoutPromise])` wrapping.

4. **Retune timeouts** (top of file, lines 23–25):
   - `DEFAULT_TIMEOUT`: `8000` → `60000`
   - `BROWSER_LAUNCH_TIMEOUT`: `3000` → `10000`
   - `DEFAULT_RETRIES`: leave at `1`

   Rationale: `svelte.config.js:14` declares `maxDuration: 300` (Vercel Pro),
   and Sparticuz cold-start decompression is ~2–5 s. The old 8 s / 3 s budget
   was optimised for the Hobby 10 s cap, which no longer applies.

5. **Update the error-message branch** on line 194
   (`'Failed to launch Chrome browser. Ensure Puppeteer is installed correctly: npm install puppeteer'`)
   to reflect the new stack — something like:
   `'Failed to launch Chrome browser. Verify @sparticuz/chromium is installed and compatible with puppeteer-core.'`

## Verification

- [ ] `npm install` succeeds.
- [ ] `npm run check` passes (Svelte/TS).
- [ ] `npm run build` succeeds.
- [ ] `grep "from 'puppeteer'" src` returns **no** matches in runtime code
      (only an `await import('puppeteer')` inside the local-dev branch).
- [ ] `npm run dev` + hit `/api/test-puppeteer` locally returns 200 with a
      PDF payload.

## Notes for Coder Agent

- Do **not** touch any `/api/generate-*/+server.ts` files — they consume
  `generatePDF` and do not need changes. Their surface is validated by
  Stream C.
- Do **not** change the retry wrapper's structure — only constants.
- Keep the `Buffer.from(pdfBuffer)` return value; downstream uploaders rely
  on it being a Node Buffer.
- The Sparticuz `chromium.args` list already includes sane Lambda defaults
  (no-sandbox, disable-dev-shm-usage, etc.). Do not merge the old args array
  in production — it can conflict. Only use the old args in the local-dev
  branch.
- Commit with message:
  `fix(pdf): swap puppeteer for puppeteer-core + @sparticuz/chromium for Vercel`
