# ClaimTech Bugs & Issues

## Resolved Bugs

### 6. Finalization Report - Outstanding Fields Checks on Completed Fields ✅ RESOLVED
**Status**: RESOLVED
**Severity**: High
**Component**: Finalization Tab / Report Generation
**Resolution Date**: 2025-11-12
**Fix**: Pass photo arrays into finalization validation and wire parent to provide them

**Description**:
Finalization report flagged tabs as incomplete even when users had completed their fields, especially photo requirements.

**Root Cause**:
`FinalizeTab` computed `getTabCompletionStatus` without passing `interiorPhotos`, `exterior360Photos`, and `tyrePhotos`. The validators rely on these arrays (≥2 interior, ≥4 exterior, ≥1 per tyre). Without the arrays, validation assumed zero photos and reported false missing fields.

**Solution**:
- Added `interiorPhotos`, `exterior360Photos`, and `tyrePhotos` props to `FinalizeTab` and included them in `getTabCompletionStatus`.
- Updated parent assessment page to pass the photo arrays from `data.*` into `FinalizeTab`.

**Implementation Details**:
- File: `src/lib/components/assessment/FinalizeTab.svelte`
  - Props extended to include `interiorPhotos`, `exterior360Photos`, `tyrePhotos` (near props interface)
  - `getTabCompletionStatus(...)` updated to include these arrays `src/lib/components/assessment/FinalizeTab.svelte:100–111`
- File: `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte`
  - Passed `interiorPhotos`, `exterior360Photos`, `tyrePhotos` into `<FinalizeTab ... />` `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte:876–890`

**Testing**:
- With completed photo requirements, Finalization no longer flags tabs as incomplete.
- Add/remove photos in their tabs and navigate to Finalize → status reflects accurately.

**Related Documentation**:
- Validation reference: `.agent/README/system_docs.md` → validation utilities

### 5. Estimate Tab - Repairer Selection Pulls Through Values ✅ RESOLVED
**Status**: RESOLVED
**Severity**: Medium
**Component**: Estimate Tab / Rates and Repairer Component
**Resolution Date**: 2025-11-12
**Fix**: Propagate repairer defaults to rates immediately, auto-apply rate changes on blur, persist rates and show loading overlay during recalculation

**Description**:
Selecting a repairer did not auto-populate their default rates/markup into the estimate, and calculations did not update. Manual rate edits also required clicking "Update Rates" to see totals change, which led to confusion and stale UI.

**Root Cause**:
`RatesAndRepairerConfiguration` only called `onUpdateRepairer` on selection; updated default rates lived in local state without invoking `onUpdateRates`. `EstimateTab` recalculation ran only when `onUpdateRates` was triggered explicitly. There was no loading/disabled state, so users could interact mid-recalc.

**Solution**:
- Call `onUpdateRates(...)` immediately after repairer selection and after Quick Add to propagate defaults and trigger recalculation.
- Add `onblur={handleUpdateRates}` to all rate/markup inputs so changes apply on field blur.
- Update `EstimateTab` to recalc totals, persist rates via parent `onUpdateRates`, and clear the Save banner after successful update.
- Add a blur overlay with a loading spinner while recalculation/persistence is in progress.

**Implementation Details**:
- File: `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte`
  - Selection handler: `handleRepairerChange` calls `onUpdateRates` `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:117–136`
  - Quick Add handler: calls `onUpdateRates` `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:166–177`
  - Auto-apply on blur: inputs `labourRate`, `paintRate`, `vatPercentage`, `oemMarkup`, `altMarkup`, `secondHandMarkup`, `outworkMarkup` `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:306–314, 328–336, 349–357, 379–388, 403–411, 426–434, 449–457`
- File: `src/lib/components/assessment/EstimateTab.svelte`
  - Recalc + persist: `handleLocalUpdateRates` `src/lib/components/assessment/EstimateTab.svelte:620–644`
  - Loading overlay: wrapper and overlay `src/lib/components/assessment/EstimateTab.svelte:668–669, 1258–1265`

**Testing**:
- Select an existing repairer → defaults populate, totals recalc immediately, UI shows brief loading overlay.
- Quick Add a repairer → defaults populate, totals recalc immediately, repairers list refreshes.
- Edit any rate/markup and tab out → totals update immediately, overlay displays briefly.
- Navigate away/back → rates and totals persist without manual Save.

**Related Documentation**:
- Architecture and tab patterns: `.agent/README/architecture_quick_ref.md`
- System docs: `.agent/README/system_docs.md`

### 4. Estimate Tab - Cannot Edit Description on Existing Line Items ✅ RESOLVED
**Status**: RESOLVED
**Severity**: Medium
**Component**: Estimate Tab / Line Items Table
**Resolution Date**: 2025-11-11
**Fix**: Changed Svelte 4 syntax `on:blur` to Svelte 5 syntax `onblur`

**Description**:
When a line item was added to the estimate, users were unable to update or edit the description field of that already-added line. The description field appeared to be locked or non-editable after initial creation.

**Root Cause**:
Line 884 of `EstimateTab.svelte` used Svelte 4 event handler syntax (`on:blur`) instead of Svelte 5 syntax (`onblur`). Svelte 5 doesn't recognize the `on:blur` directive, so the blur handler never fired. While the `oninput` handler worked (allowing text to update as you type), without the blur handler, the field didn't properly flush updates to the local state.

**Solution**:
Changed line 884 in `src/lib/components/assessment/EstimateTab.svelte` from:
```svelte
on:blur={(e) => flushUpdate(item.id!, 'description', e.currentTarget.value)}
```

To:
```svelte
onblur={(e) => flushUpdate(item.id!, 'description', e.currentTarget.value)}
```

This single-character change (removing the colon) fixes the event handler syntax to match Svelte 5 requirements.

**Implementation Details**:
- File: `src/lib/components/assessment/EstimateTab.svelte`
- Line: 884
- Change: Removed colon from `on:blur` to make it `onblur`
- Pattern: Now matches PreIncidentEstimateTab and Svelte 5 event handler syntax
- Risk: Low (single character change, no breaking changes)

**Testing**:
- Add line item to estimate
- Click into description field and type
- Tab to next field (blur handler fires)
- Click "Save Changes"
- Navigate away and return
- Verify description persists

**Related Documentation**:
- Context Report: `.augment/context_reports/BUG_4_ESTIMATE_DESCRIPTION_EDIT_CONTEXT.md`
- Implementation Plan: `.augment/fixes/BUG_4_IMPLEMENTATION_PLAN.md`
- Fix Summary: `.augment/fixes/BUG_4_FIX_SUMMARY.md`
- Completion Report: `.augment/fixes/BUG_4_COMPLETE.md`

---

### 3. Vehicle Values Tab - PDF Upload Not Persisting ✅ RESOLVED
**Status**: RESOLVED
**Severity**: Medium
**Component**: Vehicle Values Tab / PDF Upload
**Resolution Date**: 2025-11-11
**Fix**: Added `handleSave()` calls after PDF upload and removal

**Description**:
When users uploaded a PDF to the Vehicle Values tab, the upload completed successfully to storage, but the PDF URL/path was not saved to the database. When users navigated away from the tab and returned, the PDF disappeared because it was never persisted.

**Root Cause**:
The `handlePdfUpload()` function updated local state (`valuationPdfUrl` and `valuationPdfPath`) but did not call `handleSave()` to persist to the database. The PDF only saved if the user triggered the debounced save by typing in another field within 2 seconds. When users navigated away, the `$effect()` sync logic overwrote local state with database values (which had no PDF data), causing the PDF to disappear.

**Solution**:
Added `handleSave()` calls in two functions in `src/lib/components/assessment/VehicleValuesTab.svelte`:

1. In `handlePdfUpload()` (line 322):
```typescript
function handlePdfUpload(url: string, path: string) {
  valuationPdfUrl = url;
  valuationPdfPath = path;
  handleSave(); // ← Added this line
}
```

2. In `handlePdfRemove()` (line 329):
```typescript
function handlePdfRemove() {
  valuationPdfUrl = '';
  valuationPdfPath = '';
  handleSave(); // ← Added this line
}
```

**Implementation Details**:
- File: `src/lib/components/assessment/VehicleValuesTab.svelte`
- Lines: 322, 329
- Changes: Added 2 `handleSave()` calls + 2 explanatory comments
- Pattern: Matches auto-save pattern used elsewhere in assessment tabs
- Risk: Low (isolated change, no breaking changes)

**Testing**:
- Upload PDF to Vehicle Values tab
- Verify validation badge updates immediately
- Navigate to another tab and return
- Verify PDF is still visible
- Reload page and navigate to Values tab
- Verify PDF loads from database
- Remove PDF and verify it's deleted from database

**Related Documentation**:
- Context Report: `.augment/context_reports/BUG_3_VEHICLE_VALUE_PDF_UPLOAD_CONTEXT.md`
- Implementation Plan: `.augment/fixes/BUG_3_PDF_UPLOAD_FIX.md`
- Fix Summary: `.augment/fixes/BUG_3_SUMMARY.md`

---

### 2. Damage ID Outstanding Fields Badge - Stays Open When Complete ✅ RESOLVED
**Status**: RESOLVED
**Severity**: Low
**Component**: Damage Tab / Outstanding Fields Badge
**Resolution Date**: 2025-01-29
**Fix**: Changed validation to derive from local state instead of damageRecord prop

**Description**:
The outstanding fields badge on the Damage ID section stayed visible even after all required fields were filled in. The badge should close/disappear once all fields are complete.

**Root Cause**:
Validation was derived from `damageRecord` prop which only updated after database save completed. Local state had correct values immediately but validation didn't react to local state changes, causing the badge to stay visible until the prop updated from the parent.

**Solution**:
Changed validation in `src/lib/components/assessment/DamageTab.svelte` (lines 116-135) from:
```typescript
const validation = $derived.by(() => {
    return validateDamage(damageRecord ? [damageRecord] : []);
});
```

To:
```typescript
const validation = $derived.by(() => {
    const tempRecord = {
        matches_description: matchesDescription,
        severity: severity,
        damage_area: damageArea,
        damage_type: damageType,
        mismatch_notes: mismatchNotes,
        damage_description: damageDescription,
        estimated_repair_duration_days: estimatedRepairDurationDays,
        location_description: locationDescription,
        affected_panels: affectedPanels
    };
    return validateDamage([tempRecord]);
});
```

This ensures validation reacts immediately to user input without waiting for prop updates from the parent.

**Implementation Details**:
- File: `src/lib/components/assessment/DamageTab.svelte`
- Lines: 116-135
- Pattern: Derives validation from local state variables instead of prop
- Maintains same validation logic, only changes data source

**Testing**:
- ✅ Badge appears when fields incomplete
- ✅ Badge disappears immediately when all fields filled
- ✅ Badge reappears immediately when field cleared
- ✅ Persists across tab changes
- ✅ Persists after page reload
- ✅ Auto-save still works
- ✅ Finalization validation correct
- ✅ Other tabs unaffected
- ✅ No console errors

**Related Documentation**:
- Testing Instructions: `.agent/Tasks/active/bug_2_testing_instructions.md`
- Regression Testing: `.agent/Tasks/active/bug_2_regression_testing.md`

---

### 1. Appointment Creation - UI Not Auto-Updating ✅ RESOLVED
**Status**: RESOLVED
**Severity**: Medium
**Component**: Inspection Detail Page / Appointments List
**Resolution Date**: 2025-01-11
**Fix**: Added `{ invalidateAll: true }` to goto() call on line 319 of `src/routes/(app)/work/inspections/[id]/+page.svelte`

**Description**:
When an engineer is appointed to an inspection and an appointment is created, the UI did not automatically update to reflect the new appointment. User had to manually navigate away and return to see the appointment appear in the list.

**Root Cause**:
SvelteKit caches page data for performance. Without `{ invalidateAll: true }`, the appointments list page reused cached data that was loaded BEFORE the appointment was created, so the new appointment didn't appear.

**Solution**:
Changed line 319 from:
```typescript
goto('/work/appointments');
```
To:
```typescript
goto('/work/appointments', { invalidateAll: true });
```

This forces SvelteKit to discard all cached data and run the appointments list page loader fresh, which queries the database and returns updated data including the new appointment.

**Implementation Details**:
- File: `src/routes/(app)/work/inspections/[id]/+page.svelte`
- Line: 319
- Function: `handleCreateAppointment()`
- Pattern: Matches the working engineer appointment flow (line 221)

**Testing**:
- ✅ Test Case 1: Create Appointment - new appointment appears immediately
- ✅ Test Case 2: Engineer Appointment - regression test passes
- ✅ Test Case 3: Sidebar Badge - updates immediately
- ✅ Regression Tests: Cancel, Reactivate, Accept workflows all work
- ✅ Edge Cases: Double-click and network delay handled correctly

**Related Documentation**:
- Implementation Plan: `.agent/Tasks/active/bug_1_appointment_creation_fix_plan.md`
- Testing Instructions: `.agent/Tasks/active/bug_1_testing_instructions.md`

---

## Active Bugs

### 3. Vehicle Value Tab - PDF Upload Not Persisting
**Status**: Open
**Severity**: Medium
**Component**: Vehicle Value Tab / PDF Upload
**Description**:
When a PDF is uploaded to the Vehicle Value tab, the system still asks for the PDF to be uploaded (validation badge/message remains). Additionally, when navigating away from the tab and returning, the uploaded PDF is no longer visible.

**Expected Behavior**:
- PDF upload completes successfully
- Validation badge/message disappears indicating upload is complete
- PDF persists when navigating away and returning to the tab

**Current Behavior**:
- PDF is uploaded but validation still asks for upload
- PDF disappears when clicking back to the tab
- Upload appears to not be saved/persisted

**Affected Pages**:
- `/work/assessments/[id]` - Assessment page, Vehicle Value Tab

**Related Code Areas**:
- Vehicle Value Tab component (PDF upload section)
- PDF file upload/storage logic
- Data persistence/sync to database
- Tab navigation/state management

**Notes**:
- Likely issue with file upload not being properly saved to database or storage
- May be related to the auto-save pattern not triggering for file uploads
- Could be a state sync issue between local component state and database

---

### 4. Estimate Tab - Cannot Edit Description on Existing Line Items
**Status**: Open
**Severity**: Medium
**Component**: Estimate Tab / Line Items Table
**Description**:
When a line item is added to the estimate, users are unable to update or edit the description field of that already-added line. The description field appears to be locked or non-editable after initial creation.

**Expected Behavior**:
- Line items should be fully editable after creation
- Description field should be updatable like other fields (quantity, rate, etc.)
- Changes to description should be saved via the auto-save pattern

**Current Behavior**:
- Line items can be added successfully
- Description field cannot be edited after line is created
- Description appears locked/read-only

**Affected Pages**:
- `/work/assessments/[id]` - Assessment page, Estimate Tab

**Related Code Areas**:
- EstimateTab.svelte - Line items table/editing logic
- Line item row component - description field rendering
- ItemTable component - editable field configuration
- Auto-save logic for line item updates

**Notes**:
- Other fields (quantity, rate) may be editable - need to verify which fields are affected
- May be a configuration issue with the ItemTable component's editable fields
- Could be related to field permissions or validation preventing updates

---

<!-- Bug 5 moved to Resolved Bugs -->

---

<!-- Bug 6 moved to Resolved Bugs -->

---

### 7. Finalize Force Click - Supabase Auth Connection Timeout
**Status**: Open
**Severity**: High
**Component**: Finalization Tab / Force Finalize Action
**Description**:
When clicking the force finalize button, the application throws a Supabase Auth connection timeout error. The fetch fails with a ConnectTimeoutError after 10 seconds attempting to reach the Supabase Auth server.

**Error Details**:
```
TypeError: fetch failed
ConnectTimeoutError: Connect Timeout Error
(attempted address: cfblmkzleqtvtfxujikf.supabase.co:443, timeout: 10000ms)
code: 'UND_ERR_CONNECT_TIMEOUT'
```

**Stack Trace**:
- Error originates from FRCService.getCountByStatus()
- Called during dashboard page load (+page.server.ts:30)
- Supabase Auth attempting to validate user via getUser()

**Expected Behavior**:
- Force finalize action should complete without connection errors
- Dashboard should load successfully with FRC counts

**Current Behavior**:
- Connection timeout when attempting to reach Supabase Auth server
- FRC count fails to load
- Dashboard page load fails

**Affected Pages**:
- `/work/assessments/[id]` - Assessment page, Finalization Tab (force finalize action)
- `/dashboard` - Dashboard page (FRC count loading)

**Related Code Areas**:
- FinalizeTab.svelte - force finalize button handler
- FRCService.getCountByStatus() - line 668
- Dashboard +page.server.ts - line 30
- Supabase Auth client configuration
- Network/connectivity issues

**Notes**:
- Warning about using getSession() instead of getUser() for auth validation
- Likely network connectivity issue or Supabase server unreachable
- May be related to environment configuration or API endpoint issues
- Consider implementing retry logic or timeout handling

---

### 8. Generate All Documents Button - Supabase Storage Connection Timeout
**Status**: Open
**Severity**: High
**Component**: Finalization Tab / Generate All Documents Button
**Description**:
When clicking the "Generate All Documents" button on the Finalize tab, the application throws a Supabase Storage connection timeout error. The fetch fails with a ConnectTimeoutError after 10 seconds attempting to reach the Supabase Storage server.

**Error Details**:
```
StorageError: __isStorageError: true
TypeError: fetch failed
ConnectTimeoutError: Connect Timeout Error
(attempted address: cfblmkzleqtvtfxujikf.supabase.co:443, timeout: 10000ms)
code: 'UND_ERR_CONNECT_TIMEOUT'
```

**Stack Trace**:
- Error originates from @supabase/storage-js/dist/main/lib/fetch.js:31
- Called during document generation process
- Supabase Storage attempting to upload/access files

**Expected Behavior**:
- Generate All Documents button should complete successfully
- Documents should be generated and stored without connection errors
- User should receive success confirmation

**Current Behavior**:
- Connection timeout when attempting to reach Supabase Storage server
- Document generation fails
- Error message: "Status: error, Progress: 0%, Message: N/A"
- Stream closes after timeout

**Affected Pages**:
- `/work/assessments/[id]` - Assessment page, Finalization Tab

**Related Code Areas**:
- FinalizeTab.svelte - Generate All Documents button handler
- Document generation service/functions
- Supabase Storage client configuration
- File upload/storage operations
- Network/connectivity issues

**Notes**:
- Same root cause as Bug #7 (Supabase connection timeout)
- Likely network connectivity issue or Supabase server unreachable
- May be related to environment configuration or API endpoint issues
- Consider implementing retry logic, timeout handling, or fallback mechanisms
- Stream properly closes after error but user receives no actionable feedback

---

### 9. Report Generation - Most Information Shows N/A
**Status**: Open
**Severity**: Medium
**Component**: Report Generation / Document Templates
**Description**:
When generating reports (assessment reports, estimates, etc.), most of the information in the generated documents displays as "N/A" instead of showing the actual data from the assessment.

**Expected Behavior**:
- Generated reports should display all relevant assessment data
- Fields should be populated with actual values from the assessment
- No "N/A" placeholders for fields that have data

**Current Behavior**:
- Generated reports show "N/A" for most information fields
- Data is not being pulled through to the report templates
- Only some fields may be populated correctly

**Affected Pages**:
- Report generation across all document types (assessment reports, estimates, etc.)

**Related Code Areas**:
- Report generation service/functions
- Document templates
- Data mapping/transformation for reports
- Template variable substitution

**Notes**:
- User will provide example PDF documents to guide implementation
- Likely issue with data not being passed to templates or template variables not being correctly mapped
- May be related to missing data fields or incorrect field references in templates
- Requires review of actual generated documents to identify which fields are affected

---

### 10. Additionals Page - Cannot Edit Line Item Values
**Status**: Open
**Severity**: Medium
**Component**: Additionals Tab / Line Items
**Description**:
On the Additionals page, users are unable to edit line item values if typos or errors were made when adding items. Line items appear to be locked/read-only, preventing corrections to quantity, rate, description, or other fields.

**Expected Behavior**:
- Line items on Additionals page should be fully editable
- Users should be able to correct typos or errors in any field
- Changes should be saved via auto-save pattern
- Behavior should match Estimate tab editing capabilities

**Current Behavior**:
- Line items cannot be edited after creation
- Fields appear locked/read-only
- No way to correct errors without deleting and re-adding items

**Affected Pages**:
- `/work/assessments/[id]` - Assessment page, Additionals Tab

**Related Code Areas**:
- Additionals tab component
- Line items table/editing logic
- ItemTable component configuration
- Auto-save logic for additionals
- Estimate tab (reference for correct behavior)

**Notes**:
- Possible crossover issue with Estimate tab (Bug #4 - Cannot edit description on existing lines)
- May be same root cause affecting both tabs
- Consider if ItemTable component needs configuration update for editable fields
- Additionals should have same editing capabilities as Estimate tab

---

### 11. FRC Generation - Assessment Not Moving to FRC Immediately
**Status**: Open
**Severity**: Medium
**Component**: FRC Tab / FRC Generation
**Description**:
When FRC (Final Repair Costing) is generated/started, the assessment does not immediately move to the FRC list. The assessment remains in its current location and requires manual navigation or page refresh to appear in the FRC section. Additionally, the FRC badge count does not update immediately.

**Expected Behavior**:
- When FRC is generated, assessment should immediately appear in FRC list
- FRC badge count in sidebar should update immediately
- UI should reflect the new FRC status without requiring page refresh
- Similar to request → inspection auto-update behavior

**Current Behavior**:
- FRC is generated successfully (backend confirms)
- Assessment does not appear in FRC list until page refresh
- FRC badge count does not update
- User must manually navigate away and back to see changes

**Affected Pages**:
- `/work/assessments/[id]` - Assessment page, FRC Tab
- `/work/frc` - FRC list page
- Sidebar - FRC badge count

**Related Code Areas**:
- FRC tab component - FRC generation/start logic
- FRC list page data loading
- Sidebar badge count calculation
- Data invalidation/reactive state management
- Assessment status/workflow transitions

**Notes**:
- Similar to Bug #1 (Appointment creation not auto-updating)
- Likely missing data invalidation or reactive state trigger after FRC generation
- Should reference request → inspection workflow for correct auto-update pattern
- Badge count should be role-based (engineers see only their items, admins see all)

---

### 12. FRC Logic & Flow - Declined Lines Not Properly Handled
**Status**: Open
**Severity**: High
**Component**: FRC Tab / Line Item Status Management
**Description**:
The FRC (Final Repair Costing) logic and flow has issues with how declined line items are handled. When lines are declined on the Additionals or Estimate tabs, they should appear on the FRC page marked as DECLINED and not be open for adjustment. Currently, even adjusted or declined values pull through to FRC, causing confusion about which lines are actually approved vs declined.

**Expected Behavior**:
- Declined lines should appear on FRC page with DECLINED status
- Declined lines should NOT be editable/adjustable on FRC
- Only approved lines should be open for adjustment on FRC
- Adjusted values should be tracked separately from declined status
- Clear visual distinction between approved, adjusted, and declined lines

**Current Behavior**:
- Declined lines pull through to FRC as if they're available for adjustment
- No clear indication of declined status on FRC page
- Adjusted values and declined status are not properly distinguished
- Lines that should be locked appear editable

**Affected Pages**:
- `/work/assessments/[id]` - Additionals Tab, FRC Tab
- FRC line item display and editing logic

**Related Code Areas**:
- FRC tab component - line item rendering
- Additionals tab - decline logic
- Line item status tracking (approved/declined/adjusted)
- FRC data model/schema
- Line item filtering for FRC display

**Planning Notes**:
- Need to define clear line item states: PENDING → APPROVED/DECLINED/ADJUSTED
- Declined lines should be visually distinct (grayed out, strikethrough, etc.)
- Declined lines should be read-only on FRC page
- Need to track which lines were declined vs adjusted
- Consider if declined lines should be excluded from FRC totals
- May need database schema updates to track line item status/history
- Requires comprehensive flow planning before implementation

---

### 13. Additionals and FRC Document Generation Not Active/Working
**Status**: Open
**Severity**: High
**Component**: Additionals Tab / FRC Tab / Document Generation
**Description**:
Document generation functionality for Additionals and FRC pages is not active or not working. Users cannot generate documents (PDFs, reports, etc.) from the Additionals or FRC tabs. The generate document buttons may be missing, disabled, or non-functional.

**Expected Behavior**:
- Additionals tab should have document generation capability
- FRC tab should have document generation capability
- Users should be able to generate and download documents from both tabs
- Documents should include relevant line items and assessment data

**Current Behavior**:
- Document generation not available on Additionals tab
- Document generation not available on FRC tab
- Generate buttons may be missing or disabled
- No way to export/download documents from these tabs

**Affected Pages**:
- `/work/assessments/[id]` - Additionals Tab
- `/work/assessments/[id]` - FRC Tab

**Related Code Areas**:
- Additionals tab component - document generation button/logic
- FRC tab component - document generation button/logic
- Document generation service
- PDF generation templates for additionals/FRC
- Storage/upload logic for generated documents

**Notes**:
- May be related to Bug #8 (Generate All Documents button timeout issues)
- Need to verify if buttons exist but are disabled
- Need to verify if document generation logic is implemented
- May need to implement document generation for these tabs if not yet done
- Should follow same pattern as Estimate tab document generation
