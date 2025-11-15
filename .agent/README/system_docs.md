# System Documentation Index

**Last Updated**: January 31, 2025 (Bug #8 - SSE Streaming for Batch Document Generation)
**Total Files**: 35 System documentation files

---

## Overview

Comprehensive system documentation covering architecture, database design, security, UI patterns, and implementation history. Files are organized by category with detailed guidance on when to read each document.

---

## 📚 Core Architecture (MUST READ)

### 1. Project Architecture ⭐ ESSENTIAL
- **File**: [project_architecture.md](../System/project_architecture.md)
- **Size**: 977 lines | **Last Updated**: Jan 2025
- **Read When**: Starting work, need system design understanding, implementing cross-cutting features

**Contains**:
- Complete tech stack (SvelteKit 5, Supabase, TypeScript, Tailwind 4)
- 10-stage assessment pipeline workflow
- Security & authentication patterns (100% RLS coverage)
- Service layer architecture (ServiceClient injection pattern)
- PDF generation workflow (Puppeteer)
- Storage architecture (3 buckets: assessment-photos, documents, profile-photos)
- Engineer vs admin role patterns

**Key for**: Understanding system design, architectural decisions, workflow patterns

---

### 2. Database Schema ⭐ ESSENTIAL
- **File**: [database_schema.md](../System/database_schema.md)
- **Size**: 1,420 lines | **Last Updated**: Oct 2025 (verified against live DB)
- **Read When**: Adding/modifying tables, understanding relationships, debugging RLS, writing queries

**Contains**:
- All 31 tables with columns, types, constraints
- Relationships & foreign keys
- RLS policies (100% coverage achieved)
- Indexes & performance optimization
- Storage buckets configuration
- Assessment-centric architecture patterns

**Tables by Category**:
- Authentication & Users (3 tables: auth.users, users, engineers)
- Assessment Pipeline (10 tables: requests, assessments, appointments, inspections, estimates, estimate_items, additionals, frc, audit_log, settings)
- Reference Data (8 tables: vehicle_makes, models, types, colors, repair_methods, part_types, part_conditions, companies)

**Related**: [Database Quick Ref](./database_quick_ref.md) - Summary version
**Related**: [SOP: Adding Migrations](../SOP/adding_migration.md)

---

### 3. Tech Stack
- **File**: [tech-stack.md](../System/tech-stack.md)
- **Read When**: Need version numbers, package info, technology choices
- **Contains**: Frontend/backend packages with versions, development tools, rationale for choices

---

### 4. FRC Mechanics (Snapshot, Decisions, Totals)
- **File**: [frc_mechanics.md](../System/frc_mechanics.md)
- **Read When**: Implementing or debugging FRC snapshot/merge, removal grouping, Baseline vs New Total and Delta.
- **Contains**: Line composition, UI grouping, decision normalization, totals semantics.

---

## 🔐 Security & Authentication

### 1. Session Management & Security ⭐ CRITICAL
- **File**: [session_management_security.md](../System/session_management_security.md)
- **Size**: 751 lines | **Last Updated**: Jan 27, 2025
- **Read When**: Implementing auth, debugging session issues, security audit, cookie/JWT problems

**Contains**:
- Complete session architecture
- Cookie management (access_token, refresh_token with httpOnly/secure flags)
- JWT validation patterns
- Security compliance patterns
- Server-side vs client-side auth
- Common pitfalls and fixes

**Critical for**: Auth implementation, security understanding

---

### 2. Security Recommendations
- **File**: [security_recommendations.md](../System/security_recommendations.md)
- **Status**: ✅ 100% RLS coverage achieved
- **Read When**: Writing RLS policies, security review, production deployment prep
- **Contains**: Security posture, RLS testing procedures, monitoring guidelines

---

### 3. Database Verification Report (Historical)
- **File**: [database_verification_report.md](../System/database_verification_report.md)
- **Size**: 605 lines | **Status**: Historical reference
- **Purpose**: Pre-hardening security findings
- **Note**: Issues documented here have been resolved

---

## 🛠️ Development & Tooling

### 1. Development Guide
- **File**: [development_guide.md](../System/development_guide.md)
- **Read When**: Setting up dev environment, running commands
- **Contains**: npm scripts, environment variables, dev server commands

### 2. MCP Setup ⭐ NEW
- **File**: [mcp_setup.md](../System/mcp_setup.md)
- **Read When**: Using Claude Code with Supabase MCP
- **Contains**: Supabase MCP configuration, direct database access, query capabilities, migration management
- **For backend-api-dev**: Enables direct DB queries during development

### 3. Table Utilities Reference
- **File**: [table_utilities.md](../System/table_utilities.md)
- **Size**: 540 lines | **Last Updated**: Jan 29, 2025
- **Read When**: Building UI tables, formatting data, using helpers

**Contains**:
- Complete table-helpers.ts API reference
- Stage variant helpers (getStageVariant, getStageLabel)
- Type badge helpers
- Appointment status helpers
- Formatting functions (dates, currency)

---

### 4. Audit Logging System ⭐ NEW
- **File**: [audit_logging_system.md](../System/audit_logging_system.md)
- **Size**: ~600 lines | **Last Updated**: Jan 30, 2025
- **Read When**: Implementing audit logging, understanding audit patterns, debugging workflow issues

**Contains**:
- Complete audit logging architecture and patterns
- 21 audit action types with usage guidelines
- Service-by-service coverage documentation
- Metadata patterns and best practices
- UI components (ActivityTimeline, AuditTab)
- Query patterns and performance considerations
- Troubleshooting guide

**Key for**: Understanding audit trail system, implementing logging in new services, compliance tracking

---

## 🎨 UI & Loading Patterns

### 1. UI Loading Patterns ⭐ COMPREHENSIVE
- **File**: [ui_loading_patterns.md](../System/ui_loading_patterns.md)
- **Size**: 690 lines | **Last Updated**: Jan 30, 2025
- **Read When**: Implementing loading states, navigation transitions, fixing loading bugs

**Contains**:
- All 3 loading patterns (global nav bar, table row loading, button loading)
- Decision tree for choosing pattern
- Complete useNavigationLoading() API
- Common bug fixes (appointments page fix included as case study)
- Troubleshooting guide
- Implementation checklist

**Critical for**: Understanding loading patterns, preventing loading state bugs

### 2. Loading State Pattern Documentation
- **File**: [loading_state_pattern_documentation_jan_30_2025.md](../System/loading_state_pattern_documentation_jan_30_2025.md)
- **Last Updated**: Jan 30, 2025
- **Read When**: Need latest loading animation patterns
- **Note**: Complements ui_loading_patterns.md with implementation analysis

### 3. SSE Streaming for Long-Running Operations ⭐ NEW (Jan 31, 2025)
- **File**: [sse_streaming_pattern.md](../System/sse_streaming_pattern.md)
- **Size**: ~500 lines | **Last Updated**: Jan 31, 2025
- **Read When**: Implementing long-running batch operations, need real-time progress feedback, handling partial success
- **Use Case**: Document generation, batch processing, multi-step workflows

**Contains**:
- SSE (Server-Sent Events) streaming architecture
- Sequential vs parallel generation patterns
- Progress tracking with per-item status
- Partial success handling (e.g., 3/4 documents succeed)
- Client-side SSE parsing and state management
- UI component patterns (progress bars, status indicators, retry buttons)
- Error handling and recovery strategies
- Performance considerations and optimization

**Implemented in**:
- `src/routes/api/generate-all-documents/+server.ts` - SSE streaming endpoint
- `src/lib/services/document-generation.service.ts` - SSE parsing and progress callbacks
- `src/lib/components/assessment/DocumentGenerationProgress.svelte` - Progress UI component
- `src/lib/components/assessment/FinalizeTab.svelte` - Integration with retry handlers

**Related**: [UI Loading Patterns](../System/ui_loading_patterns.md), [Project Architecture](../System/project_architecture.md)

**Key for**: Understanding streaming patterns, implementing batch operations with progress feedback, handling partial failures gracefully

---

### 4. Photo Labeling Implementation ⭐ CRITICAL FIX (Nov 9, 2025)
- **File**: [photo_labeling_implementation_nov_6_2025.md](../System/photo_labeling_implementation_nov_6_2025.md)
- **Size**: ~1000 lines | **Last Updated**: Nov 9, 2025 (FINAL FIX)
- **Read When**: Working with photo components, implementing optimistic updates, debugging photo navigation, using bigger-picture library

**Contains**:
- Complete photo labeling feature implementation in PhotoViewer
- **CRITICAL BUG FIX** (Nov 9): Navigation tracking using correct bigger-picture callback signature
  - Root cause: Wrong callback signature - was using `container.position` (doesn't exist) instead of `activeItem.i`
  - Solution: Use `activeItem.i` which contains the current index from bigger-picture library
  - Impact: Label now updates correctly when scrolling through photos
- Optimistic update patterns for instant UI feedback
- Fixed bottom bar UI design
- Keyboard shortcuts implementation (E to edit, Enter to save, Escape to cancel)
- Component communication via callbacks (props down, events up)
- Comprehensive testing guide with manual tests
- Svelte 5 runes reactivity patterns ($state, $derived)
- bigger-picture library callback signature documentation

**Key for**: Understanding photo editing UI, optimistic updates, debugging navigation issues, keyboard accessibility patterns, bigger-picture library integration

---

### 4. Unified Photo Panel Pattern ⭐ NEW (Jan 2025)
- **File**: [unified_photo_panel_pattern.md](../System/unified_photo_panel_pattern.md)
- **Size**: ~400 lines | **Last Updated**: Jan 2025
- **Read When**: Implementing photo upload components, understanding photo panel architecture, migrating from legacy photo systems

**Contains**:
- Single-card layout pattern (upload zone + gallery in one component)
- Conditional rendering (empty state vs. with photos)
- Component architecture and props interface
- Database table structure for all photo panels
- Migration patterns from legacy systems (8-position exterior, interior photo columns)
- Validation updates (photos array parameter pattern)
- Implementation examples for all 5 photo panel types

**Implemented in**:
- `InteriorPhotosPanel.svelte`
- `EstimatePhotosPanel.svelte`
- `PreIncidentPhotosPanel.svelte`
- `AdditionalsPhotosPanel.svelte`
- `Exterior360PhotosPanel.svelte`

**Related**: [Photo Labeling Patterns](../SOP/photo_labeling_patterns.md), [Database Schema](../System/database_schema.md)

---

## 🐛 Bug Postmortems & Implementation History (18 files)

### Recent Critical Fixes (Nov 2025)

#### Photo Panel Reactivity ⭐ IMPORTANT

**1. Photo Panel Display Fix - Reactivity Pattern**
- **File**: [photo_panel_display_fix_nov_9_2025.md](../Tasks/completed/PHOTO_PANEL_DISPLAY_FIX_NOV_9_2025.md)
- **Date**: November 9, 2025
- **Read When**: Working with photo panels, debugging photo display issues, implementing optimistic updates
- **Contains**: Root cause analysis of photo display bug, reactivity chain explanation, direct state update pattern
- **Impact**: Photos now display correctly after upload, tab switching, and page reload
- **Key Learning**: Generic refresh callbacks break optimistic array pattern - use direct state updates
- **Related**: [Optimistic Array Bug Fix](../Tasks/completed/OPTIMISTIC_ARRAY_BUG_FIX_RESEARCH_NOV_9_2025.md) - Svelte 5 reactivity patterns

### Recent Critical Fixes (Jan 2025)

#### FRC & Stage Transitions ⭐ IMPORTANT

**1. FRC Stage Transition Fixes**
- **File**: [frc_stage_transition_fixes_jan_29_2025.md](../System/frc_stage_transition_fixes_jan_29_2025.md)
- **Size**: 543 lines
- **Read When**: Working with FRC or Additionals workflows
- **Contains**: Critical subprocess pattern fixes, stage transition logic corrections

**2. Bug Postmortem: Finalization & FRC Stage Transitions**
- **File**: [bug_postmortem_finalization_frc_stage_transitions.md](../System/bug_postmortem_finalization_frc_stage_transitions.md)
- **Size**: 551 lines
- **Read When**: Debugging stage transitions
- **Contains**: Analysis of 3 critical bugs in finalization workflows

**3. Bug Postmortem: Appointment Stage Transition**
- **File**: [bug_postmortem_appointment_stage_transition.md](../System/bug_postmortem_appointment_stage_transition.md)
- **Read When**: Working with appointment workflows
- **Contains**: Missing stage in transition eligibility fix

#### Badge Counts & RLS ⭐ IMPORTANT

**4. Bug Postmortem: Badge RLS & PostgREST Filter Fixes**
- **File**: [bug_postmortem_badge_rls_filter_fixes_jan_29_2025.md](../System/bug_postmortem_badge_rls_filter_fixes_jan_29_2025.md)
- **Size**: 621 lines
- **Read When**: Implementing badge counts or debugging count mismatches
- **Contains**: Badge count inflation fixes, PostgREST syntax corrections, assessment-based query patterns

**5. Page Update & Badge Standardization**
- **File**: [page_update_badge_standardization_jan_29_2025.md](../System/page_update_badge_standardization_jan_29_2025.md)
- **Read When**: Implementing page navigation or badge refresh
- **Contains**: Navigation-first pattern standardization

#### Subprocess Patterns

**6. Additionals FRC Filtering Fix**
- **File**: [additionals_frc_filtering_fix_jan_29_2025.md](../System/additionals_frc_filtering_fix_jan_29_2025.md)
- **Read When**: Implementing subprocess list pages
- **Contains**: Subprocess filtering pattern fixes

**7. Subprocess Stage Filtering**
- **File**: [subprocess_stage_filtering_jan_29_2025.md](../System/subprocess_stage_filtering_jan_29_2025.md)
- **Read When**: Adding stage filters to list pages
- **Contains**: Stage-based filtering for subprocess pages

**8. Navigation appointment_id Fix**
- **File**: [navigation_appointment_id_fix_jan_29_2025.md](../System/navigation_appointment_id_fix_jan_29_2025.md)
- **Read When**: Debugging navigation with nested data
- **Contains**: Nested object navigation pattern fixes

**9. FRC Completion Stage Update Fix** ⭐ CRITICAL
- **File**: [frc_completion_stage_update_fix_nov_2_2025.md](../System/frc_completion_stage_update_fix_nov_2_2025.md)
- **Date**: November 2, 2025
- **Read When**: Working with FRC completion, stage transitions, or list filtering
- **Contains**: Critical fix for silent stage update failures during FRC completion
- **Impact**: Prevents assessments from getting stuck in wrong lists (Finalized/Additionals instead of Archive)
- **Key Learning**: Always verify critical state changes, never silently catch errors on critical operations

#### RLS & Assessment Access (Jan 26, 2025)

**10. Early-Stage Assessment RLS Fix**
- **File**: [early_stage_assessment_rls_fix_jan_26_2025.md](../System/early_stage_assessment_rls_fix_jan_26_2025.md)
- **Read When**: Writing RLS policies for nullable relationships
- **Contains**: Dual-check RLS pattern for nullable foreign keys, Migrations 073-074

**11. Phase 3 Frontend + Enum Fix**
- **File**: [phase_3_frontend_and_enum_fix_jan_26_2025.md](../System/phase_3_frontend_and_enum_fix_jan_26_2025.md)
- **Size**: 602 lines
- **Read When**: Understanding assessment stage enum values
- **Contains**: Migration 075 enum corrections

#### Recent Fixes (Jan 2025)

**12. Bug #7 Hotfix: FRC Badge Count Regression** ⭐ LATEST
- **File**: [bug_7_hotfix_frc_badge_count_regression.md](../Tasks/completed/bug_7_hotfix_frc_badge_count_regression.md)
- **Date**: Jan 12, 2025
- **Issue**: FRC badge showed 2 records when only 1 active (regression from Bug #7 optimization)
- **Root Cause**: Query optimization removed stage filtering, RLS policies don't filter by stage
- **Solution**: Restored stage filtering while keeping optimization benefits (2-table join vs 3-table)
- **Impact**: Badge counts now correct, excludes archived assessments
- **Related**: [Bug #7 Fix](../Tasks/completed/bug_7_finalize_force_click_timeout_fix.md)

#### Older Implementation Logs

**13. RLS Recursion Fix Summary**
- **File**: [rls_recursion_fix_summary.md](../System/rls_recursion_fix_summary.md)
- **Date**: Oct 2025
- **Contains**: Historical RLS recursion fixes

**13-18. Additional Documentation**
- **Supabase Email Templates**: [supabase_email_templates.md](../System/supabase_email_templates.md) - Email template setup for PKCE flow
- **Auth Redirect Research**: [auth_redirect_research.md](../System/auth_redirect_research.md) - Auth flow investigation
- **Documentation Update Summaries**: Various doc update logs

---

## 📋 How to Use This Index

### For New Features
1. Read [Project Architecture](../System/project_architecture.md) - Understand system
2. Read [Database Schema](../System/database_schema.md) - Understand data model
3. Check Bug Postmortems (above) - Learn from past issues
4. Follow relevant [SOPs](./sops.md)

### For Bug Fixes
1. Check Bug Postmortems (above) - Similar issues?
2. Read [Database Schema](../System/database_schema.md) - Data model issues?
3. Check [Security Recommendations](../System/security_recommendations.md) - RLS issues?
4. Review [UI Loading Patterns](../System/ui_loading_patterns.md) - Loading bugs?

### For Architecture Decisions
1. Read [Project Architecture](../System/project_architecture.md) - Complete overview
2. Check [Architecture Quick Ref](./architecture_quick_ref.md) - Summary
3. Review Bug Postmortems - Learn from past decisions

### For Database Work
1. Start with [Database Quick Ref](./database_quick_ref.md) - Quick overview
2. Read [Database Schema](../System/database_schema.md) - Full details
3. Check [Security Recommendations](../System/security_recommendations.md) - RLS patterns
4. Follow [SOP: Adding Migrations](../SOP/adding_migration.md)

---

## Related Indexes
- **[SOP Index](./sops.md)** - How-to guides and procedures
- **[Task Guides](./task_guides.md)** - Use-case based navigation
- **[Changelog](./changelog.md)** - Recent updates chronologically
- **[FAQ](./faq.md)** - Common questions

---

---

## 🔍 Audit & Compliance

### Audit Logging System ⭐ NEW
- **File**: [audit_logging_system.md](../System/audit_logging_system.md)
- **Size**: ~600 lines | **Last Updated**: Jan 30, 2025
- **Read When**: Implementing audit logging, understanding audit patterns, compliance requirements, debugging workflow issues

**Contains**:
- Complete audit logging architecture (21 entity types, 21 action types)
- Service-by-service coverage documentation
- Metadata patterns and best practices
- UI components (ActivityTimeline, AuditTab)
- Query patterns (`getAssessmentHistory()`, `getEntityHistory()`)
- Performance considerations and indexing strategy
- Troubleshooting guide

**Key for**: Understanding audit trail system, implementing logging in new services, compliance tracking, debugging user actions

**Related**: [Database Schema](./database_schema.md) - audit_logs table schema

---

**Maintenance**: Update this index when adding new System/ documentation
**Last Review**: January 30, 2025
