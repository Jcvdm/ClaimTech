# ClaimTech Documentation Index

Welcome to the ClaimTech documentation. This folder contains comprehensive documentation about the system architecture, development practices, and implementation guides.

-CHECK RELEVANT AGENTS USE THEM IN ALL IMPLEMENTATIONS - 

---

## 📖 Quick Navigation

### System Documentation
Understanding the current state of the system

- **[Project Architecture](./System/project_architecture.md)** - Complete system overview: tech stack, structure, workflows, integration points, and security
- **[Database Schema](./System/database_schema.md)** - Complete database documentation: all tables, relationships, RLS policies, storage buckets, and data flow
- **[Development Guide](./System/development_guide.md)** - Quick reference for commands, environment setup, and development patterns
- **[Tech Stack](./System/tech-stack.md)** - Detailed technology stack reference with versions and usage

### Standard Operating Procedures (SOPs)
Best practices for common development tasks

- **[Adding Database Migrations](./SOP/adding_migration.md)** - How to create, test, and apply database migrations with examples
- **[Adding Page Routes](./SOP/adding_page_route.md)** - Creating new pages, API endpoints, and dynamic routes in SvelteKit
- **[Working with Services](./SOP/working_with_services.md)** - Service layer pattern, data access best practices, and examples
- **[Creating Components](./SOP/creating-components.md)** - Creating reusable Svelte 5 components with runes and TypeScript
- **[Testing Guide](./SOP/testing_guide.md)** - Testing patterns and best practices for unit and E2E tests

### Tasks & Features
PRDs, implementation plans, and historical documentation

- **[Production Checklist](./Tasks/production_checklist.md)** - Pre-production deployment checklist
- **[Future Enhancements](./Tasks/future/future_enhancements.md)** - Planned future features and enhancements

#### Active Tasks
Setup and configuration guides for ongoing work:
- **[Auth Setup](./Tasks/active/AUTH_SETUP.md)** - Authentication system setup and implementation
- **[Supabase Setup](./Tasks/active/SUPABASE_SETUP.md)** - Supabase configuration and project setup
- **[Supabase Branching](./Tasks/active/SUPABASE_BRANCHING.md)** - Supabase branch strategy and workflow

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
│   ├── database_schema.md             # Database structure
│   ├── development_guide.md           # Quick dev reference
│   └── tech-stack.md                  # Technology stack details
├── SOP/                               # Standard Operating Procedures
│   ├── adding_migration.md            # Migration workflow
│   ├── adding_page_route.md           # Route creation guide
│   ├── working_with_services.md       # Service layer guide
│   ├── creating-components.md         # Component creation guide
│   └── testing_guide.md               # Testing best practices
└── Tasks/                             # Tasks, features, and history
    ├── production_checklist.md        # Pre-production checklist
    ├── active/                        # Ongoing setup tasks
    │   ├── AUTH_SETUP.md
    │   ├── SUPABASE_SETUP.md
    │   └── SUPABASE_BRANCHING.md
    ├── future/                        # Future enhancements
    │   └── future_enhancements.md
    ├── historical/                    # Implementation history
    │   └── [50+ implementation docs]
    └── scan_reports/                  # Code scan reports
        └── task_scan_report.md
```

---

## 📚 Documentation by Task

### I want to add a new feature

1. Review [Project Architecture](./System/project_architecture.md) to understand where it fits
2. Check [Database Schema](./System/database_schema.md) if data changes needed
3. Follow [Adding Database Migrations](./SOP/adding_migration.md) for schema changes
4. Follow [Adding Page Routes](./SOP/adding_page_route.md) for new pages
5. Follow [Working with Services](./SOP/working_with_services.md) for data access
6. Update System docs if architecture changes significantly

### I want to add a database table

1. Review [Database Schema](./System/database_schema.md) for existing structure
2. Follow [Adding Database Migrations](./SOP/adding_migration.md) step-by-step
3. Update [Database Schema](./System/database_schema.md) with new table info
4. Create service in `src/lib/services/` for CRUD operations

### I want to add a new page

1. Review [Project Architecture - Project Structure](./System/project_architecture.md#project-structure)
2. Follow [Adding Page Routes](./SOP/adding_page_route.md) for complete guide
3. Use [Working with Services](./SOP/working_with_services.md) for data fetching
4. Update navigation if user-facing feature

### I want to create a reusable component

1. Review [Project Architecture - Client-Side State Management](./System/project_architecture.md#client-side-state-management)
2. Place in `src/lib/components/` (UI components in `ui/` subfolder)
3. Use TypeScript for type safety
4. Follow Svelte 5 runes patterns ($state, $derived, $effect)

### I want to understand the authentication flow

1. Read [Project Architecture - Security & Authentication](./System/project_architecture.md#security--authentication)
2. Review [Database Schema - Authentication & User Tables](./System/database_schema.md#authentication--user-tables)
3. Check `src/hooks.server.ts` for implementation

### I want to understand document generation (PDF/ZIP)

1. Read [Project Architecture - PDF Generation Workflow](./System/project_architecture.md#pdf-generation-workflow)
2. Check `src/routes/api/generate-*/+server.ts` for PDF endpoints
3. Review `src/lib/templates/` for HTML templates
4. See `src/lib/utils/pdf-generator.ts` for Puppeteer logic

### I want to understand storage and signed URLs

1. Read [Project Architecture - Storage Architecture](./System/project_architecture.md#storage-architecture)
2. Review [Database Schema - Storage Buckets](./System/database_schema.md#storage-buckets)
3. Check `src/lib/services/storage.service.ts` for implementation
4. See `src/routes/api/photo/` and `src/routes/api/document/` for signed URL endpoints

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
→ [Database Schema](./System/database_schema.md)

**How authentication works?**
→ [Project Architecture - Security & Authentication](./System/project_architecture.md#security--authentication)

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
→ [Database Schema - Row Level Security](./System/database_schema.md#row-level-security-rls-policies)

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

**As of documentation initialization (January 2025):**
- **50+ database tables**
- **50+ database migrations**
- **30+ service files**
- **40+ page routes**
- **10+ API endpoints**
- **TypeScript** throughout the codebase
- **Fully authenticated** with role-based access (admin/engineer)
- **Row Level Security** enabled on all tables
- **Private storage** with signed URLs

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
- ✅ Database schema documentation with RLS policies
- ✅ Standard Operating Procedures (migrations, routes, services, components, testing)
- ✅ Development guide with commands and patterns
- ✅ Historical implementation summaries organized
- ✅ Active task documentation (auth, Supabase setup)
- ✅ Future enhancements planning

**Planned additions:**
- [ ] Troubleshooting guide (common errors and solutions)
- [ ] Deployment guide (environment variables, Vercel setup, Supabase config)
- [ ] API documentation (all endpoints with request/response examples)
- [ ] Performance optimization guide

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

**Version**: 1.0.0
**Last Updated**: January 25, 2025
**Maintained By**: ClaimTech Development Team

---

**Happy coding! 🚀**

For questions or suggestions about this documentation, please reach out to the team.
