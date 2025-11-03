# Changelog - Recent Updates

**Last Updated**: November 2, 2025 (Client T&Cs Implementation)

---

## November 2, 2025

### 🔧 FRC Completion Stage Update Fix (CRITICAL)
- **ISSUE**: Assessment ASM-2025-003 stuck in Finalized Assessments and Additionals after FRC completion
- **ROOT CAUSE**: Silent failure in `completeFRC()` method - stage update failed but error was caught and only logged
- **IMPACT**: Assessments with completed FRCs appearing in wrong lists due to stage/status mismatch
- **FIX**: Refactored `completeFRC()` error handling in `src/lib/services/frc.service.ts`
  - Made stage update independent and critical (no longer nested in conditional)
  - Added explicit error handling for each step (status update, stage update, verification)
  - Added verification step to confirm both `stage` and `status` are `'archived'`
  - Errors now throw instead of being silently caught
  - Clear "CRITICAL ERROR:" prefixes for debugging
- **VERIFICATION**:
  - Query assessment after update to verify `stage = 'archived'` and `status = 'archived'`
  - Throw error if verification fails
  - User sees error message if archiving fails (no silent failures)
- **MANUAL FIX APPLIED**: Updated ASM-2025-003 stage from `'estimate_finalized'` to `'archived'`
- **FILES**:
  - `src/lib/services/frc.service.ts` (lines 731-800) - Refactored error handling
  - `.agent/System/frc_completion_stage_update_fix_nov_2_2025.md` (NEW) - Complete documentation
- **DOCUMENTATION**: Added to system_docs.md index as critical bug postmortem
- **PREVENTION**: Future FRC completions will fail loudly if stage update fails, preventing inconsistent state

### ✅ Terms & Conditions Feature - Company Defaults
- **NEW**: Customizable Terms & Conditions for all three document types
  - **Assessment Reports** - `assessment_terms_and_conditions` (TEXT)
  - **Estimate Documents** - `estimate_terms_and_conditions` (TEXT)
  - **FRC Reports** - `frc_terms_and_conditions` (TEXT)
- **MIGRATION**: `20251102_add_terms_and_conditions_to_company_settings.sql`
  - Added 3 TEXT columns to `company_settings` table
  - Idempotent migration with `IF NOT EXISTS` checks
  - Includes rollback instructions and column documentation
  - Applied to production database (cfblmkzleqtvtfxujikf)
- **SECURITY**: XSS protection via HTML escaping
  - Created `src/lib/utils/sanitize.ts` with `escapeHtml()` and `escapeHtmlWithLineBreaks()`
  - All T&Cs content escaped before rendering in PDFs
  - Input validation (10,000 character max per field)
  - Input sanitization (whitespace trimming, line break normalization)
- **UI**: Settings page enhancements
  - Added dedicated "Terms & Conditions" section with FileText icon
  - 3 large textareas (10 rows each) with helpful placeholders
  - Real-time character counters (e.g., "0 / 10,000 characters")
  - Clear descriptions for each document type
- **PDF INTEGRATION**: All three templates updated
  - T&Cs sections appear before footer in all PDFs
  - Preserves multi-line formatting with `white-space: pre-wrap`
  - Conditional rendering (only shows if T&Cs exist)
  - Consistent styling across all document types
- **CODE CLEANUP**: Removed hardcoded T&Cs from estimate template footer
- **FILES**:
  - `src/lib/utils/sanitize.ts` (NEW) - Sanitization utilities
  - `src/lib/types/assessment.ts` - Updated CompanySettings interface
  - `src/routes/(app)/settings/+page.server.ts` - Validation & sanitization
  - `src/routes/(app)/settings/+page.svelte` - UI with character counters
  - `src/lib/templates/report-template.ts` - Integrated T&Cs section
  - `src/lib/templates/estimate-template.ts` - Integrated T&Cs section
  - `src/lib/templates/frc-report-template.ts` - Integrated T&Cs section
  - `supabase/migrations/20251102_add_terms_and_conditions_to_company_settings.sql`
- **COMMITS**:
  - `d735f3f` - feat: add terms and conditions fields to company settings
  - `d3454b7` - feat: implement terms and conditions UI and PDF integration
- **IMPACT**: Companies can now customize legal terms for each document type, improving compliance and flexibility

### ✅ Terms & Conditions Feature - Client-Specific Overrides
- **NEW**: Client-specific Terms & Conditions with fallback to company defaults
  - Each client can optionally have custom T&Cs for all three document types
  - **Fallback Pattern**: Client T&Cs → Company T&Cs → Empty
  - Overrides company defaults only when client T&Cs are specified
- **MIGRATION**: `20251102_add_terms_and_conditions_to_clients.sql`
  - Added 3 TEXT columns to `clients` table:
    - `assessment_terms_and_conditions` (TEXT, NULL)
    - `estimate_terms_and_conditions` (TEXT, NULL)
    - `frc_terms_and_conditions` (TEXT, NULL)
  - Idempotent migration with `IF NOT EXISTS` checks
  - Includes column documentation explaining fallback pattern
  - RLS policies inherited from existing client table policies
- **SERVICE LAYER**: Enhanced ClientService
  - Added `validateTermsAndConditions()` method for server-side validation
  - Input validation (10,000 character max per field)
  - Validation applied to both create and update operations
  - Added `getClientTermsAndConditions()` method for optimized T&Cs-only queries
- **SECURITY**: Consistent with company T&Cs patterns
  - Same 10,000 character limit per field
  - Input sanitization via existing `sanitizeInput()` utility
  - HTML escaping in PDF generation
- **UI**: ClientForm enhancements
  - Added dedicated "Terms & Conditions" section card
  - 3 large textareas (8 rows each) with helpful placeholders
  - Real-time character counters using Svelte 5 `$derived` runes
  - Clear description: "Optional: Client-specific terms and conditions. Leave empty to use company default T&Cs"
  - Visual consistency with company settings T&Cs UI
- **PDF INTEGRATION**: All three API routes updated with fallback logic
  - `generate-report/+server.ts` (lines 123-126) - Assessment Report fallback
  - `generate-estimate/+server.ts` (lines 104-107) - Estimate fallback
  - `generate-frc-report/+server.ts` (lines 124-126) - FRC Report fallback
  - Added client data fetching to FRC route (lines 74-102)
  - Fallback implemented: `client?.{type}_tcs || companySettings?.{type}_tcs || null`
- **TYPE SAFETY**: Full TypeScript support
  - Updated `Client` interface in `src/lib/types/client.ts`
  - Updated `CreateClientInput` and `UpdateClientInput` interfaces
  - Regenerated `src/lib/types/database.types.ts` from live Supabase schema
  - TypeScript compilation verified with `npm run check`
- **FILES**:
  - `supabase/migrations/20251102_add_terms_and_conditions_to_clients.sql` (NEW)
  - `src/lib/types/client.ts` - Added T&Cs fields to interfaces
  - `src/lib/types/database.types.ts` - Regenerated from schema
  - `src/lib/services/client.service.ts` - Added validation methods
  - `src/lib/components/forms/ClientForm.svelte` - Added T&Cs section UI
  - `src/routes/api/generate-report/+server.ts` - Added fallback logic
  - `src/routes/api/generate-estimate/+server.ts` - Added fallback logic
  - `src/routes/api/generate-frc-report/+server.ts` - Added client fetch + fallback logic
- **IMPACT**: Clients can now have custom legal terms that override company defaults, enabling per-client compliance requirements while maintaining company-wide defaults

---

## January 30, 2025

### ✅ Comprehensive Audit Logging System
- **NEW**: Complete audit logging implementation across all assessment workflow operations
  - 21 distinct audit action types (line_item_added, line_item_approved, rates_updated, etc.)
  - 21 supported entity types with full coverage
  - Rich metadata capture for all operations
- **NEW**: Audit Service enhancements
  - Added `getAssessmentHistory()` method for cross-entity-type history queries
  - All service methods accept optional `ServiceClient` for RLS compliance
  - Defensive error handling (never breaks main operations)
- **NEW**: Admin-only Audit Tab on assessment detail pages
  - `AuditTab` component with ActivityTimeline integration
  - Only visible to admin users (role check in AssessmentLayout)
  - Displays complete assessment history across all entity types
- **UPDATED**: Extended ActivityTimeline component
  - Added icons and colors for 12 new action types
  - Enhanced formatting for line item operations
  - Metadata display improvements
- **COVERAGE**: Full audit logging added to:
  - Estimate service (line items, rate updates)
  - Additionals service (approve/decline/reverse operations)
  - FRC service (merge and completion)
  - Pre-incident estimate service (line items, rates)
  - Vehicle tab services (identification, exterior, interior, values)
  - Assessment notes service (create/update/delete)
  - Assessment service (creation tracking)
- **IMPACT**: Complete visibility into assessment workflow changes for compliance and debugging
- **FILES**:
  - `src/lib/types/audit.ts` - Extended with 12 new action types
  - `src/lib/services/audit.service.ts` - New `getAssessmentHistory()` method
  - `src/lib/services/estimate.service.ts` - Line item and rate logging
  - `src/lib/services/additionals.service.ts` - Updated to specific actions
  - `src/lib/services/frc.service.ts` - Merge and completion logging
  - `src/lib/services/pre-incident-estimate.service.ts` - Complete coverage
  - `src/lib/services/vehicle-*.service.ts` - Update logging with field tracking
  - `src/lib/services/assessment-notes.service.ts` - Create/update/delete logging
  - `src/lib/services/assessment.service.ts` - Creation logging
  - `src/lib/components/data/ActivityTimeline.svelte` - New action support
  - `src/lib/components/assessment/AuditTab.svelte` - New admin-only tab
  - `src/lib/components/assessment/AssessmentLayout.svelte` - Admin tab integration
  - `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte` - Tab rendering
- **DOCUMENTATION**: Created `System/audit_logging_system.md` with comprehensive guide

---

## January 30, 2025

### ✅ Assessment Cancellation Feature
- **NEW**: Added `cancelAssessment()` helper method in `assessmentService`
  - Sets both `status` and `stage` to `'cancelled'` atomically
  - Includes automatic audit logging for both changes
  - Accepts optional `ServiceClient` parameter for RLS compliance
- **NEW**: Cancel button added to Open Assessments table
  - Destructive variant button with loading state
  - Confirmation dialog before cancellation
  - Auto-refresh after cancellation (removed from list)
- **NEW**: Cancel button added to Assessment Detail page header
  - Shows for open assessment stages (`assessment_in_progress`, `estimate_review`, `estimate_sent`)
  - Redirects to Archive page with cancelled tab selected
  - Positioned between Save and Exit buttons for visibility
- **IMPACT**: Users can now cancel open assessments from both table view and detail page
- **FILES**: 
  - `src/lib/services/assessment.service.ts` - Added `cancelAssessment()` method
  - `src/routes/(app)/work/assessments/+page.svelte` - Cancel button in table
  - `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte` - Updated to use new helper
  - `src/lib/components/assessment/AssessmentLayout.svelte` - Cancel button in header

### ✅ Inspection Cancellation Flow Fixes
- **FIX**: Cancelled inspections now redirect to Archive page with cancelled tab selected
  - Changed redirect from `/work/inspections` to `/work/archive?tab=cancelled`
  - Matches pattern used for assessment cancellations
- **FIX**: Fixed 404 error when clicking cancelled inspections in Archive table
  - Archive page now uses assessment ID (not inspection ID) for detailUrl
  - Updated `listCancelledInspections()` to include assessment data via request_id join
  - Archive page extracts assessment ID from nested data structure
- **IMPACT**: Cancelled inspections properly appear in Archive and can be accessed/reactivated
- **FILES**:
  - `src/routes/(app)/work/inspections/[id]/+page.svelte` - Updated redirect
  - `src/routes/(app)/work/archive/+page.svelte` - Fixed detailUrl, added tab query param support
  - `src/lib/services/inspection.service.ts` - Added assessment join to cancelled inspections query

### ✅ Archive Page Enhancements
- **NEW**: Archive page now reads `tab` query parameter from URL
  - Supports `?tab=cancelled` and `?tab=completed` query parameters
  - Automatically selects correct tab when navigating from cancellation flows
  - Gracefully handles invalid tab values (defaults to 'all')
- **FILES**: `src/routes/(app)/work/archive/+page.svelte`

### ✅ Vercel Deployment - Live!
- **DEPLOYED**: ClaimTech is now live on Vercel
  - Production URL: `https://claimtech.vercel.app`
  - Git integration connected: `Jcvdm/ClaimTech` repository
  - Auto-deployment enabled for all branches
  - Environment variables configured for Supabase integration
  - **Status**: Running great - performance testing in progress
  - **Auth URLs Configured**: Password resets and email confirmations now work in production
  - **Next**: Monitor build times, test PDF generation, validate speed improvements

### ✅ Supabase Auth Configuration - Production Ready
- **CONFIGURED**: Added Vercel redirect URLs to Supabase auth settings
  - Added: `https://claimtech.vercel.app/auth/callback`
  - Added: `https://claimtech.vercel.app/auth/confirm`
  - **Impact**: Password resets, email confirmations, and magic links now work in production
  - **Method**: Updated via Supabase MCP (SVA project cfblmkzleqtvtfxujikf)

### Vercel Deployment Strategy
- **UPDATED**: [Deployment & Branching Strategy](../Tasks/active/SUPABASE_BRANCHING.md)
  - Renamed from "Supabase Branching Strategy" to include Vercel deployment
  - Implemented 3-tier branch structure:
    - `main` → Vercel Production + Supabase Production
    - `vercel-dev` → Vercel Preview + Supabase Dev Branch (replaces staging)
    - `dev` → Local only + Supabase Dev Branch
  - Added Vercel deployment setup guide
  - Added Vercel-specific troubleshooting
  - Updated workflows for local dev → Vercel testing → production
  - Added "Branch Hygiene & Development Workflow" section with clear rules
  - Deprecated `staging` branch in favor of `vercel-dev`
  - **Impact**: Clear separation between local development and cloud testing

### FRC Removed Lines Implementation
- **FIX**: [FRC Removed Lines Calculation](../SOP/frc_removed_lines.md)
  - Fixed removal lines with negative amounts being filtered out
  - Implemented dual-line pattern (original + removal = net zero)
  - Added "REMOVAL (-)" badge for negative additional lines
  - Updated `composeFinalEstimateLines()` to include removal lines (lines 116, 164)
  - **Files Changed**:
    - `src/lib/utils/frcCalculations.ts` - Removed filters blocking negative removal lines
    - `src/lib/components/assessment/FRCLinesTable.svelte` - Added removal badge
  - **Testing**: ASM-2025-017 prepared with removal line for validation
  - **Impact**: FRC now correctly subtracts removed lines from totals

### New SOP
- **NEW**: [FRC Removed Lines Handling](../SOP/frc_removed_lines.md) (~350 lines)
  - Business logic (dual-line pattern)
  - Technical implementation details
  - Testing procedures with expected results
  - Database schema for removal lines
  - Troubleshooting guide

### Documentation Restructuring
- **NEW**: Lightweight README system (90-95% context reduction)
- **NEW**: [index.md](./index.md) - Master navigation hub
- **NEW**: [system_docs.md](./system_docs.md) - Complete System/ documentation index
- **NEW**: [sops.md](./sops.md) - Complete SOP/ documentation index
- **NEW**: [architecture_quick_ref.md](./architecture_quick_ref.md) - High-level overview
- **NEW**: [database_quick_ref.md](./database_quick_ref.md) - Schema summary
- **NEW**: [task_guides.md](./task_guides.md) - Use-case navigation
- **NEW**: [faq.md](./faq.md) - Common questions

**Impact**: Claude agents can now navigate documentation with 90-95% less context usage

### UI Loading Patterns
- **NEW**: [ui_loading_patterns.md](../System/ui_loading_patterns.md) - Comprehensive loading patterns guide
- Documented 3 loading patterns (global nav bar, table row, button)
- Includes decision tree, API reference, troubleshooting
- **BUG FIX**: Appointments page loading state error (startingAssessment undefined)

---

## January 29, 2025

### Critical Bug Fixes & Pattern Establishment

#### FRC & Stage Transitions
- **FIX**: [FRC Stage Transition Fixes](../System/frc_stage_transition_fixes_jan_29_2025.md)
  - Fixed subprocess pattern for FRC and Additionals
  - Corrected stage transition logic
  - Established subprocess independence pattern
- **ANALYSIS**: [Bug Postmortem: Finalization & FRC Stage Transitions](../System/bug_postmortem_finalization_frc_stage_transitions.md)
  - 3 critical bugs analyzed
  - Root cause identification
  - Prevention strategies documented

#### Badge Counts & RLS
- **FIX**: [Bug Postmortem: Badge RLS & PostgREST Filter Fixes](../System/bug_postmortem_badge_rls_filter_fixes_jan_29_2025.md)
  - Fixed badge count inflation
  - Corrected PostgREST syntax
  - Established assessment-based query pattern
- **STANDARDIZATION**: [Page Update & Badge Standardization](../System/page_update_badge_standardization_jan_29_2025.md)
  - Navigation-first pattern standardized
  - Badge refresh patterns documented

#### Subprocess Filtering
- **FIX**: [Additionals FRC Filtering Fix](../System/additionals_frc_filtering_fix_jan_29_2025.md)
  - Removed incorrect FRC filtering from Additionals list
  - Fixed badge/table mismatch
- **NEW PATTERN**: [Subprocess Stage Filtering](../System/subprocess_stage_filtering_jan_29_2025.md)
  - Stage-based filtering for subprocess pages
  - Only show active assessments, hide archived/cancelled

#### Navigation Fixes
- **FIX**: [Navigation appointment_id Fix](../System/navigation_appointment_id_fix_jan_29_2025.md)
  - Fixed nested object navigation in Additionals/FRC pages
  - Corrected appointment access pattern

### New SOPs
- **NEW**: [Navigation-Based State Transitions](../SOP/navigation_based_state_transitions.md) (591 lines)
  - Server-side-first pattern
  - Idempotent load functions
  - State transition best practices
- **NEW**: [Page Updates and Badge Refresh](../SOP/page_updates_and_badge_refresh.md) (284 lines)
  - Navigation-first approach
  - Badge calculation patterns
  - Polling mechanism

### Documentation Updates
- **UPDATED**: [Table Utilities Reference](../System/table_utilities.md) (540 lines)
  - Complete table-helpers.ts API reference
  - Stage variant helpers
  - Formatting functions

---

## January 27, 2025

### Badge Count Implementation
- **NEW**: [Implementing Badge Counts](../SOP/implementing_badge_counts.md) (803 lines)
  - Assessment-centric badge patterns
  - Complete step-by-step implementation
  - Troubleshooting guide
  - Performance optimization

### Security Hardening
- **UPDATED**: [Session Management & Security](../System/session_management_security.md) (751 lines)
  - Complete session security architecture
  - Cookie management patterns
  - JWT validation
  - Security compliance

---

## January 26, 2025

### RLS Policy Improvements
- **FIX**: [Early-Stage Assessment RLS Fix](../System/early_stage_assessment_rls_fix_jan_26_2025.md)
  - Dual-check RLS pattern for nullable foreign keys
  - Migrations 073-074
  - Engineers can access assessments before appointment assignment
- **FIX**: [Phase 3 Frontend + Enum Fix](../System/phase_3_frontend_and_enum_fix_jan_26_2025.md) (602 lines)
  - Migration 075 enum corrections
  - Frontend UI completion

### New SOPs
- **NEW**: [Working with Assessment-Centric Architecture](../SOP/working_with_assessment_centric_architecture.md) (1,081 lines)
  - Complete assessment-centric patterns
  - 10-stage pipeline explained
  - Subprocess implementation
  - Best practices & anti-patterns

---

## January 2025 (Earlier)

### Authentication & Security
- **NEW**: [Password Reset Flow](../SOP/password_reset_flow.md) (761 lines)
  - Two-step reset flow pattern
  - Supabase PKCE configuration
  - Email template setup
- **NEW**: [Service Client Authentication](../SOP/service_client_authentication.md) (333 lines)
  - ServiceClient parameter pattern
  - RLS authentication requirements
  - Critical for all service implementations

### RLS Debugging
- **UPDATED**: [Fixing RLS Policy Errors](../SOP/fixing_rls_insert_policies.md) (947 lines)
  - Debugging INSERT, SELECT, UPDATE policies
  - Dual-check pattern for nullable FKs
  - Testing RLS via MCP
- **NEW**: [Handling Race Conditions in Number Generation](../SOP/handling_race_conditions_in_number_generation.md) (458 lines)
  - Retry logic with exponential backoff
  - Sequential number generation patterns

---

## October 2025

### Security Milestone
- **ACHIEVED**: 100% RLS coverage across all 28 tables
- **VERIFIED**: Database schema against live Supabase
- **DOCUMENTED**: [Security Recommendations](../System/security_recommendations.md)
- **DOCUMENTED**: [Database Verification Report](../System/database_verification_report.md) (605 lines)

### RLS Fixes
- **FIX**: [RLS Recursion Fix Summary](../System/rls_recursion_fix_summary.md)
  - JWT claims pattern established
  - Eliminated recursive RLS calls
  - Performance improvements

---

## System Documentation

### Core Architecture (Stable)
- **[Project Architecture](../System/project_architecture.md)** (977 lines) - Comprehensive system overview
- **[Database Schema](../System/database_schema.md)** (1,420 lines) - Complete database documentation
- **[Tech Stack](../System/tech-stack.md)** - Technology choices and versions

### SOPs (Stable)
- **[Adding Database Migrations](../SOP/adding_migration.md)** (543 lines)
- **[Adding Page Routes](../SOP/adding_page_route.md)** (742 lines)
- **[Working with Services](../SOP/working_with_services.md)** (859 lines)
- **[Implementing Form Actions & Auth](../SOP/implementing_form_actions_auth.md)** (1,191 lines)
- **[Implementing Role-Based Filtering](../SOP/implementing_role_based_filtering.md)** (885 lines)
- **[Creating Components](../SOP/creating-components.md)** (796 lines)
- **[Fixing RLS Recursion](../SOP/fixing_rls_recursion.md)** (935 lines)
- **[Testing Guide](../SOP/testing_guide.md)** (421 lines)

---

## Key Patterns Established

### 2025 Patterns
1. **Assessment-Centric Architecture** - One assessment per request, stage-based workflow
2. **Nullable FK Pattern** - Dual-check RLS for nullable foreign keys
3. **Navigation-First State Transitions** - Navigate → load function updates state
4. **Subprocess Independence** - FRC/Additionals don't affect main assessment stage
5. **Assessment-Based Badge Queries** - Count from assessments, not requests
6. **Loading State Patterns** - 3 patterns (global, table row, button) with decision tree
7. **ServiceClient Injection** - Required for RLS authentication

### 2024 Patterns
1. **Service Layer Pattern** - All database access through services
2. **100% RLS Coverage** - Security at database level
3. **JWT Claims for RLS** - Avoid recursive policies
4. **Server-Side Session Management** - httpOnly cookies, no localStorage

---

## Migration Summary

### Recent Migrations (Jan 2025)
- **073-074**: Early-stage assessment RLS (dual-check pattern)
- **075**: Enum corrections for assessment stages

### Notable Migrations (2024)
- **RLS Hardening**: 100% RLS coverage achieved
- **Performance**: Indexes added for common queries
- **Security**: JWT claims pattern implemented

---

## Breaking Changes

### None in 2025
All changes have been backward-compatible.

### Deprecations
- **Old loading patterns** → Use ui_loading_patterns.md patterns
- **Request-based badge queries** → Use assessment-based queries
- **Direct Supabase calls** → Always use service layer

---

## Upcoming Changes

### Planned Features
- Finance role implementation
- Advanced reporting
- PDF template improvements
- Mobile app (future consideration)

### Planned Documentation
- Video tutorials
- API documentation
- Deployment guide updates

---

## For Detailed History

- **Git Log**: `git log --oneline --graph`
- **Bug Postmortems**: [System Docs: Bug Postmortems](./system_docs.md#bug-postmortems)
- **Old README**: `.agent/README.md.backup` (archived, 1,714 lines)

---

## Related Documentation
- **[System Docs Index](./system_docs.md)** - All system documentation
- **[SOP Index](./sops.md)** - All procedures
- **[Task Guides](./task_guides.md)** - Use-case navigation

---

**Maintenance**: Update after each significant feature or bug fix
**Last Review**: January 30, 2025
