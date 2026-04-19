# SOP: Working with Services

**Last updated**: 2026-04-19 — refreshed for post-refactor service architecture (see [Refactor Consolidation Summary](../Tasks/completed/REFACTOR_CONSOLIDATION_SUMMARY.md)).

## Overview

ClaimTech's service layer is where all database I/O lives. Services sit between routes/components and Supabase, and follow one of five patterns depending on the domain. Every pattern shares one invariant: methods accept an optional `client?: ServiceClient` so routes can pass their authenticated `locals.supabase` instance.

## Anatomy of a service method (universal)

Every service method — regardless of pattern — takes `client?: ServiceClient` as its final parameter and resolves to a concrete Supabase client internally:

```ts
import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types/service';

async function getFoo(id: string, client?: ServiceClient): Promise<Foo | null> {
  const db = client ?? supabase;
  const { data, error } = await db
    .from('foos')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching foo:', error);
    return null;
  }
  return data;
}
```

Why this matters:

- **Server-side**: routes call `service.method(args, locals.supabase)` — the caller's authenticated client flows through, so Row-Level Security (RLS) policies authenticate the user correctly.
- **Client-side**: components call `service.method(args)` with no client — falls through to the shared browser `supabase` singleton.

**If you forget `client?: ServiceClient`**: RLS-protected inserts will fail with PostgreSQL error 42501 ("new row violates row-level security policy"). Every service in the codebase has been audited to include it; follow the same convention for any new service.

`ServiceClient` is defined in [`src/lib/types/service.ts`](../../src/lib/types/service.ts) as `SupabaseClient<Database>`.

---

## Pattern A — Class + singleton

**Use when**: a service is stateful, represents a canonical instance, or is expected to be directly instantiable elsewhere (e.g. a route-level `new EngineerService()` pattern that exists in one callsite).

**Shape**:
```ts
export class FooService {
  async list(client?: ServiceClient): Promise<Foo[]> { ... }
  async getById(id: string, client?: ServiceClient): Promise<Foo | null> { ... }
  async create(input: CreateFooInput, client?: ServiceClient): Promise<Foo> { ... }
  async update(id: string, input: UpdateFooInput, client?: ServiceClient): Promise<Foo | null> { ... }
  async delete(id: string, client?: ServiceClient): Promise<void> { ... }
}

export const fooService = new FooService();
```

**Live examples**:
- [`src/lib/services/assessment.service.ts`](../../src/lib/services/assessment.service.ts) — 950 lines of assessment workflow + stage transitions
- [`src/lib/services/engineer.service.ts`](../../src/lib/services/engineer.service.ts) — exports both class and singleton (one callsite still does `new EngineerService()`)
- [`src/lib/services/frc.service.ts`](../../src/lib/services/frc.service.ts) — FRC workflow, optimistic locking via `version` column
- [`src/lib/services/request.service.ts`](../../src/lib/services/request.service.ts) — request lifecycle

Use this for workflow-heavy, state-machine, or calculation-heavy domains. Keep CRUD-only entities on Pattern E instead.

---

## Pattern B — Factory function (shop module)

**Use when**: each consumer should construct its own instance at request time (no shared singleton), and the Supabase client is passed at construction instead of at each method call.

**Shape**:
```ts
export function createFooService(supabase: SupabaseClient) {
  return {
    async getById(id: string) { ... },
    async create(input: CreateFooInput) { ... },
    async update(id: string, input: UpdateFooInput) { ... },
    // methods do NOT need `client?` param — supabase is already captured
  };
}
```

**Live examples** (the entire shop module uses this pattern):
- [`src/lib/services/shop-customer.service.ts`](../../src/lib/services/shop-customer.service.ts)
- [`src/lib/services/shop-job.service.ts`](../../src/lib/services/shop-job.service.ts) — also contains a `VALID_TRANSITIONS` state machine
- [`src/lib/services/shop-estimate.service.ts`](../../src/lib/services/shop-estimate.service.ts)
- [`src/lib/services/shop-invoice.service.ts`](../../src/lib/services/shop-invoice.service.ts)
- [`src/lib/services/shop-job-photos.service.ts`](../../src/lib/services/shop-job-photos.service.ts)
- [`src/lib/services/shop-additionals.service.ts`](../../src/lib/services/shop-additionals.service.ts)

**Why the shop module uses this**: shop services need a supabase handle at construction to avoid threading `client?` through every method call. Each request's `+page.server.ts` does `const svc = createShopJobService(locals.supabase); const job = await svc.getById(params.id);` — simpler than the multi-argument Pattern A. Also see [`shop_module_overview.md`](../System/shop_module_overview.md).

---

## Pattern C — Consolidation factories (CRUD deduplication)

**Added as of 2026-04 refactor.** Three factories eliminate ~1,000 lines of byte-identical CRUD duplication across similarly-shaped services, while preserving every existing export name so callsites never changed.

### C.1 — Assessment sub-table factory

For 1:1 assessment-child records (one record per assessment_id).

[`src/lib/services/assessment-subtable-factory.ts`](../../src/lib/services/assessment-subtable-factory.ts) — `createAssessmentSubtableService({ table, entityType })`

Methods: `create`, `getByAssessment`, `update`, `upsert`. Includes automatic `auditService.logChange()` calls on create/update.

**Backed services**:
```ts
// vehicle-identification.service.ts — ~10 lines
export const vehicleIdentificationService = createAssessmentSubtableService<...>({
  table: 'assessment_vehicle_identification',
  entityType: 'vehicle_identification',
});
```

Same pattern for `interiorMechanicalService` and `exterior360Service`.

### C.2 — Photo service factory

For the 6 vanilla photo services with shared structure (estimate / interior / exterior-360 / pre-incident / additionals / damage).

[`src/lib/services/photo-service-factory.ts`](../../src/lib/services/photo-service-factory.ts) — `createPhotoService({ table, parentIdField, extraUpdateFields?, label })`

Methods: `getPhotos`, `createPhoto`, `updatePhoto`, `updatePhotoLabel`, `deletePhoto`, `reorderPhotos`, `getNextDisplayOrder`. `extraUpdateFields` lets damage allowlist its `panel` column without leaking the Insert/Update types.

**Backed services**:
```ts
// estimate-photos.service.ts
const base = createPhotoService<...>({
  table: 'estimate_photos',
  parentIdField: 'estimate_id',
  label: 'estimate photos',
});
export const estimatePhotosService = {
  ...base,
  getPhotosByEstimate: base.getPhotos,   // historical alias for backward compat
};
```

Callsites still do `estimatePhotosService.getPhotosByEstimate(id)` exactly as before.

**NOT backed** (intentionally separate — don't try to consolidate):
- `tyre-photos.service.ts` — dual parent keys + custom audit logging.
- `shop-job-photos.service.ts` — different schema (`sort_order`/`category`, not `display_order`/`label`) and different storage API.

### C.3 — Entity service factory

For plain CRUD entities with `is_active` soft-delete and a single sort column.

[`src/lib/services/entity-service-factory.ts`](../../src/lib/services/entity-service-factory.ts) — `createEntityService({ table, label, orderField })`

Methods: `list`, `getById`, `create`, `update`, `softDelete`.

**Backed services**:
- [`client.service.ts`](../../src/lib/services/client.service.ts) — wraps create/update with `validateTermsAndConditions` (client-specific concern). Extensions: `searchClients`, `getClientsByType`, `getClientTermsAndConditions`.
- [`engineer.service.ts`](../../src/lib/services/engineer.service.ts) — extensions: `getEngineerByEmail`, `listEngineersByProvince`. Also exports `EngineerService` class (one callsite uses it).
- [`repairer.service.ts`](../../src/lib/services/repairer.service.ts) — extension: `searchRepairers`.

### When to use a consolidation factory

Ask yourself: is the new service's shape **structurally identical** to an existing entity's — same methods, same signatures, only table/type differ?

- Yes, and it's an assessment child record (1:1) → extend `createAssessmentSubtableService`.
- Yes, and it's a photo-like record (display_order + parent FK) → extend `createPhotoService`.
- Yes, and it's a soft-delete CRUD entity → extend `createEntityService`.
- No, the new service has unique business logic (state transitions, calculations, workflows) → use Pattern A.

**Don't force fit**. If the fit requires a conditional branch inside the factory, that's a smell — create a separate service.

---

## Pattern D — Legacy function exports

**Historical**. Some older services still export plain functions instead of a class or factory. They still accept `client?: ServiceClient`, so they're not broken — but new services should NOT follow this pattern.

Example:
```ts
export async function getFoo(id: string, client?: ServiceClient): Promise<Foo | null> { ... }
```

Prefer Pattern A (class + singleton) for new work; Pattern D is kept around only because legacy callsites haven't been migrated.

---

## Pattern E — Utility/compute services

**Use when**: the service is pure computation or library-like (no Supabase access, no audit trail).

Examples:
- [`src/lib/services/audit.service.ts`](../../src/lib/services/audit.service.ts) — actually does Supabase writes; mentioned here for context but follows Pattern A.
- [`src/lib/utils/estimateCalculations.ts`](../../src/lib/utils/estimateCalculations.ts) — pure math on estimate line items.
- [`src/lib/services/document-generation.service.ts`](../../src/lib/services/document-generation.service.ts) — PDF generation.
- [`src/lib/services/storage.service.ts`](../../src/lib/services/storage.service.ts) — Supabase Storage wrapper.

Shape is whatever makes sense — no `client?` parameter if the service doesn't hit the DB.

---

## Audit logging convention

For mutations on assessment-child records (and anywhere domain-events need an audit trail), services call:

```ts
import { auditService } from './audit.service';
import type { EntityType } from '$lib/types/audit';

await auditService.logChange({
  entity_type: 'vehicle_identification',  // must be a valid EntityType literal
  entity_id: record.id,
  action: 'create' | 'update' | 'delete',
  metadata: { /* arbitrary JSON payload */ }
});
```

`EntityType` is a union literal in [`src/lib/types/audit.ts`](../../src/lib/types/audit.ts) — misspelled entity types fail at compile time.

The consolidation factories (assessment-subtable, photo-service) include audit logging automatically. Services that DON'T use a factory must call `auditService.logChange` themselves for state-changing operations.

---

## Using services in routes

### In `+page.server.ts` — always pass `locals.supabase`

**Class/singleton service (Pattern A)**:
```ts
import type { PageServerLoad } from './$types';
import { clientService } from '$lib/services/client.service';

export const load: PageServerLoad = async ({ locals }) => {
  const clients = await clientService.listClients(true, locals.supabase);
  return { clients };
};
```

**Factory function (Pattern B — shop module)**:
```ts
import type { PageServerLoad } from './$types';
import { createShopJobService } from '$lib/services/shop-job.service';

export const load: PageServerLoad = async ({ locals, params }) => {
  const jobService = createShopJobService(locals.supabase);
  const job = await jobService.getById(params.id);
  return { job };
};
```

### In form actions — same rule, pass `locals.supabase`

```ts
export const actions: Actions = {
  create: async ({ request, locals }) => {
    const formData = await request.formData();
    const input = parseInput(formData);
    await clientService.createClient(input, locals.supabase);
    throw redirect(303, '/clients');
  },
};
```

**If you skip `locals.supabase`**: the service falls back to the anonymous browser `supabase` client, and RLS policies reject the insert.

### In components (client-side)

```ts
// Component code — no server context, just the singleton
await clientService.updateClient(id, updates);  // uses the shared supabase client
```

This works because the browser `supabase` instance is already authenticated via the Supabase client-side auth flow.

---

## Decision table — which pattern for a new service?

| New service is... | Use pattern |
|-------------------|-------------|
| Pure CRUD on a single table with soft-delete (`is_active`) | **C.3** — `createEntityService` |
| 1:1 assessment child record (one per assessment_id) | **C.1** — `createAssessmentSubtableService` |
| Photo-like (display_order + parent FK) | **C.2** — `createPhotoService` |
| Shop-module scope | **B** — factory function, singleton-free |
| Has a state machine / workflow / stage transitions | **A** — class + singleton |
| Pure computation / library | **E** — whatever fits |
| Legacy unified-function service to extend | Migrate to **A** as you go |

---

## Common pitfalls

1. **Missing `client?: ServiceClient`** → RLS 42501 errors. Add it to every method that hits the DB.
2. **Passing `client` to a factory-function service method** → factory services don't take the param; the supabase handle was captured at construction.
3. **Using `fooService` singleton in a route that needs `locals.supabase`** → you forgot to pass it: `fooService.method(args, locals.supabase)`.
4. **Using `new FooService()` for a shop service** → shop services are factory functions. Use `createFooService(supabase)`.
5. **Adding a conditional branch inside a consolidation factory** → smell; that service probably shouldn't use the factory. Split it out.
6. **Missing audit log on a state-changing mutation** → for assessment children, confirm via grep that `auditService.logChange` is called somewhere in the flow (in the factory or the service).

---

## Related documentation

- [Shop Module Overview](../System/shop_module_overview.md) — the shop subsystem's services, routes, and architectural divergence.
- [Refactor Consolidation Summary](../Tasks/completed/REFACTOR_CONSOLIDATION_SUMMARY.md) — the 6-PR refactor that introduced the consolidation factories.
- [Audit Logging System](../System/audit_logging_system.md) — deeper dive into the audit trail.
- [Adding Page Route](adding_page_route.md) — how services plug into `(app)` and `(shop)` routes.
- [Database Schema](../System/database_schema.md) — table definitions the services operate on.
