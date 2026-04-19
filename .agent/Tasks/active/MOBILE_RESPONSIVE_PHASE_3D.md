# Mobile Responsiveness — Phase 3D: Photo Viewer Keyboard + Landscape Fixes

**Created**: 2026-04-17
**Status**: Planning → In Progress
**Complexity**: Simple
**Source Plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md` (Phase 3D section, user-approved)
**Depends on**: Phase 1 (`f27ca67`) + Phase 2 (`2ef4ebd`) + Phase 3A (`b3be12a`) + Phase 3B (`929789a`) + Phase 3C (`166a3ce`)

## Overview

Two surgical fixes to two photo-viewer components. Verified against actual source on 2026-04-17:

1. **Keyboard overlap on label input** — both viewers use `position: fixed; bottom: 0` with no `visualViewport` listener. On mobile, the virtual keyboard hides the input. Fix: `visualViewport`-driven `bottom` offset.
2. **Landscape layout breakage on FormFieldPhotoViewer** — single `@media (max-width: 768px)` query, no orientation handling. At phone landscape (≤500px height), the vertical flex bar dominates the viewport. Fix: add `@media (orientation: landscape) and (max-height: 500px)` collapse to horizontal.

**Dropped from initial plan** (verified non-issues or delegation-covered):
- Stale photo counter — counter is already reactive (`$state` + live `props.photos.length`).
- `PhotosPanel` component edits — all 6 major panels delegate label editing to the viewers. Fix viewers → panels auto-benefit.
- Z-index code changes — actual hierarchy (999 < 1000 < 10000) is intentional; document-only change to `app.css`.

## Files to modify

| File | Changes |
|------|---------|
| `src/lib/components/photo-viewer/FormFieldPhotoViewer.svelte` | visualViewport $effect + inline `bottom` style + landscape media query |
| `src/lib/components/photo-viewer/PhotoViewer.svelte` | visualViewport $effect + inline `bottom` style (no landscape query) |
| `src/app.css` | Documentary comment block for z-index hierarchy |

## Implementation

### 3D.1 — `FormFieldPhotoViewer.svelte`

**A. Add visualViewport effect (inside existing `<script>`)**. Place with the other state declarations near the top of the script block:

```ts
let vvBottomOffset = $state(0);

$effect(() => {
  if (typeof window === 'undefined' || !window.visualViewport) return;
  const vv = window.visualViewport;
  const update = () => {
    // window.innerHeight - vv.height - vv.offsetTop gives keyboard-occluded space at bottom
    vvBottomOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
  };
});
```

**B. Apply the offset** to the `.field-viewer-overlay` div (currently around line 310 in the template). Add an inline style binding:

```svelte
<div class="field-viewer-overlay" style="bottom: {vvBottomOffset}px;">
  <!-- existing contents unchanged -->
</div>
```

Do NOT remove or change the CSS `bottom: 0` in `.field-viewer-overlay`. The inline style overrides only when `vvBottomOffset > 0` (i.e. keyboard is up). When keyboard is down or the browser lacks visualViewport, the CSS default remains.

**C. Add landscape media query** at the END of the `<style>` block, AFTER the existing `@media (max-width: 768px)` (currently ends around line 520) and BEFORE `:global(.bp-wrap)`:

```css
@media (orientation: landscape) and (max-height: 500px) {
  .field-viewer-overlay {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 8px 12px;
    gap: 8px;
    align-items: center;
  }
  .field-label {
    flex: 0 0 auto;
  }
  .field-input-container {
    flex: 1 1 200px;
    min-width: 0;
  }
  .close-button {
    width: auto;
    flex: 0 0 auto;
  }
}
```

Breakpoint rationale: `max-height: 500px` catches typical phone landscape (iPhone 14 Pro = 852×393 → landscape = 393 height, matches. iPad mini landscape = 1024×768 → 768 height, does NOT match → keeps vertical layout, which is fine).

### 3D.2 — `PhotoViewer.svelte`

Apply **Parts A and B only** from 3D.1 to this file:
- Add the same `vvBottomOffset` state + `$effect` in the script block.
- Apply `style="bottom: {vvBottomOffset}px;"` to the `.photo-viewer-info` div (the fixed bottom bar, currently around line 389).

**Do NOT add a landscape media query** to PhotoViewer. Its bottom bar has different content (counter + thumbnail strip + delete + close) and collapsing to horizontal may break navigation. Leave vertical.

### 3D.3 — `src/app.css`

Add a documentary comment block near the existing CSS tokens in `:root` or under `@layer base`. Purely a comment, no CSS rules:

```css
/* Z-Index hierarchy (documentary — values set at usage sites, not as tokens)
   40      - sticky headers, toasts (svelte-sonner)
   50      - shadcn Dialog / Sheet / DropdownMenu (bits-ui default)
   999     - bigger-picture gallery (.bp-wrap) — library default
   1000    - PhotoViewer / FormFieldPhotoViewer bottom bar (above .bp-wrap intentionally)
   10000   - Critical error overlays (.viewer-error)
*/
```

Place it wherever makes sense to a future reader — near the existing tokens, or at the top of the file as a reference. No code change beyond the comment.

## Implementation order

1. **Read** first:
   - `src/lib/components/photo-viewer/FormFieldPhotoViewer.svelte` in full — confirm current script structure, state declarations, overlay div location.
   - `src/lib/components/photo-viewer/PhotoViewer.svelte` around lines 380–410 + the script block.
   - `src/app.css` top section + existing `@layer base` structure.
2. **Implement 3D.1** (FormFieldPhotoViewer) fully — all three parts (A, B, C).
3. **Implement 3D.2** (PhotoViewer) — parts A and B only.
4. **Implement 3D.3** (z-index comment in app.css).
5. **Verify** (see below).

## Hard constraints

- Do NOT touch the panel components (`EstimatePhotosPanel`, `AdditionalsPhotosPanel`, `PreIncidentPhotosPanel`, `InteriorPhotosPanel`, `Exterior360PhotosPanel`, `ShopPhotosPanel`, `TyrePhotosPanel`) — out of scope, delegation handles it.
- Do NOT touch `bigger-picture` library internals or `node_modules`.
- Do NOT change the viewport meta tag in `src/app.html` — `interactive-widget=resizes-content` isn't supported on iOS Safari; the JS listener handles Safari natively.
- Do NOT add a landscape query to PhotoViewer (only FormFieldPhotoViewer gets one).
- Do NOT change `bottom: 0` in the CSS for either overlay — the inline style binding does the dynamic adjustment.
- Do NOT remove or refactor any existing `$state`, `$effect`, or event handler. Add next to them.
- Do NOT wire any Phase 2 primitives (ResponsiveDialog etc.) into these files — the UX stays "inline label edit on the fixed bar", just fixed.
- Do NOT commit or push — orchestrator handles that.

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -60` — 0 NEW errors. Baseline = 0 errors + 29 pre-existing warnings.
2. `npm run build 2>&1 | tail -15` — succeeds.
3. `grep -n 'visualViewport' src/lib/components/photo-viewer/FormFieldPhotoViewer.svelte src/lib/components/photo-viewer/PhotoViewer.svelte` — should match in both files.
4. `grep -n 'orientation: landscape' src/lib/components/photo-viewer/FormFieldPhotoViewer.svelte` — should match (in the CSS block).
5. `grep -n 'Z-Index hierarchy' src/app.css` — should match the comment block.
6. Manual quick check: open a file that imports these viewers (any `*PhotosPanel`) and confirm no type-check regressions bubble up.

## Report back

Tight (< 300 words):
- Files modified with line-count delta.
- Where you placed the `$effect` in each viewer (relative to other effects/state).
- Any surprise in the existing script structure that made you deviate (e.g. there's already a `visualViewport`-like mechanism — unlikely per verification but flag if so).
- Build + svelte-check result.
- Any concerns about the landscape media query affecting desktop or iPad mini (reminder: `max-height: 500px` gates it; iPad mini portrait/landscape both exceed 500 height).

## Notes

- Branch: `claude/confident-mendel`. Append commits. No new branch.
- The 2 viewers live at `src/lib/components/photo-viewer/` (NOT `photos/` — the Phase 2 investigation doc path was wrong; Phase 3D plan cites the correct path).
- `visualViewport` support: Chrome 61+, Safari 13+, Firefox 91+. Universal in 2026 mobile install base. The `if (!window.visualViewport) return` guard handles SSR + the rare unsupported browser.
- iOS Safari has scroll quirks with `visualViewport.offsetTop`; listening to BOTH `resize` AND `scroll` events on `vv` catches these.
