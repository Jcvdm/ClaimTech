# Fix: Random Navigation to Summary Page

**Priority**: Critical
**Status**: Ready for Investigation
**Related**: FIELD_TESTING_ISSUES.md - Issue 2

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
