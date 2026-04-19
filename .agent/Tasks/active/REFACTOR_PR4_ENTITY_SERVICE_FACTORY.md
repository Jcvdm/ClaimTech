# Refactor PR 4 — Entity Service Factory (Client / Engineer / Repairer)

**Created**: 2026-04-18
**Status**: Planning → In Progress
**Complexity**: Simple (smallest remaining factory — 3 CRUD services; reuses PR 1 + PR 3 pattern)
**Source plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md` (Tier 2, PR 4)
**Branch**: `claude/confident-mendel`
**Depends on**: PR 1 (`e5bb64b`), PR 2 (`b4c5838`), PR 3 (`bd9d3a4`)

## Overview

Audit 1C found **3 core entity services are ~90% byte-identical modulo table + type**: `client.service.ts`, `engineer.service.ts`, `repairer.service.ts`. All three share the same 5-method CRUD surface (`list` / `getById` / `create` / `update` / soft-delete). Each has 1-3 unique extension methods that stay as per-service wrappers.

This PR reuses the exact pattern from PR 1 (`assessment-subtable-factory.ts`) and PR 3 (`photo-service-factory.ts`).

## Services IN scope (3)

| Service file | Table | Label | Extensions to preserve |
|--------------|-------|-------|------------------------|
| `client.service.ts` | `clients` | `'client'` | T&C validation on create/update, `searchClients`, `getClientsByType`, `getClientTermsAndConditions` |
| `engineer.service.ts` | `engineers` | `'engineer'` | `getEngineerByEmail`, `listEngineersByProvince` |
| `repairer.service.ts` | `repairers` | `'repairer'` | `searchRepairers` |

## Services OUT of scope (explicitly)

**DO NOT consolidate**:
- `shop-customer.service.ts` — factory-function pattern, nested vehicle CRUD, different architecture.
- `task.service.ts` — different scope (`request_tasks`, not entity-centric CRUD; date filtering, engineer-centric queries).
- `accessories.service.ts`, `vehicle-identification.service.ts` — these have **intentional audit-logging decoration** (compliance requirement). Treating them as pure CRUD would erase the audit calls.
- `damage.service.ts` — 1:N cardinality, `listByAssessment`, `createDefault` — not vanilla CRUD.
- `assessment.service.ts` (950 lines), `estimate.service.ts`, `additionals.service.ts`, `frc.service.ts`, `shop-job.service.ts` — workflow / state-machine / calculation-heavy. Not CRUD.

## Methods the factory exposes

Five methods, verified across the 3 services:

1. `list(activeOnly?: boolean, client?: ServiceClient)` — SELECT * ORDER BY `orderField` ASC. If `activeOnly`, filter `is_active = true`.
2. `getById(id: string, client?: ServiceClient)` — SELECT by id, `.single()`, PGRST116 → `null`.
3. `create(input, client?: ServiceClient)` — INSERT with `{ ...input, is_active: true }`.
4. `update(id, input, client?: ServiceClient)` — UPDATE by id. PGRST116 → `null` (if the service currently does this; confirm per-service).
5. `softDelete(id, client?: ServiceClient)` — UPDATE `is_active = false` by id. Returns `true` on success.

## Backward-compat method names

Each current service has **specific** method names matching its entity. Preserve them all:

| Service | Historical methods |
|---------|-------------------|
| client | `listClients`, `getClient`, `createClient`, `updateClient`, `deleteClient` |
| engineer | `listEngineers`, `getEngineer`, `createEngineer`, `updateEngineer`, `deleteEngineer` |
| repairer | `listRepairers`, `getRepairer`, `createRepairer`, `updateRepairer`, `deleteRepairer` |

**Confirm via grep** that these are the actual export names before refactoring. Callsites import the service object, then call the method by historical name.

## Factory file skeleton

Create `src/lib/services/entity-service-factory.ts`. Mirrors PR 1 / PR 3 pattern:

```ts
import { supabase } from '$lib/supabase';
import type { ServiceClient } from '$lib/types';
import type { Database } from '$lib/types/database';

type Tables = Database['public']['Tables'];

// Only tables with `is_active` boolean and `id` string qualify
type EntityTableName = {
  [K in keyof Tables]: Tables[K]['Row'] extends {
    id: string;
    is_active: boolean | null;
  } ? K : never;
}[keyof Tables];

export function createEntityService<
  TTable extends EntityTableName,
  TInsert,
  TUpdate,
  TDomain = Tables[TTable]['Row']
>(config: {
  table: TTable;
  label: string;                 // for error messages, e.g. 'client'
  orderField: string;            // column to ORDER BY in list(), e.g. 'name'
}) {
  const { table, label, orderField } = config;

  return {
    async list(activeOnly = false, client?: ServiceClient): Promise<TDomain[]> { ... },
    async getById(id: string, client?: ServiceClient): Promise<TDomain | null> { ... },
    async create(input: TInsert, client?: ServiceClient): Promise<TDomain> { ... },
    async update(id: string, input: TUpdate, client?: ServiceClient): Promise<TDomain | null> { ... },
    async softDelete(id: string, client?: ServiceClient): Promise<boolean> { ... },
  };
}
```

**Design rules** (same as PR 1 + PR 3):
- Preserve each service's existing `console.error` message shape (parameterize with `label`).
- Preserve `throw new Error(...)` wording.
- Preserve PGRST116 null-return semantics where current services have them.
- Cast `db` to `any` inside the factory once to sidestep Supabase's generic `.eq()` column inference under a mapped-type-constrained table (same technique PR 1 and PR 3 used).

## Per-service file shape (example)

### `src/lib/services/client.service.ts`

```ts
import { supabase } from '$lib/supabase';
import { createEntityService } from './entity-service-factory';
import type { ServiceClient } from '$lib/types';
import type { Client, CreateClientInput, UpdateClientInput } from '$lib/types/client';

const base = createEntityService<'clients', CreateClientInput, UpdateClientInput, Client>({
  table: 'clients',
  label: 'client',
  orderField: 'name',
});

// Preserve T&C validation on create/update — wraps factory methods
function validateTermsAndConditions(input: CreateClientInput | UpdateClientInput) {
  // copy verbatim from existing client.service.ts
}

export const clientService = {
  // Historical method names
  listClients: base.list,
  getClient: base.getById,

  createClient: async (input: CreateClientInput, client?: ServiceClient): Promise<Client> => {
    validateTermsAndConditions(input);
    return base.create(input, client);
  },

  updateClient: async (id: string, input: UpdateClientInput, client?: ServiceClient): Promise<Client | null> => {
    validateTermsAndConditions(input);
    return base.update(id, input, client);
  },

  deleteClient: base.softDelete,

  // Extensions — copy verbatim from current client.service.ts
  async searchClients(searchTerm: string, activeOnly = false, client?: ServiceClient): Promise<Client[]> {
    // ...copy body...
  },
  async getClientsByType(type: 'insurance' | 'private', client?: ServiceClient): Promise<Client[]> {
    // ...copy body...
  },
  async getClientTermsAndConditions(clientId: string, client?: ServiceClient) {
    // ...copy body...
  },
};

export type { Client, CreateClientInput, UpdateClientInput };
```

### `src/lib/services/engineer.service.ts`

Same pattern — factory + extensions `getEngineerByEmail`, `listEngineersByProvince`. No T&C validation.

### `src/lib/services/repairer.service.ts`

Same pattern — factory + extension `searchRepairers`. No T&C validation.

## Use Serena for token efficiency

**Same as PR 3**: don't read all 3 files in full up-front.

1. `mcp__serena__get_symbols_overview` on each of the 3 services to confirm method lists + line ranges.
2. Read ONE template in full — pick `repairer.service.ts` (simplest, fewest extensions).
3. For the other 2, use `mcp__serena__find_symbol` with `include_body=True` only for the methods that add unique logic (client's T&C validation + search variants + by-type; engineer's by-email + by-province).
4. Read `src/lib/services/assessment-subtable-factory.ts` or `src/lib/services/photo-service-factory.ts` (PR 1 / PR 3 outputs) to see the exact factory pattern + typing — one of them, not both.

## Hard constraints

1. **Don't touch the 5 OUT-OF-SCOPE services** listed above.
2. **Preserve every extension method** with its body verbatim.
3. **Preserve T&C validation** in client's create/update — it must run BEFORE the factory's insert/update.
4. **Preserve error-message wording** via the `label` config.
5. **Preserve PGRST116 null semantics** wherever current services have them.
6. **Zero callsite changes** — all exports keep their current names + signatures.
7. **Don't commit or push** — orchestrator handles.

## Implementation order

1. `get_symbols_overview` on all 3 services to establish the method matrix.
2. Read `src/lib/services/assessment-subtable-factory.ts` (PR 1) for the pattern.
3. Read `repairer.service.ts` in full (template — smallest).
4. `find_symbol` body for: client's `validateTermsAndConditions`, `searchClients`, `getClientsByType`, `getClientTermsAndConditions`; engineer's `getEngineerByEmail`, `listEngineersByProvince`.
5. Write `src/lib/services/entity-service-factory.ts`.
6. Replace `repairer.service.ts` → type-check.
7. Replace `engineer.service.ts` → type-check.
8. Replace `client.service.ts` → type-check.
9. Final verification (svelte-check + build).

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -80` — 0 new errors (baseline 0 + 29 pre-existing warnings).
2. `npm run build 2>&1 | tail -15` — succeeds.
3. Callsite invariance:
   - `grep -rn 'clientService\.\|engineerService\.\|repairerService\.' src --include='*.ts' --include='*.svelte' | wc -l` — should be unchanged pre- and post-refactor.
   - Spot-check specific methods: `grep -rn 'clientService.getClient\|engineerService.getEngineer\|repairerService.searchRepairers' src` — each should still resolve.
4. Confirm the 5 out-of-scope services are byte-unchanged: `git diff --stat src/lib/services/shop-customer.service.ts src/lib/services/task.service.ts src/lib/services/accessories.service.ts src/lib/services/vehicle-identification.service.ts src/lib/services/damage.service.ts` — empty stat.

## Report back (≤400 words)

- Factory line count + typing (how you constrained `EntityTableName`).
- Each service file's new line count (before → after).
- Net line delta (expected ~−150 to −200 total; these are smaller services than the photo set).
- Any callsite that imports a NAMED METHOD from one of the service files (rare — most import the service object, but client might have `validateTermsAndConditions` as a named export — verify).
- svelte-check + build results.
- Any deviations from the spec and why.
- Any surprises: a fifth CRUD-like method, an extra extension the audit didn't flag, unusual typing around the extensions.

## Notes

- Projection: ~`client (231) + engineer (168) + repairer (145) = 544` → `factory (~150) + 3 thin services (~40 each avg) = ~270`. Net ≈ −275 lines.
- Tone: this is the same pattern executed twice already. Should be the smoothest PR yet.
- Branch: `claude/confident-mendel`. Append commits. No new branch.
