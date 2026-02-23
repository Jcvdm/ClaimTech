# Auto Body Shop SaaS Extension — Architecture Plan

**Created**: 2026-02-23
**Status**: Planning (Awaiting Feedback)
**Complexity**: Complex (Multi-phase, architecture change)
**Branch**: `claude/auto-body-app-setup-3ub1u`

---

## Table of Contents

1. [Overview & Business Logic](#overview)
2. [Key Decisions](#key-decisions)
3. [Phase 1: Multi-Tenancy Foundation](#phase-1)
4. [Phase 2: Feature Gating & Navigation](#phase-2)
5. [Phase 3: Auto Body Work Orders](#phase-3)
6. [Phase 4: Shared Estimate Engine](#phase-4)
7. [Phase 5: Registration & Onboarding](#phase-5)
8. [Files Summary](#files-summary)
9. [Risks & Considerations](#risks)
10. [Open Questions / Feedback](#feedback)

---

## <a name="overview"></a>1. Overview & Business Logic

ClaimTech is currently a **single-company loss adjusting platform** (no multi-tenancy). The goal is to expand the platform into a **multi-tenant SaaS** that also serves **auto body shops** (and potentially mechanical shops).

**Core insight**: Auto body shops need essentially the same core systems we already have:
- Vehicle identification & data
- Photo management (intake photos, damage photos, completion photos)
- Estimate/quoting engine (same line items, process types, part types)
- PDF generation (quotes, invoices, reports)
- Document storage

**What's different**: Auto body shops have a **work order/job workflow** instead of the assessment pipeline. They track repairs from intake to collection, not inspections and loss adjusting.

**Business value**: We can offer the same proven technology as a SaaS product to a much larger market (every auto body shop and mechanical shop) while the loss adjusting side remains the core product.

---

## <a name="key-decisions"></a>2. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Same database (single Supabase project) | Shared estimate engine, photo system, future integration between loss adjusters and body shops |
| **App deployment** | Same app, different views | Same URL, same login. Users see different modules based on organization type. Simplifies maintenance. |
| **Tenancy model** | Multi-tenant SaaS | Many shops sign up, each gets isolated data via `organization_id` + RLS |
| **Integration** | Architect for future, don't build now | Loss adjusters may eventually send assessments to auto body shops for repair |
| **Work order vs assessment** | Separate `work_orders` table | Different workflow stages and lifecycle; trying to shoehorn into assessments would overcomplicate both |
| **Estimates** | Same JSONB line-item structure | Identical quoting needs; same UI components can render both |

---

## <a name="phase-1"></a>3. Phase 1: Multi-Tenancy Foundation

> **Goal**: Add organizational backbone. No auto body features yet — just making the existing app multi-tenant-ready.

### 3.1 New Table: `organizations`

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-friendly identifier (e.g., "jvd-adjusters")
  type TEXT NOT NULL CHECK (type IN ('loss_adjuster', 'auto_body_shop', 'mechanical_shop')),

  -- Company details (replaces singleton company_settings per org)
  logo_url TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'South Africa',
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Terms & Conditions (per org, used in PDFs)
  assessment_terms_and_conditions TEXT,
  estimate_terms_and_conditions TEXT,
  frc_terms_and_conditions TEXT,

  -- Subscription (future billing)
  subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  subscription_plan TEXT DEFAULT 'standard',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 New Table: `organization_members`

Links users to organizations. Supports future multi-org membership.

```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN (
    'owner',        -- Full access + billing
    'admin',        -- Full access
    'manager',      -- Can manage jobs/assessments, not settings
    'engineer',     -- Loss adjuster: assessor. Auto body: estimator.
    'technician',   -- Auto body: repair tech
    'viewer'        -- Read-only
  )),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
```

### 3.3 Add `organization_id` to Existing Core Tables

**Tables that get `organization_id` directly:**
| Table | Why |
|-------|-----|
| `requests` | Top-level entity, needs direct org filtering |
| `assessments` | Core entity, needs direct org filtering for performance |
| `engineers` | Staff belong to an org |
| `clients` | Insurance clients (loss adjusters) / Customers (auto body) |
| `repairers` | Repairers belong to an org |
| `audit_logs` | Audit trail per org |
| `user_profiles` | Add `default_organization_id` (their primary org) |

**Tables that DO NOT need `organization_id`** (they inherit isolation through parent FK):
- All `assessment_*` sub-tables (vehicle_identification, 360_exterior, tyres, damage, estimates, etc.)
- All photo sub-tables
- All FRC sub-tables

**Migration strategy (zero-downtime):**
1. Create default organization from existing `company_settings` data
2. Add columns as **NULLABLE** first
3. Backfill all existing rows with the default org ID
4. Add NOT NULL constraint
5. Add indexes

### 3.4 RLS Policy Updates

New helper functions:
```sql
-- Get current user's active organization (from JWT claims)
CREATE OR REPLACE FUNCTION get_active_organization_id()
RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'active_organization_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Get all orgs a user belongs to
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS UUID[] AS $$
  SELECT array_agg(organization_id)
  FROM organization_members
  WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

All existing RLS policies get updated with:
```sql
AND organization_id = get_active_organization_id()
```

### 3.5 JWT Custom Claims

Update the `custom_access_token_hook` to include `active_organization_id` in JWT claims. This propagates organization context through every Supabase request automatically.

### 3.6 Application-Level Organization Context

| File | Change |
|------|--------|
| `src/hooks.server.ts` | Load active org from session/cookie, set in `locals.organization` |
| `src/routes/+layout.server.ts` | Pass org to client via page data |
| `src/routes/+layout.svelte` | Provide org context to all child components |
| NEW: `src/lib/stores/organization.ts` | Organization state/store |

---

## <a name="phase-2"></a>4. Phase 2: Feature Gating & Navigation

> **Goal**: Same app shows different modules based on org type.

### 4.1 Feature Flags by Org Type

```typescript
// src/lib/config/features.ts
export const FEATURES_BY_ORG_TYPE = {
  loss_adjuster: {
    assessments: true,
    inspections: true,
    appointments: true,
    estimates: true,
    frc: true,
    work_orders: false,
    invoicing: false,
  },
  auto_body_shop: {
    assessments: false,
    inspections: false,
    appointments: false,
    estimates: true,     // SHARED - same engine
    frc: false,
    work_orders: true,
    invoicing: true,
  },
  mechanical_shop: {
    assessments: false,
    inspections: false,
    appointments: false,
    estimates: true,
    frc: false,
    work_orders: true,
    invoicing: true,
  }
};
```

### 4.2 Navigation Changes

- Sidebar items filtered by `FEATURES_BY_ORG_TYPE[org.type]`
- **Loss adjusters see**: Dashboard, Requests, Assessments, Clients, Engineers, Reports, Settings
- **Auto body shops see**: Dashboard, Work Orders, Customers, Technicians, Estimates, Reports, Settings

### 4.3 Route Guards

Server-side route protection: if an auto body shop user tries to access `/assessments`, redirect to their dashboard.

---

## <a name="phase-3"></a>5. Phase 3: Auto Body Core — Work Orders

> **Goal**: The auto body equivalent of the assessment pipeline.

### 5.1 New Table: `work_orders`

```sql
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  work_order_number TEXT NOT NULL,  -- WO-2026-001 (auto-generated per org)

  -- Customer
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_id_number TEXT,

  -- Vehicle (same fields as assessment vehicle identification)
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_vin TEXT,
  vehicle_registration TEXT,
  vehicle_mileage INTEGER,

  -- Job
  job_type TEXT CHECK (job_type IN (
    'insurance_claim',    -- Insurance-funded repair
    'private_repair',     -- Customer pays directly
    'maintenance',        -- Routine service
    'custom_work'         -- Custom modifications
  )),
  description TEXT,

  -- Insurance (if applicable)
  insurance_company TEXT,
  insurance_claim_number TEXT,
  insurance_authorization_number TEXT,

  -- Workflow (12 stages)
  stage TEXT NOT NULL DEFAULT 'intake' CHECK (stage IN (
    'intake',               -- 1. Vehicle received at shop
    'inspection',           -- 2. Inspecting damage/needs
    'quoting',              -- 3. Creating estimate
    'quote_sent',           -- 4. Sent to customer/insurer for approval
    'quote_approved',       -- 5. Approved, ready to proceed
    'parts_ordered',        -- 6. Waiting for parts delivery
    'in_repair',            -- 7. Active repair work
    'paint',                -- 8. In paint booth
    'assembly',             -- 9. Reassembly
    'quality_check',        -- 10. Final QC inspection
    'ready_for_collection', -- 11. Done, waiting for pickup
    'collected',            -- 12. Vehicle collected (complete)
    'cancelled'
  )),
  stage_history JSONB DEFAULT '[]',

  -- Assignment
  assigned_technician_id UUID REFERENCES engineers(id),

  -- Dates
  intake_date TIMESTAMPTZ DEFAULT now(),
  estimated_completion_date TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, work_order_number)
);
```

### 5.2 New Table: `work_order_estimates`

Same JSONB line-item structure as `assessment_estimates`:

```sql
CREATE TABLE work_order_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  line_items JSONB DEFAULT '[]',  -- Same structure as assessment_estimates

  labour_rate NUMERIC(10,2),
  paint_rate NUMERIC(10,2),
  oem_markup_percentage NUMERIC(5,2) DEFAULT 0,
  alt_markup_percentage NUMERIC(5,2) DEFAULT 0,

  subtotal NUMERIC(12,2) DEFAULT 0,
  vat_percentage NUMERIC(5,2) DEFAULT 15,
  vat_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'revised')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(work_order_id)
);
```

### 5.3 New Table: `work_order_photos`

```sql
CREATE TABLE work_order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN (
    'intake',       -- Before photos
    'damage',       -- Specific damage documentation
    'progress',     -- During repair
    'completion',   -- After repair
    'parts'         -- Parts received/used
  )),
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  label TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.4 New Services

| Service | Purpose |
|---------|---------|
| `work-order.service.ts` | CRUD + stage transitions for work orders |
| `work-order-estimate.service.ts` | Estimate CRUD (reuses estimate patterns) |
| `work-order-photos.service.ts` | Photo management (reuses photo patterns) |
| `organization.service.ts` | Org CRUD, member management |

### 5.5 New Routes

```
src/routes/(app)/work-orders/
  +page.svelte              -- Work order list with filters & kanban
  +page.server.ts
  [id]/
    +page.svelte            -- Work order detail (tabbed: Info, Estimate, Photos, History)
    +page.server.ts
    +layout.svelte
  new/
    +page.svelte            -- Create new work order (intake form)
    +page.server.ts
```

---

## <a name="phase-4"></a>6. Phase 4: Shared Estimate Engine

> **Goal**: Extract the estimate line-item editor into a shared component usable by both assessments and work orders.

### What's shared:
- **Line item structure** (JSONB: description, process type, part type, quantity, rate, amount)
- **Process types**: N (New), R (Repair), P (Paint), B (Blend), A (Adjust), O (Other)
- **Part types**: OEM, ALT (Alternative), 2ND (Second-hand)
- **Calculations**: Subtotals, markups, VAT, betterment
- **PDF rendering**: Estimate/quote PDF template

### What needs extraction:
- `EstimateLineItems.svelte` → shared component accepting generic estimate data
- `estimate-calculator.ts` → shared utility for calculations
- PDF template parameterized by org type and estimate source

---

## <a name="phase-5"></a>7. Phase 5: Registration & Onboarding

> **Goal**: Allow new auto body shops (and loss adjusters) to self-register.

### 7.1 Registration Flow

New route: `src/routes/(auth)/register/+page.svelte`
1. Select organization type
2. Enter company details (name, address, contact info)
3. Create account (email + password)
4. System creates organization + first user (owner role)
5. Redirect to onboarding wizard

### 7.2 User Invitation

Org owners/admins can invite team members:
- Send invite via email
- Invited user creates account
- Automatically linked to the inviting organization

---

## <a name="files-summary"></a>8. Files Summary

### Existing Files to Modify
| File | Change |
|------|--------|
| `src/hooks.server.ts` | Load active organization from session |
| `src/routes/+layout.server.ts` | Pass org context to client |
| `src/routes/+layout.svelte` | Org provider, feature gating |
| Sidebar component | Feature-gated navigation |
| All 33 service files | Add org_id to queries |
| All RLS policies | Add org_id filtering |
| `custom_access_token_hook` | Include org_id in JWT |
| `company_settings` consumers | Migrate to org settings |

### New Files to Create
| File | Purpose |
|------|---------|
| `src/lib/stores/organization.ts` | Organization state management |
| `src/lib/config/features.ts` | Feature flags by org type |
| `src/lib/services/organization.service.ts` | Org CRUD |
| `src/lib/services/work-order.service.ts` | Work order CRUD + stage transitions |
| `src/lib/services/work-order-estimate.service.ts` | WO estimates |
| `src/lib/services/work-order-photos.service.ts` | WO photos |
| `src/routes/(app)/work-orders/**` | Work order UI pages |
| `src/routes/(auth)/register/**` | Org registration |
| Migration files (5+) | Schema changes |

---

## <a name="risks"></a>9. Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Breaking existing loss adjuster functionality | Backfill all existing data to default org FIRST, test thoroughly |
| Performance: org_id added to every query | Proper indexes on organization_id; RLS via JWT claim (no extra query) |
| Migration complexity | Phased approach: nullable → backfill → not null |
| Service layer changes (33 services) | Systematic update, one at a time |
| Existing users need org assignment | Automated: create default org, assign all existing users |

---

## <a name="feedback"></a>10. Open Questions / Your Feedback

> **Add your notes, changes, and decisions below. I'll update the plan accordingly.**

### Questions for you:

1. **Organization slug**: Should the URL show org context? e.g., `/app/jvd-adjusters/assessments` vs just `/assessments` (org inferred from session)?

2. **Work order number format**: I suggested `WO-2026-001`. Do you want a different format? Should it match the assessment numbering style (e.g., `WO-CLM-2026-001`)?

3. **Engineer vs Technician**: Should we rename the `engineers` table to something generic like `staff` or keep it and just add a `staff_type` field?

4. **Company settings migration**: The current `company_settings` is a singleton. Should we keep it as a fallback/global config, or fully replace with org settings?

5. **Which phase to start with?**: I recommend starting with Phase 1 (multi-tenancy foundation) in this session. Agree?

---

### Your Notes:

<!-- Add your feedback, changes, or decisions here -->


