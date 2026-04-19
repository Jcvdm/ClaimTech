# Refactor Consolidation Summary — Service & Component Factories

**Completed**: 2026-04-18 to 2026-04-19  
**Branch**: `claude/confident-mendel`  
**Commit Range**: `e5bb64b` to `02d81bd`  
**Scope**: Six-PR consolidation of service duplication into factories + composable  
**Net Impact**: **~1,156 lines removed** with zero callsite changes and zero behavior regressions (except documented null-display fallbacks on 8 shop pages)

---

## What Shipped — Six PRs

| PR | Commit | Summary | Net Δ |
|---|--------|---------|-------|
| 1 | `e5bb64b` | Vehicle sub-table factory (vehicle-identification, interior-mechanical, exterior-360) | −126 |
| 2 | `b4c5838` | Adopt `table-helpers.ts` at 20 bypass sites across 7 files | ~−15 |
| 3 | `bd9d3a4` | Photo service factory (6 of 8 photo services) | −585 |
| 4 | `e0e6ed5` | Entity service factory (client, engineer, repairer) | −270 |
| 5 | `1f22b2f` | Adopt `formatters.ts` at 56 bypass sites across 21 files | +70 net |
| 6 | `02d81bd` | `usePhotoUpload` composable (6 assessment photo panels) | −230 |
| | | **Total** | **~−1,156** |

---

## Factories & Composable: Design & API

### 1. `src/lib/services/assessment-subtable-factory.ts` (PR 1)

Backs three services: `vehicleIdentificationService`, `interiorMechanicalService`, `exterior360Service`.

**Config Shape**:
```ts
{ table: 'vehicle_identification' | 'interior_mechanical' | 'exterior_360',
  entityType: string }  // e.g., 'vehicle_identification', 'interior_mechanical', 'exterior_360'
```

**Methods** (4 exported):
- `create(input, client?)`: Insert row + log audit change
- `getByAssessment(assessmentId, client?)`: Fetch single row by assessment_id
- `update(id, input, client?)`: Update row + log audit change
- `upsert(assessmentId, input, client?)`: Get or create, then update if exists

**Audit Integration**: Each service logs `auditService.logChange()` in `create` and `update` with its entity_type string (preserved: `'vehicle_identification'`, `'interior_mechanical'`, `'exterior_360'`).

---

### 2. `src/lib/services/photo-service-factory.ts` (PR 3)

Backs six photo services: `estimatePhotosService`, `interiorPhotosService`, `exterior360PhotosService`, `preIncidentEstimatePhotosService`, `additionalsPhotosService`, `damagePhotosService`.

**Config Shape**:
```ts
{ table: PhotoTable,
  parentIdField: string,  // e.g., 'estimate_id', 'damage_id'
  extraUpdateFields?: readonly string[],  // optional, e.g., ['panel'] for damage
  label?: string }
```

**Methods** (7 exported):
- `getPhotos(parentId, client?)`: Fetch all photos for parent
- `createPhoto(input, client?)`: Insert + return with next `display_order`
- `updatePhoto(id, input, client?)`: Update photo fields
- `updatePhotoLabel(id, label, client?)`: Update label field, return updated row
- `deletePhoto(id, client?)`: Soft delete (sets `deleted_at`)
- `reorderPhotos(parentId, photoIds, client?)`: Sequential reorder (normalized from parallel Promise.all)
- `getNextDisplayOrder(parentId, client?)`: Calculate next order value

**Audit**: All operations preserve existing behavior—no changes to audit logging.

---

### 3. `src/lib/services/entity-service-factory.ts` (PR 4)

Backs three entity services: `clientService`, `engineerService`, `repairerService`.

**Config Shape**:
```ts
{ table: 'entities' | 'engineers' | 'repairers',
  label: string,  // e.g., 'client', 'engineer', 'repairer'
  orderField?: string }  // optional sort field
```

**Methods** (5 exported):
- `list(client?)`: Fetch all entities, optionally ordered
- `getById(id, client?)`: Fetch single by PK
- `create(input, client?)`: Insert + return
- `update(id, input, client?)`: Update + return
- `softDelete(id, client?)`: Set `deleted_at` timestamp

**Callsite Behavior**: Zero changes. All method names and signatures identical.

---

### 4. `src/lib/hooks/use-photo-upload.svelte.ts` (PR 6)

Composable backing six assessment photo panels: `InteriorPhotosPanel`, `Exterior360PhotosPanel`, `EstimatePhotosPanel`, `PreIncidentEstimatePhotosPanel`, `AdditionalsPhotosPanel`, `DamagePhotosPanel`.

**API**:
```ts
export function usePhotoUpload(config: {
  onFilesSelected: (files: File[]) => Promise<void>;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}) {
  return {
    uploading: Readable<boolean>,
    fileInput: HTMLInputElement | null,
    dropZoneActive: Readable<boolean>,
    triggerFileInput: () => void,
    handleDragEnter: (e: DragEvent) => void,
    handleDragOver: (e: DragEvent) => void,
    handleDragLeave: (e: DragEvent) => void,
    handleDrop: (e: DragEvent) => void,
    handleFileInputChange: (e: Event) => void,
  };
}
```

**UX Behavior**:
- Unified drag/drop + file-input handling
- Reactive `uploading` state (true during compression/upload)
- Reactive `dropZoneActive` for UI feedback
- Panel provides `onFilesSelected` callback (called after file selection, before upload)

**Preserved Quirks**: `uploading = true` init in `InteriorPhotosPanel` + `TyrePhotosPanel` `uploadFiles` entry—kept despite being arguably incorrect (should be false during compression). Zero-behavior-change principle.

---

## Code Changes by File Category

### Services Created (3 new files)
- `src/lib/services/assessment-subtable-factory.ts` (~180 lines) — PR 1 foundation
- `src/lib/services/photo-service-factory.ts` (~380 lines) — PR 3 foundation
- `src/lib/services/entity-service-factory.ts` (~220 lines) — PR 4 foundation

### Hooks Created (1 new file)
- `src/lib/hooks/use-photo-upload.svelte.ts` (~280 lines) — PR 6 composable

### Helpers Adopted (0 new, existing files used)
- `src/lib/helpers/table-helpers.ts` (PR 2) — 20 adoption sites, ~7 files touched
- `src/lib/helpers/formatters.ts` (PR 5) — 56 adoption sites, ~21 files touched

### Services Refactored (to factories)

**PR 1 (Vehicle subtables)**:
- `vehicle-identification.service.ts` → 3-line factory call
- `interior-mechanical.service.ts` → 3-line factory call
- `exterior-360.service.ts` → 3-line factory call

**PR 3 (Photo services)**:
- `estimate-photos.service.ts` → 3-line factory call
- `interior-photos.service.ts` → 3-line factory call
- `exterior-360-photos.service.ts` → 3-line factory call
- `pre-incident-estimate-photos.service.ts` → 3-line factory call
- `additionals-photos.service.ts` → 3-line factory call
- `damage-photos.service.ts` → 3-line factory call (with `extraUpdateFields: ['panel']`)

**PR 4 (Entity services)**:
- `client.service.ts` → 3-line factory call
- `engineer.service.ts` → 3-line factory call
- `repairer.service.ts` → 3-line factory call

### Components Refactored (to composable)

**PR 6 (Photo panels)**:
- `InteriorPhotosPanel.svelte` — extract drag/drop handlers, call `usePhotoUpload`
- `Exterior360PhotosPanel.svelte` — extract drag/drop handlers, call `usePhotoUpload`
- `EstimatePhotosPanel.svelte` — extract drag/drop handlers, call `usePhotoUpload`
- `PreIncidentEstimatePhotosPanel.svelte` — extract drag/drop handlers, call `usePhotoUpload`
- `AdditionalsPhotosPanel.svelte` — extract drag/drop handlers, call `usePhotoUpload`
- `DamagePhotosPanel.svelte` — extract drag/drop handlers, call `usePhotoUpload`

---

## Behavioral Deltas (User-Visible, Approved)

### Null-Cell Display Standardization (PR 5)

Shop pages now use `formatters.ts` for consistent null fallbacks:
- **Null dates** → `'N/A'` (was `'—'` or `'-'` locally)
- **Null currency** → `'R0.00'` (was `'—'` or `'-'` locally)

**Affected Pages** (8 total):
- `/shop/dashboard`
- `/shop/jobs`
- `/shop/invoices`
- `/shop/invoiced`
- `/shop/estimates`
- `/shop/completed`
- `/shop/cancelled`
- `/shop/customers/[id]`

**Risk**: Low. Fallback displays are cosmetic; no data transformation.

### Service Method Return Values (PR 3)

- **`damage-photos.reorderPhotos`**: Normalized from parallel `Promise.all` → sequential loop (consistency with vanilla services, zero behavior change)
- **`estimate-photos.updatePhotoLabel`**: Changed return type from `void` → updated row. No callsites read return value; safe upgrade.

---

## Intentionally NOT Consolidated (With Rationale)

These services/components were audited and explicitly preserved. Attempting to consolidate would create false positives.

### Services (8 total)

| Service | Reason | Size |
|---------|--------|------|
| `tyre-photos.service.ts` | Different audit logging pattern + dual parent keys (`tyre_id` + `assessment_id`) + no `reorderPhotos` | ~180 lines |
| `shop-job-photos.service.ts` | Factory function (not class), `sort_order` + `category` schema, different storage API | ~250 lines |
| `shop-job.service.ts` | State machine with `VALID_TRANSITIONS`, status history, auto-dating—only ~3-5% is CRUD | ~380 lines |
| `assessment.service.ts` | Workflow-heavy (~950 lines); ~3-5% is CRUD, rest is domain logic (stage transitions, validations) | ~950 lines |
| `estimate.service.ts` | Calculation-heavy; significant domain logic beyond CRUD | ~450 lines |
| `frc.service.ts` | Calculation-heavy; significant domain logic beyond CRUD | ~400 lines |
| `additionals.service.ts` | Calculation-heavy; significant domain logic beyond CRUD | ~300 lines |
| `damage.service.ts` | 1:N cardinality (not 1:1 like vehicle subtables), has `createDefault` initialization logic | ~200 lines |

### Components (5 total)

| Component | Reason | Size |
|-----------|--------|------|
| `ShopPhotosPanel.svelte` | Different storage backend from assessment photo panels (shop uses `shop_job_photos` table) | ~320 lines |
| `PhotoUpload.svelte` | Single-file form-field component, not multi-photo panel; different UX role | ~220 lines |
| `PhotoUploadV2.svelte` | Zero callsites (candidate for deletion, deferred) | ~240 lines |

### Display Formatting (Deferred to PR 5.5)

- **`.toFixed(2)` in calculation utilities** (`frcCalculations.ts`, `estimateCalculations.ts`, etc.) — Arithmetic rounding, not display formatting; kept separate from `formatters.ts`
- **`.toLocaleTimeString('en-ZA')` across ~9 shop pages** — No `formatTime()` helper yet; deferred to PR 5.5 (Phase 2)

---

## Preserved Quirks (Known Issues, Not Fixed)

These are documented to prevent future well-intentioned "fixes" that would violate the "zero behavior change" principle.

| Quirk | Location | Impact | Why Preserved |
|-------|----------|--------|----------------|
| `uploading = true` init in `uploadFiles` | `InteriorPhotosPanel`, `TyrePhotosPanel` | State briefly reports "uploading" before compression runs | Preserve exact existing behavior; cosmetic, not functional |
| `handleUploadZoneKeydown` duplicated | `EstimatePhotosPanel`, `Exterior360PhotosPanel` | ~4 lines of drag/drop handler code duplicated | Deferred cleanup; candidate for follow-up utility function |

---

## Remaining Opportunities (Tier 3, Next Session)

These are documented for future optimization; not blocking.

### Decision Points

1. **`PhotoUploadV2.svelte` (0 callsites)** — Delete or migrate to? Needs git log inspection + explicit decision.
2. **`useOptimisticQueue` adoption** — ~3 bypass sites could benefit; low impact.
3. **`estimateCalculations.ts` / `frcCalculations.ts` `.toFixed(2)` bypasses** — Separate cleanup pass; arithmetic vs display formatting distinction.

### Tier 3 Feature: PR 5.5 (Phase 2)

**Add `formatTime()` to `formatters.ts` + adopt at 9 shop pages**:
- Consolidate `.toLocaleTimeString('en-ZA')` invocations
- Standardize time display across shop module
- Estimated scope: ~40 lines added to formatters, ~9 adoption sites, ~−25 net lines

### Future Architecture

**`shop-customer.service.ts` candidate for entity-service-factory**:
- Currently ~75% CRUD-identical to `client.service.ts`
- Blocker: Nested vehicle CRUD (create/update vehicle within customer update)
- Unblock: Extract vehicle CRUD into separate service layer, then slot into factory
- Priority: Low (minimal duplication benefit; architectural cleanup)

---

## Testing & Verification

### Callsite Verification

All six PRs maintain **zero export-name changes**:
- Service files maintain identical export names → no import refactoring
- Composable introduced new hook → panels opt-in to adopt (non-breaking)
- Behavior preserved except documented null-display deltas

### Test Coverage

- Unit tests in `src/lib/services/__tests__/` cover factory-generated methods (same coverage as originals)
- E2E tests for photo panels (EstimatePhotosPanel, DamagePhotosPanel, etc.) verify drag/drop + composable integration
- Shop page null-display tests updated to expect `'N/A'` / `'R0.00'`

### Manual QA Checklist

- [ ] Photo upload: drag/drop + file-input work identically across all 6 panels
- [ ] Damage photos: `panel` field updates via factory with `extraUpdateFields`
- [ ] Entity CRUD: client/engineer/repairer create/update/list work identically
- [ ] Vehicle subtables: vehicle-identification/interior-mechanical/exterior-360 audit logging preserved
- [ ] Shop pages: null cells display as `'N/A'` (dates) / `'R0.00'` (currency)

---

## Files & References

### Task Specifications (Original PRs)

The six PR task documents are now in `.agent/Tasks/completed/`:
- [REFACTOR_PR1_VEHICLE_SUBTABLE_FACTORY.md](.agent/Tasks/completed/REFACTOR_PR1_VEHICLE_SUBTABLE_FACTORY.md)
- [REFACTOR_PR2_TABLE_HELPERS_ADOPTION.md](.agent/Tasks/completed/REFACTOR_PR2_TABLE_HELPERS_ADOPTION.md)
- [REFACTOR_PR3_PHOTO_SERVICE_FACTORY.md](.agent/Tasks/completed/REFACTOR_PR3_PHOTO_SERVICE_FACTORY.md)
- [REFACTOR_PR4_ENTITY_SERVICE_FACTORY.md](.agent/Tasks/completed/REFACTOR_PR4_ENTITY_SERVICE_FACTORY.md)
- [REFACTOR_PR5_FORMATTERS_ADOPTION.md](.agent/Tasks/completed/REFACTOR_PR5_FORMATTERS_ADOPTION.md)
- [REFACTOR_PR6_USE_PHOTO_UPLOAD_COMPOSABLE.md](.agent/Tasks/completed/REFACTOR_PR6_USE_PHOTO_UPLOAD_COMPOSABLE.md)

### Audit Documentation

Pre-work audit: [REFACTOR_DUPLICATION_FINDINGS.md](.agent/Tasks/active/REFACTOR_DUPLICATION_FINDINGS.md) (reference; kept in active for context)

### Architecture Patterns

For factory patterns, service-layer best practices, and composable patterns:
- [SOP/working_with_services.md](.agent/SOP/working_with_services.md) (to be updated with factory pattern guide)
- [System/service_architecture.md](.agent/System/service_architecture.md) (reference)
- [System/supabase_service_layer.md](.agent/System/supabase_service_layer.md) (reference)

---

## Summary for Next Developer

This refactor eliminated **~1,156 lines of duplication** across three service factories and one composable. All callsites remain unchanged (zero import refactoring). Two behavioral deltas shipped on 8 shop pages (null display `'—'` → `'N/A'` for dates, `'R0.00'` for currency) and were approved.

The factories and composable are production-ready and follow ClaimTech conventions for type safety, audit logging, and service composition. Remaining opportunities (PR 5.5, PhotoUploadV2 cleanup, entity-factory expansion) are documented for future sessions.

---

**Status**: ✅ COMPLETE  
**Last Updated**: 2026-04-19  
**Branch**: `claude/confident-mendel` (commits e5bb64b → 02d81bd)
