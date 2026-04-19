# Refactor PR 3 — Photo Service Factory

**Created**: 2026-04-18
**Status**: Planning → In Progress
**Complexity**: Moderate (6 services + 1 factory; reuses PR 1 pattern)
**Source plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md`
**Branch**: `claude/confident-mendel`
**Depends on**: PR 1 (commit `e5bb64b`) + PR 2 (commit `b4c5838`)

## Overview

Audit 1A found **6 of 8 photo services ~95% byte-identical** modulo table name + parent ID field + (for damage) one extra field. Extract a type-safe factory, collapse each service to a thin config call. Exports keep their current names so callsites are unchanged.

This PR reuses the pattern established by PR 1 (`assessment-subtable-factory.ts`). Study that file first — the generic typing, error handling, and audit-logging style already proved out.

## Services IN scope (6)

| Service file | Table | parentIdField | Extra update fields | Extra methods |
|--------------|-------|---------------|---------------------|---------------|
| `estimate-photos.service.ts` | `estimate_photos` | `estimate_id` | — | — |
| `interior-photos.service.ts` | `assessment_interior_photos` | `assessment_id` | — | — |
| `exterior-360-photos.service.ts` | `assessment_exterior_360_photos` | `assessment_id` | — | — |
| `pre-incident-estimate-photos.service.ts` | `pre_incident_estimate_photos` | `estimate_id` | — | — |
| `additionals-photos.service.ts` | `assessment_additionals_photos` | `additionals_id` | — | — |
| `damage-photos.service.ts` | `assessment_damage_photos` | `assessment_id` | `['panel']` | `updatePhotoPanel` (thin wrapper) |

## Services OUT of scope (keep as-is)

- `tyre-photos.service.ts` — audit logging + dual parent keys (`tyre_id` + `assessment_id`) + missing `reorderPhotos`. Would require escape hatches that make the generic uglier than the separation.
- `shop-job-photos.service.ts` — factory function (not class), `sort_order` not `display_order`, `category` column, different storage API. Genuinely different surface.

**DO NOT touch these two files.**

## Methods the factory exposes

Seven methods verified across the 6 vanilla services (Audit 1A method matrix):

1. `getPhotos(parentId, client?)` — SELECT by parent id, ORDER BY display_order, then created_at.
2. `createPhoto(input, client?)` — INSERT. Preserve the explicit field list (photo_url, photo_path, label, display_order, plus extraUpdateFields like 'panel').
3. `updatePhoto(photoId, input, client?)` — UPDATE by id. Applies only fields the factory expects (label, display_order, plus extraUpdateFields).
4. `updatePhotoLabel(photoId, label, client?)` — thin wrapper delegating to updatePhoto with `{ label }`.
5. `deletePhoto(photoId, client?)` — DELETE by id.
6. `reorderPhotos(parentId, photoIds, client?)` — map each photoId to its index and update display_order. Use sequential loop (matches most current services; don't introduce parallel Promise.all here — that's Damage's divergence and not worth extending to others as a behavior change).
7. `getNextDisplayOrder(parentId, client?)` — SELECT max + 1. Use `|| 0` fallback (matches most; `??` used by 1 service is functionally equivalent for numeric fields).

## Preserve backward-compat method names

Each current service file has a **specific** getter name based on the parent entity — NOT a generic `getPhotos`. Callsites use these:

- `estimatePhotosService.getPhotosByEstimate(estimateId)` → 2+ callsites
- `interiorPhotosService.getPhotosByAssessment(assessmentId)` → 2+ callsites
- `exterior360PhotosService.getPhotosByAssessment(assessmentId)` → 2+ callsites
- `preIncidentEstimatePhotosService.getPhotosByEstimate(estimateId)` → 2+ callsites
- `additionalsPhotosService.getPhotosByAdditionals(additionalsId)` → 2+ callsites
- `damagePhotosService.getPhotosByAssessment(assessmentId)` → 2+ callsites

**Confirm callsite counts via grep before refactoring.**

**Approach**: the factory returns `getPhotos` as its generic name. Each service file exports a wrapper object that spreads the factory methods AND aliases `getPhotos` to the historical name. Example:

```ts
// estimate-photos.service.ts (after refactor)
import { createPhotoService } from './photo-service-factory';
import type { EstimatePhoto, CreateEstimatePhotoInput, UpdateEstimatePhotoInput } from '$lib/types/assessment';

const base = createPhotoService<
  'estimate_photos',
  CreateEstimatePhotoInput,
  UpdateEstimatePhotoInput,
  EstimatePhoto
>({
  table: 'estimate_photos',
  parentIdField: 'estimate_id',
  label: 'estimate photos',
});

export const estimatePhotosService = {
  ...base,
  // Preserve historical API
  getPhotosByEstimate: base.getPhotos,
};

export type { EstimatePhoto, CreateEstimatePhotoInput, UpdateEstimatePhotoInput };
```

Do the same for each of the 6 services, aliasing `getPhotos` to the appropriate historical name.

**For damage**, also add `updatePhotoPanel`:

```ts
// damage-photos.service.ts
const base = createPhotoService<...>({
  table: 'assessment_damage_photos',
  parentIdField: 'assessment_id',
  extraUpdateFields: ['panel'] as const,
  label: 'damage photos',
});

export const damagePhotosService = {
  ...base,
  getPhotosByAssessment: base.getPhotos,
  updatePhotoPanel: (photoId: string, panel: string | null, client?: ServiceClient) =>
    base.updatePhoto(photoId, { panel } as UpdateDamagePhotoInput, client),
};
```

## Factory file skeleton

Create `src/lib/services/photo-service-factory.ts`. Structure mirrors `assessment-subtable-factory.ts` from PR 1:

```ts
import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type { Database } from '$lib/types/database';

type Tables = Database['public']['Tables'];

// Only tables whose Row has a string `photo_url` and a `display_order`
// AND (estimate_id | assessment_id | additionals_id) qualify.
type PhotoTableName = {
  [K in keyof Tables]: Tables[K]['Row'] extends {
    photo_url: string | null;
    display_order: number | null;
  } ? K : never;
}[keyof Tables];

export function createPhotoService<
  TTable extends PhotoTableName,
  TInsert,
  TUpdate,
  TDomain = Tables[TTable]['Row']
>(config: {
  table: TTable;
  parentIdField: string;  // the FK column name (e.g. 'estimate_id')
  extraUpdateFields?: readonly string[];  // e.g. ['panel'] for damage
  label: string;  // for error messages, e.g. 'estimate photos'
}) {
  const { table, parentIdField, extraUpdateFields = [], label } = config;

  return {
    async getPhotos(parentId: string, client?: ServiceClient): Promise<TDomain[]> { ... },
    async createPhoto(input: TInsert, client?: ServiceClient): Promise<TDomain> { ... },
    async updatePhoto(photoId: string, input: TUpdate, client?: ServiceClient): Promise<TDomain> { ... },
    async updatePhotoLabel(photoId: string, label: string, client?: ServiceClient): Promise<TDomain> {
      return this.updatePhoto(photoId, { label } as TUpdate, client);
    },
    async deletePhoto(photoId: string, client?: ServiceClient): Promise<void> { ... },
    async reorderPhotos(parentId: string, photoIds: string[], client?: ServiceClient): Promise<void> { ... },
    async getNextDisplayOrder(parentId: string, client?: ServiceClient): Promise<number> { ... },
  };
}
```

**Design rules**:
- Preserve every existing `console.error` message shape (parameterize with `label`).
- Preserve `throw new Error(`Failed to X ${label}: ${error.message}`)` wording.
- Preserve PGRST116 null-return semantics wherever current services handle it.
- `createPhoto`: explicitly list fields in the INSERT to avoid leaking unwanted input fields. Always include `photo_url`, `photo_path`, `label`, `display_order`. For each extraUpdateField, include if present in input (with `|| null` fallback as current damage does).
- `updatePhoto`: same — explicit field list.
- `getNextDisplayOrder`: use the 4-space pattern: `select display_order → order desc → limit 1 → single() → + 1` with `PGRST116` handling.

## Use Serena for token efficiency

**Instructions for the implementing agent**:

1. Before reading any service file, call `mcp__serena__get_symbols_overview` on it — gets the method signature list + line ranges without reading the body.
2. Only `find_symbol` with `include_body=True` for methods you need to reproduce verbatim (error messages, audit patterns).
3. For the 6 services: since Audit 1A established they're 95% identical, you probably only need to read ONE in full (pick `estimate-photos.service.ts` as the template), then `get_symbols_overview` the other 5 to confirm they have the same method set + no surprises.
4. For callsite counts: use `mcp__serena__find_referencing_symbols` on each service's export, OR a single grep for each exported name.

This saves thousands of tokens vs reading all 6 files fully.

## Hard constraints

1. **Don't touch `tyre-photos.service.ts` or `shop-job-photos.service.ts`**.
2. **Don't touch any `*PhotosPanel.svelte` component** or any callsite. The point is zero breakage.
3. **Preserve backward-compat method names** via spread-aliasing in each service file.
4. **No behavior change.** If a service currently returns `null` on not-found, the factory version does too. If it currently uses sequential loop for reorder, keep sequential.
5. **Don't reintroduce per-service duplication inside the factory.** If different services need different code paths, it's a config flag or an escape hatch — not a branch inside the factory body.
6. **Don't commit or push.** Orchestrator handles.

## Implementation order

1. Read `src/lib/services/assessment-subtable-factory.ts` (PR 1 output) to see the pattern + typing conventions + how generics were handled.
2. `get_symbols_overview` the 6 photo service files to confirm the method matrix.
3. `find_symbol` with `include_body=True` on 2-3 methods from `estimate-photos.service.ts` (the template) to capture exact wording.
4. Write `src/lib/services/photo-service-factory.ts`.
5. Replace each of the 6 service files (estimate-photos → interior-photos → exterior-360-photos → pre-incident-estimate-photos → additionals-photos → damage-photos).
6. Type-check after each replacement to catch issues early.
7. Run final verification (svelte-check + build).

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -80` — 0 new errors. Baseline 0 + 29 pre-existing warnings.
2. `npm run build 2>&1 | tail -15` — succeeds.
3. **Callsite invariance**: for each of the 6 services, confirm grep counts match pre- and post-refactor:
   - `grep -rn 'estimatePhotosService\.getPhotosByEstimate' src --include='*.ts' --include='*.svelte' | wc -l`
   - `grep -rn 'damagePhotosService\.updatePhotoPanel' src --include='*.ts' --include='*.svelte' | wc -l`
   - Same for each other service's distinctive methods.
4. **Line delta**: expect each of the 6 services to shrink from ~150-200 → ~20-30 lines. Factory ~180-200 lines. Net: ~−400 to −500 lines.
5. `grep -rn 'shop-job-photos\|tyre-photos' src/lib/services/ --include='*.ts'` — confirm those 2 files are unchanged (should match the un-scoped set).

## Report back (≤500 words)

- Factory line count + generic typing decisions (especially how you constrained `PhotoTableName`).
- Each service file's new line count.
- Any callsite that imported a NAMED METHOD from one of the old services (unlikely, since most import the service object).
- svelte-check result (NEW errors only).
- Build result.
- Net line delta (expected ~−400 to −500).
- Any deviations from the spec and why.
- Any surprises in the 6 services that the audit didn't flag (e.g. an extra method you had to preserve).

## Notes

- The Supabase typed chain (`db.from(table).select().eq(parentIdField, ...)`) may need a cast to `any` or a narrow type assertion on `db` inside the factory. PR 1 did the same — see how `assessment-subtable-factory.ts` handled it.
- If the 6 services' Insert/Update types don't share a common base (they won't — each table has different columns), the 4 generic parameters (`TTable, TInsert, TUpdate, TDomain`) carry them through. Explicit generic args at each callsite is fine.
- Branch: `claude/confident-mendel`. Append commits. No new branch.
