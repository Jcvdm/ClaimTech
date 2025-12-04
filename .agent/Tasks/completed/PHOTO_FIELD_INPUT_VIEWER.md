# Photo Field Input Viewer Feature

**Created**: 2025-12-04
**Status**: In Progress
**Complexity**: Moderate

## Overview

Create a photo viewer component that allows users to input field values (VIN, registration, engine number, etc.) while viewing the enlarged photo. This enables users to look at the photo and type what they see without switching back and forth between the photo and the form.

## Requirements

1. **Auto-save on blur** - Value saves automatically when input loses focus
2. **Non-blocking validation** - Show warnings but allow saving anyway (user must save what they see)
3. **Desktop + Mobile** - Works on both platforms
4. **5 fields only**:
   - Registration Number (VehicleIdentificationTab)
   - VIN Number (VehicleIdentificationTab)
   - Engine Number (VehicleIdentificationTab)
   - License Disc Expiry (VehicleIdentificationTab)
   - Mileage Reading (InteriorMechanicalTab)

## Implementation Plan

### Phase 1: Create FormFieldPhotoViewer Component

**File**: `src/lib/components/photo-viewer/FormFieldPhotoViewer.svelte`

**Props**:
```typescript
interface FieldConfig {
  label: string;           // "VIN Number"
  type: 'text' | 'number' | 'date';
  placeholder?: string;    // "Enter 17-character VIN"
  maxLength?: number;      // 17 for VIN
  validation?: {
    pattern?: RegExp;
    message?: string;      // Warning message (non-blocking)
  };
}

interface Props {
  photoUrl: string;
  field: FieldConfig;
  value: string;
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}
```

**Features**:
- Uses bigger-picture library for photo display (zoom/pan)
- Fixed bottom bar with field input
- Auto-save on blur
- Non-blocking validation warnings
- Keyboard: Escape to close
- Auto-focus input on open

**UI Layout**:
```
┌─────────────────────────────────────────────┐
│                                             │
│           [Photo - zoomable/pannable]       │
│                                             │
├─────────────────────────────────────────────┤
│  VIN Number                                 │
│  ┌─────────────────────────────────────┐    │
│  │ WDB906133N12345                     │    │
│  └─────────────────────────────────────┘    │
│  ⚠️ VIN should be 17 characters (16 entered)│
│                                    [Close]  │
└─────────────────────────────────────────────┘
```

### Phase 2: Update VehicleIdentificationTab

**File**: `src/lib/components/assessment/VehicleIdentificationTab.svelte`

**Changes**:
1. Add state: `viewingField: 'registration' | 'vin' | 'engine' | 'license_disc' | null`
2. Add field configurations map
3. Add click handler to photo thumbnails/view buttons
4. Render FormFieldPhotoViewer when viewingField is set
5. Handle save callback to update form state

**Field Configurations**:
```typescript
const fieldConfigs = {
  registration: {
    label: 'Registration Number',
    type: 'text',
    placeholder: 'e.g., CA 123-456',
    photoUrl: registrationPhotoUrl,
    value: registrationNumber,
    setValue: (v) => { registrationNumber = v; }
  },
  vin: {
    label: 'VIN Number',
    type: 'text',
    placeholder: '17-character VIN',
    maxLength: 17,
    validation: {
      pattern: /^[A-HJ-NPR-Z0-9]{17}$/i,
      message: 'VIN should be 17 alphanumeric characters (no I, O, Q)'
    },
    photoUrl: vinPhotoUrl,
    value: vinNumber,
    setValue: (v) => { vinNumber = v; }
  },
  engine: {
    label: 'Engine Number',
    type: 'text',
    placeholder: 'Enter engine number',
    photoUrl: engineNumberPhotoUrl,
    value: engineNumber,
    setValue: (v) => { engineNumber = v; }
  },
  license_disc: {
    label: 'License Disc Expiry',
    type: 'date',
    photoUrl: licenseDiscPhotoUrl,
    value: licenseDiscExpiry,
    setValue: (v) => { licenseDiscExpiry = v; }
  }
};
```

### Phase 3: Update InteriorMechanicalTab

**File**: `src/lib/components/assessment/InteriorMechanicalTab.svelte`

**Changes**:
1. Add state: `viewingMileagePhoto: boolean`
2. Add click handler to mileage photo
3. Render FormFieldPhotoViewer for mileage
4. Handle save callback

**Field Configuration**:
```typescript
const mileageFieldConfig = {
  label: 'Mileage Reading (km)',
  type: 'number',
  placeholder: 'e.g., 125000',
  photoUrl: mileagePhotoUrl,
  value: mileageReading,
  setValue: (v) => { mileageReading = v; }
};
```

### Phase 4: Update PhotoUpload Component (Optional Enhancement)

**File**: `src/lib/components/shared/PhotoUpload.svelte`

**Changes**:
- Add optional `onView?: () => void` prop
- When photo exists and user clicks to view, call `onView` if provided
- Allows parent component to control view behavior

## Files to Modify/Create

1. **CREATE**: `src/lib/components/photo-viewer/FormFieldPhotoViewer.svelte`
2. **MODIFY**: `src/lib/components/assessment/VehicleIdentificationTab.svelte`
3. **MODIFY**: `src/lib/components/assessment/InteriorMechanicalTab.svelte`
4. **MODIFY** (optional): `src/lib/components/shared/PhotoUpload.svelte`

## Verification

- [ ] FormFieldPhotoViewer displays photo with zoom/pan
- [ ] Input field shows in bottom bar with correct type
- [ ] Auto-save on blur works
- [ ] Validation warnings show but don't block saving
- [ ] Escape key closes viewer
- [ ] Works on desktop and mobile
- [ ] VehicleIdentificationTab integrates all 4 fields
- [ ] InteriorMechanicalTab integrates mileage field
- [ ] npm run check passes

## Reference Files

- `src/lib/components/photo-viewer/PhotoViewer.svelte` - Existing pattern with bigger-picture
- `src/lib/components/assessment/VehicleIdentificationTab.svelte` - Target form
- `src/lib/components/assessment/InteriorMechanicalTab.svelte` - Mileage form
- `src/lib/components/shared/PhotoUpload.svelte` - Photo upload component
