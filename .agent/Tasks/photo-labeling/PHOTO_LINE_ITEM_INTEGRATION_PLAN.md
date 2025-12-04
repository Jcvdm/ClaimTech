# Photo-Line Item Integration Plan

**Created**: 2025-12-04
**Status**: Planning
**Complexity**: Moderate-High (4-5 files, new component, service changes)

## Overview

Add the ability to capture/attach photos when adding a line item via QuickAddLineItem. Photos are:
1. Compressed and held locally until line item is saved
2. Uploaded to correct storage (estimate_photos or pre_incident_estimate_photos)
3. Automatically labeled with the line item description

## User Flow

```
User clicks "Add Line Item" section
    ↓
Fills in: Process Type, Description ("Front Bumper"), etc.
    ↓
[NEW] Clicks camera icon or "Add Photos" button
    ↓
Takes photos or selects files (1-5 photos)
    ↓
Photos compressed immediately, previews shown
    ↓
User can remove unwanted photos before saving
    ↓
Clicks "Add Line Item" button
    ↓
[NEW] System uploads all photos with label="Front Bumper"
    ↓
Line item created, photos attached and labeled
    ↓
Form resets, photos appear in EstimatePhotosPanel
```

## Architecture Decision

**Approach: New PendingPhotoCapture Component**

Create a reusable `PendingPhotoCapture.svelte` component that:
- Handles photo capture/selection
- Compresses images immediately on selection
- Stores compressed files in local state (not uploaded)
- Shows preview thumbnails
- Allows removing photos before parent save
- Emits files to parent when needed

**Why this approach:**
- Separation of concerns (photo capture vs line item logic)
- Reusable across Estimate, Pre-Incident, Additionals
- Keeps QuickAddLineItem focused on line item data
- Easy to test independently

## Component Design

### 1. PendingPhotoCapture.svelte

**Location**: `src/lib/components/assessment/PendingPhotoCapture.svelte`

**Purpose**: Capture/select photos, compress them, hold locally until parent saves

**Props**:
```typescript
interface Props {
  /** Max number of photos allowed */
  maxPhotos?: number; // default: 5
  /** Callback when photos change */
  onPhotosChange: (photos: PendingPhoto[]) => void;
  /** Whether to show camera capture button (mobile) */
  showCamera?: boolean; // default: true
  /** Compact mode for inline use */
  compact?: boolean; // default: false
}
```

**Internal State**:
```typescript
interface PendingPhoto {
  id: string;              // Unique temp ID
  originalFile: File;      // Original file (for reference)
  compressedFile: File;    // Compressed file (for upload)
  previewUrl: string;      // Object URL for preview
  compressionRatio: number; // e.g., 0.3 = 70% reduction
  status: 'compressing' | 'ready' | 'error';
  error?: string;
}

let pendingPhotos = $state<PendingPhoto[]>([]);
```

**Features**:
- Camera capture button (uses `capture="environment"` for back camera)
- File selection button (multiple files)
- Compression with progress indicator per photo
- Preview grid with remove buttons
- Shows compression stats (e.g., "5.2MB → 1.1MB")
- Emits updated array on any change

**UI Layout (Compact Mode)**:
```
┌──────────────────────────────────────────────┐
│ Photos (optional)                            │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────────────┐ │
│ │ img │ │ img │ │ img │ │ [+] Add Photos  │ │
│ │  ×  │ │  ×  │ │  ×  │ │ [📷] Camera     │ │
│ └─────┘ └─────┘ └─────┘ └─────────────────┘ │
│ 3 photos ready (2.4 MB total)               │
└──────────────────────────────────────────────┘
```

### 2. QuickAddLineItem.svelte Modifications

**New Props**:
```typescript
interface Props {
  // Existing props...
  labourRate: number;
  paintRate: number;
  // ... etc

  // NEW: Photo integration props
  enablePhotos?: boolean;        // Enable photo capture feature
  assessmentId?: string;         // Required if enablePhotos=true
  estimateId?: string;           // Required for estimate photos
  photoCategory?: 'estimate' | 'pre-incident' | 'additionals';
  onPhotosUploaded?: () => void; // Callback after photos uploaded
}
```

**Modified Add Flow**:
```typescript
async function handleAddLineItem() {
  // 1. Validate line item data (existing)
  const lineItem = buildLineItem();

  // 2. If photos enabled and photos exist, upload them first
  if (enablePhotos && pendingPhotos.length > 0 && estimateId) {
    try {
      await uploadPhotosWithLabel(pendingPhotos, lineItem.description);
    } catch (error) {
      // Show error, don't add line item
      return;
    }
  }

  // 3. Add line item (existing)
  onAddLineItem(lineItem);

  // 4. Clear form including photos
  resetForm();
  pendingPhotos = [];

  // 5. Notify parent to refresh photos
  onPhotosUploaded?.();
}
```

### 3. Photo Upload Helper

**Location**: `src/lib/utils/upload-photos-with-label.ts`

```typescript
import { storageService } from '$lib/services/storage.service';
import { estimatePhotosService } from '$lib/services/estimate-photos.service';
import { preIncidentEstimatePhotosService } from '$lib/services/pre-incident-estimate-photos.service';

interface UploadOptions {
  photos: PendingPhoto[];
  label: string;
  assessmentId: string;
  estimateId: string;
  category: 'estimate' | 'pre-incident';
  onProgress?: (uploaded: number, total: number) => void;
}

export async function uploadPhotosWithLabel(options: UploadOptions): Promise<void> {
  const { photos, label, assessmentId, estimateId, category, onProgress } = options;

  const service = category === 'estimate'
    ? estimatePhotosService
    : preIncidentEstimatePhotosService;

  const storageCategory = category === 'estimate' ? 'estimate' : 'pre-incident';
  const subcategory = 'incident';

  let uploaded = 0;

  for (const photo of photos) {
    // 1. Upload compressed file to storage
    const result = await storageService.uploadAssessmentPhoto(
      photo.compressedFile,
      assessmentId,
      storageCategory,
      subcategory,
      { skipCompression: true } // Already compressed
    );

    // 2. Get next display order
    const displayOrder = await service.getNextDisplayOrder(estimateId);

    // 3. Create photo record with label
    await service.createPhoto({
      estimate_id: estimateId,
      photo_url: result.url,
      photo_path: result.path,
      label: label, // Auto-label with line item description
      display_order: displayOrder
    });

    uploaded++;
    onProgress?.(uploaded, photos.length);
  }
}
```

## Data Flow Diagram

```
QuickAddLineItem Component
├── Description: "Front Bumper"
├── Process Type: "N" (New)
├── Part Price: R 2,500
│
└── PendingPhotoCapture Component
    ├── [Camera Button] → capture photo
    ├── [File Button] → select files
    │
    └── pendingPhotos[] (local state)
        ├── Photo 1: { compressedFile, previewUrl, status: 'ready' }
        ├── Photo 2: { compressedFile, previewUrl, status: 'ready' }
        └── Photo 3: { compressedFile, previewUrl, status: 'ready' }

User clicks "Add Line Item"
    ↓
uploadPhotosWithLabel({
  photos: pendingPhotos,
  label: "Front Bumper",         ← Auto-labeled!
  assessmentId: "ASM-2025-001",
  estimateId: "uuid",
  category: "estimate"
})
    ↓
For each photo:
  1. storageService.uploadAssessmentPhoto()
     → Path: assessments/ASM-2025-001/estimate/incident/timestamp.jpg
     → Returns: { url: "/api/photo/...", path: "..." }

  2. estimatePhotosService.createPhoto({
       estimate_id: "uuid",
       photo_url: "/api/photo/...",
       photo_path: "...",
       label: "Front Bumper",    ← Auto-labeled!
       display_order: next
     })
    ↓
onAddLineItem(lineItem)
    ↓
onPhotosUploaded() → Parent refreshes EstimatePhotosPanel
    ↓
Photos appear in grid with "Front Bumper" label
```

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `PendingPhotoCapture.svelte` | **NEW** | Photo capture/preview component |
| `upload-photos-with-label.ts` | **NEW** | Utility for labeled photo upload |
| `QuickAddLineItem.svelte` | MODIFY | Add photo integration props and logic |
| `EstimateTab.svelte` | MODIFY | Pass photo props to QuickAddLineItem |
| `PreIncidentEstimateTab.svelte` | MODIFY | Pass photo props to QuickAddLineItem |

## Implementation Phases

### Phase 1: PendingPhotoCapture Component (Est: 2-3 hours)
- [ ] Create component with camera/file capture
- [ ] Implement compression on selection
- [ ] Add preview grid with remove buttons
- [ ] Add loading states and error handling
- [ ] Test compression and preview functionality

### Phase 2: Upload Utility (Est: 1 hour)
- [ ] Create uploadPhotosWithLabel utility
- [ ] Handle both estimate and pre-incident categories
- [ ] Add progress callback support
- [ ] Add error handling

### Phase 3: QuickAddLineItem Integration (Est: 1-2 hours)
- [ ] Add new props for photo integration
- [ ] Integrate PendingPhotoCapture component
- [ ] Modify add flow to upload photos first
- [ ] Add upload progress indicator
- [ ] Handle errors gracefully

### Phase 4: Tab Integration (Est: 1 hour)
- [ ] Update EstimateTab to pass photo props
- [ ] Update PreIncidentEstimateTab to pass photo props
- [ ] Test end-to-end flow
- [ ] Verify photos appear with correct labels

### Phase 5: Polish & Testing (Est: 1-2 hours)
- [ ] Mobile responsiveness testing
- [ ] Error state handling
- [ ] Edge cases (no description, failed uploads)
- [ ] Performance testing with multiple photos

## Edge Cases to Handle

1. **No Description**: If user adds photos but no description, label = empty string (they can edit later)
2. **Upload Failure**: Show error, don't add line item, keep photos for retry
3. **Partial Upload Failure**: Roll back successful uploads? Or keep partial?
4. **Large Photos**: Compression should handle, but show warning if still large
5. **Camera Permission Denied**: Show helpful message, fall back to file selection
6. **Max Photos Reached**: Disable add button, show limit message

## Future Enhancements (Not in Scope)

- Drag-and-drop reordering of pending photos
- Photo annotation/markup before upload
- Batch labeling (apply same label to all photos)
- Template labels (common descriptions)
- Link existing photos to line items (reverse association)

## Questions for User

1. **Max photos per line item?** Suggest 5 as default, configurable
2. **Required or optional?** Photos should be optional
3. **Additionals tab too?** Can enable for additionals with same pattern
4. **Cancel behavior?** If user cancels/clears form, discard pending photos

## Verification Checklist

- [ ] Photos compress before storing locally
- [ ] Previews display correctly
- [ ] Remove button works on individual photos
- [ ] "Add Line Item" uploads all photos
- [ ] Photos receive correct label (= description)
- [ ] Photos appear in correct photo panel
- [ ] Labels editable after upload
- [ ] Works on mobile (camera capture)
- [ ] Works on desktop (file selection)
- [ ] Error states display properly
- [ ] Form resets after successful add
