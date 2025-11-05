# Feature Implementation Command

You are a senior full-stack developer implementing features in ClaimTech. Follow this systematic workflow to ensure quality, consistency, and completeness.

---

## Phase 1: Requirements Clarification (5-10 min)

### Steps:

1. **Understand the Feature Request**
   - What problem does this solve?
   - Who are the users (admin/engineer)?
   - What are the acceptance criteria?
   - Are there any constraints or dependencies?

2. **Identify Scope**
   - Database changes needed?
   - New services required?
   - UI components to create?
   - API endpoints needed?
   - Authentication/authorization requirements?

3. **Check for Existing Patterns**
   - Search `.agent/System/` for similar features
   - Review `.agent/SOP/` for relevant procedures
   - Check `.claude/skills/` for applicable patterns

**Output:** Clear feature requirements document

---

## Phase 2: Research & Context Gathering (10-15 min)

### Steps:

1. **Read Documentation**
   ```bash
   # Always start here
   - .agent/README.md (index)
   - .agent/System/database_schema.md (if DB changes)
   - .agent/System/project_architecture.md (architecture context)
   ```

2. **Identify Relevant Skills**
   - Database changes? → `supabase-development` skill
   - General feature? → `claimtech-development` skill
   - Assessment workflow? → `assessment-centric-specialist` skill

3. **Find Similar Implementations**
   - Use codebase-retrieval to find similar features
   - Review existing services/components
   - Check migration patterns

**Output:** Context document with related files and patterns

---

## Phase 3: Design & Planning (15-20 min)

### Steps:

1. **Database Design** (if needed)
   - Sketch table structure
   - Define relationships
   - Plan RLS policies
   - Identify indexes needed
   - Reference: `.claude/skills/claimtech-development/resources/database-patterns.md`

2. **Service Layer Design**
   - List required CRUD operations
   - Define service methods
   - Plan ServiceClient injection
   - Reference: `.claude/skills/claimtech-development/resources/service-patterns.md`

3. **UI/UX Design**
   - Sketch component hierarchy
   - Plan page routes
   - Identify reusable components
   - Reference: `.agent/SOP/creating-components.md`

4. **Create Implementation Plan**
   ```markdown
   ## Implementation Tasks
   1. [ ] Database migration (15-30 min)
   2. [ ] Service layer (20-40 min)
   3. [ ] Page routes (30-60 min)
   4. [ ] Components (varies)
   5. [ ] Testing (20-40 min)
   6. [ ] Documentation (10-20 min)
   ```

**Output:** Detailed implementation plan with task breakdown

---

## Phase 4: Implementation (varies)

### Follow Skill Workflows:

#### 4.1 Database Migration
**Invoke:** `claimtech-development` skill → Workflow 1
**Reference:** `.agent/SOP/adding_migration.md`
**Command:** Use `database-migration.md` command

**Checklist:**
- [ ] Migration file created with proper naming
- [ ] SQL is idempotent (IF NOT EXISTS)
- [ ] RLS enabled on new tables
- [ ] RLS policies created (not just permissive)
- [ ] Indexes on all foreign keys
- [ ] updated_at trigger added
- [ ] TypeScript types generated
- [ ] Documentation updated

#### 4.2 Service Layer
**Invoke:** `supabase-development` skill
**Reference:** `.claude/skills/claimtech-development/resources/service-patterns.md`
**Command:** Use `service-development.md` command

**Template:**
```typescript
// src/lib/services/entity.service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';

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

  // ... more methods
}
```

**Checklist:**
- [ ] ServiceClient injection used (never create client)
- [ ] All methods accept optional client parameter
- [ ] Error handling implemented
- [ ] TypeScript types used throughout
- [ ] Methods follow CRUD patterns

#### 4.3 Page Routes
**Reference:** `.agent/SOP/adding_page_route.md`

**Structure:**
```
src/routes/(app)/feature/
├── +page.svelte          # UI
├── +page.server.ts       # Server load + actions
└── [id]/
    ├── +page.svelte
    └── +page.server.ts
```

**Checklist:**
- [ ] Route created in correct location
- [ ] Server load uses `locals.supabase`
- [ ] Form actions use `locals.supabase`
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] Success/error messages shown

#### 4.4 Components
**Reference:** `.agent/SOP/creating-components.md`

**Checklist:**
- [ ] Component in correct directory (ui/forms/shared/etc.)
- [ ] Uses Svelte 5 runes ($state, $derived, $effect)
- [ ] Props typed with TypeScript
- [ ] Callback props for events (onSave, onDelete)
- [ ] Handles loading/error/empty states
- [ ] Accessible (ARIA labels, keyboard nav)

**Output:** Working feature implementation

---

## Phase 5: Testing (20-40 min)

**Command:** Use `testing-workflow.md` command

### Manual Testing:

1. **Functionality Testing**
   - [ ] Feature works as expected
   - [ ] All user flows tested
   - [ ] Edge cases handled
   - [ ] Error states work correctly

2. **Security Testing**
   - [ ] RLS policies enforced
   - [ ] Authentication required
   - [ ] Role-based access works
   - [ ] No data leaks

3. **Performance Testing**
   - [ ] Page loads < 2 seconds
   - [ ] No N+1 queries
   - [ ] Indexes used effectively

### Automated Testing (if applicable):

**Reference:** `.agent/SOP/testing_guide.md`

```bash
# Run type checking
npm run check

# Run linting
npm run lint

# Run unit tests (if written)
npm run test:unit

# Run E2E tests (if written)
npm run test:e2e
```

**Output:** Verified working feature

---

## Phase 6: Documentation (10-20 min)

### Update Documentation:

1. **Database Schema**
   - Add new tables to `.agent/System/database_schema.md`
   - Include columns, indexes, RLS policies

2. **System Documentation**
   - Update `.agent/System/project_architecture.md` if architecture changed
   - Add new services to service list
   - Document new routes

3. **README Index**
   - Update `.agent/README.md` with new documentation

4. **Create SOP** (if new pattern established)
   - Document the pattern in `.agent/SOP/`
   - Include examples and best practices

**Output:** Updated documentation

---

## Phase 7: Code Review & Quality Check (10-15 min)

**Command:** Use `code-review.md` command

### Self-Review Checklist:

**Code Quality:**
- [ ] Follows ClaimTech patterns
- [ ] No magic strings or hard-coded values
- [ ] Proper error handling
- [ ] TypeScript types complete
- [ ] No console.logs left in code
- [ ] Comments explain "why", not "what"

**Security:**
- [ ] RLS policies tested
- [ ] Authentication enforced
- [ ] No sensitive data exposed
- [ ] Input validation implemented

**Performance:**
- [ ] Efficient queries
- [ ] Proper indexes used
- [ ] No unnecessary re-renders
- [ ] Images optimized

**Maintainability:**
- [ ] Code is readable
- [ ] Functions are small and focused
- [ ] Naming is clear and consistent
- [ ] Documentation is complete

**Output:** Quality-verified code

---

## Phase 8: Deployment Preparation (5-10 min)

### Pre-Deployment Checklist:

1. **Git Workflow**
   ```bash
   # Commit changes
   git add .
   git commit -m "feat: [feature description]"
   
   # Push to remote
   git push origin [branch-name]
   ```

2. **Migration Deployment**
   - [ ] Migration tested locally
   - [ ] Migration applied to staging (if available)
   - [ ] Migration ready for production

3. **Environment Variables**
   - [ ] All required env vars documented
   - [ ] No secrets in code

4. **Vercel Deployment**
   - [ ] Build succeeds locally (`npm run build`)
   - [ ] Preview deployment tested
   - [ ] Production deployment verified

**Output:** Feature ready for production

---

## Success Criteria

Feature is complete when:
1. ✅ All acceptance criteria met
2. ✅ Code follows ClaimTech patterns
3. ✅ All checklists passed
4. ✅ Documentation updated
5. ✅ Tests passing (manual + automated)
6. ✅ Security verified
7. ✅ Performance acceptable
8. ✅ Ready for deployment

---

## Common Pitfalls to Avoid

### ❌ Never:
- Skip RLS policies
- Create SupabaseClient in services
- Use API routes for auth mutations
- Hard-code values
- Skip documentation
- Deploy without testing
- Forget to update TypeScript types

### ✅ Always:
- Use ServiceClient injection
- Enable RLS on new tables
- Update documentation
- Test with both admin and engineer users
- Follow existing patterns
- Ask for clarification if unclear

---

## Related Commands

- `database-migration.md` - Detailed migration workflow
- `service-development.md` - Service layer patterns
- `testing-workflow.md` - Testing procedures
- `code-review.md` - Review standards

---

## Related Skills

- `claimtech-development` - General workflows
- `supabase-development` - Database patterns
- `assessment-centric-specialist` - Assessment features

