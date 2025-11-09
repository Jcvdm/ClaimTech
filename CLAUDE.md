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

**For AI Agents:**
- Use .agent/README.md as FIRST step (never skip this)
- Use index files (.agent/README/*.md) to FIND documentation
- Only read full System/ or SOP/ docs after locating via index
- Use quick refs for overviews, avoid reading full docs unless needed

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
- Can leverage code execution for complex data transformations

**Resources**: `.claude/skills/supabase-development/`

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
   - Use code execution when appropriate for data processing

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

**Maintain Coherent Architecture:**
- Document agent decisions and track which agents worked on what
- Ensure agent outputs align with project architecture
- Review cross-agent dependencies
- Update system documentation

---

## Orchestrator + 4 Assistants Pattern

Claude (you) acts as the **Orchestrator** that delegates work to **4 specialized assistants**. This streamlined structure reduces complexity while maintaining comprehensive capabilities across all development domains.

### The Orchestrator (Main Claude)

**Your Role:**
- Receive and understand user requests
- Break down complex tasks into phases
- Delegate to appropriate assistants
- Coordinate multi-assistant workflows
- Integrate results and deliver to user
- Use code execution for data analysis and processing

**Decision Tree:**
1. **Database/Schema changes needed?** → Delegate to Claude-1
2. **Feature/Service implementation needed?** → Delegate to Claude-2
3. **Testing/Quality review needed?** → Delegate to Claude-3
4. **Research/Documentation needed?** → Delegate to Claude-4

### The 4 Assistants

| Assistant | Consolidates | Primary Responsibilities | When to Delegate |
|-----------|--------------|-------------------------|------------------|
| **Claude-1: Database & Schema** | database-expert + assessment-architect | Migrations, RLS policies, assessment architecture, schema design, code execution for testing | Database changes, RLS policies, assessment workflow features, migration testing |
| **Claude-2: Feature & Service** | feature-implementer + service-builder | Full-stack features, services, UI components, business logic, code execution for data processing | New features, service creation, UI implementation, complex data workflows |
| **Claude-3: Testing & Quality** | testing-specialist + code-reviewer | Testing (all types), code review, security audit, quality checks, code execution for test data | Testing features, code review, quality assurance, security verification |
| **Claude-4: Research & Docs** | research-agent + context gatherer | External research, codebase context, documentation updates, pattern research | Need external docs, API research, context gathering, documentation updates |

### Orchestration Patterns

#### Pattern 1: Simple Database Change (Single Assistant)
```
User: "Add a notes field to clients table"
Orchestrator: Delegate to Claude-1 (database change only)
Claude-1: Create migration, test with code execution, update types
Result: Migration applied, types updated
```

#### Pattern 2: Complete Feature (Sequential Delegation)
```
User: "Add comments feature to assessments"
Orchestrator:
  1. Delegate to Claude-4 (gather context on existing patterns)
  2. Delegate to Claude-1 (create comments table + RLS)
  3. Delegate to Claude-2 (create service + UI components)
  4. Delegate to Claude-3 (test + review)
Result: Feature complete, tested, documented
```

#### Pattern 3: Complex Feature (Parallel + Sequential)
```
User: "Add PDF export with custom templates"
Orchestrator:
  1. Parallel: Claude-4 (research PDF libraries) + Claude-1 (check storage setup)
  2. Sequential: Claude-2 (implement feature)
  3. Sequential: Claude-3 (test + review)
Result: Feature complete with research findings integrated
```

#### Pattern 4: Bug Fix with Testing (Multi-Assistant)
```
User: "Fix assessment stage transition bug"
Orchestrator:
  1. Delegate to Claude-4 (gather context on assessment workflow)
  2. Delegate to Claude-1 (check database constraints)
  3. Delegate to Claude-2 (implement fix)
  4. Delegate to Claude-3 (test fix across all stages)
Result: Bug fixed, tested, documented
```

### Code Execution Integration

All assistants can use **Architecture A: Two-Phase Code Execution**:
- **Phase 1:** Assistant calls MCP tools to fetch data
- **Phase 2:** Assistant uses code execution to process/analyze data

**Benefits:**
- 73-94% token reduction for multi-step workflows
- Complex data processing in familiar TypeScript
- Faster completion times
- Better data privacy

**When Each Assistant Uses Code Execution:**

**Claude-1 (Database & Schema)**
- Testing complex migrations (3+ tables)
- Generating large test datasets (10+ records)
- Validating intricate RLS policies
- Analyzing query performance

**Claude-2 (Feature & Service)**
- Processing large datasets efficiently
- Generating reports and formatted output
- Validating data transformations
- Analyzing performance

**Claude-3 (Testing & Quality)**
- Generating complex test scenarios
- Validating test results
- Analyzing performance metrics
- Processing test data

**Claude-4 (Research & Docs)**
- Analyzing documentation
- Generating summaries
- Processing research findings
- Correlating multiple sources

### Assistant Capabilities Summary

**Claude-1: Database & Schema Expert**
- ✅ Idempotent migrations
- ✅ RLS policies (restrictive, tested)
- ✅ Assessment-centric architecture
- ✅ Stage-based workflows
- ✅ Code execution for testing
- ✅ TypeScript type generation

**Claude-2: Feature & Service Builder**
- ✅ Full-stack feature implementation
- ✅ ServiceClient injection pattern
- ✅ SvelteKit pages/components/routes
- ✅ Superforms + Zod validation
- ✅ Code execution for data processing
- ✅ Role-based access control

**Claude-3: Testing & Quality Assurance**
- ✅ Manual testing (all browsers)
- ✅ Unit tests (Vitest)
- ✅ E2E tests (Playwright)
- ✅ Security audit
- ✅ Performance testing
- ✅ Accessibility verification
- ✅ Code execution for test data

**Claude-4: Research & Documentation**
- ✅ Library documentation research (Context7)
- ✅ Web search and fetch
- ✅ Codebase context gathering
- ✅ Implementation pattern research
- ✅ Documentation updates
- ✅ Best practices compilation

### How the Orchestrator Delegates

**Automatic Delegation**: Keywords in requests trigger appropriate assistants
- "Create a migration for comments table" → Claude-1 (database-expert keywords)
- "Test the new feature across all roles" → Claude-3 (testing keywords)
- "Research best practices for PDF generation" → Claude-4 (research keywords)
- "Add a new feature to assessments" → Claude-2 (feature keywords)

**Explicit Delegation**: Request specific assistants by name
- "Have Claude-3 review my code" → Claude-3 (code-reviewer)
- "Claude-1, create a migration for..." → Claude-1 (database-expert)

**Coordination**: Orchestrator coordinates multi-assistant workflows
- Complex features require sequential delegation
- Parallel research + implementation possible
- Results integrated by orchestrator

### Migration from Old Structure

**Old Structure (11 agents):**
- claude-1, claude-2, claude-3, claude-4 (duplicates)
- database-expert, feature-implementer, service-builder
- testing-specialist, code-reviewer
- assessment-architect, research-agent

**New Structure (1 orchestrator + 4 assistants):**
- Main Claude (Orchestrator)
- Claude-1 (Database & Schema) = database-expert + assessment-architect
- Claude-2 (Feature & Service) = feature-implementer + service-builder
- Claude-3 (Testing & Quality) = testing-specialist + code-reviewer
- Claude-4 (Research & Docs) = research-agent + context gathering

**Archived agents** available in `.claude/agents/archive/` for reference.

---

## Commands

Claude Commands are **specialized instruction files** stored in `.claude/commands/` that provide procedural guidance for common ClaimTech development tasks. They complement Skills (patterns) and .agent docs (reference).

### Available Commands

| Command | Purpose | When to Use | Workflow |
|---------|---------|-------------|----------|
| **feature-implementation.md** | Complete feature lifecycle | Implement/add/build features | 8 phases: Requirements → Research → Design → Implementation → Testing → Documentation → Review → Deployment |
| **database-migration.md** | Safe migration creation | Add table, modify schema, RLS updates | 7 phases: Planning → Create file → Write SQL → Test → Generate types → Document → Commit |
| **service-development.md** | Service layer implementation | Create service, CRUD operations | 6 phases: Design → Create file → CRUD → Business logic → Testing → Documentation |
| **testing-workflow.md** | Comprehensive testing | Test features, write tests | 6 phases: Manual → Unit → E2E → Performance → Security → Documentation |
| **code-review.md** | Quality standards review | Review code, check quality | 5 categories: Quality (25%) → Security (30%) → Performance (20%) → Maintainability (15%) → Docs (10%) |

**Command Hierarchy**:
```
feature-implementation.md (Master workflow)
    ├── database-migration.md (DB changes)
    ├── service-development.md (Data access)
    ├── testing-workflow.md (Quality assurance)
    └── code-review.md (Final check)
```

**Example Workflow**: "Add comments feature"
1. Invoke `feature-implementation.md` → 2. Invoke `database-migration.md` → 3. Invoke `service-development.md` → 4. Implement UI → 5. Invoke `testing-workflow.md` → 6. Invoke `code-review.md` → 7. Deploy

---

## Code Execution

### What is Code Execution?

ClaimTech uses **Architecture A: Two-Phase Code Execution** for efficient data processing, achieving **73-94% token reduction** for multi-step workflows.

**CRITICAL**: Code execution runs in isolated Deno sandbox and **CANNOT call MCP tools directly**.

**Two-Phase Approach**:
1. **Phase 1**: Claude calls MCP tools to fetch data
2. **Phase 2**: Claude embeds data in TypeScript code and executes processing logic

### When to Use Code Execution

**✅ Use When:**
- Complex data transformations (multiple map/filter/reduce)
- Data analysis with calculations (averages, statistics, correlations)
- Report generation with formatting (Markdown/HTML, tables)
- Cross-source correlation (combining multiple MCP results)
- JSON parsing and aggregation (JSONB columns, nested data)
- Batch validation logic (10+ records with complex rules)

**Decision Rule**: Use if you need to transform, analyze, or format data AFTER fetching it.

**❌ Don't Use When:**
- Simple single query (use MCP tool directly)
- Data already in desired format
- Need additional queries based on results (code cannot call MCP tools)
- Data too large to embed in code (filter with SQL first)

### The Pattern

**Example: Analyze Assessment Completion Times**

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
      const times = stageDurations.map(d => d.stages[stage]).filter(t => t != null);
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

await mcp__ide__executeCode({ code });
```

**Token Efficiency**: Traditional (5 MCP calls) ~3000 tokens → Architecture A (1 MCP + 1 code) ~850 tokens = **73% savings**

### Available MCP Servers

**Important**: MCP servers are called BY Claude in Phase 1 to fetch data. They are NOT imported or called FROM code execution.

| MCP Server | Primary Use | Key Tools |
|------------|-------------|-----------|
| **Supabase** | Database operations | execute_sql, apply_migration, list_tables, get_project |
| **GitHub** | Repository operations | get_file_contents, list_commits, search_code, list_issues |
| **Playwright** | Browser automation | navigate, screenshot (E2E testing) |
| **Svelte** | Framework guidance | analyze_component (development guidance) |
| **Chrome DevTools** | Debugging | evaluate_expression (debugging) |
| **Context7** | Documentation | search_docs (research) |

### Benefits Summary

- **73-94% token reduction** for multi-step workflows
- **Two-phase approach** (MCP fetch → code process) instead of 5-10+ tool calls
- **5-10x faster** completion times
- **Type-safe** operations with full TypeScript
- **Complex processing logic** in familiar programming patterns
- **Error handling** with try/catch in code execution
- **Secure** - Isolated, cannot access MCP tools or credentials
- **Clear separation** - MCP for data access, code for processing

### Getting Started

1. **Identify if appropriate** (see decision criteria above)
2. **Read** [Using Code Executor SOP](`.agent/SOP/using_code_executor.md`) for 5-phase workflow
3. **Choose pattern** from [Code Execution Patterns](`.agent/System/code_execution_patterns.md`)
   - Pattern 1: Data Analysis Pipeline
   - Pattern 2: Batch Validation
   - Pattern 3: Cross-Source Correlation
4. **Execute** the Two-Phase Pattern (fetch with MCP → process with code)
5. **Review** results and iterate

### Documentation

For comprehensive guides and API reference:
- **[Using Code Executor](`.agent/SOP/using_code_executor.md`)** (500+ lines) - Step-by-step workflow with decision tree
- **[Code Execution Architecture](`.agent/System/code_execution_architecture.md`)** (800+ lines) - Architecture layers and token efficiency
- **[Code Execution Patterns](`.agent/System/code_execution_patterns.md`)** (600+ lines) - 6 real-world patterns with implementations
- **[MCP Code API Reference](`.agent/System/mcp_code_api_reference.md`)** (1,200+ lines) - Complete API reference for all 6 MCP servers

---

## ClaimTech Development System Overview

This table shows how Skills, Sub-Agents, Commands, and .agent Docs work together:

| Aspect | Skills | Sub-Agents | Commands | .agent Docs |
|--------|--------|------------|----------|-------------|
| **Purpose** | Domain patterns | Specialized AI personality | Procedural workflows | Current state reference |
| **Location** | `.claude/skills/` | `.claude/agents/` | `.claude/commands/` | `.agent/` |
| **Activation** | Auto on keywords | Auto on keywords | Manual invoke | Manual read |
| **Context** | Shared context | Own context window | Shared context | Shared context |
| **Content** | Best practices | System prompt + tools | Step-by-step guides | Reference info |
| **Example** | "Use ServiceClient injection" | "I am a database expert..." | "Phase 1: Do X, Phase 2: Do Y" | "Table has columns X, Y, Z" |
| **When to Use** | Implementing features | Complex multi-step tasks | Need structured workflow | Need current system info |

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
