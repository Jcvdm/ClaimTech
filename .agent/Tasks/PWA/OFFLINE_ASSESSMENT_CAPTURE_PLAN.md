# PWA Offline Assessment Capture - Implementation Plan

**Created**: 2025-12-04
**Status**: Planning
**Priority**: High
**Estimated Effort**: 10-12 days

---

## Overview

Enable engineers/assessors to capture assessment data offline in the field, then sync when connectivity is restored. This focuses specifically on the data capture workflow, not administrative functions.

### Business Problem

- Engineers often work in areas with poor/no mobile connectivity
- Photos and assessment data can be lost if connection drops mid-capture
- Current app requires constant connectivity to save data

### Solution

Progressive Web App (PWA) with:
- Installable app on phone home screen
- Local database (IndexedDB) for offline data storage
- Background sync when connectivity returns
- Photo queue for reliable uploads

---

## Scope Definition

### In Scope (Offline Capable)

| Feature | Data to Cache |
|---------|---------------|
| **Appointments List** | Engineer's assigned appointments (read-only) |
| **Vehicle ID Tab** | VIN, registration, make, model, year, color |
| **Exterior 360 Tab** | Overall condition, vehicle color, 8 exterior photos |
| **Damage Tab** | Damage area, type, severity, description, photos |
| **Tyres Tab** | 4x tyre conditions, tread depth, photos |
| **Mileage** | Odometer reading |
| **Notes Tab** | General notes, internal notes |
| **Estimate Tab** | Line items (description, quantity, rate, total) |
| **Interior Tab** | Interior condition, photos |
| **Windows Tab** | Window conditions, photos |
| **Accessories Tab** | Accessory checklist |
| **All Photos** | Stored as compressed blobs |

### Out of Scope (Online Only)

| Feature | Reason |
|---------|--------|
| Accept/Reject Requests | Admin workflow |
| Create Appointments | Scheduling requires coordination |
| Generate PDF Reports | Server-side rendering |
| FRC Workflow | Review/approval process |
| Additionals Workflow | Post-assessment process |
| Finalization | Requires all data synced |
| User Authentication | Must be online to login initially |

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ENGINEER'S MOBILE DEVICE                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────┐    ┌───────────────────┐    ┌─────────────────┐ │
│  │   PWA Shell       │    │   Service Worker  │    │   IndexedDB     │ │
│  │   (SvelteKit)     │◄──►│   (Workbox)       │◄──►│   (Dexie.js)    │ │
│  │                   │    │                   │    │                 │ │
│  │  - Assessment UI  │    │  - Cache assets   │    │  - Drafts       │ │
│  │  - Photo capture  │    │  - Offline detect │    │  - Photos       │ │
│  │  - Form inputs    │    │  - Sync queue     │    │  - Sync queue   │ │
│  └───────────────────┘    └───────────────────┘    └─────────────────┘ │
│           │                        │                        │          │
│           └────────────────────────┼────────────────────────┘          │
│                                    │                                    │
│                          ┌─────────▼─────────┐                         │
│                          │  Network Status   │                         │
│                          │  Monitor          │                         │
│                          └─────────┬─────────┘                         │
│                                    │                                    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │ ONLINE         │                │
                    ▼                                 ▼
         ┌───────────────────┐              ┌─────────────────┐
         │   Supabase DB     │              │ Supabase Storage│
         │   (PostgreSQL)    │              │ (Photos)        │
         └───────────────────┘              └─────────────────┘
```

### Data Flow

```
1. ONLINE - Open Assessment
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │ Load from    │ ──► │ Display in   │ ──► │ Cache to     │
   │ Supabase     │     │ UI           │     │ IndexedDB    │
   └──────────────┘     └──────────────┘     └──────────────┘

2. OFFLINE - Capture Data
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │ User enters  │ ──► │ Save to      │ ──► │ Mark as      │
   │ form data    │     │ IndexedDB    │     │ "pending"    │
   └──────────────┘     └──────────────┘     └──────────────┘

3. ONLINE - Sync
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │ Detect       │ ──► │ Upload       │ ──► │ Mark as      │
   │ connection   │     │ to Supabase  │     │ "synced"     │
   └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Implementation Phases

### Phase 1: PWA Foundation (1 day)

**Goal**: Make the app installable on mobile devices

**Tasks**:
1. Create `static/manifest.json`
2. Add PWA meta tags to `app.html`
3. Create app icons (192x192, 512x512)
4. Configure Service Worker with Vite PWA plugin
5. Add "Install App" prompt for engineers

**Files to Create/Modify**:
```
static/
├── manifest.json          # NEW - PWA manifest
├── icons/
│   ├── icon-192.png       # NEW - App icons
│   ├── icon-512.png       # NEW
│   └── apple-touch-icon.png # NEW
src/
├── app.html               # MODIFY - Add PWA meta tags
├── service-worker.ts      # NEW - Service worker
vite.config.ts             # MODIFY - Add PWA plugin
package.json               # MODIFY - Add dependencies
```

**Dependencies**:
```json
{
  "@vite-pwa/sveltekit": "^0.6.0",
  "workbox-precaching": "^7.0.0",
  "workbox-routing": "^7.0.0"
}
```

**manifest.json**:
```json
{
  "name": "ClaimTech Assessments",
  "short_name": "ClaimTech",
  "description": "Vehicle assessment capture for engineers",
  "start_url": "/dashboard/appointments",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Verification**:
- [ ] App can be installed to home screen
- [ ] App opens in standalone mode (no browser UI)
- [ ] App icon and splash screen display correctly

---

### Phase 2: IndexedDB Setup (2 days)

**Goal**: Set up local database for offline data storage

**Tasks**:
1. Install and configure Dexie.js
2. Define database schema matching assessment structure
3. Create database service layer
4. Add migration system for schema updates

**Files to Create**:
```
src/lib/offline/
├── db.ts                  # Dexie database definition
├── schema.ts              # TypeScript types for offline data
├── migrations.ts          # Database version migrations
└── index.ts               # Public exports
```

**Database Schema**:
```typescript
// src/lib/offline/db.ts
import Dexie, { type Table } from 'dexie';

export interface OfflineAssessment {
  id: string;                    // Assessment UUID
  appointment_id: string;
  status: 'cached' | 'modified' | 'pending_sync' | 'synced';
  last_modified: Date;
  data: {
    vehicle_id: VehicleIdData;
    exterior_360: Exterior360Data;
    damage: DamageData;
    tyres: TyresData;
    mileage: MileageData;
    notes: NotesData;
    estimate: EstimateData;
    interior: InteriorData;
    windows: WindowsData;
    accessories: AccessoriesData;
  };
}

export interface OfflinePhoto {
  id: string;                    // Local UUID
  assessment_id: string;
  category: string;              // 'exterior' | 'damage' | 'tyres' | etc
  label?: string;
  blob: Blob;                    // Actual photo data
  thumbnail: Blob;               // Compressed thumbnail
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  remote_path?: string;          // Supabase storage path after upload
  created_at: Date;
}

export interface SyncQueueItem {
  id: string;
  type: 'assessment' | 'photo';
  entity_id: string;
  action: 'create' | 'update';
  payload: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  attempts: number;
  last_attempt?: Date;
  error?: string;
  created_at: Date;
}

class ClaimTechOfflineDB extends Dexie {
  assessments!: Table<OfflineAssessment>;
  photos!: Table<OfflinePhoto>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('ClaimTechOffline');

    this.version(1).stores({
      assessments: 'id, appointment_id, status, last_modified',
      photos: 'id, assessment_id, category, status, created_at',
      syncQueue: 'id, type, entity_id, status, created_at'
    });
  }
}

export const db = new ClaimTechOfflineDB();
```

**Verification**:
- [ ] Database initializes on first load
- [ ] Can store and retrieve assessment data
- [ ] Can store and retrieve photo blobs
- [ ] Database persists across app restarts

---

### Phase 3: Offline Detection & UI (1 day)

**Goal**: Detect network status and show appropriate UI

**Tasks**:
1. Create network status store
2. Add offline indicator component
3. Show sync status in UI
4. Disable online-only features when offline

**Files to Create/Modify**:
```
src/lib/offline/
├── network-status.svelte.ts   # NEW - Network status store
├── components/
│   ├── OfflineIndicator.svelte    # NEW - Status banner
│   ├── SyncStatus.svelte          # NEW - Sync progress
│   └── OfflineWarning.svelte      # NEW - Feature disabled warning
```

**Network Status Store**:
```typescript
// src/lib/offline/network-status.svelte.ts
import { browser } from '$app/environment';

class NetworkStatus {
  isOnline = $state(browser ? navigator.onLine : true);
  lastOnline = $state<Date | null>(null);

  constructor() {
    if (browser) {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.lastOnline = new Date();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }
}

export const networkStatus = new NetworkStatus();
```

**Offline Indicator Component**:
```svelte
<!-- src/lib/offline/components/OfflineIndicator.svelte -->
<script lang="ts">
  import { networkStatus } from '../network-status.svelte';
  import { WifiOff, RefreshCw } from 'lucide-svelte';
</script>

{#if !networkStatus.isOnline}
  <div class="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
    <WifiOff class="h-4 w-4" />
    <span>You're offline - changes will sync when connected</span>
  </div>
{/if}
```

**Verification**:
- [ ] Offline banner appears when network lost
- [ ] Banner disappears when network restored
- [ ] Online-only buttons show disabled state when offline

---

### Phase 4: Assessment Data Caching (2-3 days)

**Goal**: Cache assessment data for offline access

**Tasks**:
1. Pre-load assessment data when opening (while online)
2. Save all form changes to IndexedDB
3. Load from IndexedDB when offline
4. Track modified fields for sync

**Files to Create/Modify**:
```
src/lib/offline/
├── services/
│   ├── assessment-cache.ts    # NEW - Cache management
│   ├── form-persistence.ts    # NEW - Auto-save forms
│   └── conflict-resolver.ts   # NEW - Handle sync conflicts
```

**Assessment Cache Service**:
```typescript
// src/lib/offline/services/assessment-cache.ts
import { db, type OfflineAssessment } from '../db';
import { networkStatus } from '../network-status.svelte';

export class AssessmentCache {
  /**
   * Called when assessment page loads (while online)
   * Caches all data for offline use
   */
  async preloadAssessment(assessmentId: string, data: AssessmentData): Promise<void> {
    const existing = await db.assessments.get(assessmentId);

    if (existing?.status === 'modified') {
      // Don't overwrite local changes
      console.log('Skipping preload - local changes exist');
      return;
    }

    await db.assessments.put({
      id: assessmentId,
      appointment_id: data.appointment_id,
      status: 'cached',
      last_modified: new Date(),
      data: {
        vehicle_id: data.vehicle_id,
        exterior_360: data.exterior_360,
        damage: data.damage,
        tyres: data.tyres,
        mileage: data.mileage,
        notes: data.notes,
        estimate: data.estimate,
        interior: data.interior,
        windows: data.windows,
        accessories: data.accessories
      }
    });
  }

  /**
   * Save form changes locally
   */
  async saveLocal(assessmentId: string, tab: string, data: any): Promise<void> {
    const assessment = await db.assessments.get(assessmentId);
    if (!assessment) return;

    assessment.data[tab] = data;
    assessment.status = 'modified';
    assessment.last_modified = new Date();

    await db.assessments.put(assessment);

    // If online, also queue for sync
    if (networkStatus.isOnline) {
      await this.queueSync(assessmentId, tab, data);
    }
  }

  /**
   * Get assessment data (from cache if offline)
   */
  async getData(assessmentId: string, tab: string): Promise<any | null> {
    const assessment = await db.assessments.get(assessmentId);
    return assessment?.data[tab] ?? null;
  }

  /**
   * Add to sync queue
   */
  private async queueSync(assessmentId: string, tab: string, data: any): Promise<void> {
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      type: 'assessment',
      entity_id: assessmentId,
      action: 'update',
      payload: { tab, data },
      status: 'pending',
      attempts: 0,
      created_at: new Date()
    });
  }
}

export const assessmentCache = new AssessmentCache();
```

**Form Integration Pattern**:
```svelte
<!-- Example: Integrating offline save into a tab -->
<script lang="ts">
  import { assessmentCache } from '$lib/offline/services/assessment-cache';
  import { networkStatus } from '$lib/offline/network-status.svelte';

  let { assessmentId, initialData } = $props();

  let formData = $state(initialData);

  // Auto-save on change (debounced)
  let saveTimeout: number;
  $effect(() => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      assessmentCache.saveLocal(assessmentId, 'vehicle_id', formData);
    }, 500);
  });
</script>
```

**Verification**:
- [ ] Assessment data cached when opened online
- [ ] Form changes save to IndexedDB
- [ ] Cached data loads when offline
- [ ] Modified status tracked correctly

---

### Phase 5: Photo Offline Storage (2-3 days)

**Goal**: Store photos locally when offline, upload when online

**Tasks**:
1. Intercept photo capture/selection
2. Compress and store in IndexedDB
3. Display from local storage
4. Queue for upload when online

**Files to Create/Modify**:
```
src/lib/offline/
├── services/
│   ├── photo-storage.ts       # NEW - Local photo management
│   ├── photo-compressor.ts    # NEW - Client-side compression
│   └── photo-sync.ts          # NEW - Upload queue
├── components/
│   └── OfflinePhotoCapture.svelte  # NEW - Camera with offline support
```

**Photo Storage Service**:
```typescript
// src/lib/offline/services/photo-storage.ts
import { db, type OfflinePhoto } from '../db';
import { compressPhoto, createThumbnail } from './photo-compressor';

export class PhotoStorage {
  /**
   * Store a photo locally
   */
  async storePhoto(
    assessmentId: string,
    category: string,
    file: File,
    label?: string
  ): Promise<OfflinePhoto> {
    // Compress the photo
    const compressed = await compressPhoto(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8
    });

    // Create thumbnail for display
    const thumbnail = await createThumbnail(compressed, {
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.6
    });

    const photo: OfflinePhoto = {
      id: crypto.randomUUID(),
      assessment_id: assessmentId,
      category,
      label,
      blob: compressed,
      thumbnail,
      status: 'pending',
      created_at: new Date()
    };

    await db.photos.add(photo);

    // Queue for upload
    await db.syncQueue.add({
      id: crypto.randomUUID(),
      type: 'photo',
      entity_id: photo.id,
      action: 'create',
      payload: { assessment_id: assessmentId, category, label },
      status: 'pending',
      attempts: 0,
      created_at: new Date()
    });

    return photo;
  }

  /**
   * Get photos for an assessment (local + remote)
   */
  async getPhotos(assessmentId: string, category?: string): Promise<OfflinePhoto[]> {
    let query = db.photos.where('assessment_id').equals(assessmentId);

    if (category) {
      query = query.and(p => p.category === category);
    }

    return query.toArray();
  }

  /**
   * Get photo blob URL for display
   */
  getPhotoUrl(photo: OfflinePhoto, useThumbnail = false): string {
    const blob = useThumbnail ? photo.thumbnail : photo.blob;
    return URL.createObjectURL(blob);
  }

  /**
   * Delete a local photo
   */
  async deletePhoto(photoId: string): Promise<void> {
    await db.photos.delete(photoId);
    // Also remove from sync queue if pending
    await db.syncQueue.where('entity_id').equals(photoId).delete();
  }
}

export const photoStorage = new PhotoStorage();
```

**Photo Compressor**:
```typescript
// src/lib/offline/services/photo-compressor.ts
interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

export async function compressPhoto(
  file: File | Blob,
  options: CompressionOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');

      let { width, height } = img;

      // Scale down if needed
      if (width > options.maxWidth) {
        height = (height * options.maxWidth) / width;
        width = options.maxWidth;
      }
      if (height > options.maxHeight) {
        width = (width * options.maxHeight) / height;
        height = options.maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress'));
        },
        'image/jpeg',
        options.quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function createThumbnail(
  blob: Blob,
  options: CompressionOptions
): Promise<Blob> {
  return compressPhoto(blob, options);
}
```

**Verification**:
- [ ] Photos captured offline are stored in IndexedDB
- [ ] Photos display from local storage
- [ ] Thumbnails generate correctly
- [ ] Photos queue for upload

---

### Phase 6: Background Sync Engine (2-3 days)

**Goal**: Automatically sync data when connectivity returns

**Tasks**:
1. Create sync manager service
2. Process sync queue in order
3. Handle upload failures and retries
4. Update local status after sync

**Files to Create**:
```
src/lib/offline/
├── services/
│   ├── sync-manager.ts        # NEW - Main sync orchestrator
│   └── sync-worker.ts         # NEW - Background sync logic
├── components/
│   └── SyncProgress.svelte    # NEW - Show sync status
```

**Sync Manager**:
```typescript
// src/lib/offline/services/sync-manager.ts
import { db } from '../db';
import { networkStatus } from '../network-status.svelte';
import { supabase } from '$lib/supabase';

class SyncManager {
  isSyncing = $state(false);
  pendingCount = $state(0);
  currentItem = $state<string | null>(null);
  progress = $state(0);

  constructor() {
    // Start sync when coming online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.startSync());
    }
  }

  async startSync(): Promise<void> {
    if (this.isSyncing || !networkStatus.isOnline) return;

    this.isSyncing = true;

    try {
      const pending = await db.syncQueue
        .where('status')
        .equals('pending')
        .sortBy('created_at');

      this.pendingCount = pending.length;

      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        this.currentItem = item.type;
        this.progress = ((i + 1) / pending.length) * 100;

        try {
          await this.processItem(item);
          await db.syncQueue.update(item.id, { status: 'completed' });
        } catch (error) {
          await db.syncQueue.update(item.id, {
            status: 'failed',
            attempts: item.attempts + 1,
            last_attempt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } finally {
      this.isSyncing = false;
      this.currentItem = null;
      this.progress = 100;
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    if (item.type === 'photo') {
      await this.syncPhoto(item);
    } else if (item.type === 'assessment') {
      await this.syncAssessment(item);
    }
  }

  private async syncPhoto(item: SyncQueueItem): Promise<void> {
    const photo = await db.photos.get(item.entity_id);
    if (!photo) return;

    // Upload to Supabase Storage
    const path = `assessments/${photo.assessment_id}/${photo.category}/${photo.id}.jpg`;

    const { error } = await supabase.storage
      .from('assessment-photos')
      .upload(path, photo.blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    // Update local photo status
    await db.photos.update(photo.id, {
      status: 'uploaded',
      remote_path: path
    });

    // Insert record into database
    await supabase.from('assessment_photos').insert({
      assessment_id: photo.assessment_id,
      category: photo.category,
      label: photo.label,
      storage_path: path,
      created_at: photo.created_at.toISOString()
    });
  }

  private async syncAssessment(item: SyncQueueItem): Promise<void> {
    const { tab, data } = item.payload;
    const assessmentId = item.entity_id;

    // Map tab to table/update logic
    const tableMap: Record<string, string> = {
      vehicle_id: 'assessment_vehicle',
      exterior_360: 'assessment_exterior',
      damage: 'assessment_damage',
      tyres: 'assessment_tyres',
      notes: 'assessment_notes',
      estimate: 'estimates',
      // ... etc
    };

    const table = tableMap[tab];
    if (!table) return;

    const { error } = await supabase
      .from(table)
      .upsert({ assessment_id: assessmentId, ...data });

    if (error) throw error;

    // Update local status
    const assessment = await db.assessments.get(assessmentId);
    if (assessment) {
      await db.assessments.update(assessmentId, { status: 'synced' });
    }
  }

  /**
   * Get sync status for UI
   */
  async getStatus(): Promise<{ pending: number; failed: number }> {
    const pending = await db.syncQueue.where('status').equals('pending').count();
    const failed = await db.syncQueue.where('status').equals('failed').count();
    return { pending, failed };
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<void> {
    await db.syncQueue
      .where('status')
      .equals('failed')
      .modify({ status: 'pending', attempts: 0 });

    await this.startSync();
  }
}

export const syncManager = new SyncManager();
```

**Sync Progress Component**:
```svelte
<!-- src/lib/offline/components/SyncProgress.svelte -->
<script lang="ts">
  import { syncManager } from '../services/sync-manager';
  import { RefreshCw, Check, AlertCircle } from 'lucide-svelte';
</script>

{#if syncManager.isSyncing}
  <div class="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 z-50">
    <RefreshCw class="h-5 w-5 text-blue-500 animate-spin" />
    <div>
      <p class="text-sm font-medium">Syncing...</p>
      <p class="text-xs text-gray-500">
        {syncManager.currentItem} ({Math.round(syncManager.progress)}%)
      </p>
    </div>
  </div>
{/if}
```

**Verification**:
- [ ] Sync starts automatically when coming online
- [ ] Photos upload to Supabase Storage
- [ ] Assessment data syncs to database
- [ ] Failed items can be retried
- [ ] Progress indicator shows status

---

## File Structure Summary

```
src/lib/offline/
├── db.ts                          # Dexie database definition
├── schema.ts                      # TypeScript types
├── network-status.svelte.ts       # Online/offline detection
├── index.ts                       # Public exports
│
├── services/
│   ├── assessment-cache.ts        # Pre-load and cache assessments
│   ├── photo-storage.ts           # Local photo management
│   ├── photo-compressor.ts        # Image compression
│   ├── sync-manager.ts            # Background sync orchestrator
│   └── conflict-resolver.ts       # Handle sync conflicts
│
└── components/
    ├── OfflineIndicator.svelte    # "You're offline" banner
    ├── SyncProgress.svelte        # Sync status indicator
    ├── SyncStatus.svelte          # Pending/failed counts
    └── OfflinePhotoCapture.svelte # Camera with offline support

static/
├── manifest.json                  # PWA manifest
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── apple-touch-icon.png
```

---

## Dependencies

```json
{
  "dependencies": {
    "dexie": "^4.0.0",
    "@vite-pwa/sveltekit": "^0.6.0",
    "workbox-precaching": "^7.0.0",
    "workbox-routing": "^7.0.0",
    "workbox-strategies": "^7.0.0"
  }
}
```

---

## Testing Checklist

### PWA Installation
- [ ] "Add to Home Screen" prompt appears on mobile
- [ ] App installs and opens in standalone mode
- [ ] App icon displays correctly

### Offline Data Entry
- [ ] Assessment loads from cache when offline
- [ ] All tabs save data locally when offline
- [ ] Photos capture and store locally
- [ ] "Offline" indicator visible

### Sync
- [ ] Data syncs automatically when online
- [ ] Photos upload to Supabase Storage
- [ ] Sync progress indicator works
- [ ] Failed items show error and retry option

### Edge Cases
- [ ] Network drops mid-sync (should resume)
- [ ] App closed with pending sync (should resume on reopen)
- [ ] Conflict when same data edited online/offline
- [ ] Large photo queue (100+ photos)

---

## Rollout Plan

1. **Internal Testing** - Test with 2-3 engineers
2. **Beta Release** - Enable for select engineers
3. **Monitor Sync Issues** - Track failed syncs
4. **Full Rollout** - Enable for all engineers

---

## Notes

- Photos are the largest data - compression is critical
- IndexedDB has ~50MB limit on some browsers - may need cleanup
- Service Worker caching strategy: NetworkFirst for API, CacheFirst for assets
- Consider Background Sync API for reliable photo uploads

---

## References

- [Dexie.js Documentation](https://dexie.org/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [SvelteKit Service Workers](https://kit.svelte.dev/docs/service-workers)
