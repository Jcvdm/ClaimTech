## Issue
- Svelte compile error at `FinalizeTab.svelte:396:0 Unexpected token` is caused by new function declarations inserted before closing the preceding function (`handleGeneratePhotosZIP`).
- The `await documentGenerationService.generateDocument(...` call’s callback isn’t closed (`})` and `);`), the `try` block continues, and then `async function handleGenerateFRCReport()` starts mid-function, which breaks parsing.

## Fix Summary
- Properly close the `generateDocument('photos_zip', ...)` call and finish `handleGeneratePhotosZIP` with `await loadGenerationStatus()` and `await invalidateAll()` followed by its `catch`/`finally` blocks.
- Place `handleGenerateFRCReport` and `handleGenerateAdditionalsLetter` after the full closure of `handleGeneratePhotosZIP`.
- Remove the stray `); await loadGenerationStatus(); await invalidateAll();` block that currently appears after the new functions (duplicate and out of place).

## Exact Change
- File: `src/lib/components/assessment/FinalizeTab.svelte`
- Replace the `handleGeneratePhotosZIP` function with this corrected version:
```
async function handleGeneratePhotosZIP() {
  generating.photos_zip = true;
  progress.photos_zip = 0;
  progressMessage.photos_zip = 'Starting...';
  error = null;
  try {
    await documentGenerationService.generateDocument(
      assessment.id,
      'photos_zip',
      (prog, msg) => {
        progress.photos_zip = prog;
        progressMessage.photos_zip = msg;
      }
    );
    await loadGenerationStatus();
    await invalidateAll();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to generate photos ZIP';
  } finally {
    generating.photos_zip = false;
    progress.photos_zip = 0;
    progressMessage.photos_zip = '';
  }
}
```
- Ensure the new functions:
  - `async function handleGenerateFRCReport() { ... }`
  - `async function handleGenerateAdditionalsLetter() { ... }`
  appear AFTER the closing brace of `handleGeneratePhotosZIP`.
- Delete the stray block currently at ~lines 456–466: `); await loadGenerationStatus(); await invalidateAll();` and the duplicated `catch/finally` that follows the inserted functions.

## Verification
- Rebuild dev server; the Svelte compiler should no longer throw a parse error.
- Click “Photographs ZIP” generate; progress updates; then verify no console errors and URLs update.
- Click “FRC Settlement Report” and “Additionals Letter” in Finalize tab; both should stream progress and update generation status.
- Optional: Run type-check to ensure `DocumentGenerationStatus` updates compile cleanly.

## Notes
- No behavioral logic changes besides fixing syntax; the new FRC and Additionals handlers remain intact and properly scoped.
- This addresses the Vite plugin Svelte compile error and the 500 caused by bad build.