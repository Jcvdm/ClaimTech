# Context Report: Bug #3 - Vehicle Value Tab PDF Upload Not Persisting

**Date**: November 11, 2025  
**Bug ID**: 3  
**Severity**: Medium  
**Status**: Context Gathering Complete

---

## 🎯 Bug Summary

When a PDF is uploaded to the Vehicle Value tab:
1. **Upload completes** but validation badge still asks for PDF
2. **PDF disappears** when navigating away and returning to the tab
3. **Upload appears not saved** to database or storage

---

## 📊 Data Flow Analysis

### 1. **PDF Upload Component** (`PdfUpload.svelte`)
- **Location**: `src/lib/components/forms/PdfUpload.svelte`
- **Upload Handler** (line 98-127):
  - Calls `storageService.uploadAssessmentPdf(file, assessmentId, category)`
  - On success: calls `onUpload(result.url, result.path)` callback
  - Returns: `{ url: string, path: string }`

### 2. **VehicleValuesTab Component** (`VehicleValuesTab.svelte`)
- **Location**: `src/lib/components/assessment/VehicleValuesTab.svelte`
- **PDF State** (lines 113-115):
  ```typescript
  let valuationPdfUrl = $state(data?.valuation_pdf_url || '');
  let valuationPdfPath = $state(data?.valuation_pdf_path || '');
  ```
- **Upload Callback** (lines 318-321):
  ```typescript
  function handlePdfUpload(url: string, path: string) {
    valuationPdfUrl = url;
    valuationPdfPath = path;
  }
  ```
- **Save Handler** (lines 257-289):
  - Calls `onUpdate()` with all fields including `valuation_pdf_url` and `valuation_pdf_path`
  - **CRITICAL**: Does NOT automatically save after PDF upload
  - Only saves when `debouncedSave()` is triggered (2s after user input)

### 3. **Parent Page Handler** (`+page.svelte`)
- **Location**: `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte`
- **Handler** (lines 287-307):
  ```typescript
  async function handleUpdateVehicleValues(updateData: Partial<VehicleValues>) {
    if (data.vehicleValues) {
      const updated = await vehicleValuesService.update(
        data.vehicleValues.id, 
        updateData, 
        writeOffPercentages
      );
      data.vehicleValues = updated;  // ← Updates local state
    }
  }
  ```

### 4. **Service Layer** (`vehicle-values.service.ts`)
- **Location**: `src/lib/services/vehicle-values.service.ts`
- **Update Method** (lines 126-195):
  - Fetches current record
  - Merges input with current data
  - Updates database with spread operator: `...input`
  - Returns updated record from database

### 5. **Database Schema** (`assessment_vehicle_values`)
- **PDF Fields**:
  - `valuation_pdf_url` (text, nullable)
  - `valuation_pdf_path` (text, nullable)
- **Both fields are optional** (nullable)

---

## 🔍 Root Cause Analysis

### **Issue 1: No Auto-Save After PDF Upload**
- `handlePdfUpload()` updates local state but does NOT trigger save
- PDF data only persists if user manually triggers `debouncedSave()` (2s after typing)
- **If user navigates away immediately**: PDF is lost

### **Issue 2: Validation Not Syncing with Upload**
- **Validation** (lines 329-340):
  ```typescript
  const validation = $derived.by(() => {
    return validateVehicleValues({
      valuation_pdf_url: valuationPdfUrl  // ← Checks local state
    });
  });
  ```
- **Validation Logic** (`validation.ts` lines 311-314):
  ```typescript
  if (!vehicleValues.valuation_pdf_url) {
    missingFields.push('Valuation report PDF is required');
  }
  ```
- **Problem**: After upload, `valuationPdfUrl` is set locally but validation still shows error
- **Likely cause**: Validation is checking against stale data or not re-evaluating

### **Issue 3: Data Not Syncing on Tab Return**
- **Sync Logic** (lines 179-225):
  ```typescript
  $effect(() => {
    if (data) {
      if (data.valuation_pdf_url) valuationPdfUrl = data.valuation_pdf_url;
      if (data.valuation_pdf_path) valuationPdfPath = data.valuation_pdf_path;
    }
  });
  ```
- **Problem**: If PDF was never saved to database, `data.valuation_pdf_url` is empty
- **Result**: Local state is overwritten with empty values when tab is revisited

---

## 🗄️ Database State

**Schema verified**: Both `valuation_pdf_url` and `valuation_pdf_path` exist and are nullable.

**Current behavior**:
- PDF uploads to storage successfully (file is stored)
- URL/path are returned from `storageService.uploadAssessmentPdf()`
- But are NOT persisted to database unless `handleSave()` is called

---

## 🔗 Related Components

1. **Storage Service** (`storage.service.ts` lines 293-299):
   - `uploadAssessmentPdf()` - uploads file and returns signed URL
   - Works correctly (file is stored)

2. **Validation System** (`validation.ts` lines 311-314):
   - PDF is marked as required
   - Validation logic is correct

3. **Tab Navigation** (`+page.svelte` lines 71-92):
   - `handleTabChange()` calls `handleSave()` before switching
   - But only if there are unsaved changes detected

---

## 📋 Key Findings

| Finding | Details |
|---------|---------|
| **Upload Works** | File successfully uploads to storage |
| **URL Returned** | `storageService` returns correct signed URL |
| **Local State Updates** | `valuationPdfUrl` is set correctly in component |
| **Database Not Updated** | PDF fields not saved unless `handleSave()` called |
| **Validation Mismatch** | Validation badge doesn't update after upload |
| **Tab Switch Loss** | PDF lost when navigating away without explicit save |

---

## 🎯 Next Steps for Fix

1. **Auto-save after PDF upload** - Call `handleSave()` immediately after `handlePdfUpload()`
2. **Ensure validation updates** - Verify `$derived` reactivity after PDF upload
3. **Test tab navigation** - Confirm PDF persists when switching tabs
4. **Test page reload** - Confirm PDF loads from database on return

---

## 📁 Files Involved

- `src/lib/components/forms/PdfUpload.svelte` - Upload component
- `src/lib/components/assessment/VehicleValuesTab.svelte` - Tab component
- `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte` - Parent page
- `src/lib/services/vehicle-values.service.ts` - Database service
- `src/lib/services/storage.service.ts` - Storage service
- `src/lib/utils/validation.ts` - Validation logic

