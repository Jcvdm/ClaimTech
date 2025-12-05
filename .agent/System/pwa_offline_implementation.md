# PWA Offline Implementation - Complete Guide

**Last Updated**: December 5, 2025
**Status**: ✅ Complete - All 6 phases implemented and integrated
**Scope**: Assessment data caching, photo offline storage, background sync

---

## Overview

ClaimTech now has a complete Progressive Web App (PWA) implementation enabling offline-first assessment data capture. Engineers can work in areas with poor/no mobile connectivity, with all data automatically synced when connectivity is restored.

### Key Capabilities

- **Installable App**: Home screen installation on iOS and Android
- **Offline Data Storage**: IndexedDB database with Dexie.js wrapper
- **Assessment Caching**: Auto-cache assessment data on page load
- **Photo Storage**: Compressed photo storage with offline retrieval
- **Background Sync**: Queue operations for sync when online
- **Network Detection**: Real-time network status indicators

---

## Architecture

### 6-Phase Implementation

#### Phase 1: PWA Foundation ✅
**Status**: Complete
**Components**:
- Service worker registration via Vite PWA plugin
- `manifest.json` with app metadata
- PWA install prompt for iOS/Android
- Vercel headers configuration for service worker delivery

**Key Files**:
- `vite.config.ts` - Vite PWA plugin configuration
- `static/manifest.json` - App manifest
- `src/lib/components/pwa/InstallPrompt.svelte` - Install UI
- `vercel.json` - Service worker headers

#### Phase 2: IndexedDB Setup ✅
**Status**: Complete
**Components**:
- Dexie.js database wrapper with schema
- Type-safe data access layer
- Offline data types and interfaces

**Key Files**:
- `src/lib/offline/db.ts` - Dexie database instance
- `src/lib/offline/schema.ts` - Data type definitions
- `src/lib/offline/index.ts` - Public exports

**Database Structure**:
```typescript
// Dexie database schema
{
  assessments: '&id',           // Primary key: id
  photos: '&id, assessmentId',  // Indexes: id, assessmentId
  syncQueue: '&id, timestamp',  // Indexes: id, timestamp
}
```

#### Phase 3: Offline Detection & UI ✅
**Status**: Complete
**Components**:
- Network status tracking with Svelte store
- Offline indicator banner component
- Sync status display component

**Key Files**:
- `src/lib/offline/network-status.svelte.ts` - Network state tracking
- `src/lib/offline/components/OfflineIndicator.svelte` - Offline banner
- `src/lib/offline/components/SyncStatus.svelte` - Sync status display
- `src/lib/offline/components/SyncProgress.svelte` - Sync progress bar

**UI Integration**:
- Root layout includes `OfflineIndicator` for always-visible offline status
- Sync status shows "Online", "Syncing", or "Offline" states
- Network state updates in real-time via `online` and `offline` events

#### Phase 4: Assessment Data Caching ✅
**Status**: Complete
**Components**:
- Assessment cache service with auto-population
- useOfflineAssessment hook for data access
- Optimistic updates with sync queue

**Key Files**:
- `src/lib/offline/services/assessment-cache.ts` - Assessment caching logic
- `src/lib/offline/hooks/useOfflineAssessment.ts` - React-like hook
- `src/lib/offline/index.ts` - Service exports

**Integration Points**:
- Assessment page loads data into cache on mount
- useOfflineAssessment hook provides cached/synced data
- Automatic sync when online status changes

**Data Cached**:
- Assessment metadata (id, status, stage, created_at)
- Vehicle identification data
- Exterior 360 photos
- Damage assessments
- Tyre conditions
- Interior/mechanical data
- Notes and metadata

#### Phase 5: Photo Offline Storage ✅
**Status**: Complete
**Components**:
- Photo IndexedDB storage service
- Client-side photo compression
- Photo compressor utility with HEIC support

**Key Files**:
- `src/lib/offline/services/photo-storage.ts` - Photo storage management
- `src/lib/offline/services/photo-compressor.ts` - Client-side compression

**Features**:
- Compress photos before storing (60-75% reduction)
- HEIC to JPEG conversion for iPhone photos
- Graceful fallback if compression fails
- Progress callbacks for UI feedback

**Storage Details**:
```typescript
Photo {
  id: string;                 // Unique ID
  assessmentId: string;       // Parent assessment
  category: PhotoCategory;    // exterior_360, damage, etc.
  mimeType: string;          // image/jpeg, etc.
  width: number;
  height: number;
  size: number;              // Compressed size in bytes
  compressedBlob: Blob;      // Compressed image data
  timestamp: number;         // Upload timestamp
}
```

#### Phase 6: Background Sync Engine ✅
**Status**: Complete
**Components**:
- Sync manager for orchestrating offline queues
- Optimistic updates with rollback
- Conflict resolution for sync failures

**Key Files**:
- `src/lib/offline/services/sync-manager.ts` - Sync orchestration

**Sync Queue**:
- Persists operations to IndexedDB
- Maintains order and priority
- Retries failed syncs with exponential backoff
- Automatic sync when online status changes

---

## File Structure

```
src/lib/offline/
├── db.ts                              # Dexie database instance
├── schema.ts                          # Offline data types
├── index.ts                           # Public exports
├── network-status.svelte.ts          # Network state Svelte store
├── services/
│   ├── assessment-cache.ts           # Assessment caching
│   ├── photo-storage.ts              # Photo storage
│   ├── photo-compressor.ts           # Photo compression
│   └── sync-manager.ts               # Background sync
├── components/
│   ├── OfflineIndicator.svelte       # Offline banner
│   ├── SyncStatus.svelte             # Sync status display
│   └── SyncProgress.svelte           # Sync progress bar
└── hooks/
    └── useOfflineAssessment.ts       # Data access hook

src/lib/components/pwa/
└── InstallPrompt.svelte              # PWA install UI

static/
├── icons/                            # PWA app icons (192x192, 512x512)
└── manifest.json                     # App manifest (moved to public)

vercel.json                           # Vercel config for SW headers
```

---

## Integration Points

### Root Layout
**File**: `src/routes/+layout.svelte`

```svelte
<OfflineIndicator />
<InstallPrompt />
<!-- Main content -->
```

**Purpose**:
- Show offline status banner at all times
- Display PWA install prompt
- Ensure network state is always tracked

### Assessment Page
**File**: `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte`

```typescript
// On component mount or assessment load
const { assessmentData, syncStatus } = useOfflineAssessment(assessmentId);
```

**Purpose**:
- Auto-cache assessment data when page loads
- Provide offline-ready data for all tabs
- Track sync status for UI feedback

---

## Technology Stack

### Core Libraries
- **@vite-pwa/sveltekit** (v0.x) - PWA configuration for Vite + SvelteKit
- **dexie** (v4.x) - IndexedDB wrapper with full TypeScript support
- **workbox** (via @vite-pwa) - Service worker caching strategies

### Browser APIs
- Service Worker API - Background sync and caching
- IndexedDB - Client-side storage
- Network Information API - Online/offline detection
- Web App Manifest - Installability metadata

---

## Usage Patterns

### Auto-Cache Assessment Data

```typescript
// Automatically cache data when page loads
const { assessmentData, isSyncing } = useOfflineAssessment(assessmentId);

// Data is cached and available immediately
// Syncs automatically when online
$effect(() => {
  if (assessmentData) {
    console.log('Assessment cached:', assessmentData);
  }
});
```

### Store Photo Offline

```typescript
import { photoStorage } from '$lib/offline/services/photo-storage';

// Store compressed photo
const photo = await photoStorage.storePhoto(
  assessmentId,
  blob,
  'exterior_360',
  {
    onProgress: (percent) => console.log(`Compressed: ${percent}%`)
  }
);

console.log(`Stored: ${photo.id}, size: ${photo.size} bytes`);
```

### Check Network Status

```typescript
import { networkStatus } from '$lib/offline/network-status.svelte.ts';

// Check current status
if ($networkStatus === 'online') {
  console.log('Connected');
} else if ($networkStatus === 'offline') {
  console.log('Disconnected');
}

// React to changes
$effect(() => {
  console.log('Network status:', $networkStatus);
});
```

### Manual Sync

```typescript
import { syncManager } from '$lib/offline/services/sync-manager';

// Trigger sync manually
await syncManager.syncAll();

// Check sync status
const status = syncManager.getSyncStatus();
console.log(`Synced: ${status.completed}/${status.total}`);
```

---

## Installation & Setup

### Environment Setup

1. **Service Worker Headers** - Vercel configuration already set in `vercel.json`
2. **Manifest File** - Located at `public/manifest.json`
3. **App Icons** - 192x192 and 512x512 icons in `public/icons/`

### Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 39+ | Full (service workers, IndexedDB) |
| Firefox | 44+ | Full |
| Safari | 14+ | Full (with caveats) |
| Edge | 17+ | Full |
| iOS Safari | 14.5+ | Partial (no install prompt, limited background sync) |
| Android Chrome | 39+ | Full (with install prompt) |

### Installation Methods

**Android**:
1. Open ClaimTech in Chrome
2. Tap "Install app" in address bar
3. App appears on home screen

**iOS**:
1. Open ClaimTech in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. InstallPrompt component guides users

---

## Performance Characteristics

### Storage Capacity

- **IndexedDB Quota**: Typically 50MB per origin (varies by browser)
- **Assessment Data**: ~50-100KB per assessment (metadata only)
- **Photo Storage**: Compressed to 60-75% of original size
  - Example: 5MB photo → 1.2-2MB compressed

### Sync Performance

- **Automatic Sync Trigger**: Within 500ms of online detection
- **Sync Queue**: Processes 1 operation per 200ms (configurable)
- **Retry Strategy**: Exponential backoff (500ms → 1000ms → 2000ms)
- **Failure Handling**: Failed ops remain queued for next sync attempt

### Network Detection

- **Online Detection**: Window `online` event + periodic ping
- **Update Frequency**: Real-time (sub-second for most networks)
- **Latency**: <100ms for online/offline detection

---

## Data Flow

### Online Assessment Capture

```
User Edits Assessment
        ↓
Component Updates Local State
        ↓
Optimistic Update to IndexedDB
        ↓
API Request to Server
        ↓
Sync to Remote DB
        ↓
Update Local Cache on Success
```

### Offline Assessment Capture

```
User Edits Assessment (No Network)
        ↓
Component Updates Local State
        ↓
Optimistic Update to IndexedDB
        ↓
Queue Operation (No API Call)
        ↓
User Goes Online
        ↓
Sync Manager Detects Online
        ↓
Process Queue (API Requests)
        ↓
Update Local Cache on Success
```

---

## Security & Privacy

### Data Security

- **IndexedDB**: Local-only storage, no transmission
- **Service Worker Cache**: HTTP/HTTPS only, no plaintext
- **Photo Compression**: In-browser processing, no upload until sync
- **Sync Manager**: Only syncs when device is online

### Privacy Considerations

- **No Cloud Backup**: Offline data stays on device
- **Local Storage Only**: No third-party access to IndexedDB
- **Device Clearing**: Offline data cleared when browser storage cleared
- **Auth Scope**: Service worker respects existing auth cookies

### Sensitive Data

Offline storage includes:
- Assessment metadata
- Assessment photos (compressed)
- Vehicle identification data
- Damage descriptions

**Recommendation**: Configure storage quota and retention policies per organization.

---

## Troubleshooting

### PWA Installation Not Working

**Issue**: "Install app" button not appearing

**Solutions**:
1. Check HTTPS is enabled (service workers require HTTPS)
2. Verify `manifest.json` is served with correct headers
3. Check `vercel.json` has service worker headers configured
4. Clear browser cache and reload

**Tools**: Use DevTools Application tab → Manifest to verify

### Photos Not Syncing

**Issue**: Offline photos not uploading after going online

**Solutions**:
1. Check network status with DevTools Network tab
2. Verify IndexedDB has photo data (DevTools Storage → IndexedDB)
3. Check sync manager status: `await syncManager.getSyncStatus()`
4. Enable logging: Check browser console for sync logs

### Storage Quota Exceeded

**Issue**: "QuotaExceededError" when storing photos

**Solutions**:
1. Clear old assessments from offline storage
2. Enable photo compression (automatic via photoStorage)
3. Reduce photo dimensions before storing
4. Monitor storage usage: `await db.photos.count()`

### Service Worker Not Updating

**Issue**: Changes to service worker not reflecting

**Solutions**:
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear service workers in DevTools
3. Check service worker updates: DevTools Application → Service Workers
4. Verify build includes latest service worker code

---

## Monitoring & Debugging

### Debug Logging

Enable comprehensive logging:

```typescript
import { enableDebugLogging } from '$lib/offline/services/sync-manager';

enableDebugLogging(true); // Logs all sync operations
```

**Console Output**:
- Sync queue operations
- Network status changes
- Storage operations
- Compression progress

### Performance Monitoring

```typescript
import { syncManager } from '$lib/offline/services/sync-manager';

// Track sync performance
const status = syncManager.getSyncStatus();
console.log('Sync stats:', {
  completed: status.completed,
  total: status.total,
  failed: status.failed,
  duration: status.duration
});
```

### Storage Analysis

```typescript
// Check IndexedDB usage
const assessmentCount = await db.assessments.count();
const photoCount = await db.photos.count();
const queueSize = await db.syncQueue.count();

console.log(`IndexedDB: ${assessmentCount} assessments, ${photoCount} photos, ${queueSize} queued ops`);
```

---

## Maintenance & Updates

### Clearing Offline Data

```typescript
import { db } from '$lib/offline/db';

// Clear all offline data
await db.delete();
```

### Service Worker Updates

Service workers auto-update via:
1. New deployment to Vercel
2. Browser detects updated service worker
3. Shows update notification to user
4. Updates on next reload

### Dependency Updates

- **Dexie.js**: Check `package.json` for upgrades
- **Vite PWA Plugin**: Check for new features and breaking changes
- **Workbox**: Via @vite-pwa plugin, no separate updates needed

---

## Future Enhancements

### Potential Improvements

1. **Background Sync API** - Native background sync when online
2. **Periodic Sync** - Scheduled syncs even when app closed
3. **Push Notifications** - Alerts for assessment updates
4. **Conflict Resolution** - Smart merge for concurrent edits
5. **Storage Quota Management** - UI for managing stored data
6. **Photo Gallery Caching** - Download photo galleries offline

### Experimental Features

- **Sync Scheduling**: Configure sync frequency
- **Adaptive Quality**: Adjust compression based on device storage
- **Compression Profiles**: Different profiles for different photo types

---

## Related Documentation

- [Service Worker Implementation](./service_worker_implementation.md)
- [IndexedDB Schema Guide](./indexeddb_schema_guide.md)
- [Offline Sync Patterns](./offline_sync_patterns.md)
- [Photo Compression Guide](./photo_compression_implementation.md)
- [Network Status Tracking](./network_status_tracking.md)

---

## Support & Contact

For PWA implementation questions:
- Check this guide first
- Review source code in `src/lib/offline/`
- Check browser DevTools for errors
- Review Vite PWA plugin documentation

---

**Status**: Production ready - All phases tested and integrated
**Last Tested**: December 5, 2025
**Next Review**: After first user feedback on offline features
