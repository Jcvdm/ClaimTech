---
name: supabase-development
description: Implement Supabase database operations, services, RLS policies, and storage for ClaimTech. Use when creating services, writing database queries, implementing RLS policies, working with storage, or extending the database schema. Follows ClaimTech's ServiceClient injection pattern, audit logging conventions, and security-first approach.
allowed-tools: Read, Edit, Write, Grep, Glob
---

# Supabase Development for ClaimTech

ClaimTech uses Supabase (PostgreSQL) with **50+ tables**, **27+ service files**, and a mature security-first architecture. This skill provides the patterns and conventions used throughout the codebase.

## Quick Reference

### ServiceClient Pattern (Universal)
All services accept optional client injection:

```typescript
async getEntity(id: string, client?: ServiceClient): Promise<Entity | null> {
  const db = client ?? supabase; // Use injected OR default browser client
  const { data } = await db.from('table').select('*').eq('id', id).maybeSingle();
  return data;
}
```

**Why**: Same service works client-side, server-side (with RLS), or admin (bypass RLS).

### Three Supabase Clients

1. **Browser Client** (`src/lib/supabase.ts`): Client-side, uses anon key
2. **SSR Client** (`locals.supabase` in server code): Server-side with user auth, enforces RLS
3. **Service Role Client** (`src/lib/supabase-server.ts`): Admin operations, **bypasses RLS** - use sparingly!

**Rule**: Always prefer `locals.supabase` in server code to enforce RLS.

### Unique ID Generation
Every major entity has human-readable IDs: `CLM-2025-001`, `ASM-2025-001`

```typescript
private async generateUniqueNumber(prefix: string, client?: ServiceClient): Promise<string> {
  const db = client ?? supabase;
  const year = new Date().getFullYear();

  const { count } = await db
    .from('table')
    .select('*', { count: 'exact', head: true })
    .like('unique_id', `${prefix}-${year}-%`);

  const nextNumber = (count || 0) + 1;
  return `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`;
}
```

**Pattern**: `{PREFIX}-{YEAR}-{SEQUENTIAL_NUMBER}` with database unique constraint.

### Standard CRUD Service Template

```typescript
import type { ServiceClient } from '$lib/types/service';
import { supabase } from '$lib/supabase';
import { auditService } from './audit.service';

class EntityService {
  // CREATE
  async create(input: CreateInput, client?: ServiceClient): Promise<Entity> {
    const db = client ?? supabase;
    const uniqueId = await this.generateUniqueId(client);

    const { data, error } = await db
      .from('table')
      .insert({ ...input, unique_id: uniqueId })
      .select()
      .single();

    if (error) throw new Error(`Failed to create: ${error.message}`);

    // Audit log
    await auditService.logChange({
      entity_type: 'entity',
      entity_id: data.id,
      action: 'created'
    });

    return data;
  }

  // READ (single)
  async get(id: string, client?: ServiceClient): Promise<Entity | null> {
    const db = client ?? supabase;
    const { data, error } = await db
      .from('table')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Error fetching:', error);
      throw new Error(`Failed to fetch: ${error.message}`);
    }

    return data;
  }

  // READ (list with filters)
  async list(filters?: Filters, client?: ServiceClient): Promise<Entity[]> {
    const db = client ?? supabase;
    let query = db
      .from('table')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);

    const { data } = await query;
    return data || [];
  }

  // UPDATE
  async update(id: string, input: UpdateInput, client?: ServiceClient): Promise<Entity> {
    const db = client ?? supabase;
    const old = await this.get(id, client);

    const { data, error } = await db
      .from('table')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update: ${error.message}`);

    // Audit log status changes
    if (input.status && old && input.status !== old.status) {
      await auditService.logChange({
        entity_type: 'entity',
        entity_id: id,
        action: 'status_changed',
        field_name: 'status',
        old_value: old.status,
        new_value: input.status
      });
    }

    return data;
  }

  // DELETE (or soft delete by status)
  async delete(id: string, client?: ServiceClient): Promise<void> {
    const db = client ?? supabase;
    const { error } = await db.from('table').delete().eq('id', id);

    if (error) throw new Error(`Failed to delete: ${error.message}`);

    await auditService.logChange({
      entity_type: 'entity',
      entity_id: id,
      action: 'deleted'
    });
  }
}

export const entityService = new EntityService();
```

## RLS Helper Functions

**Create reusable helper functions for policies:**

```sql
-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get engineer ID for current user
CREATE OR REPLACE FUNCTION public.get_user_engineer_id()
RETURNS UUID AS $$
DECLARE
  eng_id UUID;
BEGIN
  SELECT id INTO eng_id
  FROM public.engineers
  WHERE auth_user_id = auth.uid();

  RETURN eng_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**Why SECURITY DEFINER**: Executes with owner's permissions (lets users query `user_profiles` they can't normally access).
**Why STABLE**: Result cached within query, prevents N+1 lookups.

## RLS Multi-Policy Pattern

**Combine policies with OR logic:**

```sql
-- Admins see everything
CREATE POLICY "Admins can view all"
  ON table FOR SELECT
  TO authenticated
  USING (is_admin());

-- Engineers see only their assignments
CREATE POLICY "Engineers can view assigned"
  ON table FOR SELECT
  TO authenticated
  USING (assigned_engineer_id = get_user_engineer_id());
```

PostgreSQL grants access if **ANY** policy matches.

## Storage Patterns

### Private Buckets with Proxy Endpoints

**Don't use**: Signed URLs (they expire)
**Do use**: Proxy endpoints that stream files

```typescript
// Proxy endpoint: src/routes/api/photo/[...path]/+server.ts
export const GET: RequestHandler = async ({ params, locals }) => {
  const photoPath = params.path;

  // Authenticate
  const { data: { session } } = await locals.supabase.auth.getSession();
  if (!session) throw error(401, 'Authentication required');

  // Download (RLS enforced via user's session)
  const { data: photoBlob } = await locals.supabase.storage
    .from('SVA Photos')
    .download(photoPath);

  const arrayBuffer = await photoBlob.arrayBuffer();
  const etag = `"${Buffer.from(photoPath).toString('base64').substring(0, 16)}"`;

  // Check ETag for 304 Not Modified
  if (locals.request.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { 'ETag': etag }
    });
  }

  return new Response(arrayBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
      'ETag': etag
    }
  });
};
```

### File Upload Pattern

```typescript
// From storage.service.ts
async uploadPhoto(
  file: File,
  assessmentId: string,
  category: 'identification' | '360' | 'interior' | 'tyres'
): Promise<{ url: string; path: string }> {
  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split('.').pop();
  const fileName = `${timestamp}-${random}.${extension}`;

  // Organized path
  const folder = `assessments/${assessmentId}/${category}`;
  const filePath = `${folder}/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('SVA Photos')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Return proxy URL (not signed URL!)
  return {
    url: `/api/photo/${filePath}`,
    path: filePath
  };
}
```

**Then save to database:**

```typescript
await db.from('assessment_vehicle_identification').update({
  photo_url: uploadResult.url,
  photo_path: uploadResult.path
}).eq('assessment_id', assessmentId);
```

## Audit Logging

**When to log:**
- Status changes
- Assignments
- Deletions
- Finalizations

```typescript
await auditService.logChange({
  entity_type: 'assessment',
  entity_id: id,
  action: 'status_changed',
  field_name: 'status',
  old_value: 'in_progress',
  new_value: 'completed'
});
```

## Common Pitfalls

### ❌ Don't expose service role key
```typescript
// WRONG - exposes service key to browser!
import { supabaseServer } from '$lib/supabase-server';
export const load = async () => {
  const data = await supabaseServer.from('table').select('*');
  return { data };
};
```

```typescript
// RIGHT - use locals.supabase
export const load: PageServerLoad = async ({ locals }) => {
  const { data } = await locals.supabase.from('table').select('*');
  return { data };
};
```

### ❌ Don't use signed URLs for storage
```typescript
// WRONG - URLs expire after 1 hour
const { data } = await supabase.storage
  .from('bucket')
  .createSignedUrl(path, 3600);
```

```typescript
// RIGHT - use proxy endpoints (permanent URLs)
const url = `/api/photo/${filePath}`;
```

### ❌ Don't forget audit logging
```typescript
// WRONG - no audit trail
await db.from('requests').update({ status: 'completed' }).eq('id', id);
```

```typescript
// RIGHT - log state changes
const old = await getRequest(id);
await db.from('requests').update({ status: 'completed' }).eq('id', id);
await auditService.logChange({
  entity_type: 'request',
  entity_id: id,
  action: 'status_changed',
  field_name: 'status',
  old_value: old.status,
  new_value: 'completed'
});
```

### ❌ Don't use .single() without .maybeSingle() for nullable results
```typescript
// WRONG - throws error if not found
const { data } = await db.from('table').select('*').eq('id', id).single();
```

```typescript
// RIGHT - returns null if not found
const { data } = await db.from('table').select('*').eq('id', id).maybeSingle();
```

## Database Conventions

### Every table has:
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Auto-update trigger: `CREATE TRIGGER update_{table}_updated_at BEFORE UPDATE...`
- RLS enabled: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`

### Check constraints for enums:
```sql
status TEXT CHECK (status IN ('draft', 'submitted', 'in_progress', 'completed'))
```

### Indexes on:
- All foreign keys
- Status/filter fields
- Unique business identifiers
- Commonly searched fields

## Complex Queries (Avoid N+1)

```typescript
// BAD - N+1 queries
const assessments = await db.from('assessments').select('*');
for (const a of assessments) {
  const appointment = await db.from('appointments').select('*').eq('id', a.appointment_id);
}

// GOOD - Single query with nested select
const assessments = await db
  .from('assessments')
  .select(`
    *,
    appointment:appointments(
      *,
      request:requests(*),
      engineer:engineers(name)
    )
  `);
```

## Progressive Disclosure

For detailed information, see:
- [PATTERNS.md](PATTERNS.md) - Detailed pattern explanations, migration best practices
- [SECURITY.md](SECURITY.md) - Complete RLS templates and security patterns
- [EXAMPLES.md](EXAMPLES.md) - Real code examples from the codebase

## Quick Commands

**Create new service**: Copy template from EXAMPLES.md, replace entity name
**Add RLS policy**: Use templates from SECURITY.md
**Create migration**: Follow idempotent pattern from PATTERNS.md
**Upload file**: Use storage.service.ts upload methods
**Query with joins**: Use nested select syntax (see EXAMPLES.md)
