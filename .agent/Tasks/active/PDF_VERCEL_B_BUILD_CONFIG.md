# PDF on Vercel — Stream B: Build & Deploy Config

**Created**: 2026-04-12
**Status**: In Progress
**Complexity**: Simple
**Branch**: `claude/fix-pdf-chrome-error-HwZOh`
**Parent plan**: `/root/.claude/plans/vivid-painting-teacup.md`

## Overview

Keep Vercel function bundle well under the 250 MB uncompressed limit after
the Sparticuz Chromium (~50 MB) gets added, and verify deploy config is
right. Can run in parallel with Stream A (different files).

## Files to Modify / Verify

- `.vercelignore` — **create** (may not exist yet).
- `svelte.config.js` — **read-only verification only** (confirm
  `maxDuration: 300` is still present).
- `.env.example` — add a note that no puppeteer env vars are needed.

**Note**: `.npmrc` is owned by Stream A; do not touch it here.

## Implementation Steps

1. **Create `/home/user/ClaimTech/.vercelignore`** at repo root with:
   ```
   # Test / dev artefacts — not needed in Lambda bundle
   e2e/
   playwright.config.ts
   playwright-report/
   test-results/
   tests/
   
   # Docs & task tracking
   .agent/
   *.md
   !README.md
   
   # Local scripts not needed at runtime
   scripts/
   
   # IDE / editor
   .vscode/
   .idea/
   
   # Misc
   .env.example
   ```
   Goal: shrink the function bundle so it sits comfortably under 250 MB.

2. **`svelte.config.js`** — read-only: confirm line 14 still says
   `maxDuration: 300`. Do not modify. If it has changed, flag in task
   notes and stop.

3. **`.env.example`** — append a short comment documenting that PDF
   generation needs **no** puppeteer-specific env vars; Sparticuz manages
   `/tmp` itself.

## Verification

- [ ] `.vercelignore` exists and lists the paths above.
- [ ] `svelte.config.js` unchanged and still declares `maxDuration: 300`.
- [ ] `.env.example` carries the documentation note.

## Notes for Coder Agent

- Do **not** touch `vercel.json` — existing cache headers are unrelated.
- Do **not** add function-level `export const config = {...}` overrides
  in the generate-* routes. Out of scope for this stream.
- Commit with message:
  `chore(pdf): add .vercelignore and skip puppeteer Chrome download in CI`
