# Task: Fix Supabase Branching with Baseline Migration

**Created**: 2026-01-18
**Status**: In Progress
**Complexity**: Moderate

## Overview

Supabase branching keeps failing because it replays migrations from scratch, and our migrations folder has duplicate numbers and corrupted history. The fix is to create a single baseline migration from production's current schema.

## Context

- Production project: `cfblmkzleqtvtfxujikf` (31 tables, working)
- Current failed branch: `f4774e4a-59fa-42ef-808d-8fe5a1f0042d`
- Management API token: `sbp_2108bf785acdecd367a99efbdabf5781c2528977`

## Implementation Steps

### Step 1: Dump Production Schema

Use the Supabase CLI or Management API to dump the full schema:

```bash
# Try CLI first
supabase db dump --project-ref cfblmkzleqtvtfxujikf --schema public -f baseline_schema.sql

# If that doesn't work, use Management API queries to get table definitions
```

### Step 2: Archive Old Migrations

```bash
mkdir -p supabase/migrations_archive
mv supabase/migrations/*.sql supabase/migrations_archive/
```

### Step 3: Create Baseline Migration

Create `supabase/migrations/00000000000000_baseline.sql` with the dumped schema.

The file should contain:
- All 31 table CREATE statements
- All indexes
- All functions and triggers
- All RLS policies
- Extensions (uuid-ossp, etc.)

### Step 4: Add Shop Expansion Migrations

Copy from archive:
```bash
cp supabase/migrations_archive/20260117_001_add_shop_job_type_columns.sql \
   supabase/migrations/00000000000001_add_shop_job_type_columns.sql

cp supabase/migrations_archive/20260117_002_add_shop_mechanical_fields.sql \
   supabase/migrations/00000000000002_add_shop_mechanical_fields.sql
```

### Step 5: Delete and Recreate Branch

```bash
supabase branches delete f4774e4a-59fa-42ef-808d-8fe5a1f0042d \
  --project-ref cfblmkzleqtvtfxujikf --experimental

supabase branches create auto \
  --project-ref cfblmkzleqtvtfxujikf --experimental
```

### Step 6: Verify Success

```bash
supabase branches list --project-ref cfblmkzleqtvtfxujikf --experimental
# Should show: status = FUNCTIONS_DEPLOYED (not MIGRATIONS_FAILED)
```

### Step 7: Get New Preview Credentials

```bash
curl -s "https://api.supabase.com/v1/projects/cfblmkzleqtvtfxujikf/branches" \
  -H "Authorization: Bearer sbp_2108bf785acdecd367a99efbdabf5781c2528977"
```

Get the new `project_ref` for the auto branch, then get API keys:
```bash
curl -s "https://api.supabase.com/v1/projects/NEW_REF/api-keys" \
  -H "Authorization: Bearer sbp_2108bf785acdecd367a99efbdabf5781c2528977"
```

### Step 8: Update .env

Update these in `.env`:
- `PUBLIC_AUTO_SUPABASE_URL=https://NEW_REF.supabase.co`
- `PUBLIC_AUTO_SUPABASE_ANON_KEY=...`
- `AUTO_SUPABASE_SERVICE_ROLE_KEY=...`
- Also update the ACTIVE CREDENTIALS section

### Step 9: Create Test User

```bash
curl -X POST "https://NEW_REF.supabase.co/auth/v1/admin/users" \
  -H "Authorization: Bearer NEW_SERVICE_ROLE_KEY" \
  -H "apikey: NEW_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jaco@claimtech.co.za",
    "password": "#MJNLD2021",
    "email_confirm": true,
    "user_metadata": {"role": "admin"}
  }'
```

Then create their profile:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/NEW_REF/database/query" \
  -H "Authorization: Bearer sbp_2108bf785acdecd367a99efbdabf5781c2528977" \
  -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO user_profiles (id, email, full_name, role, is_active) VALUES (USER_ID, '\''jaco@claimtech.co.za'\'', '\''Jaco Admin'\'', '\''admin'\'', true)"}'
```

## Verification

- [ ] `supabase branches list` shows `FUNCTIONS_DEPLOYED`
- [ ] Preview database has 31+ tables
- [ ] Shop expansion columns exist in assessments
- [ ] Test user can login
- [ ] `npm run dev` works

## Notes

- The baseline should capture the EXACT production schema
- Shop expansion migrations add job_type, client_type, complaint, diagnosis, fault_codes columns
- Migration 003 (customers table) is blocked - don't include it
