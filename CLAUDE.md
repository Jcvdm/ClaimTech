# CLAUDE.md - Project Configuration

## DOCS

We keep all important docs in .agent folder with a lightweight, layered index system:

```
.agent/
├── README.md (80 lines) - Lightweight entry point
├── README/ - Focused index files
│   ├── index.md - Master navigation hub
│   ├── system_docs.md - Index of 28 System/ files
│   ├── sops.md - Index of 18 SOP/ files
│   ├── architecture_quick_ref.md - High-level overview
│   ├── database_quick_ref.md - Schema summary
│   ├── changelog.md - Recent updates
│   ├── task_guides.md - Use-case navigation
│   └── faq.md - Common questions
├── System/ - Architecture, database, security docs (28 files)
├── SOP/ - How-to guides & procedures (18 files)
└── Tasks/ - PRDs and implementation plans
```

**CRITICAL - Context-Efficient Navigation:**
1. **Start lightweight** - Read .agent/README.md (80 lines, ~150 tokens)
2. **Navigate efficiently** - Read relevant .agent/README/*.md index (200-400 lines, ~600-800 tokens)
3. **Read targeted** - Access specific System/ or SOP/ document only when needed

**Context Savings**: 90-95% reduction vs old 1,714-line README

**Navigation Examples:**

*"I need to add a database migration"*
→ Read .agent/README.md (80 lines)
→ Read .agent/README/sops.md (300 lines, find "adding_migration.md")
→ Read .agent/SOP/adding_migration.md (543 lines, full guide)
Total: ~920 lines vs 1,714+ lines old way

*"I need architecture overview"*
→ Read .agent/README.md (80 lines)
→ Read .agent/README/architecture_quick_ref.md (250 lines)
Total: ~330 lines vs 977+ lines reading full architecture

**For AI Agents:**
- Use .agent/README.md as FIRST step (never skip this)
- Use index files (.agent/README/*.md) to FIND documentation
- Only read full System/ or SOP/ docs after locating via index
- Use quick refs for overviews, avoid reading full docs unless needed

**IMPORTANT**: The old .agent/README.md was 1,714 lines and is now backed up as README.md.backup. Always use the NEW lightweight system.

We should always update .agent docs after implementing features to keep information current

---

## Claude Skills

Claude Skills are **domain expertise modules** that auto-invoke based on keywords and context. ClaimTech has 4 active skills that provide specialized knowledge and patterns.

### Active Skills

#### 1. **supabase-development**
**Purpose**: Supabase database operations, services, RLS policies, and storage
**Auto-invokes on**: database, queries, RLS, storage, services, schema, migrations
**Use when**:
- Creating or modifying services
- Writing database queries
- Implementing RLS policies
- Working with Supabase Storage
- Extending database schema

**Key Patterns**:
- ServiceClient injection pattern
- Three Supabase clients (browser, SSR, service role)
- Unique ID generation (CLM-2025-001, ASM-2025-001)
- Audit logging conventions
- **Can leverage code execution** for complex data transformations

**Resources**: `.claude/skills/supabase-development/`
- SKILL.md - Core patterns and conventions
- PATTERNS.md - Common implementation patterns
- SECURITY.md - RLS and security guidelines
- EXAMPLES.md - Real-world code examples

---

#### 2. **claimtech-development**
**Purpose**: ClaimTech platform development workflows and patterns
**Auto-invokes on**: features, SvelteKit, migrations, auth, PDF, components, routes
**Use when**:
- Implementing new features
- Creating SvelteKit pages/routes
- Working with authentication
- Generating PDFs or reports
- Following ClaimTech conventions

**Key Workflows**:
1. Database Migration (15-30 min)
2. Service Layer Implementation (20-40 min)
3. SvelteKit Page Route (30-60 min)
4. Authentication & Authorization (20-40 min)
5. PDF Generation (30-60 min)
6. File Storage & Photos (20-40 min)

**Resources**: `.claude/skills/claimtech-development/resources/`
- auth-patterns.md
- component-patterns.md
- database-patterns.md
- pdf-storage-patterns.md
- service-patterns.md

---

#### 3. **assessment-centric-specialist**
**Purpose**: Assessment-centric architecture and stage-based workflow
**Auto-invokes on**: assessment, stage, workflow, pipeline, transitions
**Use when**:
- Implementing stage-based features
- Adding workflow stages
- Working with assessment lifecycle
- Fixing assessment-related bugs
- Ensuring assessment-centric compliance

**Key Concepts**:
- Assessment created WITH request (not at "Start Assessment")
- One assessment per request (unique constraint)
- 10 pipeline stages (request_submitted → archived/cancelled)
- Nullable foreign keys with check constraints
- Idempotent operations
- Complete audit trail

**Resources**: `.claude/skills/assessment-centric-specialist/`
- SKILL.md - Complete architecture guide (1754 lines)
- README.md - Quick reference

---

#### 4. **photo-component-development**
**Purpose**: Photo component patterns with inline editing, optimistic updates, and navigation tracking
**Auto-invokes on**: photo, image, label, gallery, viewer, thumbnail, carousel, inline edit, navigation tracking
**Use when**:
- Implementing photo viewer components
- Adding photo label editing
- Working with photo galleries
- Debugging photo navigation issues
- Implementing optimistic updates for photos

**Key Patterns**:
- Fixed Bottom Bar pattern (fullscreen viewers)
- Modal Footer pattern (dialog viewers)
- Thumbnail Overlay pattern (inline galleries)
- Optimistic update pattern (instant UI feedback)
- Navigation tracking (prevents "wrong photo" bugs)

**Resources**: `.claude/skills/photo-component-development/`
- SKILL.md - Complete pattern guide (~2500 lines)
- README.md - Quick reference
- resources/pattern-templates.md - Copy-paste ready templates

**Related Documentation**:
- `.agent/System/photo_labeling_implementation_nov_6_2025.md` - Implementation history
- `.agent/SOP/photo_labeling_patterns.md` - Step-by-step procedures

---

### Skill Usage Guidelines

**Skill Hierarchy**:
1. **Start with claimtech-development** for general feature work
2. **Invoke supabase-development** when working with database/services
3. **Invoke assessment-centric-specialist** for assessment workflow features
4. **Invoke photo-component-development** for photo viewer/editing features

**Skills + .agent Documentation**:
- **Skills provide HOW** - Patterns, workflows, conventions
- **.agent docs provide WHAT** - Current state, architecture, schemas
- **Use both together** - Skills for methodology, .agent for context

**Best Practices**:
- Skills auto-invoke based on keywords - use relevant terms in your requests
- Reference skill patterns when implementing features
- Update skills when establishing new patterns
- Skills complement (not replace) .agent documentation

---

## Documentation Structure

Maintain documentation in `.agent/` directory:

```
.agent/
├── readme.md                    # Index of all documentation
├── system/
│   ├── project_structure.md    # Overall project layout
│   ├── database_schema.md      # Database design
│   ├── api_endpoints.md        # API documentation
│   └── architecture.md         # System architecture
├── tasks/
│   ├── active/                 # Current task plans
│   ├── completed/              # Finished task documentation
│   └── research/               # Research outputs
├── sops/
│   └── [standard procedures]   # Reusable procedures
└── agents/
    ├── agent_roles.md          # Agent capabilities reference
    ├── handoff_protocol.md     # Context transfer guidelines
    └── [agent_name]/
        ├── skills.md           # Agent-specific capabilities
        └── outputs/            # Agent work products
```

## Workflow Guidelines

### Starting a New Task

1. **Understand Requirements**
   - Clarify user needs
   - Identify which skills are relevant (use keywords to trigger auto-invoke)
   - Create implementation plan

2. **Research Phase (if needed)**
   - Check relevant skill resources (`.claude/skills/`)
   - Read .agent documentation for current state
   - Document findings in `.agent/tasks/research/`

3. **Design Phase (if needed)**
   - Reference skill patterns for implementation approach
   - Document architecture in `.agent/system/`

4. **Implementation Phase**
   - Follow skill workflows (e.g., claimtech-development workflows)
   - Use skill patterns (e.g., supabase-development ServiceClient pattern)
   - Ensure assessment-centric compliance for workflow features
   - Track progress with task management tools
   - **Use code execution** when appropriate for data processing

5. **Quality Assurance**
   - Verify compliance with skill patterns
   - Address any issues found
   - Update documentation

6. **Deployment**
   - Ensure all tests pass
   - Update .agent docs to reflect changes
   - Update skills if new patterns established
   - Complete handoff documentation

### Context Management

**Before Delegating:**
- Create context file in `.agent/tasks/active/[task_name].md`
- Include: requirements, constraints, related files, deliverables

**After Agent Completes:**
- Review agent output
- Integrate into project
- Update documentation
- Move task to `.agent/tasks/completed/`

#

2. **Document agent decisions**
   - Track which agents worked on what
   - Maintain decision log in task files

3. **Maintain coherent architecture**
   - Ensure agent outputs align
   - Review cross-agent dependencies
   - Update system documentation

## Sub-Agents

Claude Sub-Agents are **specialized AI assistants** stored in `.claude/agents/` that provide domain expertise with their own context windows, tools, and system prompts. They automatically delegate based on keywords and leverage Skills + Commands for their work.

### **What Are Sub-Agents?**

Sub-agents are specialized AI personalities that:
- **Have their own context window** (separate from main conversation)
- **Auto-invoke based on keywords** in their description
- **Use specific tools** (Read, Write, Bash, MCP tools)
- **Follow Skills and Commands** for patterns and workflows
- **Provide specialized expertise** for specific domains
- **Can use code execution** for complex data workflows

### **Active Sub-Agents**

#### 1. **database-expert**
**Purpose**: Database migrations, RLS policies, schema design, Supabase configurations
**Auto-invokes on**: migration, database, schema, RLS, policy, SQL, table, index, Supabase
**Tools**: Read, Write, Bash, Supabase MCP tools, code execution
**Skills Used**: supabase-development, assessment-centric-specialist
**Commands Used**: database-migration.md, code-review.md

**Key Capabilities**:
- Creates safe, idempotent migrations
- Reviews RLS policies for security
- Ensures proper indexing
- Designs normalized schemas
- Generates TypeScript types
- Uses code execution for data analysis

---

#### 2. **feature-implementer**
**Purpose**: Complete feature development from requirements to deployment
**Auto-invokes on**: feature, implement, build, create, add functionality, new component, page, route
**Tools**: Read, Write, Bash, Supabase MCP tools, code execution
**Skills Used**: claimtech-development, supabase-development, assessment-centric-specialist
**Commands Used**: feature-implementation.md, database-migration.md, service-development.md, testing-workflow.md, code-review.md

**Key Capabilities**:
- Implements complete features (8-phase workflow)
- Creates SvelteKit pages and components
- Integrates with Supabase services
- Ensures role-based access control
- Coordinates with other sub-agents
- Uses code execution for complex operations

---

#### 3. **code-reviewer**
**Purpose**: Code quality, security, and ClaimTech standards compliance
**Auto-invokes on**: review, quality, check, standards, security, audit, verify, validate
**Tools**: Read, Bash, code execution
**Skills Used**: claimtech-development, supabase-development, assessment-centric-specialist
**Commands Used**: code-review.md

**Key Capabilities**:
- Reviews code for quality and security
- Generates comprehensive review reports
- Provides weighted scoring (0-10)
- Identifies issues with severity ratings
- Verifies acceptance criteria
- Can analyze code patterns via execution

---

#### 4. **testing-specialist**
**Purpose**: Comprehensive testing (manual, unit, E2E, performance, security)
**Auto-invokes on**: test, testing, verify, validate, E2E, unit test, performance, security, QA
**Tools**: Read, Write, Bash, code execution
**Skills Used**: claimtech-development, supabase-development, assessment-centric-specialist
**Commands Used**: testing-workflow.md

**Key Capabilities**:
- Designs comprehensive test plans
- Writes unit tests (Vitest)
- Writes E2E tests (Playwright)
- Tests across user roles
- Verifies accessibility
- Uses code execution for test data generation

---

#### 5. **service-builder**
**Purpose**: Service layer implementation with proper patterns
**Auto-invokes on**: service, data access, CRUD, business logic, database operations, queries
**Tools**: Read, Write, Bash, Supabase MCP tools, code execution
**Skills Used**: supabase-development, claimtech-development
**Commands Used**: service-development.md

**Key Capabilities**:
- Creates service classes with ServiceClient injection
- Implements CRUD operations
- Writes business logic and custom queries
- Ensures type safety with TypeScript
- Documents with JSDoc
- Uses code execution for complex queries

---

#### 6. **assessment-architect**
**Purpose**: Assessment-centric architecture and stage-based workflow
**Auto-invokes on**: assessment, request, stage, workflow, pipeline, transition, lifecycle
**Tools**: Read, Write, Bash, Supabase MCP tools, code execution
**Skills Used**: assessment-centric-specialist, claimtech-development, supabase-development
**Commands Used**: feature-implementation.md, database-migration.md

**Key Capabilities**:
- Ensures assessment-centric compliance
- Implements stage-based workflow features
- Manages assessment lifecycle
- Enforces one-assessment-per-request
- Designs idempotent operations
- Uses code execution for workflow analysis

---

#### 7. **research-agent**
**Purpose**: Research documentation, libraries, APIs, and implementation patterns
**Auto-invokes on**: research, documentation, library, API, how to, example, implementation, best practice, guide
**Tools**: Read, Write, Context7 MCP, web-search, web-fetch, code execution
**Skills Used**: claimtech-development, supabase-development
**Commands Used**: feature-implementation.md (research phase)

**Key Capabilities**:
- Researches library documentation (Context7)
- Searches web for examples and guides
- Fetches API documentation
- Finds best practices and patterns
- Documents research findings
- Can execute example code for validation

---

### **Sub-Agent Hierarchy**

```
Main Claude (Orchestrator)
    ├── feature-implementer (Master coordinator)
    │   ├── database-expert (Schema changes)
    │   ├── service-builder (Data access)
    │   ├── testing-specialist (Quality assurance)
    │   └── code-reviewer (Final check)
    ├── assessment-architect (Assessment features)
    │   ├── database-expert (Assessment schema)
    │   └── feature-implementer (Implementation)
    └── research-agent (External knowledge)
        └── feature-implementer (Apply findings)
```

### **How Sub-Agents Work**

#### **Automatic Delegation**
When you mention keywords in your request, Claude automatically delegates to the appropriate sub-agent:

**Example 1**: "Create a migration for comments table"
→ Auto-invokes `database-expert` (keyword: migration, table)

**Example 2**: "Test the new feature across all roles"
→ Auto-invokes `testing-specialist` (keywords: test, roles)

**Example 3**: "Research best practices for PDF generation"
→ Auto-invokes `research-agent` (keywords: research, best practices)

#### **Explicit Delegation**
You can also explicitly request a specific sub-agent:

**Example**: "Have the code-reviewer check my changes"
→ Explicitly invokes `code-reviewer`

#### **Sub-Agent Coordination**
Sub-agents work together on complex tasks:

**Example**: "Implement a comments feature"
1. `feature-implementer` coordinates the work
2. Delegates to `database-expert` for migration
3. Delegates to `service-builder` for CommentService
4. Implements UI components itself
5. Delegates to `testing-specialist` for testing
6. Delegates to `code-reviewer` for final check

### **Sub-Agents vs Skills vs Commands**

| Aspect | Sub-Agents | Skills | Commands |
|--------|------------|--------|----------|
| **Purpose** | Specialized AI personality | Domain patterns | Procedural workflows |
| **Location** | `.claude/agents/` | `.claude/skills/` | `.claude/commands/` |
| **Activation** | Auto on keywords | Auto on keywords | Manual invoke |
| **Context** | Own context window | Shared context | Shared context |
| **Content** | System prompt + tools | Best practices | Step-by-step guides |
| **Example** | "I am a database expert..." | "Use ServiceClient injection" | "Phase 1: Do X, Phase 2: Do Y" |

### **Benefits of Sub-Agents**

1. **Context Preservation**: Each sub-agent has its own context window, preventing context overflow
2. **Specialized Expertise**: Each sub-agent is an expert in its domain
3. **Parallel Work**: Multiple sub-agents can work simultaneously
4. **Reusability**: Sub-agents can be invoked multiple times across conversations
5. **Flexible Permissions**: Each sub-agent has specific tools it can use
6. **Quality Consistency**: Sub-agents always follow the same patterns and standards

---

## Commands

Claude Commands are **specialized instruction files** stored in `.claude/commands/` that provide procedural guidance for common ClaimTech development tasks. They complement Skills (patterns) and .agent docs (reference).

### **Available Commands**

#### **1. feature-implementation.md** - Complete Feature Development Workflow
**Purpose**: Guides through the entire feature lifecycle from requirements to deployment

**When to Use**:
- User requests: "Implement [feature]", "Add [functionality]", "Build [component]"
- Starting any new feature work
- Need structured approach to complex features

**8-Phase Workflow**:
1. Requirements Clarification (5-10 min)
2. Research & Context Gathering (10-15 min)
3. Design & Planning (15-20 min)
4. Implementation (varies) - Invokes other commands/skills, may use code execution
5. Testing (20-40 min) - Uses `testing-workflow.md`
6. Documentation (10-20 min)
7. Code Review & Quality Check (10-15 min) - Uses `code-review.md`
8. Deployment Preparation (5-10 min)

**Success Criteria**: All acceptance criteria met, patterns followed, tests passing, docs updated

---

#### **2. database-migration.md** - Safe Migration Creation and Testing
**Purpose**: Detailed procedural guide for creating, testing, and deploying database migrations

**When to Use**:
- User requests: "Add table", "Modify schema", "Create migration"
- Any database structure changes
- RLS policy updates

**7-Phase Workflow**:
1. Planning (5-10 min) - Schema design
2. Create Migration File (2-3 min) - Naming conventions
3. Write Migration SQL (15-25 min) - Idempotent patterns
4. Test Migration Locally (10-15 min) - RLS verification
5. Generate TypeScript Types (2-3 min)
6. Update Documentation (5-10 min)
7. Commit Migration (2-3 min)

**Key Features**: Idempotency checklist, RLS patterns, common SQL patterns, rollback strategy

---

#### **3. service-development.md** - Service Layer Implementation
**Purpose**: Guide for creating ClaimTech service classes with proper patterns

**When to Use**:
- User requests: "Create service for [table]", "Add data access layer"
- After creating database migration
- Need CRUD operations for a table

**6-Phase Workflow**:
1. Service Design (5-10 min) - Identify operations
2. Create Service File (5-10 min) - ServiceClient injection
3. Implement CRUD Operations (15-25 min) - Basic methods
4. Add Business Logic (15-30 min) - Custom queries, aggregations
5. Testing (15-25 min) - Manual testing in routes
6. Documentation (5-10 min) - JSDoc and system docs

**Key Patterns**: ServiceClient injection, error handling, filtering, relationships, bulk operations

---

#### **4. testing-workflow.md** - Comprehensive Testing Procedures
**Purpose**: Systematic testing procedures for ClaimTech features

**When to Use**:
- User requests: "Test [feature]", "Write tests for [component]"
- After implementing any feature
- Before deployment

**6-Phase Workflow**:
1. Manual Testing (15-20 min) - Functionality, roles, browsers, accessibility
2. Unit Testing (20-30 min) - Vitest for services/components
3. E2E Testing (30-45 min) - Playwright for user flows
4. Performance Testing (10-15 min) - Page load, queries, bundle size
5. Security Testing (10-15 min) - RLS, auth, input validation
6. Test Documentation (5-10 min) - Test report and cases

**Coverage**: Manual, automated, performance, security, accessibility testing

---

#### **5. code-review.md** - Quality Standards and Review Checklist
**Purpose**: Comprehensive code review ensuring ClaimTech quality standards

**When to Use**:
- User requests: "Review this code", "Check quality"
- Before committing code
- Before creating PR
- Self-review before asking for human review

**5-Category Review** (Weighted Scoring):
1. **Code Quality (25%)** - Patterns, style, error handling
2. **Security (30%)** - Auth, RLS, data protection
3. **Performance (20%)** - Queries, rendering, bundle size
4. **Maintainability (15%)** - Readability, organization, TypeScript
5. **Documentation (10%)** - Code docs, system docs

**Scoring Guide**:
- 9-10: Excellent - Ready to merge
- 7-8: Good - Minor improvements needed
- 5-6: Acceptable - Significant improvements needed
- < 5: Needs work - Major issues to address

**Output**: Detailed review report with severity-rated issues and actionable fixes

---

### **Command Hierarchy**

Commands work together in a structured workflow:

```
feature-implementation.md (Master workflow)
    ├── database-migration.md (DB changes)
    ├── service-development.md (Data access)
    ├── testing-workflow.md (Quality assurance)
    └── code-review.md (Final check)
```

### **Commands vs Skills vs .agent Docs**

| Aspect | Commands | Skills | .agent Docs |
|--------|----------|--------|-------------|
| **Purpose** | Procedural workflows | Domain patterns | Current state |
| **Location** | `.claude/commands/` | `.claude/skills/` | `.agent/` |
| **Activation** | Manual invoke | Auto on keywords | Manual read |
| **Content** | Step-by-step guides | Best practices | Reference info |
| **Example** | "Phase 1: Do X, Phase 2: Do Y" | "Use ServiceClient injection" | "Table has columns X, Y, Z" |

### **How to Use Commands**

**Example: Complete Feature Implementation**

User Request: "Add a comments feature to assessments"

**Claude's Workflow**:
1. Invokes `feature-implementation.md` (master workflow)
2. Invokes `database-migration.md` (creates comments table)
3. Invokes `service-development.md` (creates CommentService)
4. Implements UI (following feature-implementation phases)
5. Invokes `testing-workflow.md` (comprehensive testing)
6. Invokes `code-review.md` (quality verification)
7. Completes deployment (from feature-implementation)

**Result**: Complete, tested, reviewed, documented feature ready for production

---

## Code Execution

### What is Code Execution?

ClaimTech uses **Architecture A: Two-Phase Code Execution** for efficient data processing. This pattern achieves 73-94% token reduction for multi-step data workflows.

**CRITICAL**: Code execution runs in an isolated Deno sandbox and **CANNOT call MCP tools directly**. Instead, Claude uses a two-phase approach:

1. **Phase 1**: Claude calls MCP tools to fetch data
2. **Phase 2**: Claude embeds data in TypeScript code and executes processing logic

This separation provides excellent token efficiency while maintaining the security and isolation benefits of the sandbox.

### The Pattern

**Traditional Approach (Inefficient)**:
```
User: "Analyze assessment completion times by stage"

Claude:
  → mcp__supabase__execute_sql (500 tokens)
  → mcp__supabase__execute_sql (500 tokens)
  → mcp__supabase__execute_sql (500 tokens)
  → Process data in conversation (1000 tokens)
  → Format response (500 tokens)

Total: ~3000 tokens, 5 API calls, 30 seconds
```

**Architecture A: Two-Phase Pattern (Efficient)**:
```
User: "Analyze assessment completion times by stage"

Phase 1 - Claude calls MCP tool to fetch data:
  → mcp__supabase__execute_sql (500 tokens)

Phase 2 - Claude processes in code execution:
  → Generate processing code with embedded data (200 tokens)
  → Execute via mcp__ide__executeCode (100 tokens)
  → Return formatted results (50 tokens)

Total: ~850 tokens, 2 operations, 8 seconds
73% token reduction
```

**The Two-Phase Pattern**:

```typescript
// Phase 1: Fetch Data (Claude calls MCP tool)
const assessments = await mcp__supabase__execute_sql({
  project_id: env.SUPABASE_PROJECT_ID,
  query: `
    SELECT id, stage, stage_history
    FROM assessments
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `
});

// Phase 2: Process Data (Claude executes code)
const code = `
  const assessments = ${JSON.stringify(assessments)};

  // Calculate stage durations
  const durations = assessments.map(a => {
    const history = JSON.parse(a.stage_history || '[]');
    const stageTimes = {};

    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i-1].timestamp);
      const curr = new Date(history[i].timestamp);
      const hours = (curr - prev) / (1000 * 60 * 60);
      stageTimes[history[i].stage] = hours;
    }

    return { id: a.id, durations: stageTimes };
  });

  // Aggregate statistics
  const stats = ['inspection_scheduled', 'inspection_in_progress', 'report_in_progress']
    .map(stage => {
      const times = durations
        .map(d => d.durations[stage])
        .filter(t => t != null);

      return {
        stage,
        count: times.length,
        avg: times.reduce((a,b) => a+b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times)
      };
    });

  console.log('Stage breakdown:', JSON.stringify(stats, null, 2));
`;

await mcp__ide__executeCode({ code });
```

### Available MCP Servers for Data Fetching

**Important**: These MCP servers are called BY Claude in Phase 1 to fetch data. They are NOT imported or called FROM code execution.

ClaimTech has 6 active MCP servers that Claude uses to fetch data:

#### 1. **Supabase** - Database Operations
**Claude calls these tools in Phase 1**:
- `mcp__supabase__execute_sql` - Run SQL queries
- `mcp__supabase__apply_migration` - Deploy migrations
- `mcp__supabase__list_tables` - Schema inspection
- `mcp__supabase__get_project` - Project details

**Example - Phase 1 (Fetch)**:
```typescript
// Claude calls this MCP tool
const assessments = await mcp__supabase__execute_sql({
  project_id: env.SUPABASE_PROJECT_ID,
  query: 'SELECT * FROM assessments WHERE stage = $1',
  params: ['completed']
});
```

**Example - Phase 2 (Process)**:
```typescript
// Claude generates code with data embedded
const code = `
  const assessments = ${JSON.stringify(assessments)};

  // Process data
  const stats = assessments.reduce((acc, a) => {
    acc[a.stage] = (acc[a.stage] || 0) + 1;
    return acc;
  }, {});

  console.log('Stage breakdown:', JSON.stringify(stats, null, 2));
`;

await mcp__ide__executeCode({ code });
```

#### 2. **GitHub** - Repository Operations
**Claude calls these tools in Phase 1**:
- `mcp__github__get_file_contents` - Read files
- `mcp__github__list_commits` - Commit history
- `mcp__github__search_code` - Code search
- `mcp__github__list_issues` - Issue tracking

**Example - Phase 1 (Fetch)**:
```typescript
// Claude calls MCP tool
const commits = await mcp__github__list_commits({
  owner: 'ClaimTech',
  repo: 'claimtech',
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
});
```

**Example - Phase 2 (Process)**:
```typescript
// Claude processes commit data
const code = `
  const commits = ${JSON.stringify(commits)};

  const analysis = commits.reduce((acc, c) => {
    const author = c.commit.author.name;
    acc[author] = (acc[author] || 0) + 1;
    return acc;
  }, {});

  console.log('Commits by author:', JSON.stringify(analysis, null, 2));
`;

await mcp__ide__executeCode({ code });
```

#### 3. **Playwright** - Browser Automation
**Claude calls these tools**:
- `mcp__playwright__navigate` - Navigate pages
- `mcp__playwright__screenshot` - Capture screenshots
- Used for E2E testing, not typically in code execution workflows

#### 4. **Svelte** - Framework Guidance
**Claude calls these tools**:
- `mcp__svelte__analyze_component` - Component analysis
- Used for development guidance, not data processing

#### 5. **Chrome DevTools** - Debugging
**Claude calls these tools**:
- `mcp__chrome__evaluate_expression` - Runtime inspection
- Used for debugging, not data workflows

#### 6. **Context7** - Documentation
**Claude calls these tools**:
- `mcp__context7__search_docs` - Search documentation
- Used for research, not data processing

### When to Use Code Execution

**Important**: Code execution is for DATA PROCESSING, not data fetching. Always fetch data with MCP tools first (Phase 1), then process with code execution (Phase 2).

#### ✅ Use Code Execution When:

1. **Complex data transformations** after fetching
   - Multiple map/filter/reduce operations
   - Example: "Process 100 assessments with validation logic"
   - Pattern: Fetch with MCP → Transform in code

2. **Data analysis** with calculations
   - Averages, statistics, correlations, percentages
   - Example: "Calculate completion times by stage from stage_history JSON"
   - Pattern: Fetch assessments with MCP → Calculate in code

3. **Report generation** with formatting
   - Markdown/HTML output, tables, charts
   - Example: "Generate monthly performance report with stage breakdown"
   - Pattern: Fetch data with MCP → Format in code

4. **Cross-source correlation** (combining multiple MCP results)
   - Joining data from different queries
   - Example: "Correlate GitHub commits with assessment updates"
   - Pattern: Fetch from GitHub MCP + Supabase MCP → Correlate in code

5. **JSON parsing and aggregation**
   - Processing JSONB columns, nested data structures
   - Example: "Analyze stage_history to find average time per stage"
   - Pattern: Fetch JSON data with MCP → Parse and aggregate in code

6. **Batch validation logic**
   - Validate 10+ records with complex rules
   - Example: "Find assessments ready for completion (photos >= 5, no open issues)"
   - Pattern: Fetch assessments with MCP → Validate in code

**Decision Rule**: If you need to transform, analyze, or format data AFTER fetching it, use Architecture A (MCP fetch → code process).

#### ❌ Don't Use Code Execution When:

1. **Simple single query** - Use MCP tool directly, no processing needed
2. **Data already in desired format** - MCP tools return structured data
3. **Need additional queries** based on results - Code cannot call MCP tools
4. **Data too large** to embed in code - Filter with SQL or batch process

### Common Patterns

#### Pattern 1: Data Analysis Pipeline

**Scenario**: Analyze assessment completion times by stage

**Phase 1: Fetch Data with MCP**
```typescript
// Claude calls MCP tool to fetch data
const assessments = await mcp__supabase__execute_sql({
  project_id: env.SUPABASE_PROJECT_ID,
  query: `
    SELECT id, stage, created_at, stage_history
    FROM assessments
    WHERE stage IN ('completed', 'archived')
      AND created_at >= NOW() - INTERVAL '30 days'
    ORDER BY updated_at DESC
    LIMIT 1000
  `
});
```

**Phase 2: Process Data with Code Execution**
```typescript
// Claude generates processing code with embedded data
const code = `
  const assessments = ${JSON.stringify(assessments)};

  // Calculate stage durations
  const stageDurations = assessments.map(a => {
    const history = JSON.parse(a.stage_history || '[]');
    const durations = {};

    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i-1].timestamp);
      const curr = new Date(history[i].timestamp);
      const hours = (curr - prev) / (1000 * 60 * 60);
      durations[history[i].stage] = hours;
    }

    return { id: a.id, stages: durations };
  });

  // Aggregate statistics
  const stageStats = ['inspection_scheduled', 'inspection_in_progress', 'report_in_progress']
    .map(stage => {
      const times = stageDurations
        .map(d => d.stages[stage])
        .filter(t => t != null);

      return {
        stage,
        count: times.length,
        avg: times.length > 0 ? times.reduce((a,b) => a+b, 0) / times.length : 0,
        min: times.length > 0 ? Math.min(...times) : 0,
        max: times.length > 0 ? Math.max(...times) : 0
      };
    });

  console.log(JSON.stringify(stageStats, null, 2));
`;

// Claude executes processing code
await mcp__ide__executeCode({ code });
```

**Token Efficiency**:
- Traditional (5 separate MCP calls): ~3000 tokens
- Architecture A (1 MCP + 1 code): ~850 tokens
- **Savings: 73%**

#### Pattern 2: Batch Validation

**Scenario**: Find assessments ready for completion (with validation logic)

**Phase 1: Fetch Data with MCP**
```typescript
// Claude calls MCP tool to fetch assessments with related counts
const assessments = await mcp__supabase__execute_sql({
  project_id: env.SUPABASE_PROJECT_ID,
  query: `
    SELECT a.*,
      COUNT(DISTINCT p.id) as photo_count,
      COUNT(DISTINCT CASE WHEN i.status = 'open' THEN i.id END) as open_issue_count
    FROM assessments a
    LEFT JOIN photos p ON p.assessment_id = a.id
    LEFT JOIN issues i ON i.assessment_id = a.id
    WHERE a.stage = 'pending_review'
    GROUP BY a.id
  `
});
```

**Phase 2: Process Validation with Code Execution**
```typescript
// Claude generates validation code with embedded data
const code = `
  const assessments = ${JSON.stringify(assessments)};

  // Validate assessments
  const results = {
    ready: [],
    notReady: [],
    reasons: {}
  };

  for (const a of assessments) {
    const reasons = [];

    // Validation rules
    if (a.photo_count < 5) {
      reasons.push('Needs ' + (5 - a.photo_count) + ' more photos');
    }

    if (a.open_issue_count > 0) {
      reasons.push(a.open_issue_count + ' open issues remain');
    }

    if (!a.engineer_id) {
      reasons.push('No engineer assigned');
    }

    // Categorize
    if (reasons.length === 0) {
      results.ready.push(a.id);
    } else {
      results.notReady.push(a.id);
      results.reasons[a.id] = reasons;
    }
  }

  // Summary report
  const summary = {
    total: assessments.length,
    ready: results.ready.length,
    notReady: results.notReady.length,
    readyIds: results.ready,
    notReadyDetails: results.notReady.map(id => ({
      id,
      reasons: results.reasons[id]
    }))
  };

  console.log(JSON.stringify(summary, null, 2));
`;

// Claude executes validation code
await mcp__ide__executeCode({ code });
```

**Note**: For batch UPDATES (not just validation), you would:
1. Phase 1: Fetch data with MCP
2. Phase 2: Validate in code execution (identify which to update)
3. Phase 3: Update via MCP (loop through IDs from Phase 2)

**Token Efficiency**:
- Traditional (10+ separate MCP calls for validation): ~8000 tokens
- Architecture A (1 MCP fetch + 1 code validation): ~1200 tokens
- **Savings: 85%**

#### Pattern 3: Cross-Source Data Correlation

**Scenario**: Correlate GitHub commits with assessment updates

**Phase 1: Fetch Data from Multiple MCP Sources**
```typescript
// Claude calls Supabase MCP tool
const assessments = await mcp__supabase__execute_sql({
  project_id: env.SUPABASE_PROJECT_ID,
  query: `
    SELECT id, assessment_number, updated_at
    FROM assessments
    WHERE updated_at >= NOW() - INTERVAL '7 days'
  `
});

// Claude calls GitHub MCP tool
const commits = await mcp__github__list_commits({
  owner: 'ClaimTech',
  repo: 'claimtech',
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
});
```

**Phase 2: Correlate Data with Code Execution**
```typescript
// Claude generates correlation code with both datasets embedded
const code = `
  const assessments = ${JSON.stringify(assessments)};
  const commits = ${JSON.stringify(commits)};

  // Correlate commits with assessments
  const correlation = assessments.map(a => {
    const relatedCommits = commits.filter(c =>
      c.commit.message.includes(a.assessment_number)
    );

    return {
      assessment: a.assessment_number,
      updated_at: a.updated_at,
      commit_count: relatedCommits.length,
      commit_messages: relatedCommits.map(c => c.commit.message),
      authors: [...new Set(relatedCommits.map(c => c.commit.author.name))]
    };
  });

  // Filter to assessments with related commits
  const withCommits = correlation.filter(c => c.commit_count > 0);

  // Summary statistics
  const summary = {
    total_assessments: assessments.length,
    assessments_with_commits: withCommits.length,
    total_commits: commits.length,
    correlation_details: withCommits
  };

  console.log(JSON.stringify(summary, null, 2));
`;

// Claude executes correlation code
await mcp__ide__executeCode({ code });
```

**Token Efficiency**:
- Traditional (separate fetches + in-conversation correlation): ~6000 tokens
- Architecture A (2 MCP fetches + 1 code correlation): ~1550 tokens
- **Savings: 74%**

### Getting Started

**Step 1**: Identify if code execution is appropriate (see decision criteria above)
   - Need to process, transform, or analyze data AFTER fetching it
   - Data is not too large to embed in code (< 1000 records typically)

**Step 2**: Read the [Using Code Executor SOP](`.agent/SOP/using_code_executor.md`) for complete 5-phase workflow

**Step 3**: Choose a pattern from [Code Execution Patterns](`.agent/System/code_execution_patterns.md`)
   - Pattern 1: Data Analysis Pipeline
   - Pattern 2: Batch Validation
   - Pattern 3: Cross-Source Correlation

**Step 4**: Execute the Two-Phase Pattern:

**Phase 1 - Fetch Data**: Call MCP tools to get data
```typescript
const data = await mcp__supabase__execute_sql({
  project_id: env.SUPABASE_PROJECT_ID,
  query: 'SELECT * FROM table WHERE condition'
});
```

**Phase 2 - Process Data**: Generate and execute processing code
```typescript
const code = `
  const data = ${JSON.stringify(data)};
  // Processing logic here
  console.log(JSON.stringify(result, null, 2));
`;
await mcp__ide__executeCode({ code });
```

**Step 5**: Review results and iterate if needed

### Benefits Summary

- **73-94% token reduction** for multi-step workflows
- **Two-phase approach** (MCP fetch → code process) instead of 5-10+ tool calls
- **5-10x faster** completion times
- **Type-safe** operations with full TypeScript in code execution
- **Complex processing logic** in familiar programming patterns
- **Error handling** with try/catch in code execution
- **Secure** - Code execution is isolated, cannot access MCP tools or credentials
- **Clear separation** - MCP for data access, code for processing

### Documentation

For comprehensive guides and API reference:

- **[Using Code Executor](`.agent/SOP/using_code_executor.md`)** (500+ lines) - Step-by-step workflow guide with decision tree
- **[Code Execution Architecture](`.agent/System/code_execution_architecture.md`)** (800+ lines) - Architecture layers and token efficiency analysis
- **[Code Execution Patterns](`.agent/System/code_execution_patterns.md`)** (600+ lines) - 6 real-world patterns with complete implementations
- **[MCP Code API Reference](`.agent/System/mcp_code_api_reference.md`)** (1,200+ lines) - Complete API reference for all 6 MCP servers

---

## Best Practices

1. **Plan Before Delegating**
   - Break down complex tasks
   - Identify dependencies between agent tasks
   - Sequence agents appropriately

2. **Leverage Parallelization**
   - Launch independent agents simultaneously
   - Use single message with multiple Task calls

3. **Quality First**
   - Never skip code quality analysis
   - Address issues before moving forward

4. **Document Everything**
   - Maintain task logs
   - Update system documentation
   - Track decisions and rationale

5. **Coordinate Effectively**
   - Ensure agents have complete context
   - Review and integrate agent outputs
   - Maintain project coherence

6. **Use Code Execution When Appropriate**
   - Multi-step workflows (3+ operations)
   - Complex data transformations
   - Batch processing operations
   - Data analysis and reporting
