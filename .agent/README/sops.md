# Standard Operating Procedures Index

**Last Updated**: January 30, 2025
**Total SOPs**: 19 step-by-step guides

---

## Overview

Standard Operating Procedures for database operations, service layer development, authentication/security, UI implementation, and debugging. Each SOP provides step-by-step instructions, code templates, and best practices.

---

## 🗄️ Database Operations

### 1. Adding Database Migrations ⭐ ESSENTIAL
- **File**: [adding_migration.md](../SOP/adding_migration.md)
- **Size**: 543 lines
- **Read When**: Creating/modifying tables, adding RLS policies, creating indexes/triggers

**Contains**:
- Migration file naming convention (`XXX_description.sql`)
- SQL migration templates (CREATE TABLE, ALTER TABLE, RLS policies)
- Testing migrations locally
- Applying to production via Supabase
- Rolling back migrations
- Common pitfalls (RLS order, constraint naming)

**Quick Template**:
```sql
-- migrations/XXX_description.sql
-- Up migration
CREATE TABLE IF NOT EXISTS table_name (...);
-- RLS policies
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY...;
-- Down migration (commented)
-- DROP TABLE...;
```

---

### 2. Adding Page Routes
- **File**: [adding_page_route.md](../SOP/adding_page_route.md)
- **Size**: 742 lines
- **Read When**: Creating new pages, API endpoints, dynamic routes

**Contains**:
- SvelteKit routing patterns (`+page.svelte`, `+page.server.ts`, `+layout.svelte`)
- Page load functions (`load()`)
- Form actions vs API routes decision tree
- Dynamic routes (`[id]`, `[...rest]`)
- Protected routes (auth checks in hooks)
- Layout hierarchy

---

## 🔧 Service & Data Layer

### 1. Working with Services ⭐ ESSENTIAL
- **File**: [working_with_services.md](../SOP/working_with_services.md)
- **Size**: 859 lines
- **Read When**: Creating services, querying database, implementing CRUD, writing data access logic

**Contains**:
- Service layer architecture overview
- ServiceClient pattern (RLS authentication requirement)
- CRUD operation templates
- Query patterns (filtering, sorting, pagination)
- Error handling strategies
- Transaction management
- Testing services

**Quick Pattern**:
```typescript
export class MyService {
  constructor(private client: ServiceClient) {}

  async list() {
    const { data, error } = await this.client
      .from('table')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
```

**Critical**: Must accept ServiceClient parameter for RLS authentication

---

### 2. Working with Assessment-Centric Architecture ⭐ CRITICAL
- **File**: [working_with_assessment_centric_architecture.md](../SOP/working_with_assessment_centric_architecture.md)
- **Size**: 1,081 lines | **Last Updated**: Jan 2025
- **Read When**: Working with assessments, implementing stage-based workflows, understanding subprocess patterns, building list pages

**Contains**:
- Assessment-centric principles (one assessment per request)
- 10-stage pipeline explained in detail
- One assessment per request pattern
- Nullable foreign key patterns (dual-check RLS)
- Stage-based filtering (not status-based)
- Subprocess implementation (FRC, Additionals)
- Idempotent operations
- Best practices & anti-patterns

**Critical Concepts**:
- Assessment created WITH request (not after)
- Stage-based workflow (10 stages, not statuses)
- Nullable FKs until stage reached (e.g., `appointment_id` NULL until `appointment_scheduled`)
- Constraint enforcement via CHECK constraints
- Subprocess independence (don't affect main assessment stage)

**Essential Reading**: Core to understanding ClaimTech's data architecture

---

### 3. Service Client Authentication 🔴 CRITICAL
- **File**: [service_client_authentication.md](../SOP/service_client_authentication.md)
- **Size**: 333 lines
- **Read When**: Creating services, fixing RLS authentication errors, understanding service injection

**Contains**:
- ServiceClient parameter pattern (why it's required)
- RLS authentication requirements
- Dependency injection pattern
- Server-side vs client-side clients
- Common RLS auth errors and solutions

**Critical Pattern**:
```typescript
// ✅ CORRECT - Accept ServiceClient parameter
export class MyService {
  constructor(private client: ServiceClient) {}
}

// Usage in load function
export const load: PageServerLoad = async ({ locals }) => {
  const service = new MyService(locals.supabase);
  return { data: await service.list() };
};

// ❌ WRONG - Don't create client inside service
export class MyService {
  private client = supabase; // NO! Bypasses RLS
}
```

**Why Critical**: Violating this pattern causes RLS policy failures

---

## 🔐 Authentication & Security (4 SOPs)

### 1. Implementing Form Actions & Auth ⭐ MUST READ
- **File**: [implementing_form_actions_auth.md](../SOP/implementing_form_actions_auth.md)
- **Size**: 1,191 lines (largest SOP)
- **Read When**: Implementing login/logout, creating form actions, choosing API routes vs form actions, auth debugging

**Contains**:
- Form actions vs API routes decision tree
- Authentication patterns (login, logout, signup)
- Session management (cookies, JWT)
- Cookie handling (httpOnly, secure, sameSite)
- Protected routes implementation
- Error handling and validation
- Progressive enhancement

**Decision Tree**:
- **Form Actions**: Page refreshes, progressive enhancement, simple forms
- **API Routes**: AJAX calls, complex interactions, programmatic access

---

### 2. Fixing RLS Infinite Recursion
- **File**: [fixing_rls_recursion.md](../SOP/fixing_rls_recursion.md)
- **Size**: 935 lines
- **Read When**: Encountering "stack depth limit exceeded" errors

**Contains**:
- JWT claims pattern (`auth.uid()`, `auth.jwt()`)
- Avoiding recursive RLS calls (don't reference same table in policy)
- Policy refactoring strategies
- Testing recursion fixes

**Critical**: Use `auth.uid()` instead of table lookups in RLS policies

---

### 3. Fixing RLS Policy Errors ✅ UPDATED
- **File**: [fixing_rls_insert_policies.md](../SOP/fixing_rls_insert_policies.md)
- **Size**: 947 lines | **Last Updated**: Jan 2025
- **Read When**: RLS INSERT fails, RLS SELECT returns no rows, RLS UPDATE returns 0 rows

**Contains**:
- Debugging INSERT policies (permission denied errors)
- Debugging SELECT policies (empty results, count mismatches)
- Debugging UPDATE policies (0 rows updated)
- Dual-check pattern for nullable FKs
- Testing RLS policies via MCP
- Common error patterns and solutions

**Dual-Check Pattern** (for nullable FKs):
```sql
CREATE POLICY "engineers_select" ON table_name FOR SELECT
USING (
  is_admin() OR
  -- Direct: FK linked to engineer's record
  (appointment_id IS NOT NULL AND
   appointment_id IN (SELECT id FROM appointments WHERE engineer_id = auth.uid()))
  OR
  -- Indirect: via parent relationship (when FK is NULL)
  (appointment_id IS NULL AND
   EXISTS (SELECT 1 FROM requests WHERE id = table_name.request_id AND ...))
);
```

---

### 4. Password Reset Flow ✅ NEW
- **File**: [password_reset_flow.md](../SOP/password_reset_flow.md)
- **Size**: 761 lines
- **Read When**: Implementing or debugging password reset

**Contains**:
- Two-step flow pattern (request reset → verify OTP → set password)
- Supabase PKCE configuration
- Email template setup
- OTP handling and validation
- Error handling (expired tokens, invalid OTPs)
- Security considerations

---

## 🎨 UI & Features (4 SOPs)

### 1. Implementing Role-Based Filtering
- **File**: [implementing_role_based_filtering.md](../SOP/implementing_role_based_filtering.md)
- **Size**: 885 lines
- **Read When**: Filtering data by user role, implementing admin vs engineer views, adding role checks

**Contains**:
- Complete step-by-step implementation
- Database queries by role (admin sees all, engineer sees assigned)
- Service-level filtering
- UI conditional rendering
- Badge count filtering by role

**Pattern**:
```typescript
// Service layer
async listForUser(userId: string, isAdmin: boolean) {
  let query = this.client.from('assessments').select('*');

  if (!isAdmin) {
    // Engineers only see assigned assessments
    query = query.in('appointment_id',
      this.client.from('appointments')
        .select('id')
        .eq('engineer_id', userId)
    );
  }

  const { data, error } = await query;
  return data || [];
}
```

---

### 2. Implementing Badge Counts ⭐ NEW
- **File**: [implementing_badge_counts.md](../SOP/implementing_badge_counts.md)
- **Size**: 803 lines | **Last Updated**: Jan 27, 2025
- **Read When**: Adding sidebar badges, fixing badge count mismatches, optimizing badge queries

**Contains**:
- Assessment-centric badge patterns (count by stage)
- Service implementation (badge count methods)
- Load function setup (polling mechanism)
- Polling mechanism (prevents race conditions)
- Troubleshooting mismatches (RLS issues, query errors)
- Performance optimization

**Critical**: Use assessment-based queries, not request-based

---

### 3. Creating Components
- **File**: [creating-components.md](../SOP/creating-components.md)
- **Size**: 796 lines
- **Read When**: Building reusable Svelte components

**Contains**:
- Svelte 5 runes (`$state`, `$derived`, `$effect`)
- TypeScript integration
- Props and events
- Composition patterns (snippets, slots)
- Testing components

---

### 4. FRC Removed Lines Handling ⭐ NEW
- **File**: [frc_removed_lines.md](../SOP/frc_removed_lines.md)
- **Size**: ~350 lines | **Last Updated**: Jan 30, 2025
- **Read When**: Working with FRC, debugging removed line calculations, implementing additionals

**Contains**:
- Dual-line pattern (original + removal = net zero)
- Negative amount calculations
- Visual indicators (REMOVED vs REMOVAL badges)
- Auto-merge behavior and testing
- Database schema for removal lines
- Troubleshooting common issues

**Critical Concepts**:
- Removal line has negative amounts that subtract from totals
- Both original (+R12k) and removal (-R12k) appear in FRC
- Filters removed from `composeFinalEstimateLines()` (lines 116, 164)
- Auto-merge preserves decisions via stable fingerprints

**Testing Procedure**: Remove estimate line → verify dual lines in FRC → verify net zero totals

---

### 5. Navigation-Based State Transitions ⭐ NEW
- **File**: [navigation_based_state_transitions.md](../SOP/navigation_based_state_transitions.md)
- **Size**: 591 lines | **Last Updated**: Jan 29, 2025
- **Read When**: Implementing state transitions via navigation

**Contains**:
- Server-side-first pattern (delegate to load functions)
- State transition via `goto()` + idempotent load function
- Page invalidation (`invalidate('supabase:auth')`)
- Error handling

**Pattern**: Navigate → load function updates state idempotently → page renders updated state

---

### 6. Page Updates and Badge Refresh ⭐ NEW
- **File**: [page_updates_and_badge_refresh.md](../SOP/page_updates_and_badge_refresh.md)
- **Size**: 284 lines | **Last Updated**: Jan 29, 2025
- **Read When**: Implementing page navigation or badge refresh

**Contains**:
- Navigation-first approach (navigate, then let load function handle updates)
- Badge calculation patterns (assessment-based queries)
- Polling mechanism (automatic badge refresh)

---

## 🐛 Debugging & Testing (5 SOPs)

### 1. Debugging Supabase Auth Hooks
- **File**: [debugging_supabase_auth_hooks.md](../SOP/debugging_supabase_auth_hooks.md)
- **Size**: 590 lines
- **Read When**: Auth hooks fail or throw errors

**Contains**:
- Custom auth hook troubleshooting
- Testing with MCP
- Type casting fixes
- Common hook errors

---

### 2. Debugging Auth User Creation Errors
- **File**: [debugging_auth_user_creation_errors.md](../SOP/debugging_auth_user_creation_errors.md)
- **Size**: 442 lines
- **Read When**: User signup/creation fails

**Contains**:
- Constraint violation fixes
- Trigger error debugging
- RLS conflict resolution

---

### 3. Handling Race Conditions in Number Generation ✅ NEW
- **File**: [handling_race_conditions_in_number_generation.md](../SOP/handling_race_conditions_in_number_generation.md)
- **Size**: 458 lines | **Last Updated**: Jan 2025
- **Read When**: Implementing sequential number generation (request numbers, assessment numbers)

**Contains**:
- Retry logic with exponential backoff
- Race condition prevention
- Testing concurrent operations
- Error handling strategies

**Critical**: Use for sequential number generation to avoid duplicates

---

### 4. Testing Guide
- **File**: [testing_guide.md](../SOP/testing_guide.md)
- **Size**: 421 lines
- **Read When**: Writing tests

**Contains**:
- Unit testing patterns (Vitest)
- E2E testing with Playwright
- Test organization
- Mocking strategies

---

## 📋 How to Use This Index

### For Database Work
1. Read [Adding Migrations](#1-adding-database-migrations)
2. Read [Working with Services](#1-working-with-services)
3. Check [Service Client Authentication](#3-service-client-authentication)
4. Review [Fixing RLS Policies](#3-fixing-rls-policy-errors) if issues arise

### For Authentication
1. Read [Implementing Form Actions & Auth](#1-implementing-form-actions--auth)
2. Check [Fixing RLS Policies](#3-fixing-rls-policy-errors)
3. Review [Password Reset Flow](#4-password-reset-flow) if needed
4. Check [Fixing RLS Recursion](#2-fixing-rls-infinite-recursion) if recursion errors

### For Assessment Features
1. Read [Working with Assessment-Centric Architecture](#2-working-with-assessment-centric-architecture) - MUST READ
2. Check [Implementing Badge Counts](#2-implementing-badge-counts)
3. Review [Role-Based Filtering](#1-implementing-role-based-filtering)
4. Follow [Navigation-Based State Transitions](#4-navigation-based-state-transitions)

### For Bug Fixes
1. Check relevant debugging SOP (above)
2. Review [System Bug Postmortems](./system_docs.md#bug-postmortems)
3. Check [FAQ](./faq.md)

---

## Related Indexes
- **[System Docs](./system_docs.md)** - Architecture & database documentation
- **[Task Guides](./task_guides.md)** - Use-case navigation
- **[Changelog](./changelog.md)** - Recent updates

---

**Maintenance**: Update this index when adding new SOPs
**Last Review**: January 30, 2025
