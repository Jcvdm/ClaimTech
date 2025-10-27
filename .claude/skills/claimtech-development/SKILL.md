---
name: ClaimTech Development
description: ClaimTech vehicle assessment platform development patterns and workflows. Use when implementing features, reviewing code, or working with SvelteKit, Supabase, database migrations, service layer, authentication, PDF generation, or storage. Includes systematic workflows for common ClaimTech development tasks.
---

# ClaimTech Development Skill

Systematic workflows for developing features in the ClaimTech vehicle assessment platform.

## Overview

This skill provides step-by-step workflows for common ClaimTech development tasks, ensuring consistency with project patterns and best practices. It works alongside the `.agent/` documentation system to provide both methodology (HOW) and context (WHAT/WHERE).

## When to Use

Auto-invokes when working with:
- Database migrations and schema changes
- Service layer implementation
- Authentication and authorization
- SvelteKit page routes
- PDF generation and reporting
- File storage and photos
- ClaimTech-specific patterns

## Core Workflows

---

### Workflow 1: Database Migration

**When:** Adding or modifying database tables
**Time:** 15-30 minutes
**Triggers:** "database", "migration", "schema", "table", "RLS"

**Steps:**

1. **Review Current Schema**
   - Read `.agent/System/database_schema.md`
   - Understand existing tables and relationships
   - Check for similar patterns

2. **Create Migration File**
   ```bash
   # Name: YYYYMMDD_descriptive_name.sql
   # Location: supabase/migrations/
   ```

3. **Write Idempotent SQL**
   ```sql
   -- Create table with IF NOT EXISTS
   CREATE TABLE IF NOT EXISTS table_name (
     id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
     -- columns here
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );

   -- Create indexes
   CREATE INDEX IF NOT EXISTS idx_table_field
     ON table_name(field_name);

   -- Enable RLS
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

   -- Create RLS policies
   CREATE POLICY IF NOT EXISTS "policy_name"
     ON table_name
     FOR SELECT
     USING (auth.uid() IS NOT NULL);

   -- Add updated_at trigger
   CREATE TRIGGER IF NOT EXISTS update_table_updated_at
     BEFORE UPDATE ON table_name
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at_column();
   ```

4. **Test Migration**
   - Apply migration locally
   - Verify table structure
   - Test RLS policies

5. **Update TypeScript Types**
   - Generate types from schema
   - Update relevant type files

6. **Update Documentation**
   - Add table to `.agent/System/database_schema.md`
   - Include columns, indexes, RLS policies

**Output:** Working migration + updated documentation

**Quality Checklist:**
- [ ] Migration is idempotent (IF NOT EXISTS everywhere)
- [ ] RLS enabled on table
- [ ] RLS policies created (not just permissive)
- [ ] Indexes on all foreign keys
- [ ] updated_at trigger added
- [ ] created_at and updated_at columns present
- [ ] Documentation updated in database_schema.md

**Reference:** See `.agent/SOP/adding_migration.md` for detailed process

---

### Workflow 2: Service Layer Implementation

**When:** Creating data access for a table
**Time:** 20-40 minutes
**Triggers:** "service", "data access", "CRUD", "database query"

**Steps:**

1. **Create Service File**
   ```typescript
   // Location: src/lib/services/entity.service.ts
   import type { SupabaseClient } from '@supabase/supabase-js';
   import type { Database } from '$lib/types/database.types';

   // ServiceClient injected, never created
   export class EntityService {
     constructor(private supabase: SupabaseClient<Database>) {}

     async getAll() {
       const { data, error } = await this.supabase
         .from('entities')
         .select('*')
         .order('created_at', { ascending: false });

       if (error) throw error;
       return data;
     }

     async getById(id: string) {
       const { data, error } = await this.supabase
         .from('entities')
         .select('*')
         .eq('id', id)
         .single();

       if (error) throw error;
       return data;
     }

     async create(entity: InsertEntity) {
       const { data, error } = await this.supabase
         .from('entities')
         .insert(entity)
         .select()
         .single();

       if (error) throw error;
       return data;
     }

     async update(id: string, updates: UpdateEntity) {
       const { data, error } = await this.supabase
         .from('entities')
         .update(updates)
         .eq('id', id)
         .select()
         .single();

       if (error) throw error;
       return data;
     }

     async delete(id: string) {
       const { error } = await this.supabase
         .from('entities')
         .delete()
         .eq('id', id);

       if (error) throw error;
     }
   }

   // Export singleton factory
   export const createEntityService = (supabase: SupabaseClient<Database>) =>
     new EntityService(supabase);
   ```

2. **Use in Server Load**
   ```typescript
   // +page.server.ts
   import { createEntityService } from '$lib/services/entity.service';

   export async function load({ locals }) {
     const entityService = createEntityService(locals.supabase);
     const entities = await entityService.getAll();
     return { entities };
   }
   ```

**Output:** Reusable service with type-safe CRUD operations

**Quality Checklist:**
- [ ] ServiceClient injected (constructor parameter)
- [ ] Error handling on all database calls
- [ ] TypeScript types for all parameters and returns
- [ ] Service exported as factory function
- [ ] Follows existing service patterns
- [ ] Used in +page.server.ts load function

**Reference:** See `.agent/SOP/working_with_services.md`

---

### Workflow 3: Authentication Flow

**When:** Implementing auth-protected features
**Time:** 10-20 minutes
**Triggers:** "auth", "login", "logout", "protect", "RLS"

**Steps:**

1. **Use Form Actions (NOT API Routes)**
   ```typescript
   // +page.server.ts
   import { fail, redirect } from '@sveltejs/kit';

   export const actions = {
     login: async ({ request, locals }) => {
       const formData = await request.formData();
       const email = formData.get('email')?.toString();
       const password = formData.get('password')?.toString();

       const { error } = await locals.supabase.auth.signInWithPassword({
         email,
         password
       });

       if (error) {
         return fail(400, { error: error.message });
       }

       throw redirect(303, '/dashboard');
     }
   };
   ```

2. **Check Auth in Load Functions**
   ```typescript
   export async function load({ locals }) {
     const session = await locals.getSession();
     if (!session) {
       throw redirect(303, '/auth/login');
     }

     // Protected data access
     return { user: session.user };
   }
   ```

3. **Implement RLS Policies**
   ```sql
   -- Row-level security based on auth.uid()
   CREATE POLICY "Users can view own data"
     ON table_name
     FOR SELECT
     USING (auth.uid() = user_id);

   -- Admin access
   CREATE POLICY "Admins can view all"
     ON table_name
     FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM user_profiles
         WHERE id = auth.uid() AND role = 'admin'
       )
     );
   ```

4. **Add Role Checks**
   ```typescript
   // Check user role
   const { data: profile } = await locals.supabase
     .from('user_profiles')
     .select('role')
     .eq('id', session.user.id)
     .single();

   if (profile?.role !== 'admin') {
     throw error(403, 'Forbidden');
   }
   ```

**Output:** Secure auth flow with RLS

**Quality Checklist:**
- [ ] Form actions used for login/logout (not API routes)
- [ ] RLS policies protect data at database level
- [ ] Role checks implemented where needed
- [ ] Redirects to /auth/login when not authenticated
- [ ] Session checked in load functions
- [ ] No direct database access without auth check

**Reference:** See `.agent/SOP/implementing_form_actions_auth.md`

---

### Workflow 4: Page Route Creation

**When:** Adding new UI pages
**Time:** 15-30 minutes
**Triggers:** "page", "route", "UI", "component"

**Steps:**

1. **Create Route Files**
   ```
   src/routes/feature/
   ├── +page.svelte        # UI component
   ├── +page.server.ts     # Server-side data loading
   └── +page.ts            # (optional) Client-side data
   ```

2. **Implement Server Load**
   ```typescript
   // +page.server.ts
   import { createEntityService } from '$lib/services/entity.service';

   export async function load({ locals }) {
     const entityService = createEntityService(locals.supabase);
     const entities = await entityService.getAll();

     return { entities };
   }
   ```

3. **Create Svelte 5 Component**
   ```svelte
   <!-- +page.svelte -->
   <script lang="ts">
     import { page } from '$app/stores';

     let { data } = $props();

     // Svelte 5 runes
     let searchTerm = $state('');
     let filteredEntities = $derived(
       data.entities.filter(e =>
         e.name.toLowerCase().includes(searchTerm.toLowerCase())
       )
     );

     $effect(() => {
       console.log('Search term changed:', searchTerm);
     });
   </script>

   <div class="container">
     <h1>Entities</h1>
     <input bind:value={searchTerm} placeholder="Search..." />

     {#each filteredEntities as entity}
       <div class="card">{entity.name}</div>
     {/each}
   </div>
   ```

4. **Add Navigation**
   - Update sidebar/nav component if needed

**Output:** Working page with server-side data loading

**Quality Checklist:**
- [ ] ServiceClient used in +page.server.ts
- [ ] Svelte 5 runes used ($state, $derived, $effect)
- [ ] TypeScript types for data prop
- [ ] Error boundaries added
- [ ] Loading states handled
- [ ] Navigation updated if user-facing

**Reference:** See `.agent/SOP/adding_page_route.md`

---

### Workflow 5: PDF Generation

**When:** Creating reports or documents
**Time:** 30-60 minutes
**Triggers:** "PDF", "report", "document generation", "Puppeteer"

**Steps:**

1. **Create HTML Template**
   ```svelte
   <!-- src/lib/templates/report-template.svelte -->
   <script lang="ts">
     let { data } = $props();
   </script>

   <html>
     <head>
       <style>
         /* Tailwind-based styles */
         @import 'tailwindcss/base';
         @import 'tailwindcss/components';
         @import 'tailwindcss/utilities';
       </style>
     </head>
     <body class="p-8">
       <h1 class="text-2xl font-bold">{data.title}</h1>
       <!-- Report content -->
     </body>
   </html>
   ```

2. **Create API Endpoint**
   ```typescript
   // src/routes/api/generate-report/+server.ts
   import { generatePDF } from '$lib/utils/pdf-generator';
   import { createStorageService } from '$lib/services/storage.service';

   export async function POST({ request, locals }) {
     const { assessmentId } = await request.json();

     // Fetch data
     const assessment = await getAssessment(assessmentId);

     // Render template
     const html = renderTemplate('report-template', assessment);

     // Generate PDF
     const pdfBuffer = await generatePDF(html);

     // Upload to storage
     const storage = createStorageService(locals.supabase);
     const path = `assessments/${assessmentId}/report.pdf`;
     await storage.upload('documents', path, pdfBuffer);

     return new Response(JSON.stringify({ success: true }));
   }
   ```

3. **Create Proxy Endpoint for Signed URLs**
   ```typescript
   // src/routes/api/document/[...path]/+server.ts
   export async function GET({ params, locals }) {
     const storage = createStorageService(locals.supabase);
     const url = await storage.getSignedUrl('documents', params.path);

     return new Response(null, {
       status: 302,
       headers: { Location: url }
     });
   }
   ```

**Output:** Generated PDF in storage with proxy access

**Quality Checklist:**
- [ ] Template uses Tailwind for styling
- [ ] Puppeteer configured with correct options
- [ ] PDF uploaded to documents bucket
- [ ] Proxy endpoint returns signed URL
- [ ] Never expose signed URLs directly to client
- [ ] File path follows convention

**Reference:** See `.agent/System/project_architecture.md#pdf-generation-workflow`

---

### Workflow 6: Storage & Photo Upload

**When:** Handling file uploads
**Time:** 20-30 minutes
**Triggers:** "upload", "photo", "storage", "file", "image"

**Steps:**

1. **Use Storage Service**
   ```typescript
   import { createStorageService } from '$lib/services/storage.service';

   export async function POST({ request, locals }) {
     const formData = await request.formData();
     const file = formData.get('file') as File;

     const storage = createStorageService(locals.supabase);

     // Choose correct bucket
     const bucket = file.type.startsWith('image/')
       ? 'SVA Photos'
       : 'documents';

     // Upload
     const path = `assessments/${assessmentId}/${file.name}`;
     await storage.upload(bucket, path, file);

     return new Response(JSON.stringify({ success: true }));
   }
   ```

2. **Create Proxy for Access**
   ```typescript
   // GET /api/photo/[...path]
   export async function GET({ params, locals }) {
     const storage = createStorageService(locals.supabase);
     const url = await storage.getSignedUrl('SVA Photos', params.path);

     return new Response(null, {
       status: 302,
       headers: { Location: url }
     });
   }
   ```

3. **Handle Deletion**
   ```typescript
   await storage.delete('SVA Photos', path);
   ```

**Output:** Secure file storage with proxy access

**Quality Checklist:**
- [ ] Correct bucket used (documents vs SVA Photos)
- [ ] Proxy endpoint created for access
- [ ] No direct signed URL exposure to client
- [ ] File deletion handled when entity deleted
- [ ] File paths follow conventions
- [ ] MIME types validated

**Reference:** See `.agent/System/project_architecture.md#storage-architecture`

---

## Best Practices

### Always:
- ✅ Read `.agent/` docs for current state before implementing
- ✅ Use ServiceClient injection pattern
- ✅ Enable RLS on all tables
- ✅ Use form actions for auth mutations
- ✅ Use Svelte 5 runes (not stores)
- ✅ Add TypeScript types everywhere
- ✅ Update documentation after changes
- ✅ Use proxy endpoints for storage URLs

### Never:
- ❌ Create SupabaseClient in services (inject it)
- ❌ Skip RLS policies
- ❌ Use API routes for auth mutations
- ❌ Expose signed URLs directly
- ❌ Use Svelte 4 stores in new code
- ❌ Skip documentation updates
- ❌ Hard-code bucket names

## Success Criteria

### Feature is Complete When:
1. ✅ Code follows ClaimTech patterns
2. ✅ All quality checklists passed
3. ✅ Documentation updated
4. ✅ TypeScript types complete
5. ✅ Tests passing (if applicable)
6. ✅ Security verified (RLS, auth)

## Related Documentation

**Always consult:**
- `.agent/README.md` - Documentation index
- `.agent/System/database_schema.md` - Database structure
- `.agent/System/project_architecture.md` - System architecture
- `.agent/SOP/` - Detailed SOPs for each workflow

**Quick Reference:**
- Database: `.agent/SOP/adding_migration.md`
- Services: `.agent/SOP/working_with_services.md`
- Auth: `.agent/SOP/implementing_form_actions_auth.md`
- Pages: `.agent/SOP/adding_page_route.md`
- Components: `.agent/SOP/creating-components.md`

---

**Skill Version:** 1.0.0
**Last Updated:** October 25, 2025
**ClaimTech Version:** Current (28 tables, 18/28 RLS enabled)