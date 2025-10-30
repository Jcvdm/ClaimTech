# Changelog - Recent Updates

**Last Updated**: January 30, 2025

---

## January 30, 2025

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
