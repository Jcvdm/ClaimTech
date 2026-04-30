# SOP: Adding a New Page Route

## Overview

This document describes how to add a new page route in ClaimTech using SvelteKit's file-based routing system.

---

## SvelteKit Routing Basics

SvelteKit uses **file-based routing**: the file structure in `src/routes/` determines the URL structure.

### Route Types

1. **Page Routes**: `+page.svelte` - Renders a page
2. **Server Load**: `+page.server.ts` - Fetches data on the server
3. **Client Load**: `+page.ts` - Fetches data on the client
4. **Layouts**: `+layout.svelte` - Shared UI wrapper for routes
5. **Server Layouts**: `+layout.server.ts` - Shared server-side data loading
6. **API Routes**: `+server.ts` - API endpoints

### Route Groups

Routes can be grouped using parentheses:
- `(app)` - Assessment-centric protected routes (clients, engineers, assessments, requests, /work/*)
- `(shop)` - Body-shop protected routes (jobs, estimates, invoices, customers)
- `(public)` - Public routes

---

## Step-by-Step Guide

### 1. Determine Route Structure

Decide where your page fits in the application:

**Examples:**
- Dashboard: `/dashboard` → `src/routes/(app)/dashboard/+page.svelte`
- Client detail: `/clients/[id]` → `src/routes/(app)/clients/[id]/+page.svelte`
- New request: `/requests/new` → `src/routes/(app)/requests/new/+page.svelte`
- API endpoint: `/api/generate-report` → `src/routes/api/generate-report/+server.ts`

---

### 2. Create Route Directory

Create the directory structure for your route:

```bash
# Example: Adding a new "reports" page
mkdir -p src/routes/\(app\)/reports
```

---

### 3. Create Page Component (`+page.svelte`)

Create a Svelte component for your page:

```bash
touch src/routes/\(app\)/reports/+page.svelte
```

**Basic Template:**

```svelte
<script lang="ts">
  import type { PageData } from './$types'

  // Props passed from +page.server.ts
  let { data }: { data: PageData } = $props()

  // Component state using Svelte 5 runes
  let searchQuery = $state('')

  // Derived state
  let filteredReports = $derived(
    data.reports.filter(r => r.name.includes(searchQuery))
  )
</script>

<div class="container mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6">Reports</h1>

  <input
    type="text"
    bind:value={searchQuery}
    placeholder="Search reports..."
    class="mb-4 px-4 py-2 border rounded"
  />

  <div class="grid gap-4">
    {#each filteredReports as report}
      <div class="border p-4 rounded">
        <h2>{report.name}</h2>
        <p>{report.description}</p>
      </div>
    {/each}
  </div>
</div>
```

---

### 4. Create Server Load Function (`+page.server.ts`)

Create a server-side load function to fetch data:

```bash
touch src/routes/\(app\)/reports/+page.server.ts
```

**Template:**

```typescript
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals, params }) => {
  const { supabase } = locals

  // Fetch data from database
  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (fetchError) {
    throw error(500, 'Failed to load reports')
  }

  return {
    reports: reports ?? []
  }
}
```

**With Actions (for form submissions):**

```typescript
import type { PageServerLoad, Actions } from './$types'
import { fail, redirect } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals }) => {
  // Load data...
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const formData = await request.formData()
    const name = formData.get('name')?.toString()

    if (!name) {
      return fail(400, { error: 'Name is required' })
    }

    const { error: insertError } = await locals.supabase
      .from('reports')
      .insert({ name })

    if (insertError) {
      return fail(500, { error: 'Failed to create report' })
    }

    throw redirect(303, '/reports')
  }
}
```

---

### 5. Using Route Parameters

For dynamic routes (e.g., `/clients/[id]`):

**Directory Structure:**
```
src/routes/(app)/clients/[id]/
  +page.svelte
  +page.server.ts
```

**+page.server.ts:**
```typescript
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals, params }) => {
  const { id } = params

  const { data: client, error: fetchError } = await locals.supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !client) {
    throw error(404, 'Client not found')
  }

  return { client }
}
```

**+page.svelte:**
```svelte
<script lang="ts">
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<h1>{data.client.name}</h1>
<p>{data.client.email}</p>
```

---

### 6. Add Navigation Link

Update the navigation to include your new page.

**Example: Update `src/routes/(app)/+layout.svelte`:**

```svelte
<nav class="flex gap-4">
  <a href="/dashboard">Dashboard</a>
  <a href="/requests">Requests</a>
  <a href="/clients">Clients</a>
  <a href="/reports">Reports</a> <!-- New link -->
</nav>
```

---

### 7. Using Services for Data Fetching

Follow the service layer pattern:

**Create a service (if needed):**

```typescript
// src/lib/services/report.service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '$lib/types/database'

type ReportRow = Database['public']['Tables']['reports']['Row']

export async function getReports(supabase: SupabaseClient<Database>) {
  return await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
}

export async function getReport(supabase: SupabaseClient<Database>, id: string) {
  return await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()
}

export async function createReport(
  supabase: SupabaseClient<Database>,
  report: Database['public']['Tables']['reports']['Insert']
) {
  return await supabase
    .from('reports')
    .insert(report)
    .select()
    .single()
}
```

**Use in +page.server.ts:**

```typescript
import { getReports } from '$lib/services/report.service'

export const load: PageServerLoad = async ({ locals }) => {
  const { data: reports, error } = await getReports(locals.supabase)

  if (error) {
    throw error(500, 'Failed to load reports')
  }

  return { reports }
}
```

---

## Common Page Patterns

### 1. List Page (e.g., `/clients`)

**Structure:**
```
src/routes/(app)/clients/
  +page.svelte          # List view
  +page.server.ts       # Load all clients
  [id]/
    +page.svelte        # Detail view
    +page.server.ts     # Load single client
```

**+page.server.ts:**
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  const { data: clients, error } = await locals.supabase
    .from('clients')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error(500, 'Failed to load clients')

  return { clients: clients ?? [] }
}
```

**+page.svelte:**
```svelte
<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<div class="container">
  <h1>Clients</h1>

  <div class="grid gap-4">
    {#each data.clients as client}
      <a href="/clients/{client.id}" class="card">
        <h2>{client.name}</h2>
        <Badge>{client.type}</Badge>
      </a>
    {/each}
  </div>
</div>
```

---

### 2. Detail Page (e.g., `/clients/[id]`)

**+page.server.ts:**
```typescript
export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: client, error } = await locals.supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !client) {
    throw error(404, 'Client not found')
  }

  return { client }
}
```

---

### 3. Form Page (e.g., `/clients/new`)

**+page.server.ts:**
```typescript
export const actions: Actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData()

    const client = {
      name: formData.get('name')?.toString(),
      email: formData.get('email')?.toString(),
      type: formData.get('type')?.toString()
    }

    // Validation
    if (!client.name || !client.email) {
      return fail(400, { error: 'Name and email are required' })
    }

    // Insert
    const { error: insertError } = await locals.supabase
      .from('clients')
      .insert(client)

    if (insertError) {
      return fail(500, { error: 'Failed to create client' })
    }

    // Redirect to list
    throw redirect(303, '/clients')
  }
}
```

**+page.svelte:**
```svelte
<script lang="ts">
  import { enhance } from '$app/forms'
</script>

<form method="POST" use:enhance>
  <label>
    Name:
    <input type="text" name="name" required />
  </label>

  <label>
    Email:
    <input type="email" name="email" required />
  </label>

  <label>
    Type:
    <select name="type" required>
      <option value="insurance">Insurance</option>
      <option value="private">Private</option>
    </select>
  </label>

  <button type="submit">Create Client</button>
</form>
```

---

### 4. Edit Page (e.g., `/clients/[id]/edit`)

**+page.server.ts:**
```typescript
export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: client, error } = await locals.supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !client) {
    throw error(404, 'Client not found')
  }

  return { client }
}

export const actions: Actions = {
  default: async ({ request, params, locals }) => {
    const formData = await request.formData()

    const updates = {
      name: formData.get('name')?.toString(),
      email: formData.get('email')?.toString()
    }

    const { error: updateError } = await locals.supabase
      .from('clients')
      .update(updates)
      .eq('id', params.id)

    if (updateError) {
      return fail(500, { error: 'Failed to update client' })
    }

    throw redirect(303, `/clients/${params.id}`)
  }
}
```

---

## Protected Routes (Authentication)

All routes in `(app)` group are protected by the auth guard in `src/hooks.server.ts`.

To add a public route:
1. Place it outside `(app)` group, or
2. Update `publicRoutes` array in `hooks.server.ts`

**Example: Public landing page**
```
src/routes/
  +page.svelte          # Public landing page
  (app)/
    dashboard/
      +page.svelte      # Protected dashboard
```

---

## API Routes

For API endpoints (e.g., PDF generation):

**Structure:**
```
src/routes/api/generate-report/
  +server.ts
```

**+server.ts:**
```typescript
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json()
  const { reportId } = body

  if (!reportId) {
    throw error(400, 'Report ID is required')
  }

  // Process report generation...
  const result = { success: true, url: '...' }

  return json(result)
}

export const GET: RequestHandler = async ({ url }) => {
  const id = url.searchParams.get('id')

  // Fetch and return data...
  return json({ data: [] })
}
```

---

## Best Practices

### 1. Use TypeScript Types

Always import and use generated types:
```typescript
import type { PageData, PageServerLoad } from './$types'
```

### 2. Handle Errors Properly

Use SvelteKit's `error()` helper:
```typescript
import { error } from '@sveltejs/kit'

if (!data) {
  throw error(404, 'Not found')
}
```

### 3. Use Service Layer

Don't write database queries directly in `+page.server.ts`:
```typescript
// Good
import { getClients } from '$lib/services/client.service'
const { data } = await getClients(locals.supabase)

// Bad
const { data } = await locals.supabase.from('clients').select('*')
```

### 4. Use Form Actions for Mutations

Use SvelteKit's form actions instead of API routes for form submissions:
```typescript
export const actions: Actions = {
  create: async ({ request, locals }) => { ... },
  update: async ({ request, locals }) => { ... },
  delete: async ({ request, locals }) => { ... }
}
```

**CRITICAL: Form Actions vs API Routes**

**Use Form Actions (`+page.server.ts`)** when:
- Handling HTML form submissions
- Using `use:enhance` in your Svelte component
- Need progressive enhancement (works without JavaScript)
- Examples: Login, logout, create/update/delete operations

**Use API Routes (`+server.ts`)** when:
- Building JSON API endpoints
- Handling non-form requests (fetch, external services)
- Need different HTTP methods on same endpoint
- Examples: PDF generation, signed URLs, webhooks

**Why this matters:**
- Form actions return `ActionResult` (JSON-serializable) that `use:enhance` can parse
- API routes return HTTP `Response` objects (HTML/redirect)
- Using `+server.ts` with `use:enhance` causes: `JSON.parse: unexpected character at line 1 column 1`

**Example - Login/Logout (CORRECT):**
```typescript
// src/routes/auth/logout/+page.server.ts
import { redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  default: async ({ locals: { supabase } }) => {
    await supabase.auth.signOut()
    redirect(303, '/auth/login')
  }
}
```

```svelte
<!-- Component using form action -->
<form method="POST" action="/auth/logout" use:enhance>
  <button type="submit">Logout</button>
</form>
```

### 5. Use `enhance` for Progressive Enhancement

Use `enhance` action for better UX:
```svelte
<script>
  import { enhance } from '$app/forms'
</script>

<form method="POST" use:enhance>
  <!-- Form fields -->
</form>
```

### 6. Follow Naming Conventions

- **Components**: PascalCase (e.g., `ClientCard.svelte`)
- **Routes**: kebab-case (e.g., `new-request`)
- **Services**: camelCase with `.service.ts` suffix

---

## Common Pitfalls

### 1. Not Handling Loading States

Always show loading states:
```svelte
{#if !data.clients}
  <p>Loading...</p>
{:else}
  <!-- Content -->
{/if}
```

### 2. Forgetting to Add RLS Policies

If you add a new table, ensure RLS policies exist or queries will fail.

### 3. Not Using `locals.supabase`

Always use `locals.supabase` (respects user session), not `supabaseServer` (service role) for user-facing queries.

### 4. Not Redirecting After Mutations

Always redirect after successful form submission:
```typescript
throw redirect(303, '/clients')
```

### 5. Using +server.ts for Form Submissions

**WRONG:**
```typescript
// src/routes/auth/logout/+server.ts
export const POST: RequestHandler = async ({ locals }) => {
  await locals.supabase.auth.signOut()
  redirect(303, '/auth/login') // Returns HTTP Response
}
```

```svelte
<form method="POST" action="/auth/logout" use:enhance>
  <!-- This will cause JSON.parse error! -->
</form>
```

**CORRECT:**
```typescript
// src/routes/auth/logout/+page.server.ts
export const actions: Actions = {
  default: async ({ locals }) => {
    await locals.supabase.auth.signOut()
    redirect(303, '/auth/login') // Returns ActionResult
  }
}
```

**Why:** `use:enhance` requires form actions that return ActionResult, not API routes that return HTTP Response.

---

---

## Adding a (shop) Route

The shop routes use a **factory function service pattern** where services are instantiated per-request, unlike (app) routes which often use singletons.

### Step 1: Determine Route Structure

Routes in `(shop)` are for body-shop operations:

**Examples:**
- Dashboard: `/shop/dashboard` → `src/routes/(shop)/shop/dashboard/+page.svelte`
- Job list: `/shop/jobs` → `src/routes/(shop)/shop/jobs/+page.svelte`
- Job detail: `/shop/jobs/[id]` → `src/routes/(shop)/shop/jobs/[id]/+page.svelte`
- Estimate detail: `/shop/estimates/[id]` → `src/routes/(shop)/shop/estimates/[id]/+page.svelte`
- Customer detail: `/shop/customers/[id]` → `src/routes/(shop)/shop/customers/[id]/+page.svelte`

### Step 2: Create Route Directory

```bash
# Example: Adding a new shop jobs detail page
mkdir -p src/routes/\(shop\)/shop/jobs/\[id\]
```

### Step 3: Create Server Load Function Using Factory Pattern

Shop services are **factory functions** that return an object of methods. Instantiate per-request:

**+page.server.ts:**

```typescript
import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { createShopJobService } from '$lib/services/shop-job.service';
import { createShopJobPhotosService } from '$lib/services/shop-job-photos.service';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;

	// Factory pattern: instantiate service with supabase client
	const jobService = createShopJobService(supabase);
	const photosService = createShopJobPhotosService(supabase);

	const { data: job, error: jobError } = await jobService.getJob(params.id);

	if (jobError || !job) {
		error(404, 'Job not found');
	}

	// Load photos for this job
	const { data: photos, error: photosError } = await photosService.getPhotos(params.id);

	return {
		job,
		photos: photos ?? [],
		jobId: params.id
	};
};

export const actions: Actions = {
	updateStatus: async ({ params, request, locals }) => {
		const { supabase } = locals;
		const jobService = createShopJobService(supabase);
		const formData = await request.formData();
		const newStatus = formData.get('status') as string;

		if (!newStatus) {
			return fail(400, { error: 'Status is required' });
		}

		try {
			const { error: updateError } = await jobService.updateJobStatus(
				params.id,
				newStatus as any, // Cast to ShopJobStatus
				locals.user?.id
			);

			if (updateError) {
				return fail(400, { error: updateError.message });
			}

			return { success: true };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Failed to update status' });
		}
	}
};
```

**Compare to (app) service pattern** (singleton, client passed per-call):

```typescript
// (app) pattern: Singleton service, pass client to each method
import { estimatePhotosService } from '$lib/services/estimate-photos.service';

const photos = await estimatePhotosService.getPhotosByEstimate(estimateId, locals.supabase);
```

### Step 4: Create Page Component

**+page.svelte:**

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: PageData } = $props();

	let job = $state(data.job);
	let statusUpdating = $state(false);
</script>

<div class="container mx-auto p-6">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-3xl font-bold">{job.job_number}</h1>
		<Badge>{job.status}</Badge>
	</div>

	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Vehicle Details</Card.Title>
		</Card.Header>
		<Card.Content>
			<p>{job.vehicle_year} {job.vehicle_make} {job.vehicle_model}</p>
			<p class="text-sm text-gray-600">{job.vehicle_reg}</p>
		</Card.Content>
	</Card.Root>

	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Update Status</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/updateStatus" use:enhance>
				<select name="status" class="mb-4 p-2 border rounded">
					<option value="">Select new status...</option>
					<option value="checked_in">Checked In</option>
					<option value="in_progress">In Progress</option>
					<option value="quality_check">Quality Check</option>
				</select>
				<Button type="submit" disabled={statusUpdating}>Update</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.photos.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Photos ({data.photos.length})</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-3 gap-4">
					{#each data.photos as photo}
						<div class="border rounded overflow-hidden">
							<img src={photo.storage_path} alt={photo.label} class="w-full h-48 object-cover" />
							<p class="p-2 text-sm">{photo.label}</p>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
```

### Step 5: Photo Column Differences

Shop photos use different columns than assessment photos:

| Aspect | Assessment Photos | Shop Photos |
|--------|------------------|------------|
| **Ordering column** | `display_order` | `sort_order` |
| **Labeling column** | `label` | `label` |
| **Storage path column** | `photo_path` | `storage_path` |
| **Category column** | None | `category` (e.g., "damage", "work_in_progress") |
| **Service** | Singleton (`estimatePhotosService`) | Factory (`createShopJobPhotosService()`) |

Use the correct service for your route:
- For assessment photos: `import { estimatePhotosService } from '$lib/services/estimate-photos.service'`
- For shop photos: `import { createShopJobPhotosService } from '$lib/services/shop-job-photos.service'`

---

## Service Patterns at a Glance

| Aspect | (app) Pattern | (shop) Pattern |
|--------|--------------|----------------|
| **Export** | Singleton class instance | Factory function |
| **Import** | `import { serviceInstance }` | `import { createServiceName }` |
| **Instantiation** | Already instantiated | `const svc = createServiceName(supabase)` |
| **Method calls** | `serviceInstance.method(arg, supabase)` | `svc.method(arg)` |
| **Per-request state** | Managed externally | Encapsulated in closure |
| **Example** | `estimatePhotosService.getPhotosByEstimate(id, locals.supabase)` | `photosService.getPhotos(jobId)` |

---

## Examples from ClaimTech

### Example 1: Assessment Detail Page

**Route:** `/work/assessments/[appointment_id]`

**Structure:**
```
src/routes/(app)/work/assessments/[appointment_id]/
  +page.svelte
  +page.server.ts
```

**+page.server.ts:**
```typescript
export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: appointment } = await locals.supabase
    .from('appointments')
    .select('*, inspection:inspections(*), request:requests(*)')
    .eq('id', params.appointment_id)
    .single()

  if (!appointment) {
    throw error(404, 'Appointment not found')
  }

  // Load assessment if exists
  const { data: assessment } = await locals.supabase
    .from('assessments')
    .select('*')
    .eq('appointment_id', params.appointment_id)
    .single()

  return {
    appointment,
    assessment
  }
}
```

---

---

## Common Pitfalls: (app) vs (shop)

### Service Pattern Mismatches

**❌ WRONG: Using singleton pattern with shop service**
```typescript
// Incorrect - shop services are factories, not singletons
import { shopJobService } from '$lib/services/shop-job.service';
const job = await shopJobService.getJob(id); // Error: shopJobService is a function
```

**✅ CORRECT: Instantiate shop service factory**
```typescript
// Correct - instantiate factory with supabase client
import { createShopJobService } from '$lib/services/shop-job.service';
const jobService = createShopJobService(locals.supabase);
const { data: job } = await jobService.getJob(id);
```

### Importing from Wrong Route Group

**❌ WRONG: Import shop components in (app) routes**
```typescript
// This couples route groups and breaks modularity
import JobCard from '$lib/components/shop/JobCard.svelte';
// Use this in (app)/dashboard instead
```

**✅ CORRECT: Keep components domain-specific**
```typescript
// (app) routes use: $lib/components/assessment/, $lib/components/request/
// (shop) routes use: $lib/components/shop/
import JobCard from '$lib/components/shop/JobCard.svelte'; // Only in (shop) routes
```

### Photo Service Confusion

**❌ WRONG: Using assessment photo service for shop**
```typescript
// Wrong - assessment photos have different schema
const photos = await estimatePhotosService.getPhotosByEstimate(jobId, locals.supabase);
// This uses estimate_photos table, not shop_job_photos
```

**✅ CORRECT: Use shop-specific photo service**
```typescript
// Right - shop photos have sort_order and category columns
const photosService = createShopJobPhotosService(locals.supabase);
const { data: photos } = await photosService.getPhotos(jobId, 'damage');
```

### Untyped Queries

Shop tables (shop_jobs, shop_estimates, etc.) are not yet in `database.types.ts`, so you may see untyped queries:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data: jobs } = await (supabase as any)
	.from('shop_jobs')
	.select('*');
```

This is temporary. When shop tables are added to the database schema and types generated, remove the type assertion.

---

## Related Documentation
- Project Architecture: `../System/project_architecture.md`
- Service Layer Pattern: See services in `src/lib/services/`
- Shop Module Overview: `../System/shop_module_overview.md` (for comprehensive shop architecture)
