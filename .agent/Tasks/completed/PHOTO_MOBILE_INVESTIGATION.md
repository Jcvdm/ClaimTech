# Photo Labeling / Viewing / Capture — Mobile Investigation

**Created**: 2026-04-17
**Status**: Investigation only — NOT yet a task
**Source**: Explore-agent deep dive during Phase 3C chapter
**Purpose**: Capture what we currently know about the photo flow's mobile behaviour. This becomes the basis for a future **Phase 3D** task after user review.

## Scope of this document

This is an investigation report, not an implementation plan. Some findings are **directly observed** in the code (marked ✅); others are **Explore-agent inferences** that weren't verified (marked ⚠️). The orchestrator should confirm ⚠️ items before writing Phase 3D.

## Inventory (directly observed)

### Viewer components ✅
- `src/lib/components/photos/PhotoViewer.svelte` — fullscreen gallery viewer using the `bigger-picture` library. Supports keyboard shortcuts (E to edit, Escape, Enter, Delete). Fixed bottom bar with label input + actions.
- `src/lib/components/photos/FormFieldPhotoViewer.svelte` — field-specific photo viewer. Similar pattern but scoped to a single field. Uses `max-width: 500px` and fixed bottom bar.

### Inline gallery / panel components ✅
The Explore agent found 7 `*PhotosPanel` components via Glob (not all contents were read):
- `Exterior360PhotosPanel`
- `InteriorPhotosPanel`
- `AdditionalsPhotosPanel`
- `EstimatePhotosPanel`
- `PreIncidentPhotosPanel`
- `TyrePhotosPanel`
- `ShopPhotosPanel`

These are called from the various assessment tabs. Actual layout classes were NOT inspected — unknown whether they use fixed-pixel widths, flex-nowrap, or responsive grids.

### Upload / capture ✅
- `src/lib/components/forms/PhotoUpload.svelte`
- `PhotoUploadV2.svelte` (referenced in the report — path not confirmed)
- Uses `filepond` + `browser-image-compression` (confirmed via `package.json`).

### Services ✅
- 7 assessment-specific photo services under `$lib/services/` (names follow `*photo*.service.ts` or similar pattern — Glob confirmed the count).
- `photo-compressor.ts` and `photo-storage.ts` for offline support.
- `photo-prefetch.ts` (referenced; integration unknown).
- `upload-photos-with-label.ts` utility (combines operations).

## Mobile pain points

### CRITICAL — verified or highly likely

1. **Dynamic viewport height not handled on fixed bottom bars** ⚠️
   - Report claims fixed bottom bars use `position: fixed; bottom: 0` without `h-dvh` awareness.
   - On mobile Chrome, the address bar hides on scroll, viewport grows, and the bar's `bottom: 0` stays pinned — but internal content layout may break because the child heights were computed against the shrunk viewport.
   - **Needs verification**: read `PhotoViewer.svelte` and `FormFieldPhotoViewer.svelte` source to see whether they use `h-dvh`, `100vh`, or something else for the viewer container.
   - Phase 1 swept most `h-screen` → `h-dvh` but `PhotoViewer` may have been missed.

2. **Soft-keyboard overlap on label inputs** ⚠️
   - Fixed bottom bars don't reposition when the keyboard appears on iOS/Android.
   - When editing a label, the input is inside the fixed bar at the bottom. Keyboard rises, covers the input.
   - **Fix usually requires**: `interactionObserver` on `visualViewport`, or switching the edit mode to render in a dialog/sheet where the browser handles it automatically.

3. **Stale photo counter during async delete** ⚠️
   - Report says "1 / 5" counter doesn't update during async delete.
   - **Needs verification**: read the delete flow in PhotoViewer to see whether the counter derives from the live array (would auto-update via `$derived`) or from a captured snapshot.

### MAJOR — verified or highly likely

4. **Optimistic-queue error states lack retry UX** ⚠️
   - Exterior360Tab has an optimistic queue with "error" status but the retry button's handler may be missing.
   - **Needs verification**: read Exterior360Tab.svelte's queue handling.

5. **`bigger-picture` z-index hardcoded at 999** ⚠️
   - Report says library hardcodes z-index; app overlays use 1000+.
   - If a system modal (permission prompt, iOS share sheet) appears, stacking context may break.
   - **Needs verification**: check how `bigger-picture` is configured in the viewer and whether any z-index override is applied.

6. **FormFieldPhotoViewer landscape layout** ⚠️
   - Report says in landscape (812×375), the field overlay and bigger-picture viewer overlap.
   - **Needs verification**: live test or read the CSS to see how `position: fixed` + `bottom: 0` + `max-width: 500px` behaves in a short viewport.

### MINOR — documented, polish-level

- Inputs inside viewers lack placeholder text guidance for required formats (e.g. VIN field).
- Validation warning icon is small on mobile (12px text) — users may not notice.
- 2000ms debounce on damage description / mismatch notes creates latency; unsaved-on-navigate risk.
- No visible skeleton/loading state for inline photo panels during fetch.

## Patterns worth consolidating (if we pursue a follow-up)

The Explore agent's consolidation suggestions are reasonable but UNVERIFIED:

- **"Fixed Bottom Bar" pattern** — possibly reusable component.
- **Validation warning display** — possibly extractable.
- **Keyboard shortcut handling** — possibly extractable to `useKeyboardShortcuts` util.
- **Optimistic queue pattern** — the agent says multiple tabs reimplement this; the Explore agent's `photo-component-development` skill may already document this.

**Do not act on consolidation until each "duplication" claim is verified**. The agent hallucinated some things (like speculating about files it didn't read).

## Recommended Phase 3D scope (subject to verification)

**Priority 1 — verified mobile bugs**:
- Confirm `h-dvh` / viewport-unit handling on both viewers and fix if missing.
- Confirm soft-keyboard overlap on the label input; fix via one of:
  - Move label-editing into a `ResponsiveDialog` so the browser handles keyboard positioning naturally.
  - OR implement `visualViewport` listener to shift the bar.
- Confirm stale counter issue; fix via `$derived`.

**Priority 2 — UX reliability**:
- Confirm optimistic-queue retry handler presence; add if missing.
- Confirm z-index stacking with `bigger-picture`; raise override to 10000 if needed.
- Confirm landscape layout of FormFieldPhotoViewer; add responsive breakpoint if needed.

**Priority 3 — polish**:
- Add placeholder text to label inputs.
- Raise validation warning icon size on mobile (`text-sm` or `size-4`).
- Add skeleton loading states to photo panels.
- Review 2000ms debounce and add a visible "saving..." indicator so users don't navigate mid-debounce.

**Out of scope for 3D** (too speculative without deeper investigation):
- Service consolidation (7 → 1 generalized). Might be real, might be wrong. Needs its own architecture task.
- Shared primitive extraction (FixedBottomBar, ValidationAlert, etc.). Premature — validate the patterns exist first.
- Offline-first sync strategy audit.

## Open questions for orchestrator

1. Are users actively hitting the keyboard-overlap issue in production, or is it a theoretical mobile concern?
2. What viewports does the field engineer team actually use? iPhone, Android mid-range, iPad? The fix matrix depends on this.
3. Should photo label editing on mobile become a bottom-sheet (ResponsiveDialog-like pattern) instead of an inline input on the fullscreen viewer?
4. Is there a performance budget for photo viewer load times? The prefetch utility exists but isn't integrated — is that worth fixing?

## Next steps

1. User reviews this document.
2. Orchestrator (in a next session) reads `PhotoViewer.svelte` + `FormFieldPhotoViewer.svelte` + one or two PhotosPanel components in full to verify the ⚠️ claims.
3. Based on verified pain points, write a focused Phase 3D task spec.
4. The consolidation / architecture work (if real) becomes a separate task, not bundled into Phase 3D.

## References

- `src/lib/components/photos/PhotoViewer.svelte`
- `src/lib/components/photos/FormFieldPhotoViewer.svelte`
- `src/lib/components/assessment/Exterior360Tab.svelte`
- `src/lib/components/assessment/DamageTab.svelte`
- `src/lib/components/forms/PhotoUpload.svelte`
- `.claude/skills/photo-component-development/` — Claude Skill with pre-existing patterns
- Phase 1 sweep: changed many `h-screen` → `h-dvh` but PhotoViewer may have been missed
