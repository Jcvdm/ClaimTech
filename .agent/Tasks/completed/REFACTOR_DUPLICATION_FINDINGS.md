# Refactor: Service & Component Duplication Findings

**Created**: 2026-04-18
**Status**: Investigation complete — not yet a task
**Source**: 3 parallel Explore-agent audits verifying concrete duplication claims
**Scope**: Independent of mobile-responsiveness work. Ship whenever convenient.

## TL;DR

- **Photo services (8 files)**: 6 are ~95% byte-identical. Consolidate via factory. **DO.**
- **Photo components (8 files)**: 20–25% identical, not 90%. Extract a composable, keep components. **DO (narrow).**
- **Entity services (client/engineer/repairer)**: ~90% CRUD-body identical. Factory it. **DO.**
- **shop-job, assessment, tyre photo, shop-job photo services**: genuinely different. **DO NOT consolidate.**

## Verification summary (verified 2026-04-18)

### 1. Photo services — "95% identical across 8" claim

**VERDICT: TRUE FOR 6 OF 8.**

| Service | Similarity | Notes |
|---------|-----------|-------|
| `estimate-photos.service.ts` | 95% | Vanilla |
| `interior-photos.service.ts` | 95% | Vanilla |
| `exterior-360-photos.service.ts` | 95% | Vanilla |
| `pre-incident-estimate-photos.service.ts` | 95% | Vanilla |
| `additionals-photos.service.ts` | 95% | Vanilla (one `??` vs `\|\|` delta) |
| `damage-photos.service.ts` | 90% | Adds `panel` field |
| `tyre-photos.service.ts` | ~75% | Audit logging, dual parent IDs, no `reorderPhotos` |
| `shop-job-photos.service.ts` | ~40% | Factory function not class, `sort_order`+`category`, different storage API |

Shared methods verified byte-identical modulo table/id across the 6 vanilla services: `getPhotosBy*`, `createPhoto`, `updatePhoto`, `updatePhotoLabel`, `deletePhoto`, `reorderPhotos`, `getNextDisplayOrder`.

### 2. Photo components — "90% identical" claim

**VERDICT: MATERIALLY FALSE.**

Only **20–25% of each file is duplicated** — specifically drag/drop handlers (`handleDragEnter`/`Over`/`Leave`/`Drop`), file-input triggers, photo-viewer open/close.

75–80% is entity-specific and genuinely different:
- Props vary: `estimateId` vs `additionalsId` vs `tyreId` vs `jobId` vs assessment-only
- Service API shapes differ: factory function vs class instance
- Storage categories/subcategories differ per entity
- Field naming differs: `storage_path` (Shop) vs `photo_url` (assessment)
- Templates differ: TyrePhotosPanel has a simplified 3-section layout; ShopPhotosPanel uses different storage API entirely
- PhotoUpload is a single-file form-field component, not a panel

The snippet originally quoted showing "only types differ" cherry-picked the shared boilerplate and omitted the divergence.

### 3. Entity services — "60–70% identical" claim

**VERDICT: TRUE FOR 3 CORE ENTITIES.**

| Service | CRUD similarity | Divergence driver |
|---------|-----------------|-------------------|
| `client.service.ts` | 90% | T&C validation wrapper on create/update |
| `engineer.service.ts` | 90% | `getByEmail`, `listByProvince` extensions |
| `repairer.service.ts` | 90% | `search` extension |
| `vehicle-identification.service.ts` | 85% | **Audit logging** on create/update (intentional) |
| `accessories.service.ts` | 85% | **Audit logging** on create/update (intentional) |
| `shop-customer.service.ts` | ~75% | Factory pattern + nested vehicle CRUD |
| `shop-job.service.ts` | ~30% | State machine — `updateJobStatus` w/ `VALID_TRANSITIONS`, milestones, status history |
| `assessment.service.ts` | N/A | 950 lines — workflow-heavy, not CRUD |

## Recommended refactors

### A. Photo service factory (HIGHEST ROI, LOWEST RISK)

**Consolidate 6 vanilla photo services into one type-safe factory.** Keep Tyre and ShopJob separate.

```ts
// src/lib/services/photo-service-factory.ts
export function createPhotoService<
  TTable extends PhotoTableName,
  TPhoto extends Tables<TTable>
>(config: {
  table: TTable;
  parentIdField: keyof TPhoto & string;
  extraUpdateFields?: readonly (keyof TPhoto & string)[];
}) {
  return {
    async getByParent(parentId, client) { ... },
    async create(input, client) { ... },
    async update(id, input, client) { ... },
    async delete(id, client) { ... },
    async reorder(parentId, photoIds, client) { ... },
    async updateLabel(id, label, client) { ... },
  };
}

// Each service shrinks to a one-liner at the SAME EXPORT NAME:
export const estimatePhotosService = createPhotoService({
  table: 'estimate_photos',
  parentIdField: 'estimate_id',
});
export const damagePhotosService = createPhotoService({
  table: 'assessment_damage_photos',
  parentIdField: 'assessment_id',
  extraUpdateFields: ['panel'],
});
// ...etc for interior, exterior360, pre-incident, additionals
```

**Why this is safe:**
- Callsites unchanged — each service keeps its current export name.
- Type safety preserved via Supabase's generated `Tables<>` helper + generics.
- `extraUpdateFields` is an explicit allowlist (no `any`).
- Bug fixes now land once across 6 entity types.

**Keep separate:**
- `tyre-photos.service.ts` — audit logging + dual parent IDs would pollute the generic. Could revisit later if audit logging is extracted as a decorator.
- `shop-job-photos.service.ts` — factory pattern, category filtering, different API shape. Genuinely different product surface.

**Scope:** ~1 PR. 6 files shrink dramatically, 1 new file, 0 callsite changes.

### B. `usePhotoUpload` composable (LOW RISK, HIGH CLARITY GAIN)

**Extract the 20% that IS shared** (drag/drop + file-select + progress). Keep 8 panel components.

```ts
// src/lib/hooks/use-photo-upload.svelte.ts
export function usePhotoUpload(config: {
  category: string;
  subcategory: string;
  assessmentId?: string;
  onPhotoCreated: (url: string, path: string, label: string | null) => Promise<void>;
}) {
  let uploading = $state(false);
  let compressing = $state(false);
  let uploadProgress = $state(0);
  let isDragging = $state(false);

  // shared drag handlers + uploadFiles loop
  return { uploading, compressing, uploadProgress, isDragging, handleDragEnter, handleDragOver, handleDragLeave, handleDrop, uploadFiles };
}
```

**Why this is right:**
- Each panel keeps its entity-specific wiring (props, template, storage config).
- Bug fixes in drag/drop land once.
- Each panel shrinks from ~400 → ~150 lines.
- Migration is incremental — introduce composable, migrate one panel as proof, then others.

**Do NOT extract a `<PhotoGrid>` or `<PhotoUploader>` component.** The template divergence fights abstraction.

**Scope:** 1 composable + 6 panel migrations. Ship 1 + 1 (proof) first, then batch the rest.

### C. Entity service factory — 3 core entities (SMALL BUT WORTH IT)

Same pattern, scoped to `client`, `engineer`, `repairer`:

```ts
export function createEntityService<TTable, TEntity>(config: {
  table: TTable;
  orderField: keyof TEntity & string;
  activeField?: keyof TEntity & string;  // 'is_active'
}) {
  return {
    async list(activeOnly, client) { ... },
    async getById(id, client) { ... },
    async create(input, client) { ... },
    async update(id, input, client) { ... },
    async softDelete(id, client) { ... },
  };
}
```

- `client.service.ts`: wrap the factory; keep `validateTermsAndConditions` as a pre-call in its own thin `create`/`update` wrappers; keep `searchClients`, `getClientsByType`, `getClientTermsAndConditions` as extensions.
- `engineer.service.ts`: wrap the factory; keep `getEngineerByEmail`, `listEngineersByProvince` as extensions.
- `repairer.service.ts`: wrap the factory; keep `searchRepairers` as an extension.

**Do NOT touch:**
- `shop-job.service.ts` (state machine)
- `assessment.service.ts` (950 lines of workflow)
- Audit-logged services (`accessories`, `vehicle-identification`) — their divergence is intentional per-compliance
- `shop-customer.service.ts` (factory pattern, nested vehicles — different enough to leave)

**Scope:** small PR. 1 factory + 3 service simplifications.

## Explicit REJECTIONS

| Refactor | Reason |
|----------|--------|
| Merge 8 photo components into one | Templates and props diverge by 75%+; abstraction would be uglier than duplication |
| Consolidate `tyre-photos.service` into generic | Audit-logging + dual parent IDs justify separation |
| Consolidate `shop-job-photos.service` | Different API (factory), different schema (`sort_order`+`category`), different storage function |
| Consolidate `shop-job.service` | State machine with `VALID_TRANSITIONS`, not CRUD |
| Consolidate `assessment.service` | 950 lines of workflow-specific logic |
| Remove per-table Photo TypeScript types | Type safety loss outweighs DRY gain |
| Generic `audit-logged` photo service | Cross-cutting concern — decorator or wrapper pattern is better than conditional branches inside the generic |

## Risks to manage when pursuing

1. **Type safety** — Supabase's typed chains (`.from('estimate_photos').eq('estimate_id', ...)`) depend on table-literal inference. Using `TTable extends keyof Database['public']['Tables']` with `Tables<TTable>` preserves this; confirm with a TS compile pass before merging.
2. **RLS policies** — different tables may have different RLS rules. Consolidation doesn't change RLS, but anyone auditing security might assume shared code = shared policy. Document per-table RLS expectations in the factory's JSDoc.
3. **Migration blast radius** — recommended approach (keep export names unchanged) sidesteps this. If callsites change, every photo flow is touched.
4. **Future divergence cost** — if a seventh entity suddenly needs audit logging on its photos, either extract the logging pattern OR fork from the factory. Don't bolt on a branch inside the generic.
5. **Git blame** — consolidation loses per-file history. Rebase + include a `git log --follow` tip in the commit message.

## Recommended sequence (when picked up)

1. **Photo service factory** (Refactor A) — smallest blast radius, highest payoff, zero callsite changes. One PR, ~1 session.
2. **`usePhotoUpload` composable + migrate 1 panel as proof** (Refactor B, phase 1) — low risk, incremental.
3. **Migrate remaining 5 panels** (Refactor B, phase 2) — piecemeal, 1–2 per PR.
4. **Entity service factory for 3 core entities** (Refactor C) — small separate PR.

Total: ~3–5 PRs. All independently shippable. None blocks the other. None is coupled to the mobile-responsiveness phases.

## References (from verification audits)

- Photo-services audit: `src/lib/services/{estimate,interior,exterior-360,damage,tyre,pre-incident-estimate,additionals,shop-job}-photos.service.ts`
- Photo-components audit: `src/lib/components/assessment/{Estimate,PreIncident,Additionals,Interior,Exterior360,Tyre}PhotosPanel.svelte`, `src/lib/components/shop/ShopPhotosPanel.svelte`, `src/lib/components/forms/PhotoUpload.svelte`
- Entity-services audit: `src/lib/services/{client,engineer,repairer,vehicle-identification,accessories,shop-customer,shop-job,assessment}.service.ts`

## Outstanding question for the user

> Is any of these refactors a priority, or capture-for-later? The mobile-responsiveness work (Phases 3D, 3C batch 2, 4, 5) is the current push. These refactors would slot in between phases, or during a lull.
