# Svelte 5 Error Fixes - Complete Task List

**Created**: November 21, 2025  
**Total Tasks**: 30 subtasks across 6 phases  
**Estimated Total Time**: 2-2.5 hours  
**Target**: Reduce errors from 449 to 0

---

## 📋 Task Structure

### Phase 1: Fix Icon Type Mismatches (7 subtasks, 15-20 min)
- 1.1: select-trigger.svelte
- 1.2: select-scroll-down-button.svelte
- 1.3: select-scroll-up-button.svelte
- 1.4: calendar-month-select.svelte
- 1.5: calendar-year-select.svelte
- 1.6: dropdown-menu-sub-trigger.svelte
- 1.7: dropdown-menu-checkbox-item.svelte

### Phase 2: Resolve DataTable Generic Types (4 subtasks, 20-30 min)
- 2.1: Update DataTable.svelte Column type
- 2.2: Update ModernDataTable.svelte Column type
- 2.3: Verify getSortIcon() return type
- 2.4: Test with existing usage patterns

### Phase 3: Fix Missing Component Props (3 subtasks, 10-15 min)
- 3.1: Fix EstimateTab.svelte onComplete
- 3.2: Fix PreIncidentEstimateTab.svelte onComplete
- 3.3: Test callback execution

### Phase 4: Align Service Input Types (4 subtasks, 15-20 min)
- 4.1: Audit estimate.service.ts
- 4.2: Audit additionals.service.ts
- 4.3: Verify EstimateTab calls
- 4.4: Verify PreIncidentEstimateTab calls

### Phase 5: Update Request Type Definitions (4 subtasks, 20-30 min)
- 5.1: Search for request.notes references
- 5.2: Determine intent for notes field
- 5.3: Update Request interface
- 5.4: Update input types

### Phase 6: Verification & Testing (6 subtasks, 15-20 min)
- 6.1: Run npm run check
- 6.2: Test icon rendering
- 6.3: Test DataTable
- 6.4: Test EstimateTab callback
- 6.5: Test Request creation
- 6.6: Update documentation

---

## 🎯 Success Criteria

✅ npm run check returns 0 errors  
✅ All icon components render correctly  
✅ DataTable sorting works  
✅ Estimate tab callbacks fire  
✅ Request creation works  
✅ No console errors  
✅ All tests pass  

---

## 📚 Related Documentation
- `.agent/Tasks/active/PDR_CONTEXT_ENGINE_ANALYSIS.md` - Context analysis
- `.agent/shadcn/pdr.md` - Main PDR
- Implementation plan in conversation history

