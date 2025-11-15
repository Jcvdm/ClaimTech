# Bug #9 Enhancement: Notes Formatting by Section

**Status**: PLANNING | **Priority**: Medium | **Effort**: 2-3 hours

---

## 📋 Overview

Improve assessment report notes display by grouping notes by section (Vehicle Identification, Interior, Damage, etc.) instead of showing all notes in one chronological list. Remove timestamps and note type indicators for a more professional, formal report appearance.

---

## 🎯 Requirements

### Current State
- All notes displayed chronologically in one section
- Includes timestamps: "(Added: 2025/11/10)"
- Includes note type indicators: "[BETTERMENT]", "[SYSTEM]"
- Includes source tab in parentheses: "(identification)"

### Desired State
- Notes grouped by section with headers: "VEHICLE IDENTIFICATION NOTES"
- No timestamps in report
- No note type indicators
- Professional paragraph format
- Estimate/Additionals/FRC notes excluded (belong on their documents)

---

## 📊 Implementation Phases

### Phase 1: Update Helper Function
**File**: `src/routes/api/generate-report/+server.ts`

Replace `formatAssessmentNotes()` with `formatAssessmentNotesBySection()`:
- Filter out estimate, additionals, frc notes
- Group remaining notes by source_tab
- Create section headers
- Format as paragraphs with double line breaks

### Phase 2: Update Template
**File**: `src/lib/templates/report-template.ts`

Update Assessment Notes section (lines 515-521):
- Call new formatting function
- Render grouped sections with headers
- Maintain professional styling

### Phase 3: Testing
- Test with multiple notes per section
- Test with empty sections
- Test with mixed note types
- Verify estimate/additionals notes excluded

---

## 📝 Acceptance Criteria

- ✅ Notes grouped by section with clear headers
- ✅ No timestamps displayed
- ✅ No note type indicators
- ✅ Professional paragraph format
- ✅ Estimate/Additionals/FRC notes excluded
- ✅ Empty sections handled gracefully
- ✅ All existing tests pass
- ✅ No TypeScript errors

---

## 🔧 Technical Details

### Source Tab Mapping
| source_tab | Header | Include |
|------------|--------|---------|
| identification | VEHICLE IDENTIFICATION NOTES | ✅ |
| exterior_360 | EXTERIOR 360 NOTES | ✅ |
| interior | INTERIOR & MECHANICAL NOTES | ✅ |
| tyres | TYRES NOTES | ✅ |
| damage | DAMAGE ASSESSMENT NOTES | ✅ |
| vehicle_values | VEHICLE VALUES NOTES | ✅ |
| pre_incident_estimate | PRE-INCIDENT ESTIMATE NOTES | ✅ |
| summary | SUMMARY NOTES | ✅ |
| finalize | FINALIZATION NOTES | ✅ |
| estimate | (Estimate Notes) | ❌ |
| additionals | (Additionals Notes) | ❌ |
| frc | (FRC Notes) | ❌ |

---

## 📚 Related Documentation

- `.agent/Tasks/completed/NOTES_AND_ASSESSMENT_DATA_FLOW.md` - Notes system architecture
- `.agent/System/database_schema.md` - assessment_notes table structure
- `.augment/BUG_9_COMPLETION_REPORT.md` - Previous Bug #9 fixes

---

**Next Step**: Execute Phase 1 - Update helper function

