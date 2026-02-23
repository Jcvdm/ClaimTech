# Auto Body Shop SaaS Extension — Architecture Plan

**Created**: 2026-02-23
**Updated**: 2026-02-23
**Status**: Planning (User reviewing, will edit with suggestions)
**Complexity**: Complex (Multi-phase, architecture change)
**Branch**: `claude/auto-body-app-setup-3ub1u`

---

## Table of Contents

1. [Overview & Business Logic](#overview)
2. [Real-World Auto Body Workflow](#workflow)
3. [Key Decisions](#decisions)
4. [What We Reuse vs What's New](#reuse)
5. [Phase 1: Multi-Tenancy Foundation](#phase-1)
6. [Phase 2: Feature Gating & Assessment Tabs](#phase-2)
7. [Phase 3: Jobs (New Entity)](#phase-3)
8. [Phase 4: Registration & Onboarding (Future)](#phase-4)
9. [Implementation Order for This Session](#implementation)
10. [Open Questions / Your Feedback](#feedback)

---

## <a name="overview"></a>1. Overview & Business Logic

ClaimTech currently does loss adjusting. The platform can be expanded to serve **auto body shops** (and mechanical shops) as a SaaS product because the core systems are the same: vehicle data, photos, estimates/quoting, PDF generation, document storage.

**Core business reality**: Auto body shops do ~1000 quotes but only ~50 become actual jobs. The quoting phase MUST be lightweight. Our existing Request → Assessment flow already captures exactly what's needed for quoting (photos + estimate). We only need a new "Job" entity for when a quote is accepted.

---

## <a name="workflow"></a>2. Real-World Auto Body Workflow

```
PATH A: Normal flow (customer walks in for a quote)
═══════════════════════════════════════════════════
Customer arrives → "I need a quote"
    │
    ▼
REQUEST created (lightweight, same as current)
    │
    ▼
ASSESSMENT opens (= THE QUOTE)
    ├── Vehicle Identification (reg, VIN, make/model)
    ├── Photos (damage + intake photos)
    ├── Damage description
    └── Estimate (line items: parts, labour, paint)
    │
    ▼
Quote sent to customer or insurer
    │
    ├── NOT ACCEPTED → Stays as quote only (no job created)
    │                   This is ~95% of quotes
    │
    └── ACCEPTED / AUTHORIZATION RECEIVED
        │
        ▼
      JOB created (linked to assessment)
        │
        ▼
      booked_in → parts_ordered → in_repair → paint →
      assembly → quality_check → ready_for_collection → collected

      ⚡ ADDITIONALS can be raised at ANY stage during repair
         (extra damage found, extra parts needed, etc.)
         Additionals have their own approval workflow


PATH B: Direct authorization (insurer sends auth first)
═══════════════════════════════════════════════════════
Insurer sends authorization (no prior quote exists)
    │
    ▼
JOB created directly (skip Request/Assessment)
    │ Vehicle details entered during job intake
    │ Assessment/quote can still be done later
    ▼
booked_in → parts_ordered → in_repair → ... → collected
```

### Key Points
- **Request = Quote request** (same as current request, just different context)
- **Assessment = The Quote** (photos + estimate. Same data, same system)
- **Job = Actual repair tracking** (NEW entity, only created when quote accepted)
- **Additionals = Extra charges** during repair, can happen at ANY stage (not sequential)
- **~95% of quotes never become jobs** — the system must handle this gracefully

---

## <a name="decisions"></a>3. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Same database (single Supabase project) | Shared systems, future integration |
| **App** | Same app, different views | Same URL/login, features gated by org type |
| **Tenancy** | Multi-tenant SaaS | `organization_id` + RLS isolates data per shop |
| **Quoting** | Reuse Request → Assessment | Don't reinvent what works. Assessment = quote. |
| **Jobs** | New `jobs` table | Only created when quote accepted. Light entity. |
| **Additionals** | Separate `job_additionals` table | Can be raised at any stage, own approval workflow |
| **Integration** | Architect for future, don't build now | Loss adjuster → auto body shop handoff later |

---

## <a name="reuse"></a>4. What We Reuse vs What's New

### REUSE AS-IS (quoting phase)
| System | How Used for Auto Body |
|--------|----------------------|
| Request creation | Request = "quote request" |
| Assessment flow | Assessment = "the quote" |
| Vehicle identification | Same fields needed |
| Photo system | Intake/damage photos |
| Damage documentation | What needs repair |
| Estimate engine | THE QUOTE itself (same line items) |
| PDF generation | Quote PDF |
| Audit logging | Same |
| Storage | Same |

### REUSE WITH MODIFICATION
| System | Change |
|--------|--------|
| Assessment tabs | Show subset for auto body: Vehicle ID, Photos, Damage, Estimate. Hide: Interior, Tyres, Values, Pre-Incident, FRC, Additionals |
| Sidebar navigation | Different nav items per org type |

### ENTIRELY NEW
| System | Purpose |
|--------|---------|
| `organizations` + `organization_members` | Multi-tenancy backbone |
| `jobs` table | Repair tracking (post-quote acceptance) |
| `job_additionals` table | Extra work discovered during repair |
| `job_photos` table | Progress/completion photos |
| Job UI routes | Job list, detail, stage transitions |
| Feature flags config | Show/hide features by org type |
| Organization context | Svelte store + server hooks |

---

## <a name="phase-1"></a>5. Phase 1: Multi-Tenancy Foundation

> Migration files + application code. Migrations applied separately via Supabase dashboard.

### 5.1 `organizations` table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('loss_adjuster', 'auto_body_shop', 'mechanical_shop')),

  -- Company details
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
  vat_number TEXT,

  -- Terms & Conditions
  assessment_terms_and_conditions TEXT,
  estimate_terms_and_conditions TEXT,
  frc_terms_and_conditions TEXT,

  -- Default rates
  default_labour_rate NUMERIC(10,2),
  default_paint_rate NUMERIC(10,2),
  default_oem_markup NUMERIC(5,2) DEFAULT 25,
  default_alt_markup NUMERIC(5,2) DEFAULT 25,

  -- Subscription
  subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 `organization_members` table

```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN (
    'owner', 'admin', 'manager', 'engineer', 'technician', 'viewer'
  )),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
```

### 5.3 Add `organization_id` to core tables

**Tables**: requests, assessments, engineers, clients, repairers, audit_logs
**user_profiles**: add `default_organization_id`
**Strategy**: Nullable → backfill existing data → NOT NULL → indexes

### 5.4 Application code

**New files:**
- `src/lib/types/organization.ts` — TypeScript types
- `src/lib/stores/organization.ts` — Svelte store
- `src/lib/config/features.ts` — Feature flags by org type
- `src/lib/services/organization.service.ts` — Org CRUD

**Modified files:**
- `src/hooks.server.ts` — Load active org into `locals`
- `src/routes/+layout.server.ts` — Pass org to client
- `src/routes/+layout.svelte` — Org context provider

---

## <a name="phase-2"></a>6. Phase 2: Feature Gating & Assessment Tabs

### Assessment Tabs by Org Type

| Tab | Loss Adjuster | Auto Body |
|-----|:---:|:---:|
| Summary | Y | Y |
| Vehicle ID | Y | Y |
| Photos | Y | Y (simplified) |
| Interior & Mechanical | Y | N |
| Tyres | Y | N |
| Damage | Y | Y |
| Vehicle Values | Y | N |
| Pre-Incident Estimate | Y | N |
| Estimate (= Quote) | Y | Y |
| Finalize (= Send Quote) | Y | Y |
| Additionals | Y | N |
| FRC | Y | N |

### Navigation by Org Type

**Loss Adjuster**: Dashboard, Requests, Appointments, Assessments, Finalized, FRC, Archive, Settings
**Auto Body Shop**: Dashboard, Quotes (=requests), Jobs, Archive, Settings

---

## <a name="phase-3"></a>7. Phase 3: Jobs (New Entity)

### 7.1 `jobs` table

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  job_number TEXT NOT NULL,  -- JOB-2026-001

  -- Link to quote (OPTIONAL - Path B skips this)
  assessment_id UUID REFERENCES assessments(id),
  request_id UUID REFERENCES requests(id),

  -- Customer
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_id_number TEXT,

  -- Vehicle
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_vin TEXT,
  vehicle_registration TEXT,
  vehicle_mileage INTEGER,

  -- Job details
  job_type TEXT NOT NULL CHECK (job_type IN (
    'insurance', 'private', 'maintenance', 'custom_work'
  )),
  description TEXT,

  -- Insurance
  insurance_company TEXT,
  insurance_claim_number TEXT,
  authorization_number TEXT,

  -- Workflow stages
  stage TEXT NOT NULL DEFAULT 'booked_in' CHECK (stage IN (
    'booked_in',            -- 1. Vehicle arrived, booked in
    'parts_ordered',        -- 2. Waiting for parts
    'in_repair',            -- 3. Active repair
    'paint',                -- 4. Paint booth
    'assembly',             -- 5. Reassembly
    'quality_check',        -- 6. Final QC
    'ready_for_collection', -- 7. Waiting for pickup
    'collected',            -- 8. Complete
    'cancelled'
  )),
  stage_history JSONB DEFAULT '[]',
  -- NOTE: Additionals can be raised at ANY stage (see job_additionals)

  -- Assignment
  assigned_technician_id UUID REFERENCES engineers(id),

  -- Dates
  job_start_date TIMESTAMPTZ DEFAULT now(),
  estimated_completion_date TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,

  -- Financials
  accepted_estimate_total NUMERIC(12,2),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, job_number)
);
```

### 7.2 `job_additionals` table

Additionals = extra work found DURING repair. Can be raised at **any stage**. Own approval workflow.

```sql
CREATE TABLE job_additionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  raised_at_stage TEXT NOT NULL,  -- What stage was job in when additional found?
  description TEXT NOT NULL,
  line_items JSONB DEFAULT '[]',  -- Same structure as estimates

  subtotal NUMERIC(12,2) DEFAULT 0,
  vat_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,

  -- Approval workflow
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Submitted, waiting
    'sent',       -- Sent to customer/insurer
    'approved',   -- Go ahead with extra work
    'rejected',   -- Don't do it
    'completed'   -- Extra work done
  )),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
```

### 7.3 `job_photos` table

```sql
CREATE TABLE job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN (
    'progress', 'completion', 'parts', 'additional_damage'
  )),
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  label TEXT,
  display_order INTEGER DEFAULT 0,
  job_additional_id UUID REFERENCES job_additionals(id),  -- Optional link to specific additional
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.4 New Services

| Service | Purpose |
|---------|---------|
| `job.service.ts` | CRUD, stage transitions, create from assessment |
| `job-additionals.service.ts` | Additionals CRUD + approval workflow |
| `job-photo.service.ts` | Photo management |

### 7.5 New Routes

```
src/routes/(app)/jobs/
  +page.svelte              -- Job list (kanban or table by stage)
  +page.server.ts
  [id]/
    +page.svelte            -- Job detail (Info, Photos, Additionals, History)
    +page.server.ts
  new/
    +page.svelte            -- Create job directly (Path B)
    +page.server.ts
```

### 7.6 "Accept Quote → Create Job" Action

On assessment Finalize tab: "Accept Quote / Create Job" button
- Prompts for authorization number (if insurance)
- Calls `jobService.createJobFromAssessment(assessmentId)`
- Copies vehicle + customer data into the new job
- Redirects to job detail page

---

## <a name="phase-4"></a>8. Phase 4: Registration & Onboarding (Future)

- Organization registration flow
- User invitation system
- Onboarding wizard

---

## <a name="implementation"></a>9. Implementation Order for This Session

Since we can't apply migrations yet, we focus on **application code + migration files**:

1. **Types**: `organization.ts`, `job.ts`
2. **Config**: `features.ts` (feature flags)
3. **Services**: `organization.service.ts`, `job.service.ts`, `job-additionals.service.ts`, `job-photo.service.ts`
4. **Stores**: `organization.ts` (Svelte store)
5. **Migration SQL files**: organizations, organization_members, org_id on tables, jobs, job_additionals, job_photos, RLS
6. **Route scaffolding**: Job routes

---

## <a name="feedback"></a>10. Your Feedback

> **Edit below with your notes, changes, decisions.**

### Your Notes:

<!-- Add your feedback here -->


