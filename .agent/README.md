# ClaimTech Documentation Index

Welcome to the ClaimTech documentation. This folder contains comprehensive documentation about the system architecture, development practices, and implementation guides.

-CHECK RELEVANT AGENTS USE THEM IN ALL IMPLEMENTATIONS USE SKILLS WHEN RELEVANT

---

## 📖 Quick Navigation

### System Documentation
Understanding the current state of the system

- **[Project Architecture](./System/project_architecture.md)** - Complete system overview: tech stack, structure, workflows, integration points, and security
- **[Database Schema](./System/database_schema.md)** - Complete database documentation: all 28 tables, relationships, RLS policies, storage buckets, and data flow (verified & secured Oct 2025)
- **[Security Recommendations](./System/security_recommendations.md)** - ✅ **NEW:** Security posture, RLS policies, testing procedures, monitoring guidelines, and best practices (100% RLS coverage achieved)
- **[Database Verification Report](./System/database_verification_report.md)** - Pre-hardening security findings and database verification against live Supabase (historical reference)
- **[Development Guide](./System/development_guide.md)** - Quick reference for commands, environment setup, and development patterns
- **[Tech Stack](./System/tech-stack.md)** - Detailed technology stack reference with versions and usage
- **[MCP Setup](./System/mcp_setup.md)** - Model Context Protocol configuration for Claude Code integration with Supabase, GitHub, and dev tools

### Standard Operating Procedures (SOPs)
Best practices for common development tasks

- **[Adding Database Migrations](./SOP/adding_migration.md)** - How to create, test, and apply database migrations with examples
- **[Adding Page Routes](./SOP/adding_page_route.md)** - Creating new pages, API endpoints, and dynamic routes in SvelteKit
- **[Working with Services](./SOP/working_with_services.md)** - Service layer pattern, data access best practices, and examples
- **[Creating Components](./SOP/creating-components.md)** - Creating reusable Svelte 5 components with runes and TypeScript
- **[Implementing Form Actions & Auth](./SOP/implementing_form_actions_auth.md)** - Form actions vs API routes, authentication patterns, and common pitfalls
- **[Testing Guide](./SOP/testing_guide.md)** - Testing patterns and best practices for unit and E2E tests

### Claude Code Skills
AI-powered development assistance with ClaimTech patterns

- **[ClaimTech Development Skill](../.claude/skills/claimtech-development/)** - Systematic workflows for ClaimTech development
  - **[SKILL.md](../.claude/skills/claimtech-development/SKILL.md)** - 6 core workflows with step-by-step instructions and quality checklists
  - **[database-patterns.md](../.claude/skills/claimtech-development/resources/database-patterns.md)** - Migration templates, RLS policies, indexes, triggers, JSONB patterns
  - **[service-patterns.md](../.claude/skills/claimtech-development/resources/service-patterns.md)** - ServiceClient injection, CRUD templates, error handling, filtering
  - **[auth-patterns.md](../.claude/skills/claimtech-development/resources/auth-patterns.md)** - Form actions, RLS policies, session management, protected routes
  - **[component-patterns.md](../.claude/skills/claimtech-development/resources/component-patterns.md)** - Svelte 5 runes, TypeScript, composition, ClaimTech components
  - **[pdf-storage-patterns.md](../.claude/skills/claimtech-development/resources/pdf-storage-patterns.md)** - PDF generation with Puppeteer, storage service, proxy endpoints

- **[Supabase Development Skill](../.claude/skills/supabase-development/)** - Complete Supabase patterns and templates
  - **[SKILL.md](../.claude/skills/supabase-development/SKILL.md)** - Quick reference: ServiceClient pattern, CRUD templates, RLS helpers, storage patterns
  - **[PATTERNS.md](../.claude/skills/supabase-development/PATTERNS.md)** - Deep dive: migrations, type safety, query optimization, performance
  - **[SECURITY.md](../.claude/skills/supabase-development/SECURITY.md)** - RLS policies, auth patterns, storage security, common gaps
  - **[EXAMPLES.md](../.claude/skills/supabase-development/EXAMPLES.md)** - Real code from codebase: complete services, migrations, queries

### Tasks & Features
PRDs, implementation plans, and historical documentation

- **[Production Checklist](./Tasks/production_checklist.md)** - Pre-production deployment checklist
- **[Future Enhancements](./Tasks/future/future_enhancements.md)** - Planned future features and enhancements

#### Active Tasks
Setup and configuration guides for ongoing work:
- **[Auth Setup](./Tasks/active/AUTH_SETUP.md)** - Authentication system setup and implementation
- **[RLS Security Hardening](./Tasks/active/rls_security_hardening.md)** - ✅ **COMPLETED:** RLS implementation plan and results (100% database coverage achieved Oct 2025)
- **[Supabase Setup](./Tasks/active/SUPABASE_SETUP.md)** - Supabase configuration and project setup
- **[Supabase Branching](./Tasks/active/SUPABASE_BRANCHING.md)** - Supabase branch strategy and workflow
- **[Supabase Skill Implementation](./Tasks/active/supabase_skill_implementation.md)** - Implementation plan for Supabase development skill
- **[ClaimTech Skill Implementation](./Tasks/active/claimtech_skill_implementation.md)** - Implementation plan for ClaimTech development skill with 6 core workflows

#### Historical Implementation Summaries
Complete record of all implementations and fixes in `Tasks/historical/` folder:
- 50+ implementation summaries documenting features, fixes, and refactoring
- Organized chronologically for reference
- Includes: Additionals, Assessments, Estimates, FRC, PDF generation, Photo handling, and more

---

## 🚀 Getting Started

If you're new to the project or returning after a break, start here:

1. **Read** [Project Architecture](./System/project_architecture.md) to understand the complete system (2-3 hours)
2. **Review** [Database Schema](./System/database_schema.md) to understand the data model (1 hour)
3. **Study** the relevant SOPs for your task:
   - Adding features? → [Adding Page Routes](./SOP/adding_page_route.md) + [Working with Services](./SOP/working_with_services.md)
   - Database changes? → [Adding Database Migrations](./SOP/adding_migration.md)

---

## 📝 Development Workflow

Before implementing any feature:

1. ✅ Read this README to get oriented
2. ✅ Check [Project Architecture](./System/project_architecture.md) for architecture understanding
3. ✅ Review [Database Schema](./System/database_schema.md) if working with data
4. ✅ Follow appropriate SOP for your task
5. ✅ Update documentation after implementation

---

## 🗂️ Documentation Structure

```
.agent/
├── README.md                           # This file - index of all docs
├── System/                             # System state documentation
│   ├── project_architecture.md        # Complete system overview
│   ├── database_schema.md             # Database structure (verified & secured)
│   ├── security_recommendations.md    # ✅ NEW: Security guide (100% RLS coverage)
│   ├── database_verification_report.md # Pre-hardening findings (historical)
│   ├── development_guide.md           # Quick dev reference
│   ├── tech-stack.md                  # Technology stack details
│   ├── mcp_setup.md                   # MCP configuration guide
│   └── documentation_update_summary.md # Documentation update history
├── SOP/                               # Standard Operating Procedures
│   ├── adding_migration.md            # Migration workflow
│   ├── adding_page_route.md           # Route creation guide
│   ├── working_with_services.md       # Service layer guide
│   ├── creating-components.md         # Component creation guide
│   ├── implementing_form_actions_auth.md  # Form actions & auth patterns
│   └── testing_guide.md               # Testing best practices
└── Tasks/                             # Tasks, features, and history
    ├── production_checklist.md        # Pre-production checklist
    ├── active/                        # Ongoing setup tasks
    │   ├── AUTH_SETUP.md
    │   ├── rls_security_hardening.md  # ✅ NEW: RLS implementation (COMPLETED Oct 2025)
    │   ├── SUPABASE_SETUP.md
    │   ├── SUPABASE_BRANCHING.md
    │   ├── supabase_skill_implementation.md
    │   └── claimtech_skill_implementation.md
    ├── future/                        # Future enhancements
    │   └── future_enhancements.md
    ├── historical/                    # Implementation history
    │   └── [50+ implementation docs]
    └── scan_reports/                  # Code scan reports
        └── task_scan_report.md

../.claude/skills/                     # Claude Code AI Skills
├── claimtech-development/             # ← NEW: ClaimTech systematic workflows
│   ├── SKILL.md                       # 6 core workflows with checklists
│   └── resources/                     # Pattern templates (3,100+ lines)
│       ├── database-patterns.md       # Migrations, RLS, indexes, triggers
│       ├── service-patterns.md        # ServiceClient injection, CRUD
│       ├── auth-patterns.md           # Form actions, RLS, sessions
│       ├── component-patterns.md      # Svelte 5 runes, TypeScript
│       └── pdf-storage-patterns.md    # PDF generation, storage
└── supabase-development/              # Supabase development patterns
    ├── SKILL.md                       # Quick reference
    ├── PATTERNS.md                    # Detailed patterns
    ├── SECURITY.md                    # Security templates
    └── EXAMPLES.md                    # Real code examples
```

---

## 🔍 Recent Updates

### RLS Security Hardening - COMPLETE (October 25, 2025)

Achieved **100% RLS coverage** across all database tables with comprehensive security hardening:

**What was completed:**
- ✅ Enabled RLS on all 10 unprotected tables (36% → 100% coverage)
- ✅ Created 40+ RLS policies for comprehensive access control
- ✅ Fixed search_path vulnerabilities in 8 functions
- ✅ Verified with Supabase security advisors (0 errors remaining)
- ✅ Comprehensive security documentation created

**Security status:**
- **Before:** 10 RLS errors + 8 function warnings (36% unprotected)
- **After:** 0 RLS errors + 0 function warnings (100% protected)

**Tables secured (10):**
1. `repairers` - Enabled RLS (policies already existed)
2. `assessment_estimates` - RLS + admin-only modification
3. `pre_incident_estimates` - RLS + admin-only modification
4. `pre_incident_estimate_photos` - RLS + admin-only modification
5. `assessment_vehicle_values` - RLS + admin-only modification
6. `company_settings` - RLS + admin-only modification
7. `assessment_additionals` - RLS + admin-only modification
8. `assessment_additionals_photos` - RLS + admin-only modification
9. `assessment_frc` - RLS + admin-only modification
10. `assessment_frc_documents` - RLS + admin-only modification

**Access control enforced:**
- Anonymous: ❌ No database access
- Authenticated: ✅ Read-only access
- Admin: ✅ Full CRUD operations
- Engineer: ✅ Read + write to assigned work

**Documentation:**
- [Security Recommendations](./System/security_recommendations.md) - Complete security guide
- [RLS Security Hardening](./Tasks/active/rls_security_hardening.md) - Implementation details
- 5 migrations applied (058-062)

**Next steps:**
- ⚠️ Enable leaked password protection (manual Supabase dashboard config)
- 📅 Quarterly security audits (next due: January 25, 2026)

### ClaimTech Development Skill Implementation (October 25, 2025)

Created comprehensive Claude Code skill for systematic ClaimTech development workflows:

**What was created:**
- ✅ Core SKILL.md with 6 systematic workflows
- ✅ 5 resource files with production-ready patterns (3,100+ lines)
- ✅ Quality checklists for all workflows
- ✅ Auto-invocation on ClaimTech keywords
- ✅ Integration with existing `.agent/` documentation

**Workflows provided:**
1. 🗄️ **Database Migration** (15-30 min) - Idempotent migrations with RLS, indexes, triggers
2. 🔧 **Service Layer** (20-40 min) - ServiceClient injection, CRUD operations, error handling
3. 🔐 **Authentication** (10-20 min) - Form actions, RLS policies, session management
4. 📄 **Page Routes** (15-30 min) - SvelteKit pages with Svelte 5 runes
5. 📑 **PDF Generation** (30-60 min) - Puppeteer templates, storage upload, signed URLs
6. 📸 **Storage & Photos** (20-30 min) - Secure file handling, proxy endpoints

**Integration:**
- Works alongside specialized agents (Supabase, Svelte, Research)
- Skill provides methodology (HOW to implement)
- `.agent/` docs provide context (WHAT/WHERE in system)
- Auto-invokes based on task keywords

**Files created:**
- [ClaimTech Development Skill](../.claude/skills/claimtech-development/SKILL.md) - Core workflows
- [Implementation Plan](./Tasks/active/claimtech_skill_implementation.md) - Complete implementation details
- 5 resource pattern files (database, service, auth, component, pdf-storage)

### Database Schema Verification & Security Hardening (October 25, 2025)

Completed comprehensive verification and security hardening of database:

**Verification completed:**
- ✅ All 28 tables verified against live Supabase database
- ✅ Column names, types, and constraints documented
- ✅ Indexes and foreign keys verified
- ✅ Storage bucket configurations documented
- ✅ JSONB architecture for estimates verified

**Security issues identified:**
- 🔒 10 tables had RLS disabled (36% unprotected)
- ⚠️ 8 functions had search_path vulnerabilities
- ⚠️ Storage bucket limits not enforced

**Security hardening completed:**
- ✅ **100% RLS coverage** - All 28 tables now protected
- ✅ **40+ RLS policies** created with proper access control
- ✅ **All functions secured** with search_path protection
- ✅ **0 security errors** remaining (verified with Supabase advisors)

**Documentation created:**
- [Database Schema](./System/database_schema.md) - Accurate, verified schema documentation
- [Security Recommendations](./System/security_recommendations.md) - Security guide and monitoring
- [Database Verification Report](./System/database_verification_report.md) - Pre-hardening findings (historical)
- [RLS Security Hardening](./Tasks/active/rls_security_hardening.md) - Implementation details

---

## 📚 Documentation by Task

### I want to add a new feature

**Use the ClaimTech Development Skill** - Auto-invokes with systematic workflows:
1. Review [Project Architecture](./System/project_architecture.md) to understand where it fits
2. Check [Database Schema](./System/database_schema.md) if data changes needed
3. **Skill auto-invokes**: Follow [Database Migration Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-1-database-migration) with quality checklist
4. **Skill auto-invokes**: Follow [Page Route Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-4-page-route-creation) for new pages
5. **Skill auto-invokes**: Follow [Service Layer Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-2-service-layer-implementation) for data access
6. Update System docs if architecture changes significantly

**Alternative**: Follow SOPs directly ([Adding Migrations](./SOP/adding_migration.md), [Adding Routes](./SOP/adding_page_route.md), [Working with Services](./SOP/working_with_services.md))

### I want to add a database table

**Use the Database Migration Workflow** (auto-invokes when you mention "database", "migration", "schema", or "table"):
1. Review [Database Schema](./System/database_schema.md) for existing structure
2. **Skill provides**: [Database Migration Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-1-database-migration) with step-by-step instructions
3. **Skill provides**: [Database Pattern Templates](../.claude/skills/claimtech-development/resources/database-patterns.md) - Migration templates, RLS policies, indexes
4. Update [Database Schema](./System/database_schema.md) with new table info
5. **Skill provides**: [Service Layer Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-2-service-layer-implementation) for data access

**Manual alternative**: Follow [Adding Database Migrations SOP](./SOP/adding_migration.md) step-by-step

### I want to add a new page

**Use the Page Route Workflow** (auto-invokes when you mention "page", "route", or "component"):
1. Review [Project Architecture - Project Structure](./System/project_architecture.md#project-structure)
2. **Skill provides**: [Page Route Creation Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-4-page-route-creation) with quality checklist
3. **Skill provides**: [Component Patterns](../.claude/skills/claimtech-development/resources/component-patterns.md) - Svelte 5 runes, TypeScript
4. **Skill provides**: [Service Layer Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-2-service-layer-implementation) for data fetching
5. Update navigation if user-facing feature

**Manual alternative**: Follow [Adding Page Routes SOP](./SOP/adding_page_route.md) for complete guide

### I want to create a reusable component

**Use the Component Patterns** (auto-invokes when you mention "component", "UI", or "Svelte"):
1. Review [Project Architecture - Client-Side State Management](./System/project_architecture.md#client-side-state-management)
2. **Skill provides**: [Component Patterns](../.claude/skills/claimtech-development/resources/component-patterns.md) - Svelte 5 runes, TypeScript, composition
3. Place in `src/lib/components/` (UI components in `ui/` subfolder)
4. Use TypeScript for type safety
5. Follow Svelte 5 runes patterns ($state, $derived, $effect)

**Manual alternative**: Follow [Creating Components SOP](./SOP/creating-components.md)

### I want to implement authentication

**Use the Authentication Workflow** (auto-invokes when you mention "auth", "login", "logout", or "protect"):
1. Read [Project Architecture - Security & Authentication](./System/project_architecture.md#security--authentication)
2. **Skill provides**: [Authentication Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-3-authentication-flow) with step-by-step instructions
3. **Skill provides**: [Auth Patterns](../.claude/skills/claimtech-development/resources/auth-patterns.md) - Form actions, RLS policies, session management
4. Review [Database Schema - Authentication & User Tables](./System/database_schema.md#authentication--user-tables)
5. Check `src/hooks.server.ts` for implementation

**Manual alternative**: Follow [Implementing Form Actions & Auth SOP](./SOP/implementing_form_actions_auth.md)

### I want to generate PDFs or export documents

**Use the PDF Generation Workflow** (auto-invokes when you mention "PDF", "report", or "document generation"):
1. Read [Project Architecture - PDF Generation Workflow](./System/project_architecture.md#pdf-generation-workflow)
2. **Skill provides**: [PDF Generation Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-5-pdf-generation) with quality checklist
3. **Skill provides**: [PDF & Storage Patterns](../.claude/skills/claimtech-development/resources/pdf-storage-patterns.md) - Puppeteer templates, storage upload
4. Check `src/routes/api/generate-*/+server.ts` for PDF endpoints
5. Review `src/lib/templates/` for HTML templates
6. See `src/lib/utils/pdf-generator.ts` for Puppeteer logic

### I want to upload files or handle photos

**Use the Storage & Photos Workflow** (auto-invokes when you mention "upload", "photo", "storage", or "file"):
1. Read [Project Architecture - Storage Architecture](./System/project_architecture.md#storage-architecture)
2. **Skill provides**: [Storage & Photos Workflow](../.claude/skills/claimtech-development/SKILL.md#workflow-6-storage--photo-upload) with step-by-step instructions
3. **Skill provides**: [PDF & Storage Patterns](../.claude/skills/claimtech-development/resources/pdf-storage-patterns.md) - Storage service, proxy endpoints
4. Review [Database Schema - Storage Buckets](./System/database_schema.md#storage-buckets)
5. Check `src/lib/services/storage.service.ts` for implementation
6. See `src/routes/api/photo/` and `src/routes/api/document/` for signed URL endpoints

---

## 🔄 Keeping Documentation Updated

**Important**: After implementing any feature, update relevant documentation:

- ✅ Added database table? → Update [Database Schema](./System/database_schema.md)
- ✅ Changed architecture? → Update [Project Architecture](./System/project_architecture.md)
- ✅ Added new technology or dependency? → Update [Project Architecture - Tech Stack](./System/project_architecture.md#tech-stack)
- ✅ Completed significant feature? → Add PRD to `Tasks/` folder
- ✅ Found better way to do something? → Update relevant SOP
- ✅ Discovered common pitfall? → Add to relevant SOP's "Common Pitfalls" section

---

## 💡 Common Questions

### Where do I find information about...

**Tech stack and tools used?**
→ [Tech Stack](./System/tech-stack.md) or [Project Architecture - Tech Stack](./System/project_architecture.md#tech-stack)

**Development commands and environment setup?**
→ [Development Guide](./System/development_guide.md)

**Database tables and columns?**
→ [Database Schema](./System/database_schema.md) (verified against live DB Oct 2025)
→ [Database Verification Report](./System/database_verification_report.md) - Security findings and discrepancies fixed

**How authentication works?**
→ [Project Architecture - Security & Authentication](./System/project_architecture.md#security--authentication)

**How to implement login/logout/signup?**
→ [Implementing Form Actions & Auth](./SOP/implementing_form_actions_auth.md)

**Form actions vs API routes - when to use which?**
→ [Implementing Form Actions & Auth](./SOP/implementing_form_actions_auth.md#critical-distinction-form-actions-vs-api-routes)

**How to create a new page?**
→ [Adding Page Routes](./SOP/adding_page_route.md)

**How to add a database table?**
→ [Adding Database Migrations](./SOP/adding_migration.md)

**How to fetch data from the database?**
→ [Working with Services](./SOP/working_with_services.md)

**How to create reusable components?**
→ [Creating Components](./SOP/creating-components.md)

**How to test my code?**
→ [Testing Guide](./SOP/testing_guide.md)

**How PDF generation works?**
→ [Project Architecture - PDF Generation Workflow](./System/project_architecture.md#pdf-generation-workflow)

**How storage and signed URLs work?**
→ [Project Architecture - Storage Architecture](./System/project_architecture.md#storage-architecture)

**What are the core workflows?**
→ [Project Architecture - Key Workflows](./System/project_architecture.md#key-workflows)

**Project directory structure?**
→ [Project Architecture - Project Structure](./System/project_architecture.md#project-structure)

**Service layer pattern?**
→ [Working with Services](./SOP/working_with_services.md)

**Architecture patterns used?**
→ [Project Architecture - Architecture Patterns](./System/project_architecture.md#architecture-patterns)

**Row Level Security policies?**
→ [Security Recommendations](./System/security_recommendations.md) - ✅ **100% RLS coverage** - Complete security guide
→ [Database Schema - Row Level Security](./System/database_schema.md#row-level-security-rls-policies) - All 28 tables RLS enabled
→ [RLS Security Hardening](./Tasks/active/rls_security_hardening.md) - Implementation details and results
→ [Supabase Skill - RLS Templates](../.claude/skills/supabase-development/SECURITY.md#rls-policy-templates)

**Supabase development patterns?**
→ [Supabase Development Skill](../.claude/skills/supabase-development/SKILL.md) - Quick reference
→ [PATTERNS.md](../.claude/skills/supabase-development/PATTERNS.md) - Detailed patterns
→ [SECURITY.md](../.claude/skills/supabase-development/SECURITY.md) - Security templates
→ [EXAMPLES.md](../.claude/skills/supabase-development/EXAMPLES.md) - Real code examples

**ClaimTech development workflows?**
→ [ClaimTech Development Skill](../.claude/skills/claimtech-development/SKILL.md) - 6 systematic workflows
→ [Database Patterns](../.claude/skills/claimtech-development/resources/database-patterns.md) - Migration templates, RLS
→ [Service Patterns](../.claude/skills/claimtech-development/resources/service-patterns.md) - ServiceClient injection
→ [Auth Patterns](../.claude/skills/claimtech-development/resources/auth-patterns.md) - Form actions, RLS policies
→ [Component Patterns](../.claude/skills/claimtech-development/resources/component-patterns.md) - Svelte 5 runes
→ [PDF & Storage Patterns](../.claude/skills/claimtech-development/resources/pdf-storage-patterns.md) - PDF generation, storage

**How to use Claude Code with Supabase/GitHub/dev tools?**
→ [MCP Setup](./System/mcp_setup.md) - Model Context Protocol configuration and usage

---

## 📋 Development Checklist Templates

### New Feature Checklist

- [ ] Read [Project Architecture](./System/project_architecture.md) to understand context
- [ ] Design database schema (if needed)
- [ ] Create migration following [Adding Database Migrations](./SOP/adding_migration.md)
- [ ] Create service in `src/lib/services/`
- [ ] Create routes following [Adding Page Routes](./SOP/adding_page_route.md)
- [ ] Build components with TypeScript types
- [ ] Add to navigation (if user-facing)
- [ ] Implement tests (unit + E2E)
- [ ] Update [Database Schema](./System/database_schema.md) if schema changed
- [ ] Update [Project Architecture](./System/project_architecture.md) if architecture changed
- [ ] Test thoroughly in dev environment
- [ ] Create pull request with documentation updates

### Bug Fix Checklist

- [ ] Understand the issue (reproduce it)
- [ ] Review relevant architecture and schema docs
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Add test to prevent regression
- [ ] Verify fix in dev environment
- [ ] Update docs if behavior changed
- [ ] Create pull request

### Database Migration Checklist

- [ ] Review [Database Schema](./System/database_schema.md) for context
- [ ] Follow [Adding Database Migrations](./SOP/adding_migration.md)
- [ ] Create migration file with proper naming
- [ ] Write SQL with idempotency (IF NOT EXISTS)
- [ ] Include indexes on foreign keys
- [ ] Enable RLS and create policies
- [ ] Add triggers for updated_at
- [ ] Test migration locally
- [ ] Apply to remote database
- [ ] Update TypeScript types
- [ ] Update [Database Schema](./System/database_schema.md)
- [ ] Update service layer
- [ ] Commit migration file

---

## 🎯 Documentation Goals

This documentation aims to:

1. **Onboard new developers quickly** - Understand system in hours, not days
2. **Reduce cognitive load** - Don't keep architecture in your head
3. **Maintain consistency** - Everyone follows same patterns
4. **Preserve knowledge** - Decisions and context don't get lost
5. **Enable autonomy** - Developers can find answers without asking
6. **Reduce bugs** - Clear patterns and best practices prevent common mistakes

---

## 📊 Project Stats

**As of security hardening (October 25, 2025):**
- **28 database tables** (verified & secured against live Supabase DB)
- **62 database migrations** (from supabase/migrations/ - includes 5 new security migrations)
- **27+ service files** (all using ServiceClient injection pattern)
- **40+ page routes**
- **10+ API endpoints**
- **TypeScript** throughout the codebase
- **Fully authenticated** with role-based access (admin/engineer)
- **✅ Row Level Security** enabled on 28/28 tables (**100% coverage** - secured Oct 2025)
- **40+ RLS policies** protecting all data access
- **Private storage** with proxy endpoints (2 buckets: documents, SVA Photos)
- **AI-powered development** with Claude Code Skills
- **JSONB-based estimates** (document-oriented architecture for flexibility)
- **Enterprise-grade security** (0 Supabase security errors remaining)

---

## ✍️ Contributing to Docs

When updating documentation:

- **Be specific** - Include code examples from the actual codebase
- **Keep it current** - Update docs as you change code (documentation is part of the feature)
- **Be concise** - Respect readers' time, but be complete
- **Use examples** - Real examples from ClaimTech, not generic ones
- **Link references** - Cross-reference related documentation
- **Follow structure** - Maintain existing documentation patterns
- **Update index** - Update this README if adding new docs

**Documentation is code.** Treat it with the same care and review process.

---

## 🔗 External Resources

Official documentation for technologies used in ClaimTech:

- [SvelteKit Documentation](https://svelte.dev/docs/kit) - Full-stack framework
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/overview) - Component framework
- [Supabase Documentation](https://supabase.com/docs) - Database, auth, storage
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Styling
- [TypeScript Documentation](https://www.typescriptlang.org/docs) - Type system
- [Vercel Documentation](https://vercel.com/docs) - Deployment platform
- [Puppeteer Documentation](https://pptr.dev/) - PDF generation

---

## 🚀 Next Steps for Documentation

**Completed:**
- ✅ Complete system architecture documentation
- ✅ Database schema documentation with RLS policies (verified Oct 2025)
- ✅ Database verification report with security findings
- ✅ Standard Operating Procedures (migrations, routes, services, components, testing)
- ✅ Development guide with commands and patterns
- ✅ Historical implementation summaries organized
- ✅ Active task documentation (auth, Supabase setup)
- ✅ Future enhancements planning
- ✅ Supabase Development Skill (AI-powered pattern assistance)
- ✅ ClaimTech Development Skill (6 systematic workflows with 3,100+ lines of patterns)
- ✅ MCP setup guide for Claude Code integration

**Planned additions:**
- [ ] Troubleshooting guide (common errors and solutions)
- [ ] Deployment guide (environment variables, Vercel setup, Supabase config)
- [ ] API documentation (all endpoints with request/response examples)
- [ ] Performance optimization guide
- [ ] Skill usage examples and best practices guide
- [ ] Storage bucket limit enforcement guide

---

## 📞 Getting Help

**Stuck on something not covered in the docs?**

1. Search this documentation using Ctrl+F (or Cmd+F)
2. Search the codebase for existing examples
3. Check related documentation using "Related Documentation" links at bottom of each doc
4. Ask the team in Slack/Teams
5. Once you figure it out, consider adding it to the docs!

**Found an error in the docs?**
1. Fix it immediately
2. Submit a PR with the fix
3. Let the team know

---

**Version**: 1.3.0
**Last Updated**: October 25, 2025 (RLS Security Hardening Complete - 100% Coverage Achieved)
**Maintained By**: ClaimTech Development Team

---

**Happy coding! 🚀**

For questions or suggestions about this documentation, please reach out to the team.
