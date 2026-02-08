# Deployment Readiness Audit - ClaimTech

**Created**: 2026-02-08
**Status**: Active
**Context**: Pre-deployment rollout audit (initial internal use, then employee expansion)

---

## Executive Summary

ClaimTech has a **solid architectural foundation** — proper RLS coverage, role-based access, parameterized queries, session-only auth, and immutable audit logging. However, there are issues across **4 severity tiers** that should be addressed before and during rollout.

**Verdict**: Safe for limited internal testing with awareness of the issues below. Several items (particularly RLS gaps and missing user feedback) should be fixed before expanding to employees.

---

## Part 1: End-to-End Flow Analysis

### Flow 1: User Management (Admin creates engineers)

**What works:**
- Admin can create engineer accounts at `/engineers/new`
- Supabase auth user created with temporary password
- Profile auto-created via DB trigger (`handle_new_user()`)
- Password reset email sent to new engineer
- Admin can list, view, edit, deactivate engineers
- Role stored in `user_profiles.role` and embedded in JWT claims
- Admin-only route protection in layout server

**Issues found:**
| Issue | Severity | Details |
|-------|----------|---------|
| No admin user creation UI | HIGH | Only 'engineer' role can be created. Admins must be made via Supabase console |
| Password reset redirect bug | HIGH | `/auth/callback` ignores the `next` parameter — always redirects to `/auth/reset-password` instead of `/account/set-password` |
| No role change UI | MEDIUM | Can't promote engineer to admin or vice versa |
| No self-service profile editing | LOW | Engineers can't update their own profile |
| No email format validation | LOW | Only HTML5 `type=email`, no server-side check |

### Flow 2: Client/Insurer Management

**What works:**
- Full CRUD for clients at `/clients` (create, list, view, edit, soft delete)
- Two client types: `insurance` and `private`
- Per-client write-off percentages (borderline, total, salvage)
- Per-client Terms & Conditions (assessment, estimate, FRC) that override company defaults
- Quick-add client modal inside request creation form
- T&Cs validation (10,000 char limit)
- Soft delete pattern (never loses data)

**Issues found:**
| Issue | Severity | Details |
|-------|----------|---------|
| No duplicate client prevention | MEDIUM | No uniqueness constraint on name — easy to create "ABC Insurance" twice |
| No way to restore deactivated clients | LOW | Soft-deleted clients can't be reactivated from UI |
| Delete uses `confirm()` | LOW | Browser alert instead of modal |
| No client email validation server-side | LOW | Only HTML5 validation |

### Flow 3: Claims/Assessment Lifecycle (Core Workflow)

**What works:**
- Request creation at `/requests/new` with auto-generated number (CLM/REQ-YYYY-NNN)
- Assessment auto-created with request (assessment-centric architecture)
- 10-stage pipeline: `request_submitted` → `archived`/`cancelled`
- Auto-transitions when engineer opens assessment (early stages → `assessment_in_progress`)
- Default records created idempotently (tyres, damage, values, estimates)
- 13 tabs for data capture: summary, identification, exterior 360, interior/mechanical, tyres, damage, values, pre-incident, estimate, finalize, additionals, FRC, audit
- Comprehensive data model with photos for every section
- Auto-save on tab change
- Estimate finalization freezes rates (snapshot pattern)
- Full audit trail on all changes
- Retry logic for number generation (handles race conditions)

**Issues found:**
| Issue | Severity | Details |
|-------|----------|---------|
| No validation before finalization | HIGH | Can finalize estimate with empty/incomplete data tabs |
| `estimate_sent` stage never used | MEDIUM | Defined in DB but no transition triggers it |
| No "complete" action on assessment | MEDIUM | User just leaves the page — no completion confirmation |
| Auto-save has no UI feedback | MEDIUM | Users don't know saves are happening (Tier 2.5 above) |
| No required-field enforcement | MEDIUM | Every data field is optional — can submit nearly empty assessments |
| No claim_number validation for insurance type | LOW | Should require claim number when request type is 'insurance' |
| Vehicle data not pre-validated | LOW | Can proceed through pipeline with no vehicle info |

### Flow 4: Report Generation & Output

**What works:**
- **6 document types** all fully implemented:
  - Assessment Report (PDF via Puppeteer)
  - Estimate Report (PDF with T&Cs fallback chain)
  - FRC Report (PDF with signed URL, 1hr expiry)
  - Additionals Letter (PDF)
  - Photos PDF (base64 embedded, 8 organized sections)
  - Photos ZIP (JSZip, organized folders, concurrent downloads)
- Batch "Generate All Documents" with SSE progress streaming
- Print routes with image-wait logic and `window.print()` fallback
- Document proxy endpoint with auth, ETag caching, proper content types
- Photo proxy for private bucket access
- Timeout handling optimized for Vercel Hobby (8-second target)
- Retry logic (3x exponential backoff) on uploads and downloads
- Keep-alive SSE pings prevent browser timeout during generation

**Issues found:**
| Issue | Severity | Details |
|-------|----------|---------|
| No email sending | HIGH | Documents can be generated and downloaded but not emailed to clients/insurers |
| Finalized assessments page has stub buttons | HIGH | "Generate Report" and "Download Docs" buttons on list pages are fake (simulated delays) — the real generation works from the assessment detail page |
| Image resizing TODO | MEDIUM | Photos PDF uses CSS sizing, no server-side resize (slow for large photos) |
| Print image timeout 3s | LOW | May miss images on slow connections |
| FRC uses signed URL (1hr expiry) | LOW | If user doesn't download quickly, link expires |

---

## Part 2: Security & Infrastructure Issues

### TIER 1 — MUST FIX BEFORE EMPLOYEE ROLLOUT

### 1.1 Overly Permissive RLS on 4 Assessment Detail Tables
**Risk**: Data leak between users
**Tables affected**:
- `assessment_interior_mechanical`
- `assessment_accessories`
- `assessment_tyres`
- `assessment_damage`

**Problem**: These tables use `USING (true)` / `WITH CHECK (true)` policies, meaning ANY authenticated user can read/modify ANY record. The parent `assessments` table has proper role-based RLS, but these child tables bypass it entirely.

**Fix**: Create a new migration with role-based policies matching the parent assessment access pattern.

### 1.2 Verify JWT Claims Hook is Enabled
**Risk**: If disabled, all RLS policies using `user_role` silently fail
**Fix**: Verify in Supabase Dashboard (Authentication → Hooks) and add runtime validation.

### 1.3 Overly Broad SELECT on Financial Tables
**Risk**: Any authenticated user can read all estimates, valuations, FRC data
**Tables**: `assessment_estimates`, `assessment_vehicle_values`, `assessment_frc`
**Fix**: Restrict SELECT to users who can access the parent assessment.

---

### TIER 2 — FIX BEFORE EMPLOYEE ROLLOUT (UX Critical)

### 2.1 No Toast/Notification System
Users get zero feedback on success/failure. 9 explicit `// TODO: Show toast` comments.

### 2.2 Browser `alert()`/`confirm()`/`prompt()` — 32 instances
Breaks the PWA native-app feel.

### 2.3 Stub/Fake Features Still in UI
Quotes page is entirely fake. Finalized assessments list page buttons are stubs.

### 2.4 No Error Pages
No `+error.svelte` — users see raw SvelteKit errors.

### 2.5 Auto-Save Has No User Feedback
`lastSaved` state exists but is never displayed.

---

### TIER 3 — FIX DURING INITIAL ROLLOUT

- 3.1 Missing toast notifications at specific locations
- 3.2 Navigation dead ends (only 4 routes have back buttons)
- 3.3 Offline sync status not visible to users
- 3.4 Print/PDF image loading timeout (3s, silent failure)
- 3.5 Route-level access guards missing (URL guessing bypasses sidebar)
- 3.6 Error handling only logs to console, nothing shown to users

### TIER 4 — NICE TO HAVE

- 4.1 Console.log in production code
- 4.2 Hardcoded configuration values in EstimateTab
- 4.3 Image optimization (sharp library TODO)
- 4.4 Rate limiting on auth endpoints
- 4.5 Verify appointment RLS migration was superseded

---

## Part 3: Testing Strategy

### Recommendation: Manual Test Scripts + Targeted Automated Tests

Given the app's current state (no existing test infrastructure), here's the practical approach:

### A. Manual Test Checklist (Use During Internal Testing)

These are step-by-step scripts you walk through to verify each flow works:

**Test 1: Engineer Onboarding**
- [ ] Log in as admin
- [ ] Navigate to Engineers → New Engineer
- [ ] Fill form (name, email, phone, province, specialization)
- [ ] Submit — verify engineer appears in list
- [ ] Check email received with password reset link
- [ ] Click link → verify redirect to set-password page
- [ ] Set password → verify login works with new credentials
- [ ] Verify new engineer sees correct dashboard (not admin pages)
- [ ] As admin: deactivate engineer → verify they can't access app

**Test 2: Client Setup**
- [ ] Navigate to Clients → New Client
- [ ] Create insurance client (fill all fields including write-off %)
- [ ] Create private client
- [ ] Verify both appear in client list
- [ ] Edit a client → change contact info → verify saved
- [ ] Set custom T&Cs → verify they persist
- [ ] Delete a client → verify soft-deleted (gone from list, not from DB)

**Test 3: Full Claim Lifecycle**
- [ ] Create new request → select insurance client → fill vehicle info
- [ ] Verify request number generated (CLM-YYYY-NNN)
- [ ] Verify assessment auto-created
- [ ] Schedule inspection → verify stage transitions
- [ ] Create appointment → assign engineer
- [ ] As engineer: open assessment → verify auto-transition to `assessment_in_progress`
- [ ] Fill each tab:
  - [ ] Identification: enter vehicle details, upload 5 photos
  - [ ] Exterior 360: upload 8 position photos
  - [ ] Interior/Mechanical: fill systems check, upload photos
  - [ ] Tyres: fill 4 tyres with condition and tread depth
  - [ ] Damage: add 2-3 damage records with photos
  - [ ] Values: enter trade/market/retail values
  - [ ] Pre-incident estimate: add line items
  - [ ] Estimate: add line items with parts, labour, paint
  - [ ] Additionals: add additional work items if needed
- [ ] Switch between tabs → verify auto-save works
- [ ] Finalize estimate → verify rates are frozen
- [ ] Open FRC tab → verify data populated correctly

**Test 4: Document Generation**
- [ ] From assessment detail → Finalize tab
- [ ] Generate Assessment Report → verify PDF opens/downloads
- [ ] Generate Estimate → verify PDF with correct line items and T&Cs
- [ ] Generate FRC Report → verify PDF downloads (signed URL)
- [ ] Generate Photos PDF → verify all 8 sections with photos
- [ ] Generate Photos ZIP → verify organized folder structure
- [ ] Generate All Documents → verify batch progress works
- [ ] Use Print route → verify print dialog opens with correct content
- [ ] Verify documents use client-specific T&Cs (not just company defaults)

**Test 5: Edge Cases**
- [ ] Create request with missing optional fields → verify no errors
- [ ] Upload very large photo (10MB+) → verify handling
- [ ] Open assessment on mobile → verify layout works
- [ ] Lose internet during assessment → verify offline behavior
- [ ] Two users edit same assessment simultaneously → verify no data loss
- [ ] Generate report for assessment with missing photos → verify no crash
- [ ] Try accessing admin URL as engineer → verify redirect

### B. Automated Tests (Build Incrementally)

For automated testing, I'd recommend building **Playwright E2E tests** that mirror the manual scripts above. This gives you:
- Browser-based testing (real user simulation)
- Screenshot on failure (easy debugging)
- Can run before each deployment

**Priority order for automation:**
1. Login/auth flow (highest value — gates everything)
2. Request creation → assessment creation (core workflow)
3. Document generation (most complex, most likely to break)
4. Client CRUD (straightforward, good for regression)

### C. What I Can Build Now

I can create:
1. **Manual test checklist document** — printable, with pass/fail columns
2. **Playwright test scaffolding** — project setup, test helpers, auth fixtures
3. **Critical path E2E tests** — login → create request → open assessment → generate report

---

## Recommended Rollout Plan

### Phase 1: Pre-Internal Testing (Before You Start Using It)
- [ ] Fix Tier 1 RLS issues (1.1, 1.2, 1.3)
- [ ] Verify JWT hook is enabled in Supabase Dashboard
- [ ] Add basic toast notification system (2.1)
- [ ] Create error page (2.4)
- [ ] Fix password reset redirect bug

### Phase 2: During Internal Testing (You Using It)
- [ ] Walk through all 5 manual test scripts
- [ ] Replace browser alerts with modals (2.2)
- [ ] Disable or remove stub features (2.3)
- [ ] Add auto-save indicator (2.5)
- [ ] Track and fix bugs as you find them

### Phase 3: Before Employee Rollout
- [ ] Fix all Tier 3 items
- [ ] Add route-level access guards (3.5)
- [ ] Add user-facing error messages (3.6)
- [ ] Set up Playwright E2E for critical path
- [ ] Create user training documentation

### Phase 4: Post-Employee Rollout
- [ ] Address Tier 4 items based on feedback
- [ ] Monitor error logs
- [ ] Add rate limiting and security hardening
- [ ] Implement email sending for documents
- [ ] Expand automated test coverage
