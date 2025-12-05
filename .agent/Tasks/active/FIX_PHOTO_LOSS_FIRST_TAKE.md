# Fix: Photo Loss on First Take

**Priority**: High
**Status**: Ready for Investigation
**Related**: FIELD_TESTING_ISSUES.md - Issue 1

---

## Problem

When taking a photo for the first time on each page/type:
- App returns to summary page
- Photo is lost
- Second attempt works correctly

## Investigation Steps

1. Check photo capture flow in each tab component
2. Look for race conditions in:
   - Component mount vs photo handler registration
   - State initialization timing
   - File input change handlers
3. Check if PWA offline caching interferes with first photo
4. Review navigation guards that might trigger on state changes

## Files to Investigate

- `src/lib/components/assessment/*.svelte` (tabs with photo capture)
- `src/lib/components/photos/*.svelte` (photo components)
- Photo upload handlers and state management

## Acceptance Criteria

- [ ] First photo capture works reliably
- [ ] No unexpected navigation after photo capture
- [ ] Photo persists in state immediately
