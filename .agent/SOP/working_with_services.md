# SOP: Working with Services

## Overview

ClaimTech uses a **Service Layer Pattern** to abstract all database operations. Services provide a clean, testable, and reusable interface for data access across the application.

---

## Service Architecture

### Location
All services are in `src/lib/services/*.service.ts`

### Naming Convention
- File: `{entity}.service.ts` (e.g., `client.service.ts`)
- Functions: `get{Entity}`, `create{Entity}`, `update{Entity}`, `delete{Entity}`

### Core Principles
1. **Accept Supabase client as first parameter**: Allows flexibility between authenticated and service role clients
2. **Return raw Supabase response**: Let the caller handle errors
3. **Use TypeScript generics**: Leverage Supabase's type system
4. **Single responsibility**: Each service handles one entity or domain

---

## Basic Service Structure

### Template

```typescript
// src/lib/services/entity.service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '$lib/types/database'

// Type aliases for better readability
type EntityRow = Database['public']['Tables']['entities']['Row']
type EntityInsert = Database['public']['Tables']['entities']['Insert']
type EntityUpdate = Database['public']['Tables']['entities']['Update']

/**
 * Get all entities
 */
export async function getEntities(
  supabase: SupabaseClient<Database>,
  filters?: { is_active?: boolean }
) {
  let query = supabase
    .from('entities')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  return await query
}

/**
 * Get single entity by ID
 */
export async function getEntity(
  supabase: SupabaseClient<Database>,
  id: string
) {
  return await supabase
    .from('entities')
    .select('*')
    .eq('id', id)
    .single()
}

/**
 * Create new entity
 */
export async function createEntity(
  supabase: SupabaseClient<Database>,
  entity: EntityInsert
) {
  return await supabase
    .from('entities')
    .insert(entity)
    .select()
    .single()
}

/**
 * Update entity
 */
export async function updateEntity(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: EntityUpdate
) {
  return await supabase
    .from('entities')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
}

/**
 * Delete entity (soft delete by setting is_active = false)
 */
export async function deleteEntity(
  supabase: SupabaseClient<Database>,
  id: string
) {
  return await supabase
    .from('entities')
    .update({ is_active: false })
    .eq('id', id)
}

/**
 * Hard delete entity
 */
export async function hardDeleteEntity(
  supabase: SupabaseClient<Database>,
  id: string
) {
  return await supabase
    .from('entities')
    .delete()
    .eq('id', id)
}
```

---

## Using Services in Routes

### In `+page.server.ts`

```typescript
import type { PageServerLoad } from './$types'
import { getEntities } from '$lib/services/entity.service'
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals }) => {
  // Use authenticated client from locals
  const { data: entities, error: fetchError } = await getEntities(
    locals.supabase,
    { is_active: true }
  )

  if (fetchError) {
    throw error(500, 'Failed to load entities')
  }

  return {
    entities: entities ?? []
  }
}
```

### In Form Actions

```typescript
import type { Actions } from './$types'
import { createEntity, updateEntity } from '$lib/services/entity.service'
import { fail, redirect } from '@sveltejs/kit'

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const formData = await request.formData()

    const entity = {
      name: formData.get('name')?.toString(),
      description: formData.get('description')?.toString()
    }

    if (!entity.name) {
      return fail(400, { error: 'Name is required' })
    }

    const { error: createError } = await createEntity(
      locals.supabase,
      entity
    )

    if (createError) {
      return fail(500, { error: 'Failed to create entity' })
    }

    throw redirect(303, '/entities')
  }
}
```

### In API Routes

```typescript
import type { RequestHandler } from './$types'
import { getEntity } from '$lib/services/entity.service'
import { json, error } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ params, locals }) => {
  const { data: entity, error: fetchError } = await getEntity(
    locals.supabase,
    params.id
  )

  if (fetchError || !entity) {
    throw error(404, 'Entity not found')
  }

  return json(entity)
}
```

---

## Advanced Service Patterns

### 1. Fetching Related Data (Joins)

```typescript
/**
 * Get assessment with all related data
 */
export async function getAssessmentWithRelations(
  supabase: SupabaseClient<Database>,
  id: string
) {
  return await supabase
    .from('assessments')
    .select(`
      *,
      appointment:appointments(*),
      inspection:inspections(*),
      request:requests(*, client:clients(*)),
      vehicle_identification:assessment_vehicle_identification(*),
      exterior:assessment_360_exterior(*),
      damage:assessment_damage(*)
    `)
    .eq('id', id)
    .single()
}
```

### 2. Complex Filters

```typescript
/**
 * Get requests with complex filtering
 */
export async function getRequestsFiltered(
  supabase: SupabaseClient<Database>,
  filters: {
    status?: string[]
    clientId?: string
    engineerId?: string
    dateFrom?: string
    dateTo?: string
  }
) {
  let query = supabase
    .from('requests')
    .select('*, client:clients(*), engineer:engineers(*)')

  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  if (filters.clientId) {
    query = query.eq('client_id', filters.clientId)
  }

  if (filters.engineerId) {
    query = query.eq('assigned_engineer_id', filters.engineerId)
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  return await query.order('created_at', { ascending: false })
}
```

### 3. Batch Operations

```typescript
/**
 * Create multiple estimate line items
 */
export async function createEstimateLines(
  supabase: SupabaseClient<Database>,
  lines: Database['public']['Tables']['assessment_estimates']['Insert'][]
) {
  return await supabase
    .from('assessment_estimates')
    .insert(lines)
    .select()
}
```

### 4. Transactional Operations

```typescript
/**
 * Create assessment with initial data
 */
export async function createAssessmentWithInitialData(
  supabase: SupabaseClient<Database>,
  assessment: Database['public']['Tables']['assessments']['Insert']
) {
  // Create assessment
  const { data: newAssessment, error: assessmentError } = await supabase
    .from('assessments')
    .insert(assessment)
    .select()
    .single()

  if (assessmentError || !newAssessment) {
    return { data: null, error: assessmentError }
  }

  // Create related records
  const { error: identificationError } = await supabase
    .from('assessment_vehicle_identification')
    .insert({ assessment_id: newAssessment.id })

  if (identificationError) {
    // Rollback not possible - handle gracefully
    return { data: null, error: identificationError }
  }

  const { error: exteriorError } = await supabase
    .from('assessment_360_exterior')
    .insert({ assessment_id: newAssessment.id })

  if (exteriorError) {
    return { data: null, error: exteriorError }
  }

  return { data: newAssessment, error: null }
}
```

### 5. Aggregations

```typescript
/**
 * Get assessment statistics
 */
export async function getAssessmentStats(
  supabase: SupabaseClient<Database>,
  filters?: { dateFrom?: string; dateTo?: string }
) {
  let query = supabase
    .from('assessments')
    .select('status, id.count()', { count: 'exact' })

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  return await query
}
```

---

## Service Best Practices

### 1. Always Accept Supabase Client

**Good:**
```typescript
export async function getClient(supabase: SupabaseClient<Database>, id: string)
```

**Bad:**
```typescript
import { supabase } from '$lib/supabase'
export async function getClient(id: string) {
  return await supabase.from('clients').select('*')
}
```

**Why:** Accepting the client allows for flexibility:
- Use `locals.supabase` for authenticated requests
- Use `supabaseServer` for server-side operations
- Easier to test with mocked clients

---

### 2. Return Raw Supabase Response

**Good:**
```typescript
export async function getClient(supabase: SupabaseClient<Database>, id: string) {
  return await supabase.from('clients').select('*').eq('id', id).single()
}
```

**Bad:**
```typescript
export async function getClient(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}
```

**Why:** Let the caller decide how to handle errors. Different contexts may need different error handling.

---

### 3. Use TypeScript Types

**Good:**
```typescript
import type { Database } from '$lib/types/database'

type ClientInsert = Database['public']['Tables']['clients']['Insert']

export async function createClient(
  supabase: SupabaseClient<Database>,
  client: ClientInsert
) { ... }
```

**Bad:**
```typescript
export async function createClient(
  supabase: any,
  client: any
) { ... }
```

**Why:** Type safety prevents bugs and provides autocomplete.

---

### 4. Use Optional Filters

**Good:**
```typescript
export async function getClients(
  supabase: SupabaseClient<Database>,
  filters?: { is_active?: boolean; type?: string }
) {
  let query = supabase.from('clients').select('*')

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  return await query
}
```

**Why:** Single function can handle multiple use cases without creating separate functions.

---

### 5. Document Complex Queries

Use JSDoc comments for complex functions:

```typescript
/**
 * Get assessment with all related data for report generation
 *
 * @param supabase - Supabase client
 * @param assessmentId - Assessment ID
 * @returns Assessment with joined data (appointment, request, client, damage, estimates)
 */
export async function getAssessmentForReport(
  supabase: SupabaseClient<Database>,
  assessmentId: string
) {
  return await supabase
    .from('assessments')
    .select(`
      *,
      appointment:appointments(*),
      request:requests(*, client:clients(*)),
      damage:assessment_damage(*),
      estimates:assessment_estimates(*)
    `)
    .eq('id', assessmentId)
    .single()
}
```

---

## Common Service Examples from ClaimTech

### Example 1: Assessment Service

```typescript
// src/lib/services/assessment.service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '$lib/types/database'

export async function getAssessment(
  supabase: SupabaseClient<Database>,
  id: string
) {
  return await supabase
    .from('assessments')
    .select('*')
    .eq('id', id)
    .single()
}

export async function updateAssessmentStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: string
) {
  return await supabase
    .from('assessments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
}

export async function finalizeAssessment(
  supabase: SupabaseClient<Database>,
  id: string,
  finalizationData: {
    report_number?: string
    assessor_name?: string
    assessor_contact?: string
  }
) {
  return await supabase
    .from('assessments')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      estimate_finalized_at: new Date().toISOString(),
      ...finalizationData
    })
    .eq('id', id)
}
```

### Example 2: Estimate Service

```typescript
// src/lib/services/estimate.service.ts
export async function getEstimates(
  supabase: SupabaseClient<Database>,
  assessmentId: string
) {
  return await supabase
    .from('assessment_estimates')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('is_removed', false)
    .order('line_number')
}

export async function createEstimateLine(
  supabase: SupabaseClient<Database>,
  estimate: Database['public']['Tables']['assessment_estimates']['Insert']
) {
  return await supabase
    .from('assessment_estimates')
    .insert(estimate)
    .select()
    .single()
}

export async function removeEstimateLine(
  supabase: SupabaseClient<Database>,
  lineId: string
) {
  // Soft delete
  return await supabase
    .from('assessment_estimates')
    .update({ is_removed: true })
    .eq('id', lineId)
}
```

### Example 3: Storage Service

```typescript
// src/lib/services/storage.service.ts
export async function uploadPhoto(
  supabase: SupabaseClient<Database>,
  file: File,
  path: string
) {
  return await supabase.storage
    .from('SVA Photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })
}

export async function getSignedUrl(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
  expiresIn: number = 3600
) {
  return await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
}

export async function deletePhoto(
  supabase: SupabaseClient<Database>,
  path: string
) {
  return await supabase.storage
    .from('SVA Photos')
    .remove([path])
}
```

---

## Testing Services

### Unit Testing with Mocked Client

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getClient } from '$lib/services/client.service'

describe('client.service', () => {
  it('should get client by id', async () => {
    // Mock Supabase client
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: '123', name: 'Test Client' },
              error: null
            }))
          }))
        }))
      }))
    } as any

    const { data, error } = await getClient(mockSupabase, '123')

    expect(error).toBeNull()
    expect(data).toEqual({ id: '123', name: 'Test Client' })
  })
})
```

---

## Common Pitfalls

### 1. Hardcoding Supabase Client

**Bad:**
```typescript
import { supabase } from '$lib/supabase'

export async function getClient(id: string) {
  return await supabase.from('clients').select('*').eq('id', id).single()
}
```

**Why:** You can't use different clients (authenticated vs. service role).

---

### 2. Throwing Errors in Services

**Bad:**
```typescript
export async function getClient(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}
```

**Why:** Let the caller handle errors. They may want to handle 404s differently than 500s.

---

### 3. Not Using Filters

**Bad:**
```typescript
export async function getActiveClients(supabase: SupabaseClient) { ... }
export async function getInactiveClients(supabase: SupabaseClient) { ... }
export async function getAllClients(supabase: SupabaseClient) { ... }
```

**Good:**
```typescript
export async function getClients(
  supabase: SupabaseClient,
  filters?: { is_active?: boolean }
) { ... }
```

---

## Related Documentation
- Project Architecture: `../System/project_architecture.md`
- Adding Page Routes: `adding_page_route.md`
- Database Schema: `../System/database_schema.md`
