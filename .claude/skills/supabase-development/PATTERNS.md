# Detailed Supabase Patterns for ClaimTech

This document provides in-depth explanations of patterns used throughout the ClaimTech codebase.

## Table of Contents
1. [ServiceClient Injection Pattern](#serviceclient-injection-pattern)
2. [Migration Best Practices](#migration-best-practices)
3. [Type Safety Patterns](#type-safety-patterns)
4. [Query Optimization](#query-optimization)
5. [Performance Patterns](#performance-patterns)
6. [Database Conventions](#database-conventions)

---

## ServiceClient Injection Pattern

### Why This Pattern?

ClaimTech uses a universal service layer that works in three contexts:
1. **Client-side** (browser): Uses default `supabase` client with anon key
2. **Server-side** (with auth): Uses `locals.supabase` with user's session, enforces RLS
3. **Admin operations**: Uses `supabaseServer` with service role key, bypasses RLS

### Pattern Structure

```typescript
import type { ServiceClient } from '$lib/types/service';
import { supabase } from '$lib/supabase';

class MyService {
  async myMethod(id: string, client?: ServiceClient): Promise<Result> {
    // Use injected client OR fall back to default browser client
    const db = client ?? supabase;

    const { data, error } = await db.from('table').select('*').eq('id', id);

    if (error) {
      console.error('Error:', error);
      throw new Error(`Operation failed: ${error.message}`);
    }

    return data;
  }
}

export const myService = new MyService();
```

### Usage Examples

#### Client-Side (Svelte Component)
```typescript
// Uses default browser client, user must be authenticated
const assessment = await assessmentService.getAssessment(id);
```

#### Server-Side (Page Load)
```typescript
// src/routes/work/assessments/[id]/+page.server.ts
export const load: PageServerLoad = async ({ params, locals }) => {
  // RLS enforced based on user's role
  const assessment = await assessmentService.getAssessment(
    params.id,
    locals.supabase
  );

  return { assessment };
};
```

#### Admin API Endpoint
```typescript
// src/routes/api/admin/reset/+server.ts
import { supabaseServer } from '$lib/supabase-server';

export const POST: RequestHandler = async ({ request }) => {
  // Bypasses RLS for admin operations
  const data = await assessmentService.getAssessment(
    id,
    supabaseServer
  );

  return json({ data });
};
```

### Benefits

1. **Single Implementation**: One service works everywhere
2. **Type Safety**: Same `Database` types across all contexts
3. **RLS Flexibility**: Respect or bypass RLS based on need
4. **Testability**: Easy to inject mock clients
5. **Maintainability**: Changes in one place apply everywhere

---

## Migration Best Practices

### File Naming Convention

**Pattern**: Sequential numbers or date-prefixed for major features

```
001_initial_schema.sql
006_create_assessments.sql
043_auth_setup.sql
044_secure_storage_policies.sql
046_secure_rls_policies.sql
20250116_add_frozen_rates_markups.sql
```

### Migration Structure Template

```sql
-- ============================================================================
-- Migration: [Feature Name]
-- Description: [What this migration does and why]
-- Author: [Team/Developer]
-- Date: [YYYY-MM-DD]
-- ============================================================================

-- Step 1: Create tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add columns to existing tables
-- ============================================================================
ALTER TABLE existing_table
ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Step 3: Create indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_new_table_status
  ON new_table(status);

CREATE INDEX IF NOT EXISTS idx_new_table_created_at
  ON new_table(created_at DESC);

-- Step 4: Enable RLS
-- ============================================================================
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- ============================================================================
CREATE POLICY "Authenticated users can view"
  ON new_table FOR SELECT
  TO authenticated
  USING (true);

-- Step 6: Create triggers
-- ============================================================================
CREATE TRIGGER update_new_table_updated_at
  BEFORE UPDATE ON new_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Add comments
-- ============================================================================
COMMENT ON TABLE new_table IS
  'Stores [description of what this table contains]';

COMMENT ON COLUMN new_table.status IS
  'Current status: draft (being created), active (in use), archived (historical)';
```

### Idempotency Patterns

**Always use IF EXISTS / IF NOT EXISTS** for safe re-runs:

```sql
-- Tables
CREATE TABLE IF NOT EXISTS table_name (...);

-- Columns
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);

-- Policies
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name ...;

-- Functions
CREATE OR REPLACE FUNCTION function_name() ...;

-- Triggers
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...;
```

### Common Migration Tasks

#### Adding a New Entity Table

```sql
-- 1. Create table with standard structure
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unique_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index everything important
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_unique_number ON entities(unique_number);

-- 3. Enable RLS
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- 4. Add policies (see SECURITY.md for templates)
CREATE POLICY "Users can view entities" ON entities FOR SELECT ...;

-- 5. Auto-update timestamps
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Adding a 1:1 Related Table

```sql
CREATE TABLE IF NOT EXISTS entity_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID UNIQUE NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index foreign key
CREATE INDEX IF NOT EXISTS idx_entity_details_entity
  ON entity_details(entity_id);
```

#### Adding a 1:N Related Table

```sql
CREATE TABLE IF NOT EXISTS entity_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index foreign key for queries
CREATE INDEX IF NOT EXISTS idx_entity_items_entity
  ON entity_items(entity_id);
```

---

## Type Safety Patterns

### Database Type Structure

```typescript
// src/lib/types/database.ts
export interface Database {
  public: {
    Tables: {
      table_name: {
        Row: FullEntity;          // Complete object from SELECT
        Insert: CreateEntity;     // Omits auto-generated fields
        Update: Partial<Entity>;  // All fields optional
      };
    };
  };
}
```

### Domain Type Patterns

```typescript
// src/lib/types/entity.ts

// Main entity type
export interface Entity {
  id: string;
  unique_number: string;
  name: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

// Status enum
export type EntityStatus = 'draft' | 'active' | 'archived';

// Input types for service methods
export type CreateEntityInput = Omit<
  Entity,
  'id' | 'unique_number' | 'created_at' | 'updated_at' | 'status'
> & {
  status?: EntityStatus;
};

export type UpdateEntityInput = Partial<
  Omit<Entity, 'id' | 'unique_number' | 'created_at' | 'updated_at'>
>;

// Filters for list operations
export interface EntityFilters {
  status?: EntityStatus;
  name?: string;
  created_after?: string;
}
```

### Type-Safe Query Building

```typescript
// Supabase client is fully typed
const { data } = await supabase
  .from('entities') // TypeScript knows table schema
  .select('id, name, status')
  .eq('status', 'active') // TypeScript validates 'active' is valid status
  .order('created_at', { ascending: false });

// data is typed as: Array<{ id: string; name: string; status: EntityStatus }>
```

---

## Query Optimization

### Avoiding N+1 Queries

#### ❌ Bad: N+1 Queries
```typescript
const assessments = await supabase.from('assessments').select('*');

// N additional queries!
for (const assessment of assessments) {
  const appointment = await supabase
    .from('appointments')
    .select('*')
    .eq('id', assessment.appointment_id)
    .single();

  const request = await supabase
    .from('requests')
    .select('*')
    .eq('id', assessment.request_id)
    .single();
}
```

#### ✅ Good: Single Query with Nested Selects
```typescript
const assessments = await supabase
  .from('assessments')
  .select(`
    *,
    appointment:appointments(
      *,
      request:requests(*)
    )
  `);

// All data in one query!
```

### Efficient Counting

#### ❌ Bad: Fetch All Data to Count
```typescript
const { data } = await supabase.from('assessments').select('*');
const count = data.length; // Wasteful if you only need count
```

#### ✅ Good: Count Without Fetching Data
```typescript
const { count } = await supabase
  .from('assessments')
  .select('*', { count: 'exact', head: true });
// Returns count without data
```

### Selective Column Fetching

#### ❌ Bad: Fetch All Columns
```typescript
const { data } = await supabase.from('assessments').select('*');
// Returns 50+ columns when you only need 3
```

#### ✅ Good: Fetch Only Needed Columns
```typescript
const { data } = await supabase
  .from('assessments')
  .select('id, assessment_number, status');
// Much faster, less data transferred
```

### Filter at Database Level

#### ❌ Bad: Filter in JavaScript
```typescript
const { data } = await supabase.from('assessments').select('*');
const filtered = data.filter(a => a.status === 'in_progress' && a.created_at > startDate);
```

#### ✅ Good: Filter in Query
```typescript
const { data } = await supabase
  .from('assessments')
  .select('*')
  .eq('status', 'in_progress')
  .gte('created_at', startDate);
```

---

## Performance Patterns

### Caching with STABLE Functions

RLS helper functions use `STABLE` modifier:

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
--                                    ^^^^^^ STABLE allows caching
```

**Why STABLE**: PostgreSQL caches result within single query, preventing multiple lookups of the same value.

### Browser Caching with ETags

Proxy endpoints implement ETag caching:

```typescript
// Generate deterministic ETag
const etag = `"${Buffer.from(photoPath).toString('base64').substring(0, 16)}-${size}"`;

// Check if client has current version
if (request.headers.get('if-none-match') === etag) {
  return new Response(null, {
    status: 304, // Not Modified
    headers: { 'ETag': etag }
  });
}

// Return with ETag for future requests
return new Response(arrayBuffer, {
  headers: {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'private, max-age=3600',
    'ETag': etag
  }
});
```

**Result**: Browser only downloads photos once, uses cache for subsequent requests.

### Index Strategy

**Index These Fields**:
1. **Foreign keys**: `client_id`, `assessment_id`, etc.
2. **Status/filter fields**: `status`, `is_active`
3. **Unique identifiers**: `request_number`, `assessment_number`
4. **Sort fields**: `created_at DESC`, `updated_at DESC`
5. **Search fields**: Full-text search indexes

```sql
-- Foreign keys
CREATE INDEX idx_assessments_appointment ON assessments(appointment_id);

-- Filters
CREATE INDEX idx_assessments_status ON assessments(status);

-- Unique identifiers
CREATE INDEX idx_assessments_number ON assessments(assessment_number);

-- Sorting
CREATE INDEX idx_assessments_created_at ON assessments(created_at DESC);

-- Full-text search
CREATE INDEX idx_requests_search ON requests
  USING GIN(to_tsvector('english', request_number || ' ' || owner_name));
```

---

## Database Conventions

### Standard Table Structure

Every table follows this pattern:

```sql
CREATE TABLE table_name (
  -- Primary key (UUID)
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Unique business identifier (if applicable)
  unique_number TEXT UNIQUE,

  -- Entity-specific columns
  name TEXT NOT NULL,
  description TEXT,

  -- Status with check constraint
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),

  -- Foreign keys
  parent_id UUID REFERENCES parent_table(id),

  -- Timestamps (always include these)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Universal Trigger Function

All tables share this trigger function:

```sql
-- Function (created once)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger (created per table)
CREATE TRIGGER update_{table_name}_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### JSONB Usage Patterns

Use JSONB for:
1. **Dynamic arrays**: Photos, tags, completed tabs
2. **Flexible metadata**: Configuration that changes
3. **Nested data**: That doesn't warrant separate tables

```sql
-- Arrays
additional_photos JSONB DEFAULT '[]'

-- Objects
metadata JSONB DEFAULT '{}'

-- Querying JSONB
SELECT * FROM table WHERE additional_photos @> '["photo1.jpg"]';
SELECT * FROM table WHERE metadata->>'key' = 'value';

-- Updating JSONB (in TypeScript)
await supabase
  .from('table')
  .update({
    additional_photos: [...existingPhotos, newPhoto]
  });
```

### Foreign Key Cascade Strategy

**CASCADE**: For tightly coupled data (child can't exist without parent)

```sql
assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE
-- Deleting assessment deletes all its damage records
```

**NO CASCADE** (default): For loose references

```sql
client_id UUID REFERENCES clients(id)
-- Deleting client doesn't delete requests (set to NULL or prevent delete)
```

### Check Constraints for Data Integrity

```sql
-- Enum values
status TEXT CHECK (status IN ('draft', 'submitted', 'completed'))

-- Value ranges
age INTEGER CHECK (age >= 0 AND age <= 120)

-- Conditional constraints
CHECK (
  (type = 'insurance' AND claim_number IS NOT NULL) OR
  (type = 'private' AND claim_number IS NULL)
)
```

---

## Error Handling Patterns

### Service Error Handling

```typescript
const { data, error } = await db.from('table').select('*').eq('id', id).single();

if (error) {
  // Expected error: Not found
  if (error.code === 'PGRST116') {
    return null;
  }

  // Unexpected errors: Log and throw
  console.error('Database error:', error);
  throw new Error(`Failed to fetch entity: ${error.message}`);
}

return data;
```

### Query Result Patterns

```typescript
// For single results that might not exist
.maybeSingle() // Returns null if not found (no error)

// For single results that must exist
.single() // Throws error if not found (use with try/catch)

// For multiple results
.select() // Returns array (empty if no results)
```

---

## Testing Patterns

### Mock Client Injection

```typescript
// Create mock client
const mockClient = {
  from: (table) => ({
    select: () => ({ data: mockData, error: null }),
    insert: () => ({ data: mockData, error: null }),
    // ... other methods
  })
} as unknown as ServiceClient;

// Test service with mock
const result = await entityService.getEntity('test-id', mockClient);
expect(result).toEqual(mockData);
```

### Integration Tests

```typescript
// Use test Supabase instance
const testClient = createClient(TEST_URL, TEST_ANON_KEY);

// Clean up after tests
afterEach(async () => {
  await testClient.from('test_table').delete().neq('id', '');
});
```

---

## Summary

These patterns form the foundation of ClaimTech's Supabase implementation:

1. **ServiceClient injection** provides flexibility across contexts
2. **Idempotent migrations** allow safe re-runs
3. **Type safety** prevents runtime errors
4. **Query optimization** improves performance
5. **Consistent conventions** make code predictable
6. **Proper error handling** improves reliability

Refer to SECURITY.md for RLS patterns and EXAMPLES.md for copy-paste templates.
