# Shop Module Overview

**Created**: 2026-04-19
**Scope**: Architecture overview of the body-shop route group and services.

## What the shop module is

The shop module is a separate workflow under the `(shop)` SvelteKit route group. It serves body-shop repair operations — jobs, parts lists, estimates, invoicing, customer management — distinct from the assessment-centric `(app)` workflow.

**Key separation**:
- Assessment users (clients, engineers) work in `(app)` routes on assessment records.
- Shop users work in `(shop)` routes on job records.
- The two workflows are **independently evolving**. Shops don't know about assessments; clients/engineers don't know about shops. Any integration happens only at the report/PDF-generation layer.

---

## Routes

All shop routes live under [`src/routes/(shop)/shop/`](../../src/routes/(shop)/shop/). The `(shop)` route group provides its own layout chrome — see [`src/routes/(shop)/+layout.svelte`](../../src/routes/(shop)/+layout.svelte) for the top-level shell.

| Route | Purpose | File |
|-------|---------|------|
| `/shop/dashboard` | KPIs + recent activity | `src/routes/(shop)/shop/dashboard/+page.svelte` |
| `/shop/jobs` | Job list | `src/routes/(shop)/shop/jobs/+page.svelte` |
| `/shop/jobs/[id]` | Job detail — status, notes, parts, photos | `src/routes/(shop)/shop/jobs/[id]/+page.svelte` |
| `/shop/estimates` | Shop-side estimate list | `src/routes/(shop)/shop/estimates/+page.svelte` |
| `/shop/estimates/new` | New estimate form | `src/routes/(shop)/shop/estimates/new/+page.svelte` |
| `/shop/estimates/[id]` | Estimate detail (if route exists) | `src/routes/(shop)/shop/estimates/[id]/+page.svelte` |
| `/shop/invoices` | Invoice list | `src/routes/(shop)/shop/invoices/+page.svelte` |
| `/shop/invoices/[id]` | Invoice detail | `src/routes/(shop)/shop/invoices/[id]/+page.svelte` |
| `/shop/invoiced` | Status-filtered job list (invoiced) | `src/routes/(shop)/shop/invoiced/+page.svelte` |
| `/shop/completed` | Status-filtered job list (completed) | `src/routes/(shop)/shop/completed/+page.svelte` |
| `/shop/cancelled` | Status-filtered job list (cancelled) | `src/routes/(shop)/shop/cancelled/+page.svelte` |
| `/shop/customers` | Customer list | `src/routes/(shop)/shop/customers/+page.svelte` |
| `/shop/customers/[id]` | Customer detail + nested vehicles | `src/routes/(shop)/shop/customers/[id]/+page.svelte` |

---

## Services (all factory-function pattern)

Shop services uniformly follow **Pattern B — Factory function** (see [`working_with_services.md`](../SOP/working_with_services.md)). Each is instantiated per-request with the route's `locals.supabase`, rather than as a shared singleton.

```ts
// Canonical usage in a +page.server.ts:
import { createShopJobService } from '$lib/services/shop-job.service';

export const load: PageServerLoad = async ({ locals, params }) => {
  const jobService = createShopJobService(locals.supabase);
  const job = await jobService.getById(params.id);
  return { job };
};
```

| Service | File | Notable behavior |
|---------|------|------------------|
| `createShopCustomerService` | [`src/lib/services/shop-customer.service.ts`](../../src/lib/services/shop-customer.service.ts) | CRUD + **nested vehicle CRUD** (add/list/remove vehicles per customer) |
| `createShopJobService` | [`src/lib/services/shop-job.service.ts`](../../src/lib/services/shop-job.service.ts) | **State machine** — `VALID_TRANSITIONS`, `status_history` audit trail, auto-dates (`date_booked`, `date_in`, `date_completed`, `qc_passed_at`). Also: milestone tracking via `setMilestone`/`clearMilestone`. |
| `createShopEstimateService` | [`src/lib/services/shop-estimate.service.ts`](../../src/lib/services/shop-estimate.service.ts) | Shop-side estimate CRUD + line items |
| `createShopInvoiceService` | [`src/lib/services/shop-invoice.service.ts`](../../src/lib/services/shop-invoice.service.ts) | Invoice generation + operations |
| `createShopJobPhotosService` | [`src/lib/services/shop-job-photos.service.ts`](../../src/lib/services/shop-job-photos.service.ts) | Job photos — **different schema** from assessment photos (see below) |
| `createShopAdditionalsService` | [`src/lib/services/shop-additionals.service.ts`](../../src/lib/services/shop-additionals.service.ts) | Shop-side "additionals" line items |

---

## Architectural differences from `(app)`

### 1. Factory function vs class+singleton

Shop services export only a factory function — no class, no singleton. Each request's load function instantiates its own service.

Contrast with the `(app)` entity services (`clientService`, `engineerService`, etc.), which export a singleton that methods accept `locals.supabase` on a per-call basis.

### 2. Different photo schema

Shop photos (`shop_job_photos` table) use columns `sort_order` and `category`, and a storage path keyed by job ID:

```
shop-jobs/{jobId}/{category}/{filename}
```

vs. assessment photos (`estimate_photos`, `assessment_interior_photos`, etc.) which use `display_order` + `label`, and storage paths keyed by assessment ID via `storageService.uploadAssessmentPhoto()`.

**Implication**: `shop-job-photos.service.ts` is intentionally NOT wired into the [`photo-service-factory.ts`](../../src/lib/services/photo-service-factory.ts) consolidation (which backs the 6 vanilla assessment photo services). They're different subsystems.

### 3. State machine in `shop-job.service.ts`

Job status transitions are enforced at service-layer. The service rejects illegal transitions and automatically sets lifecycle timestamps:

```ts
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  new: ['booked', 'cancelled'],
  booked: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['qc_passed', 'cancelled'],
  qc_passed: ['invoiced', 'cancelled'],
  // ...
};

async function updateJobStatus(id, newStatus) {
  const current = await this.getById(id);
  if (!VALID_TRANSITIONS[current.status].includes(newStatus)) {
    throw new Error(`Invalid transition from ${current.status} to ${newStatus}`);
  }
  // auto-set date_booked / date_in / date_completed depending on newStatus
  // append to status_history
  // update + return
}
```

This makes `shop-job.service.ts` a **workflow service, not a CRUD service**. Don't try to consolidate it into the `entity-service-factory`.

### 4. Request-scoped construction

Because shop services are factory functions, every request instantiates fresh. No hidden shared state. This is a deliberate architectural choice for the shop module — assessment-centric services are singletons because they have shared cross-request state (caching, in-memory derived data).

---

## Database tables

| Table | Purpose |
|-------|---------|
| `shop_customers` | Customer records (name, contact, VAT) |
| `shop_customer_vehicles` | Vehicles belonging to a customer |
| `shop_jobs` | Job records — status, milestones, status_history, lifecycle dates |
| `shop_estimates` | Shop-side estimates (separate from assessment estimates) |
| `shop_invoices` | Invoice header records |
| `shop_invoice_items` | Invoice line items (if separate table; verify via Supabase) |
| `shop_job_photos` | Job photos keyed by `job_id` |
| `shop_job_notes` | Timeline notes per job (verify existence) |
| `shop_additionals` | Shop-side additionals |

See [`database_schema.md`](database_schema.md) for column-level detail.

---

## Shop-specific components

Components purpose-built for shop UI live in [`src/lib/components/shop/`](../../src/lib/components/shop/):

- `ShopPhotosPanel.svelte` — photo panel adapted to shop's `storage_path` + `category` schema. **Intentionally separate** from the 6 assessment `*PhotosPanel` components that share the `usePhotoUpload` composable.
- `ShopJobCard.svelte` — job summary card for list pages.
- `ShopJobNotes.svelte` — per-job notes timeline.
- `ItemTable.svelte` — line-item table used by estimates/invoices.

---

## What NOT to do

1. **Don't import `(app)` services into shop routes or vice versa.** Workflows are independently evolving and schema differences will cause subtle bugs.
2. **Don't instantiate shop services with `new`.** They're factory functions: `createShopJobService(supabase)`, not `new ShopJobService()`.
3. **Don't consolidate `shop-job-photos.service.ts` into `photo-service-factory.ts`.** Different schema, different storage API, different FK column. The separation is intentional.
4. **Don't wrap `shop-job.service.ts`'s state machine in a generic CRUD abstraction.** The status transition enforcement is core business logic, not boilerplate.
5. **Don't assume shop helpers translate to assessment routes.** `formatCurrency` etc. are shared, but storage paths, photo panels, and service instantiation patterns are not.

---

## Related documentation

- [Working with Services](../SOP/working_with_services.md) — the five service patterns explained (shop uses Pattern B).
- [Adding Page Route](../SOP/adding_page_route.md) — how to add new `(app)` or `(shop)` routes.
- [Refactor Consolidation Summary](../Tasks/completed/REFACTOR_CONSOLIDATION_SUMMARY.md) — the 2026-04 refactor that explicitly scoped OUT the shop module.
- [Database Schema](database_schema.md) — table definitions.
