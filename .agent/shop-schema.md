# Shop Expansion Schema Tracker

**Created**: 2026-01-17
**Updated**: 2026-01-18
**Branch**: `auto` (preview database)
**Status**: Migrations 1 & 2 applied ✅

---

## Overview

This document tracks database schema changes required for the Shop Expansion feature. All migrations should be applied to the `auto` branch first, then merged to `main` when ready.

---

## ✅ Pre-Migration Verification (Completed 2026-01-17)

The following checks confirm it's safe to run migrations on the preview database:

| Check | Result | Notes |
|-------|--------|-------|
| Preview Project ID | `nujawzwxgtyqzabeclai` | Different from production |
| Production Project ID | `cfblmkzleqtvtfxujikf` | We do NOT have access to this |
| Assessment Count | **0** | Preview is empty (production has data) |
| Column `job_type` exists | **Yes** ✅ | Migrations 1 & 2 applied (2026-01-18) |
| REST API | ✅ Working | Can query preview database |
| Management API | ✅ Working | Can execute SQL on preview |

**Conclusion**: Safe to proceed with migrations on preview database.

---

## Execution Method (Ready to Use)

Use Supabase Management API to execute SQL directly:

```bash
# Execute SQL on PREVIEW database only
curl -s -X POST "https://api.supabase.com/v1/projects/nujawzwxgtyqzabeclai/database/query" \
  -H "Authorization: Bearer sbp_2108bf785acdecd367a99efbdabf5781c2528977" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_SQL_HERE"}'
```

**IMPORTANT**: This targets `nujawzwxgtyqzabeclai` (preview), NOT production.

Migration files are ready at:
- `supabase/migrations/20260117_001_add_shop_job_type_columns.sql`
- `supabase/migrations/20260117_002_add_shop_mechanical_fields.sql`
- `supabase/migrations/20260117_003_create_shop_customers.sql`

---

## Current State (MVP Workaround)

The MVP implementation uses existing schema with workarounds:

| Field | Current Storage | Notes |
|-------|-----------------|-------|
| `job_type` | Not stored | Uses dev mode switcher (frontend only) |
| `client_type` | Not stored | Inferred from client_id presence |
| `complaint` | Not stored | Mechanical-specific |
| `diagnosis` | Not stored | Mechanical-specific |

**Limitation**: Jobs cannot be filtered by type in database. This works for dev/demo but not production.

---

## Required Migrations

### Migration 1: Job Type Columns (Priority: HIGH)

**Status**: [x] ✅ Applied (2026-01-18)

Add job_type and client_type columns to assessments table.

```sql
-- Migration: 001_add_job_type_columns.sql

-- Add job type (autobody or mechanical)
ALTER TABLE assessments ADD COLUMN job_type TEXT
  CHECK (job_type IN ('autobody', 'mechanical'))
  DEFAULT NULL;

-- Add client type (private or insurance)
ALTER TABLE assessments ADD COLUMN client_type TEXT
  CHECK (client_type IN ('private', 'insurance'))
  DEFAULT NULL;

-- Index for filtering
CREATE INDEX idx_assessments_job_type ON assessments(job_type);
CREATE INDEX idx_assessments_client_type ON assessments(client_type);

-- Comment
COMMENT ON COLUMN assessments.job_type IS 'autobody (panel/paint) or mechanical (repairs)';
COMMENT ON COLUMN assessments.client_type IS 'private (customer pays) or insurance (claim)';
```

**Dependencies**: None
**RLS Impact**: None (columns are nullable, existing RLS still applies)
**Backfill**: Existing assessments get `job_type = NULL` (legacy insurance workflow)

---

### Migration 2: Mechanical Fields (Priority: HIGH)

**Status**: [x] ✅ Applied (2026-01-18)

Add complaint and diagnosis fields for mechanical jobs.

```sql
-- Migration: 002_add_mechanical_fields.sql

-- Customer's reported issue
ALTER TABLE assessments ADD COLUMN complaint TEXT DEFAULT NULL;

-- Technician's diagnosis/findings
ALTER TABLE assessments ADD COLUMN diagnosis TEXT DEFAULT NULL;

-- Optional: OBD fault codes as JSONB array
ALTER TABLE assessments ADD COLUMN fault_codes JSONB DEFAULT NULL;

-- Comments
COMMENT ON COLUMN assessments.complaint IS 'Customer reported issue (mechanical jobs)';
COMMENT ON COLUMN assessments.diagnosis IS 'Technician diagnosis findings (mechanical jobs)';
COMMENT ON COLUMN assessments.fault_codes IS 'OBD fault codes array [{code, description}]';
```

**Dependencies**: None
**RLS Impact**: None

---

### Migration 3: Customers Table (Priority: MEDIUM)

**Status**: [ ] Blocked - `organizations` table missing in preview DB

Create customers table for private jobs (repeat customers).

```sql
-- Migration: 003_create_customers_table.sql

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customers_organization ON customers(organization_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customers in their organization"
  ON customers FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert customers in their organization"
  ON customers FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update customers in their organization"
  ON customers FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Updated at trigger
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Dependencies**: None
**RLS Impact**: New table, needs RLS policies

---

### Migration 4: Customer Link on Assessments (Priority: MEDIUM)

**Status**: [ ] Not Started

Link assessments to customers for private jobs.

```sql
-- Migration: 004_add_customer_to_assessments.sql

-- Add customer reference
ALTER TABLE assessments ADD COLUMN customer_id UUID
  REFERENCES customers(id) ON DELETE SET NULL
  DEFAULT NULL;

-- Index for customer job history
CREATE INDEX idx_assessments_customer ON assessments(customer_id);

-- Comment
COMMENT ON COLUMN assessments.customer_id IS 'Customer for private jobs (NULL for insurance claims)';
```

**Dependencies**: Migration 3 (customers table)
**RLS Impact**: None (column is nullable, customer RLS handles access)

---

### Migration 5: Customer Vehicles (Priority: LOW)

**Status**: [ ] Not Started

Track which vehicles belong to which customers.

```sql
-- Migration: 005_create_customer_vehicles.sql

CREATE TABLE customer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, vehicle_id)
);

-- Index for lookups
CREATE INDEX idx_customer_vehicles_customer ON customer_vehicles(customer_id);
CREATE INDEX idx_customer_vehicles_vehicle ON customer_vehicles(vehicle_id);

-- RLS (inherit from customers)
ALTER TABLE customer_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customer vehicles via customer access"
  ON customer_vehicles FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage customer vehicles via customer access"
  ON customer_vehicles FOR ALL
  USING (customer_id IN (
    SELECT id FROM customers WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));
```

**Dependencies**: Migration 3 (customers table)
**RLS Impact**: New table, inherits access via customer

---

### Migration 6: Labor Rates (Priority: LOW)

**Status**: [ ] Not Started

Configurable labor rates per organization and job type.

```sql
-- Migration: 006_create_labor_rates.sql

CREATE TABLE labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('autobody', 'mechanical')),
  rate_name TEXT NOT NULL,
  description TEXT,
  hourly_rate DECIMAL(10,2) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, job_type, rate_name)
);

-- Indexes
CREATE INDEX idx_labor_rates_org_type ON labor_rates(organization_id, job_type);

-- RLS
ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view labor rates in their organization"
  ON labor_rates FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage labor rates"
  ON labor_rates FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Seed default rates (run after migration)
-- INSERT INTO labor_rates (organization_id, job_type, rate_name, hourly_rate, is_default)
-- SELECT id, 'autobody', 'Panel Work', 450.00, true FROM organizations;
-- INSERT INTO labor_rates (organization_id, job_type, rate_name, hourly_rate, is_default)
-- SELECT id, 'mechanical', 'General Repairs', 400.00, true FROM organizations;
```

**Dependencies**: None
**RLS Impact**: New table, needs RLS policies

---

## Migration Order

```
1. Job Type Columns     [HIGH]  ─────┐
2. Mechanical Fields    [HIGH]  ─────┤ Can run in parallel
3. Customers Table      [MEDIUM]─────┤
4. Customer Link        [MEDIUM]─────┘ Depends on #3
5. Customer Vehicles    [LOW]  ────── Depends on #3
6. Labor Rates          [LOW]  ────── Independent
```

**Recommended sequence**:
1. Run migrations 1, 2, 3 together (no dependencies)
2. Run migration 4 after 3
3. Run migrations 5, 6 when needed

---

## Type Generation

After each migration batch, regenerate types:

```bash
npm run generate:types
```

This updates `src/lib/types/database.types.ts` with new columns.

---

## Service Layer Updates

After migrations, update these services:

| Service | Changes Needed |
|---------|----------------|
| `request.service.ts` | Update `createQuoteJob` to use real columns |
| `assessment.service.ts` | Add `job_type`, `client_type` to queries |
| NEW: `customer.service.ts` | CRUD for customers table |

---

## Testing Checklist

After applying migrations:

- [ ] Types regenerated without errors
- [ ] `npm run check` passes
- [ ] Quote creation stores job_type/client_type
- [ ] Quotes list can filter by job_type
- [ ] Customer creation works (when implemented)
- [ ] RLS policies work correctly

---

## Notes

- All migrations are additive (no breaking changes)
- Existing assessments get NULL for new columns (legacy support)
- Preview branch (`auto`) allows safe experimentation
- Merge to `main` only after thorough testing
