# Field Testing Issues - Mobile Assessment

**Reported**: 2025-12-05
**Context**: Testing assessment workflow in the field on mobile device
**Status**: Needs Investigation & Fixes

---

## Issue 1: Photo Loss on First Take

**Severity**: High
**Location**: Photo capture across various tabs

**Expected Behavior**:
- Take a photo → photo is saved and displayed

**Actual Behavior**:
- First time taking a photo on each page/type, the app returns to summary page and photo is lost
- On second attempt, it works correctly
- Recurring pattern: seems to happen the first time taking a photo on each tab/category

**Possible Causes**:
- Race condition in photo upload/state initialization
- Component not fully mounted before photo capture
- State not properly initialized on first render

---

## Issue 2: Random Navigation to Summary Page

**Severity**: Critical
**Location**: Assessment workflow general

**Expected Behavior**:
- Stay on current tab while working
- Progress is preserved

**Actual Behavior**:
- App randomly returns to summary page
- Some progress is lost when this happens

**Possible Causes**:
- Sync/state management issue
- Unhandled error causing navigation reset
- PWA/offline sync interfering with state

---

## Issue 3: Exterior 360 Photo Taking UX

**Severity**: Medium
**Location**: Exterior 360 tab

**Expected Behavior**:
- In the field, tap photo button repeatedly to quickly capture multiple photos
- Photos feed directly into the 360 grid
- Quick tap-tap-tap workflow

**Actual Behavior**:
- Have to upload through a larger dialog
- Cannot quickly take successive photos with camera
- Lost the "quick capture" functionality

**Desired Fix**:
- Add quick-capture button that opens camera directly
- Each photo taken immediately adds to the 360 grid
- No dialog required for successive photos

---

## Issue 4: Estimate Quick Add Line - Photo Not Showing

**Severity**: High
**Location**: Estimate tab → Quick Add Line Item

**Expected Behavior**:
- Take photo with line item → photo shows immediately in the line
- Seamless workflow

**Actual Behavior**:
- Photo taken with line doesn't show immediately
- Have to navigate away and back to see the photo

**Possible Causes**:
- State not updating after photo capture
- Missing reactive update/invalidation

---

## Issue 5: Estimate Quick Add - Scroll & Save Required

**Severity**: High
**Location**: Estimate tab → Quick Add Line Item

**Expected Behavior**:
- Quick add function allows adding hundreds of lines in fast succession
- Add line → immediately ready to add next line
- No scrolling or manual save required between lines

**Actual Behavior**:
- After adding a line, user must scroll down to see it
- Must click save after each line
- Breaks the "quick" workflow
- Not practical for field use where 100+ lines may be needed

**Desired Fix**:
- Auto-scroll to show new line (or keep input at top)
- Auto-save new lines immediately
- Keep focus on quick-add input for rapid entry

---

## Issue 6: Estimate Table Auto-Save

**Severity**: Medium
**Location**: Estimate tab → Line items table editing

**Expected Behavior**:
- When editing existing lines in the table, changes auto-save
- On blur or after typing stops, changes persist

**Actual Behavior**:
- Have to manually click "Save" button
- Only saves when Save is clicked
- Risk of losing edits if navigating away

**Desired Fix**:
- Implement debounced auto-save on blur or after typing stops
- Match pattern used in other assessment tabs

---

## Summary

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | Photo loss on first take | High | Photo Capture |
| 2 | Random return to summary page | Critical | State/Navigation |
| 3 | Exterior 360 quick capture UX | Medium | UX Enhancement |
| 4 | Quick add line photo not showing | High | Estimate Tab |
| 5 | Quick add requires scroll/save | High | Estimate Tab |
| 6 | Estimate table no auto-save | Medium | Estimate Tab |

---

## Next Steps

1. Investigate root causes for issues 1, 2, 4
2. Implement fixes prioritized by severity
3. Re-test in field conditions
