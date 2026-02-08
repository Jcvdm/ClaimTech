# Deployment Readiness Audit - ClaimTech

**Created**: 2026-02-08
**Status**: Active
**Context**: Pre-deployment rollout audit (initial internal use, then employee expansion)

---

## Executive Summary

ClaimTech has a **solid architectural foundation** — proper RLS coverage, role-based access, parameterized queries, session-only auth, and immutable audit logging. However, there are issues across **4 severity tiers** that should be addressed before and during rollout.

**Verdict**: Safe for limited internal testing with awareness of the issues below. Several items (particularly RLS gaps and missing user feedback) should be fixed before expanding to employees.

---

## TIER 1 — MUST FIX BEFORE EMPLOYEE ROLLOUT

These are security or data integrity issues that could expose data or cause real problems.

### 1.1 Overly Permissive RLS on 4 Assessment Detail Tables
**Risk**: Data leak between users
**Tables affected**:
- `assessment_interior_mechanical`
- `assessment_accessories`
- `assessment_tyres`
- `assessment_damage`

**Problem**: These tables use `USING (true)` / `WITH CHECK (true)` policies, meaning ANY authenticated user can read/modify ANY record. The parent `assessments` table has proper role-based RLS, but these child tables bypass it entirely.

**Fix**: Create a new migration that drops the permissive policies and adds role-based policies matching the parent assessment access pattern (admin full access, engineers only via assigned appointments/inspections). Follow the pattern used in migration 059 for `assessment_estimates`.

**File**: `supabase/migrations/006_create_assessments.sql` (lines 248-256)
**Effort**: ~1 migration file

### 1.2 Verify JWT Claims Hook is Enabled
**Risk**: If disabled, all RLS policies using `user_role` silently fail
**Problem**: The JWT hook (`custom_access_token_hook`) must be manually enabled in Supabase Dashboard under Authentication → Hooks. There's no runtime check.

**Fix**:
- Verify in Supabase Dashboard that the hook is enabled
- Add a startup validation in `src/hooks.server.ts` that warns if JWT claims are missing `user_role`

### 1.3 Overly Broad SELECT on Financial Tables
**Risk**: Any authenticated user can read all estimates, valuations, FRC data
**Tables**: `assessment_estimates`, `assessment_vehicle_values`, `assessment_frc`
**Problem**: SELECT policies use `USING (true)` — any logged-in user can query all financial data even if they don't have access to the parent assessment.

**Fix**: Restrict SELECT to users who can access the parent assessment (same pattern as assessment RLS).

---

## TIER 2 — FIX BEFORE EMPLOYEE ROLLOUT (UX Critical)

These are user experience issues that will cause confusion, support tickets, and lost confidence.

### 2.1 No Toast/Notification System
**Impact**: Users get no feedback on success or failure of actions
**Scope**: App-wide (~40+ pages affected)
**Details**: There's no notification library integrated. 9 explicit `// TODO: Show toast` comments exist. Users will click buttons with no visible result.

**Fix**: Integrate a toast library (e.g., `svelte-french-toast` or `svelte-sonner`) and add success/error toasts to all user actions.

### 2.2 Browser `alert()` / `confirm()` / `prompt()` Usage
**Count**: 32 instances across the codebase
**Impact**: Breaks the PWA native-app feel, looks unprofessional, blocks all interaction
**Examples**:
- `quotes/new/+page.svelte` — alert for save feedback
- `work/appointments/+page.svelte` — prompt for reschedule reason
- Multiple pages — confirm for destructive actions

**Fix**: Replace with modal dialogs or the new toast system. Use existing Dialog components.

### 2.3 Stub/Fake Features Still in UI
**Impact**: Users will click buttons that do nothing real
**Broken features**:
- **Quotes page** (`/quotes/new/`) — hardcoded demo data, no API calls, `console.log` only
- **Generate Report** button (`/work/finalized-assessments/`) — fake 1.5s delay, no actual generation
- **Download Documents** button (`/work/finalized-assessments/`, `/work/archive/`) — stub implementations
- **Generate Package ZIP** (`/work/assessments/[id]`) — not implemented

**Fix**: Either implement these features or remove/disable the buttons with "Coming soon" labels.

### 2.4 No Error Pages
**Impact**: Users see raw SvelteKit error pages on failures
**Problem**: No `+error.svelte` files exist anywhere in the app. No 404, no 500, no friendly error page.

**Fix**: Create `src/routes/+error.svelte` with a user-friendly error page.

### 2.5 Auto-Save Has No User Feedback
**File**: `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte`
**Impact**: Users don't know if their work is being saved
**Problem**: Auto-save runs every 30s but there's no indicator. `lastSaved` state exists but is never displayed. No error state if save fails.

**Fix**: Add a save status indicator (e.g., "Saved 5 seconds ago" / "Saving..." / "Save failed").

---

## TIER 3 — FIX DURING INITIAL ROLLOUT

These are quality-of-life issues you'll encounter during internal use. Track them and fix as you go.

### 3.1 Missing Toast Notifications (Specific Locations)
| Location | Action Missing Feedback |
|----------|------------------------|
| `EstimateTab.svelte` | Parts list copy to clipboard |
| `TyresTab.svelte` (4 places) | Save/error for tyre data |
| `FRC page` (2 places) | Error notifications |
| `Finalized assessments` | Report generation, document download |
| `Archive page` | Document download |

### 3.2 Navigation Dead Ends
**Problem**: Only 4 routes have explicit back buttons. Users on detail pages (especially mobile) may struggle to navigate back.
**Fix**: Add consistent back navigation to all detail/form pages.

### 3.3 Offline Sync Status Not Visible
**Problem**: The offline sync infrastructure works but there's no UI showing sync status. Users won't know if changes are queued, syncing, or failed.
**Fix**: Add a sync status component showing pending/failed/completed items.

### 3.4 Print/PDF Image Loading
**Problem**: Print pages use a 3-second timeout for images. On slow connections, images may not load and print without them — silently.
**Fix**: Add a loading indicator and warn if images fail to load.

### 3.5 Route-Level Access Guards
**Problem**: Sidebar hides admin-only items, but there are no route-level guards. If an engineer knows the URL, they can navigate to admin pages (server-side RLS still protects data, but the page may error or show empty).
**Fix**: Add role checks in `+page.server.ts` load functions for admin-only routes.

### 3.6 Error Handling Shows Nothing to Users
**Problem**: 32 routes catch errors but only `console.error()` them. Users see blank states or broken UI.
**Fix**: Surface error messages in the UI, even if just "Something went wrong. Please try again."

---

## TIER 4 — NICE TO HAVE / TRACK FOR LATER

### 4.1 Console.log in Production Code
4 `console.log` statements in production routes that should be removed or converted to proper logging.

### 4.2 Hardcoded Configuration Values
`EstimateTab.svelte` has hardcoded values marked `// TODO: Get from company settings`. Should eventually pull from a settings table.

### 4.3 Image Optimization
`generate-photos-pdf` has `// TODO: Add sharp library for server-side image resizing`. PDFs with large photos will be slow to generate.

### 4.4 Rate Limiting
No rate limiting on auth endpoints. Low risk for internal use, but should be added before wider deployment.

### 4.5 RLS Policy on Appointments (Migration 005)
Comment in migration: `-- TODO: Replace with proper policies based on user roles in production`. Verify this was addressed in later migrations (likely was, given migrations 046+).

---

## What Will Work Well

The audit also found many things that are solid:

- **Authentication flow** — Proper session-only cookies, JWT validation, auth guards on routes
- **SQL injection protection** — All 331+ database calls use parameterized Supabase client, zero raw SQL
- **Service layer error handling** — 342+ error/throw/catch patterns, consistent across 31 service files
- **Audit logging** — Immutable insert-only audit_logs table
- **Storage security** — All buckets set to private, authenticated access only
- **Multi-role access control** — Admin/engineer separation throughout
- **Assessment-centric architecture** — Clean 10-stage pipeline with proper stage transitions
- **PWA infrastructure** — Service worker, IndexedDB caching, background sync framework in place

---

## Recommended Rollout Plan

### Phase 1: Pre-Internal Testing (Before You Start Using It)
- [ ] Fix Tier 1 RLS issues (1.1, 1.2, 1.3)
- [ ] Verify JWT hook is enabled in Supabase Dashboard
- [ ] Add basic toast notification system (2.1)
- [ ] Create error page (2.4)

### Phase 2: During Internal Testing (You Using It)
- [ ] Replace browser alerts with modals (2.2)
- [ ] Disable or remove stub features (2.3)
- [ ] Add auto-save indicator (2.5)
- [ ] Track and fix bugs as you find them

### Phase 3: Before Employee Rollout
- [ ] Fix all Tier 3 items
- [ ] Add route-level access guards (3.5)
- [ ] Add user-facing error messages (3.6)
- [ ] Full manual testing of all workflows
- [ ] Create user training documentation

### Phase 4: Post-Employee Rollout
- [ ] Address Tier 4 items based on feedback
- [ ] Monitor error logs
- [ ] Add rate limiting and security hardening
