# Fix: Random Navigation to Summary Page

**Priority**: Critical
**Status**: ✅ COMPLETED (2025-12-05)
**Related**: FIELD_TESTING_ISSUES.md - Issue 2
**Commit**: 107bda5

## Resolution

Implemented URL-based tab persistence:
- Tab is now stored in URL query param (`?tab=damage`)
- Survives page reloads and back/forward navigation
- Added `setTabWithUrl()` helper for programmatic tab changes
- DB save is now fire-and-forget (non-blocking)

---

## Problem

- App randomly returns to summary page during assessment
- Progress is lost when this happens
- Unpredictable behavior breaks field workflow

## Investigation Steps

1. Check for unhandled errors that might trigger navigation
2. Review state management for assessment data
3. Check PWA sync manager for navigation side effects
4. Look for `goto()` or navigation calls triggered by:
   - Error handlers
   - Sync operations
   - State resets
5. Check browser history manipulation

## Files to Investigate

- `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte`
- `src/lib/offline/services/sync-manager.svelte.ts`
- `src/lib/offline/services/assessment-cache.ts`
- Error boundaries and catch blocks

## Acceptance Criteria

- [ ] No unexpected navigation during assessment
- [ ] Progress is never lost without user action
- [ ] Clear error handling that doesn't redirect
