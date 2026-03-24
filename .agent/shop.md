# ClaimTech Shop Expansion - SaaS Planning

**Created**: 2026-01-17
**Updated**: 2026-01-17
**Status**: Planning
**Branch**: Mechanical & Autobody Shop Market

---

## Executive Summary

Expand ClaimTech to serve mechanical workshops and autobody repair shops as a SaaS product. The key insight: **the existing system already does 90% of what shops need**. We're not building a separate product - we're adding toggles for job type (autobody/mechanical) and client type (private/insurance).

**Core Principle**: Same app, same components, different configuration.

---

## The Unified Approach

### Job Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CREATE NEW JOB                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Job Type:     ○ Autobody           ○ Mechanical               │
│                                                                 │
│   Client Type:  ○ Private            ○ Insurance                │
│                 (customer pays)      (claim)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The 4 Job Combinations

|                | Private (Customer Pays) | Insurance (Claim) |
|----------------|-------------------------|-------------------|
| **Autobody**   | Customer pays for bodywork | Collision claim (existing flow) |
| **Mechanical** | Customer pays for repairs | Mechanical cover claim |

All 4 combinations use the **same estimate flow, same components, same PDF output**.

---

## Market Analysis

### Target Segments

| Segment | Size | Pain Points | Opportunity |
|---------|------|-------------|-------------|
| **Independent Mechanics** | Small (1-5 techs) | Paper-based, no estimates | Entry-level tier |
| **Autobody Shops** | Medium (5-20) | Photo documentation, insurance claims | Mid tier |
| **Multi-Location Shops** | Large | Consistency, reporting, oversight | Enterprise tier |

### Why This Market?

1. **Underserved** - Many shops use outdated software or paper
2. **Identical Workflows** - Inspect → Document → Estimate → Report (we already do this)
3. **90%+ Reuse** - Quote component, photos, PDFs work as-is
4. **Different Buyer** - No cannibalization of insurance business
5. **Recurring Need** - Shops process vehicles daily = sticky product

### Competitive Landscape

| Competitor | Strength | Weakness | Our Advantage |
|------------|----------|----------|---------------|
| Shop-Ware | Established | Expensive, complex | Modern UX, mobile-first |
| Mitchell | Industry standard | Legacy, expensive | Agile, affordable |
| Tekmetric | Modern | Mechanics only | Broader (autobody too) |
| Paper/Excel | Free | No efficiency | Obvious value |

---

## Product Adaptation

### Component Reuse (90%+)

| Component | Autobody | Mechanical | Change Needed |
|-----------|----------|------------|---------------|
| **Quote/Estimate component** | ✅ Exact reuse | ✅ Exact reuse | None |
| **Parts table** | ✅ Exact reuse | ✅ Exact reuse | None |
| **Labor table** | ✅ Exact reuse | ✅ Exact reuse | None |
| **Photo flow** | ✅ Exact reuse | ✅ Exact reuse | None |
| **PDF output** | ✅ Exact reuse | ✅ Exact reuse | Minor header variation |
| **User management** | ✅ Exact reuse | ✅ Exact reuse | None |
| **Mobile experience** | ✅ Exact reuse | ✅ Exact reuse | None |

### What's Actually Different

#### Autobody vs Mechanical Fields

| Field | Autobody | Mechanical |
|-------|----------|------------|
| Damage areas | ✅ Yes | ❌ No |
| Complaint (customer issue) | ❌ No | ✅ Yes |
| Diagnosis (tech findings) | ❌ No | ✅ Yes |
| Fault codes | ❌ No | ✅ Optional |
| Photo documentation | Heavy | Light |

#### Private vs Insurance Fields

| Field | Private | Insurance |
|-------|---------|-----------|
| Customer name/phone | ✅ Required | ✅ Required |
| Claim number | ❌ No | ✅ Required |
| Insurance company | ❌ No | ✅ Required |
| Policy number | ❌ No | ✅ Optional |

### What We Need to Build (The 10%)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **Job type toggle** | High | Low | Autobody vs Mechanical at job creation |
| **Client type toggle** | High | Low | Private vs Insurance at job creation |
| **Customer management** | High | Medium | Customer database for private jobs |
| **Complaint/diagnosis fields** | High | Low | Mechanical-specific fields |
| **Labor rate configuration** | Medium | Low | Different rate names per job type |
| **Subscription billing** | High | Medium | Stripe/Yoco for shop tenants |
| **Accounting integration** | Low | High | Xero/QuickBooks sync (future) |

---

## Technical Architecture

### Unified Flow (Not Separate Modules)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLAIMTECH PLATFORM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  JOB CREATION                           │   │
│   │   job_type: autobody | mechanical                       │   │
│   │   client_type: private | insurance                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              SHARED COMPONENTS (90%+)                   │   │
│   │   • Photo management                                    │   │
│   │   • Estimate/quote tables (parts + labor)              │   │
│   │   • PDF generation                                      │   │
│   │   • User management                                     │   │
│   │   • Storage                                             │   │
│   └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│              ┌─────────────┴─────────────┐                     │
│              ▼                           ▼                      │
│   ┌──────────────────┐       ┌──────────────────┐              │
│   │  AUTOBODY        │       │  MECHANICAL      │              │
│   │  • Damage areas  │       │  • Complaint     │              │
│   │  • Heavy photos  │       │  • Diagnosis     │              │
│   │                  │       │  • Fault codes   │              │
│   └──────────────────┘       └──────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Changes (Minimal)

```sql
-- Add to existing assessments table
ALTER TABLE assessments ADD COLUMN job_type TEXT
  CHECK (job_type IN ('autobody', 'mechanical'));

ALTER TABLE assessments ADD COLUMN client_type TEXT
  CHECK (client_type IN ('private', 'insurance'));

ALTER TABLE assessments ADD COLUMN customer_id UUID
  REFERENCES customers(id);

-- Mechanical-specific fields
ALTER TABLE assessments ADD COLUMN complaint TEXT;    -- Customer's reported issue
ALTER TABLE assessments ADD COLUMN diagnosis TEXT;    -- Technician's findings
ALTER TABLE assessments ADD COLUMN fault_codes JSONB; -- OBD codes (optional)

-- New table for private job customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer's vehicles (service history via assessments)
CREATE TABLE customer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: Configurable labor rates per organization
CREATE TABLE labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  job_type TEXT NOT NULL,        -- 'autobody' or 'mechanical'
  rate_name TEXT NOT NULL,       -- 'Panel work', 'Diagnostic', etc.
  hourly_rate DECIMAL NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Multi-Tenant Approach

| Option | Recommendation |
|--------|----------------|
| **Single DB, tenant column** | ✅ Use this - simple, efficient |
| Organizations get `tenant_type` | `insurance` or `shop` |
| Feature flags based on tenant | Show/hide relevant features |

---

## SaaS Pricing Strategy

### Pricing Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRICING TIERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STARTER          │  PROFESSIONAL      │  ENTERPRISE           │
│  R299/mo          │  R599/mo           │  R999/mo              │
│  (R2,990/yr)      │  (R5,990/yr)       │  (R9,990/yr)          │
│  Save 17%         │  Save 17%          │  Save 17%             │
│                   │                    │                       │
│  • 1 user         │  • 5 users         │  • Unlimited users    │
│  • 50 jobs/mo     │  • 200 jobs/mo     │  • Unlimited jobs     │
│  • Basic reports  │  • Custom reports  │  • API access         │
│  • Email support  │  • Priority support│  • Dedicated support  │
│                   │  • Integrations    │  • White-label option │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pricing Rationale

- **Monthly first**: Lower barrier = easier acquisition
- **Annual discount (17%)**: Incentivize commitment, reduce churn
- **South African pricing**: R299-R999 range accessible for local market
- **USD equivalent**: ~$16-55/mo for international expansion

### Revenue Projections (Conservative)

| Year | Shops | MRR | ARR |
|------|-------|-----|-----|
| Y1 | 50 | R25,000 | R300,000 |
| Y2 | 200 | R100,000 | R1,200,000 |
| Y3 | 500 | R250,000 | R3,000,000 |

---

## Go-To-Market Strategy

### Phase 1: MVP (Month 1-3)
**Goal**: Validate with 5-10 beta shops

- [ ] Add job_type and client_type toggles to job creation
- [ ] Add customer management for private jobs
- [ ] Add complaint/diagnosis fields for mechanical jobs
- [ ] Create customer-facing quote PDF template (minor variation)
- [ ] Set up Stripe/Yoco for subscriptions
- [ ] Recruit beta testers (local shops - both autobody and mechanical)

### Phase 2: Launch (Month 4-6)
**Goal**: 50 paying customers

- [ ] Marketing website for shops
- [ ] Onboarding flow and tutorials
- [ ] Configurable labor rates per organization
- [ ] Customer support processes
- [ ] Referral program

### Phase 3: Scale (Month 7-12)
**Goal**: 200 customers, product-market fit

- [ ] Advanced features based on feedback
- [ ] Accounting integrations (Xero/QuickBooks)
- [ ] API for integrations
- [ ] Enterprise features
- [ ] Expand to neighboring countries

---

## Financial Considerations

### Costs to Consider

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Supabase (Pro) | ~R800 | Current infrastructure |
| Vercel | ~R0-500 | Depends on traffic |
| Stripe fees | 2.9% + R5 | Per transaction |
| Storage | Variable | Photo storage scaling |
| Support | Variable | Initially you |

### Break-Even Analysis

- **Fixed costs**: ~R2,000/mo
- **Average revenue per shop**: ~R450/mo (mix of tiers)
- **Break-even**: ~5 paying shops
- **Target**: 50 shops = R22,500/mo profit

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low adoption | Medium | High | Free trial, beta feedback |
| Feature creep | High | Medium | MVP discipline - reuse existing components |
| Competition | Medium | Medium | Focus on UX, local market |
| Support burden | High | Medium | Self-service docs, tutorials |
| Cash flow | Medium | High | Annual discounts, prepayment |

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Same app or separate?** | Same app | 90%+ code reuse, single codebase |
| **Target market first?** | Both together | Same flow, just toggles |
| **Pricing currency?** | ZAR first | Local market focus, add USD later |
| **Free tier?** | No (14-day trial) | Higher quality leads |
| **Database approach?** | Single DB, tenant column | Simple, efficient |

---

## Implementation Progress

### ✅ Completed (January 17, 2026)

1. **Dev Mode Switcher**
   - [x] App mode store (`src/lib/stores/app-mode.svelte.ts`)
   - [x] DevModeSwitcher dropdown in header (admin only)
   - [x] Modes: Insurance, Autobody, Mechanical
   - [x] localStorage persistence

2. **New Quote Flow**
   - [x] Conditional sidebar nav (New Quote vs New Request)
   - [x] `/quotes/new` form page
   - [x] Client type toggle (Private/Insurance)
   - [x] Insurance: client dropdown + claim number
   - [x] Private: owner details only (no insurer)
   - [x] `createQuoteJob` service method

3. **Open Quotes List**
   - [x] `/quotes` page with ModernDataTable
   - [x] Columns: Quote #, Vehicle, Owner/Client, Type, Created, Status
   - [x] Row click → estimate tab

4. **Supabase Branching**
   - [x] `auto` branch for shop development
   - [x] `.env.auto` and `.env.main` environment files
   - [x] Documentation in Development Setup section

---

## Next Steps

### Immediate (This Week)
- [ ] Validate assumptions with 3-5 shop owners (interviews)
- [ ] Research competitor pricing in SA market
- [x] ~~Design UI for job type + client type toggles~~ (Completed)

### Short-term (This Month)
- [ ] Add job_type and client_type columns to assessments table (schema migration)
- [ ] Create customers table for private jobs (repeat customers)
- [ ] Add conditional fields (complaint/diagnosis for mechanical)
- [ ] Create customer-facing quote PDF variant

### Medium-term (Next Quarter)
- [ ] Beta launch with 5-10 shops
- [ ] Subscription billing integration
- [ ] Marketing website
- [ ] Iterate based on feedback

---

## Development Setup

### Supabase Branching (Configured 2026-01-17)

We use Supabase branching to isolate shop development from production.

```
┌─────────────────────────────────────────────────────────────────┐
│                    BRANCH MAPPING                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Git Branch    Supabase DB              Purpose                │
│   ──────────    ───────────              ───────                │
│   main          cfblmkzleqtvtfxujikf     Production (insurance) │
│   auto          nujawzwxgtyqzabeclai     Preview (shop dev)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Files

| File | Database | Use When |
|------|----------|----------|
| `.env` | Active config | Currently loaded by app |
| `.env.main` | Production | Working on `main` branch |
| `.env.auto` | Preview | Working on `auto` branch (shop features) |

### Switching Environments

```bash
# For shop development (auto branch)
copy .env.auto .env
npm run dev

# For production work (main branch)
copy .env.main .env
npm run dev
```

### Connection Details

**Production (main):**
- Project ID: `cfblmkzleqtvtfxujikf`
- URL: `https://cfblmkzleqtvtfxujikf.supabase.co`

**Preview (auto):**
- Project ID: `nujawzwxgtyqzabeclai`
- URL: `https://nujawzwxgtyqzabeclai.supabase.co`

### Important Notes

- All shop-related migrations go in `auto` branch first
- Merge `auto` → `main` when ready to deploy shop features
- Preview DB starts as a copy of production at branch creation time
- Keep `.env.auto` and `.env.main` in `.gitignore` (already configured)

---

## References

- `.agent/System/database_schema.md` - Current schema
- `.agent/System/assessment_centric_architecture.md` - Core workflow
- `.agent/README.md` - Project overview
