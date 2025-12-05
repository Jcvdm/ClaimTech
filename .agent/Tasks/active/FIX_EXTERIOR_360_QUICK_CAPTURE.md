# Enhancement: Exterior 360 Quick Capture UX

**Priority**: Medium
**Status**: Ready for Implementation
**Related**: FIELD_TESTING_ISSUES.md - Issue 3

---

## Problem

Current flow requires uploading through a dialog. In the field, engineers need to quickly tap-tap-tap to capture multiple photos.

## Desired Behavior

1. Quick capture button opens camera directly
2. Each photo taken immediately adds to the 360 grid
3. No dialog required between successive photos
4. Tap → photo taken → ready for next tap

## Implementation Plan

1. Add "Quick Capture" button to Exterior 360 tab
2. Use `<input type="file" capture="environment">` for direct camera access
3. On photo capture:
   - Compress photo
   - Add to grid immediately (optimistic)
   - Upload in background
4. Keep camera input ready for next photo

## Files to Modify

- `src/lib/components/assessment/Exterior360Tab.svelte`
- May need new `QuickCaptureButton.svelte` component

## Acceptance Criteria

- [ ] Quick capture button available
- [ ] Photos appear in grid immediately after capture
- [ ] Can take multiple photos in rapid succession
- [ ] Works on mobile browsers (Android Chrome, iOS Safari)
