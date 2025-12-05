# Fix: Estimate Quick Add Line Issues

**Priority**: High
**Status**: Ready for Implementation
**Related**: FIELD_TESTING_ISSUES.md - Issues 4, 5, 6

---

## Problems

### Issue 4: Photo not showing immediately
- Photo taken with line item doesn't show immediately
- Have to navigate away and back

### Issue 5: Scroll & save required after each line
- Must scroll down after adding line
- Must click save for each line
- Breaks rapid-entry workflow for 100+ lines

### Issue 6: Table edits don't auto-save
- Editing existing lines requires manual save
- Risk of losing changes

## Desired Behavior

1. **Photo shows immediately** after capture
2. **Auto-save new lines** without manual save click
3. **No scroll required** - keep quick-add input accessible
4. **Auto-save table edits** on blur/debounce
5. Support adding 100+ lines in rapid succession

## Implementation Plan

### For Quick Add:
1. After adding line, keep focus on quick-add input
2. Auto-save new line immediately (no Save button needed)
3. Scroll new line into view but keep input visible
4. Update photo state reactively after capture

### For Table Editing:
1. Add debounced auto-save on input blur
2. Match pattern from other assessment tabs
3. Show subtle save indicator

## Files to Modify

- `src/lib/components/assessment/EstimateTab.svelte`
- `src/lib/components/assessment/QuickAddLineItem.svelte`
- Related estimate line item components

## Acceptance Criteria

- [ ] Photos show immediately in quick-add flow
- [ ] New lines auto-save without clicking Save
- [ ] Quick-add input stays accessible after adding line
- [ ] Table edits auto-save on blur
- [ ] Can add 100+ lines rapidly without interruption
