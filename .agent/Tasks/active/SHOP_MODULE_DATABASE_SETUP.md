# Shop Module - Database Setup

**Created**: 2026-03-24
**Status**: Phase 1 Complete (DB tables live on production)
**Complexity**: Complex
**Branch**: `auto` (reset from `main`)
**Plan File**: `.claude/plans/adaptive-knitting-cat.md`

---

## Overview

Create the database schema for the new workshop/shop module. This adds `shop_*` prefixed tables to the existing `public` schema - completely independent from assessment tables. Shares only authentication (user_profiles, auth.users).

**Safety**: All migrations are purely additive (CREATE TABLE only). Zero modifications to existing assessment tables. Rollback = DROP TABLE shop_*.

---

## Pre-Implementation Checklist

- [ ] Reset `auto` branch to fresh state from `main`
- [ ] Verify Supabase preview branch (`nujawzwxgtyqzabeclai`) is accessible
- [ ] Take note of existing assessment table count for regression check

---

## Phase 1: Migration Files (Database)

Create 10 migration files. Each is a standalone CREATE TABLE with indexes, constraints, and comments.

### Migration 1: `shop_settings`
**File**: `supabase/migrations/20260324_001_create_shop_settings.sql`
- Shop configuration table (name, contact, business details, defaults, terms)
- No FK to existing tables
- See plan file for full schema

### Migration 2: `shop_customers`
**File**: `supabase/migrations/20260324_002_create_shop_customers.sql`
- Customer database for the shop
- FK: shop_id → shop_settings(id)
- Indexes on shop_id, name, phone

### Migration 3: `shop_customer_vehicles`
**File**: `supabase/migrations/20260324_003_create_shop_customer_vehicles.sql`
- Vehicles linked to customers
- FK: customer_id → shop_customers(id) CASCADE
- UNIQUE(customer_id, reg_number)

### Migration 4: `shop_jobs`
**File**: `supabase/migrations/20260324_004_create_shop_jobs.sql`
- Core job/work order record
- Custom enum: `shop_job_status` (9 states)
- FK: shop_id → shop_settings, customer_id → shop_customers, assigned_to/created_by → user_profiles
- Inline customer + vehicle info (for walk-ins)
- Autobody fields (damage_description) + Mechanical fields (complaint, diagnosis, fault_codes)
- Workflow dates (date_in, date_promised, date_completed)
- UNIQUE job_number

### Migration 5: `shop_estimates`
**File**: `supabase/migrations/20260324_005_create_shop_estimates.sql`
- Quotes/estimates for jobs
- Custom enum: `shop_estimate_status` (6 states)
- FK: job_id → shop_jobs(id) CASCADE
- JSONB line_items (matching existing assessment_estimates pattern)
- Totals: parts, labor, sublet, sundries, discount, VAT
- UNIQUE estimate_number

### Migration 6: `shop_invoices`
**File**: `supabase/migrations/20260324_006_create_shop_invoices.sql`
- Invoices for completed work (NEW concept - assessments don't have this)
- Custom enum: `shop_invoice_status` (7 states)
- FK: job_id → shop_jobs(id) CASCADE, estimate_id → shop_estimates(id) SET NULL
- Payment tracking (method, date, reference, amount_paid, amount_due)
- UNIQUE invoice_number

### Migration 7: `shop_job_photos`
**File**: `supabase/migrations/20260324_007_create_shop_job_photos.sql`
- Photos for jobs (simpler than assessment's 5+ photo tables)
- FK: job_id → shop_jobs(id) CASCADE
- Categories: before, during, after, damage, general

### Migration 8: `shop_labor_rates`
**File**: `supabase/migrations/20260324_008_create_shop_labor_rates.sql`
- Configurable labor rates per shop and job type
- FK: shop_id → shop_settings(id) CASCADE
- UNIQUE(shop_id, job_type, rate_name)

### Migration 9: `shop_audit_logs`
**File**: `supabase/migrations/20260324_009_create_shop_audit_logs.sql`
- Audit trail for shop operations (separate from assessment audit_logs)
- FK: performed_by → user_profiles(id)
- Entity types: job, estimate, invoice, customer

### Migration 10: `shop_rls_policies`
**File**: `supabase/migrations/20260324_010_shop_rls_policies.sql`
- Enable RLS on all shop tables
- Admin: full access
- Staff: scoped to their shop
- Decision needed: how to link users to shops (shop_id on user_profiles vs junction table)

---

## Phase 2: Apply to Preview Branch

1. Apply all migrations to preview DB (`nujawzwxgtyqzabeclai`) via MCP or Supabase CLI
2. Verify all tables created correctly
3. Test FK relationships with sample inserts
4. Verify RLS policies work

---

## Phase 3: Generate Types & Verify

1. Run `npm run generate:types` (or equivalent) to get TypeScript types
2. Verify `shop_*` types appear in `database.types.ts`
3. Run `npm run check` - should pass
4. Verify existing assessment functionality unaffected

---

## Phase 4: Rollback Script

Create `supabase/migrations/rollback_shop_tables.sql` (NOT applied, kept for emergency):
```sql
-- ROLLBACK: Drop all shop tables (assessment tables UNTOUCHED)
DROP TABLE IF EXISTS shop_job_photos CASCADE;
DROP TABLE IF EXISTS shop_audit_logs CASCADE;
DROP TABLE IF EXISTS shop_invoices CASCADE;
DROP TABLE IF EXISTS shop_estimates CASCADE;
DROP TABLE IF EXISTS shop_jobs CASCADE;
DROP TABLE IF EXISTS shop_customer_vehicles CASCADE;
DROP TABLE IF EXISTS shop_customers CASCADE;
DROP TABLE IF EXISTS shop_labor_rates CASCADE;
DROP TABLE IF EXISTS shop_settings CASCADE;
DROP TYPE IF EXISTS shop_job_status;
DROP TYPE IF EXISTS shop_estimate_status;
DROP TYPE IF EXISTS shop_invoice_status;
```

---

## Verification Checklist

- [ ] All 9 tables created successfully on preview
- [ ] 3 custom enum types created (shop_job_status, shop_estimate_status, shop_invoice_status)
- [ ] FK relationships work (can insert related records)
- [ ] RLS policies enforce access control
- [ ] Types generated successfully
- [ ] `npm run check` passes
- [ ] Assessment tables completely unchanged (count tables, spot-check data)
- [ ] Rollback script tested (can drop all shop tables cleanly)

---

## Full Schema Reference

See `.claude/plans/adaptive-knitting-cat.md` for complete SQL definitions of all tables.

---

## Notes

- All shop tables use `shop_` prefix for clear identification
- JSONB `line_items` pattern matches existing `assessment_estimates` for component reuse
- `shop_jobs` has inline customer/vehicle info for walk-ins (customer_id is optional)
- Invoices are a NEW concept not present in the assessment system
- Photos use a single table with categories (simpler than assessment's 5+ photo tables)
