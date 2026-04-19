# Refactor PR 1 — Vehicle Sub-Table Service Factory

**Created**: 2026-04-18
**Status**: Planning → In Progress
**Complexity**: Simple (smallest PR in the refactor plan; proves the pattern)
**Source plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md` (section "PR 1 — Vehicle sub-table service factory")
**Branch**: `claude/confident-mendel`
**Depends on**: Phase 3D commit `46d4ca1`

## Overview

Collapse three assessment sub-table services into one type-safe factory. Audit 2A verified **96% duplication — 118 of 122 non-import lines are byte-identical modulo table/type names**.

Target services:
- `src/lib/services/vehicle-identification.service.ts` (~125 lines)
- `src/lib/services/interior-mechanical.service.ts` (~125 lines)
- `src/lib/services/exterior-360.service.ts` (~117 lines)

Each exposes four methods: `create`, `getByAssessment`, `update`, `upsert`. All call `auditService.logChange()` identically in `create` / `update` with a service-specific `entity_type` string.

After this PR, each of the 3 service files should be a ~3-line factory call, all methods provided by a shared factory. Exports keep the same names — no callsite changes.

## Verified duplication map (from Audit 2A)

| Method | Body verdict | Only differences |
|--------|-------------|------------------|
| `create` | IDENTICAL-MODULO-TABLE | Table name, return type cast, audit `entity_type` string |
| `getByAssessment` | IDENTICAL-MODULO-TABLE | Table name, return type cast |
| `update` | IDENTICAL-MODULO-TABLE | Table name, return type cast, audit `entity_type` string |
| `upsert` | IDENTICAL — structural delegation to getByAssessment + create/update | None |

Audit `entity_type` strings (MUST preserve):
- vehicle-identification → `'vehicle_identification'`
- interior-mechanical → `'interior_mechanical'`
- exterior-360 → `'exterior_360'`

## Files to create

### `src/lib/services/assessment-subtable-factory.ts`

A type-safe factory function that generates the four methods for any table that matches the shape "single row keyed by `assessment_id`". Skeleton:

```ts
import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types/service';
import type { Database } from '$lib/types/supabase';  // or wherever generated types live — confirm path
import { auditService } from './audit.service';

type Tables = Database['public']['Tables'];

// Only allow tables that have an `assessment_id` column — constrains misuse at compile time.
type AssessmentSubtableName = {
  [K in keyof Tables]: Tables[K]['Row'] extends { assessment_id: string } ? K : never;
}[keyof Tables];

export function createAssessmentSubtableService<
  TTable extends AssessmentSubtableName,
  TRow extends Tables[TTable]['Row'],
  TInsert extends Tables[TTable]['Insert'],
  TUpdate extends Tables[TTable]['Update'],
>(config: {
  table: TTable;
  entityType: string;  // audit entity_type, e.g. 'vehicle_identification'
}) {
  const { table, entityType } = config;

  return {
    async create(input: TInsert, client?: ServiceClient): Promise<TRow> {
      const db = client ?? supabase;
      const { data, error } = await db.from(table).insert(input).select().single();
      if (error) { /* log + throw — preserve existing message shape */ }
      await auditService.logChange({
        entity_type: entityType,
        entity_id: data!.id,
        action: 'create',
        metadata: { assessment_id: (input as any).assessment_id }, // preserve current shape
      });
      return data as TRow;
    },

    async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<TRow | null> {
      const db = client ?? supabase;
      const { data, error } = await db.from(table).select('*').eq('assessment_id', assessmentId).maybeSingle();
      if (error) { /* log + throw */ }
      return data as TRow | null;
    },

    async update(assessmentId: string, input: TUpdate, client?: ServiceClient): Promise<TRow> {
      const db = client ?? supabase;
      // Preserve the undefined→null conversion from existing services
      const cleanedInput = Object.fromEntries(
        Object.entries(input).map(([k, v]) => [k, v === undefined ? null : v])
      );
      const { data, error } = await db.from(table).update(cleanedInput).eq('assessment_id', assessmentId).select().single();
      if (error) { /* log + throw */ }
      // Preserve existing audit pattern including fields_updated filter
      await auditService.logChange({
        entity_type: entityType,
        entity_id: assessmentId,
        action: 'update',
        metadata: {
          fields_updated: Object.keys(cleanedInput).filter(k => cleanedInput[k] !== null && cleanedInput[k] !== undefined),
        },
      });
      return data as TRow;
    },

    async upsert(assessmentId: string, input: TUpdate, client?: ServiceClient): Promise<TRow> {
      const existing = await this.getByAssessment(assessmentId, client);
      if (existing) {
        return this.update(assessmentId, input, client);
      }
      return this.create({ ...input, assessment_id: assessmentId } as unknown as TInsert, client);
    },
  };
}
```

**Implementation rules**:
- Read the three existing services in full first. Copy the error-handling strings VERBATIM (same `console.error` messages, same `throw new Error()` wording) so any log monitoring keeps matching.
- Preserve every call to `auditService.logChange()` with its existing metadata shape. If one service logs `fields_updated` and another doesn't, adapt — but all three currently log identically per Audit 2A (lines 88–97), so one shared implementation should cover all three.
- Generic typing: use Supabase's generated `Database['public']['Tables']` if it exists (grep for existing `Database` imports to find the right path; `src/lib/types/supabase.ts` is the likely home). If the generated types don't exist or are stale, fall back to a looser generic but DO NOT use `any` liberally — prefer `unknown` with explicit casts at known-safe points.
- Don't introduce new error semantics. If a method currently returns `null` on `PGRST116`, the factory version does too.

## Files to modify

Each of the three service files becomes a thin factory invocation. The exported names STAY THE SAME — no callsite grep-and-replace required.

### `src/lib/services/vehicle-identification.service.ts`

Replace entire contents with:

```ts
import { createAssessmentSubtableService } from './assessment-subtable-factory';

export const vehicleIdentificationService = createAssessmentSubtableService({
  table: 'assessment_vehicle_identification',
  entityType: 'vehicle_identification',
});

// Re-export types for consumers that imported them from this file (if any)
export type {
  VehicleIdentification,
  CreateVehicleIdentificationInput,
  UpdateVehicleIdentificationInput,
} from '$lib/types/assessment';  // confirm path via grep
```

**Before you write this**: grep for `vehicleIdentificationService` across `src/` to confirm all callsites import from `./vehicle-identification.service` (or `$lib/services/vehicle-identification.service`). If any callsite imports a NAMED METHOD from this file (unusual but possible), preserve the export.

### `src/lib/services/interior-mechanical.service.ts`

Same pattern. Export name: `interiorMechanicalService`, entityType: `'interior_mechanical'`, table: `'assessment_interior_mechanical'`.

### `src/lib/services/exterior-360.service.ts`

Same pattern. Export name: `exterior360Service` (verify actual current export name via grep — might be `exterior360PhotosService` ← NO, that's the photos service; this is the sub-table record service). Table: `'assessment_360_exterior'`. entityType: `'exterior_360'`.

## Hard constraints

- **Do NOT touch `tyre-photos.service.ts`** — different pattern (audit + dual parent keys, 75% similarity).
- **Do NOT touch `damage.service.ts`** — 1:N cardinality, has extra methods.
- **Do NOT touch `task.service.ts`, `frc.service.ts`** — different scope.
- **Do NOT touch any `*PhotosPanel.svelte` component** — photo services are a separate future PR.
- **Do NOT change any callsites.** The three service exports keep their current names. Callsites should be byte-identical after this PR.
- **Do NOT commit or push.** Orchestrator handles that.

## Implementation order

1. **Read all three existing services in full**. Note the exact `console.error` wording, the audit `metadata` shape, the return type patterns, and whether there's a fourth method I missed.
2. **Confirm the type imports**: where does `Database` live? Where do `VehicleIdentification` / `InteriorMechanical` / `Exterior360` types live? Use Glob/grep.
3. **Write the factory** (`assessment-subtable-factory.ts`). Get the type parameters right first — if Supabase's `Database` types work, use them; otherwise use a narrower generic.
4. **Replace service 1** (vehicle-identification). Type-check immediately.
5. **Replace service 2** (interior-mechanical). Type-check.
6. **Replace service 3** (exterior-360). Type-check.
7. **Final verification**: svelte-check + build.

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -120` — 0 NEW errors. Baseline: 0 errors + 29 pre-existing warnings.
2. `npm run build 2>&1 | tail -15` — succeeds.
3. Confirm callsite invariance: for each of the three services, grep their USAGE sites and confirm no changes are needed:
   - `grep -rn 'vehicleIdentificationService' src --include='*.ts' --include='*.svelte' | wc -l` — pre- and post-refactor counts should match.
   - Same for `interiorMechanicalService` and the exterior-360 service.
4. File size sanity: the 3 service files should shrink from ~125/125/117 → ~10 lines each. The factory should be ~100-120 lines. Net code delta: roughly −250 lines.

## Report back

Tight (<400 words):
- Confirmed type-import paths used in the factory (`Database` location, service type locations).
- Factory line count + key design decisions you made (how you handled the generic typing, how you preserved audit metadata).
- Any callsites that imported a NAMED METHOD (not just the service object) — if any, how you preserved compatibility.
- Build + svelte-check result (new errors only).
- Any deviations from the spec and why.

## Notes

- This is PR 1 of 6. If the pattern works here, PR 3 (photo service factory) reuses it.
- If the Supabase generated types aren't available or are too loose, document the fallback in the factory's JSDoc and flag in the report.
- If any of the three services has a fifth method not listed in Audit 2A (unlikely but possible), quote it in the report so I can decide whether to include it in the factory or keep it as a per-service extension.
