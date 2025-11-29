# CLAUDE.md - Project Configuration

## Project Info

**Supabase Project ID**: `cfblmkzleqtvtfxujikf`
**Project Name**: SVA (ClaimTech)
**Region**: eu-central-1

---

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

## Agent Orchestration

Claude uses a **4-agent system** optimized for cost and capability. The main Claude instance (Sonnet) acts as the Orchestrator, delegating to specialized agents when appropriate.

### Agents

| Agent | Model | Cost | Purpose | When Used |
|-------|-------|------|---------|-----------|
| **Context** | Haiku 4.5 | $ | Fast context gathering | Before complex planning |
| **Planner** | Opus 4.5 | $$$$ | Deep reasoning, detailed plans | Complex features |
| **Docs** | Haiku | $ | Update documentation | After implementations |
| **Coder** | Sonnet | $$ | Execute code changes | Implementation phase |

### Orchestration Flow

```
User Request → Orchestrator (Sonnet)
    │
    ├── Simple task ────────────► Execute directly
    │
    ├── Need context ───────────► Context Agent (Haiku)
    │                                   │
    │                                   ▼
    │                              Return context
    │
    ├── Complex feature ────────► Planner Agent (Opus)
    │                                   │
    │                    ┌──────────────┴──────────────┐
    │               Need more                     Plan ready
    │               context?                           │
    │                    │                             ▼
    │                    ▼                      Coder Agent (Sonnet)
    │              Context Agent                       │
    │                                                  ▼
    │                                           Changes made
    │
    └── Update docs ────────────► Document Updater (Haiku)
```

### Orchestration Rules

1. **Always use agents when relevant** - Delegate to specialized agents during planning and implementation instead of executing directly. This optimizes cost and leverages each agent's strengths.
2. **Direct execution** for simple tasks (no agents needed)
3. **Context first** before expensive Opus planning
4. **Plan before code** for complex multi-file features
5. **Auto-proceed** for straightforward plans (no user approval needed)
6. **Document after** larger code changes or when user requests

### When to Use Each Agent

**Context Agent (Haiku 4.5)**
- Before planning complex features
- When Planner needs more context
- Research tasks ("how does X work?")
- Finding patterns and examples

**Planner Agent (Opus 4.5)**
- Complex multi-file features
- Architectural decisions
- Ambiguous requirements
- When implementation path is unclear

**Document Updater (Haiku)**
- After feature implementation
- When user runs `/update_doc`
- After significant code changes

**Coder Agent (Sonnet)**
- Executing Planner's detailed plans
- Straightforward code changes
- Bug fixes with clear scope

### Agent Files

Detailed prompts for each agent are in `.claude/agents/`:
- `context-agent.md` - Context gathering patterns
- `planner-agent.md` - Planning and design patterns
- `document-updater.md` - Documentation patterns
- `coder-agent.md` - Implementation patterns

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

**Task Documentation:**
- Create context file in `.agent/tasks/active/[task_name].md` for complex tasks
- Include: requirements, constraints, related files, deliverables
- Move completed tasks to `.agent/tasks/completed/`

**Maintain Coherent Architecture:**
- Document key decisions and rationale
- Ensure implementations align with project architecture
- Update system documentation after changes

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

This table shows how Skills, Commands, and .agent Docs work together:

| Aspect | Skills | Commands | .agent Docs |
|--------|--------|----------|-------------|
| **Purpose** | Domain patterns | Procedural workflows | Current state reference |
| **Location** | `.claude/skills/` | `.claude/commands/` | `.agent/` |
| **Activation** | Auto on keywords | Manual invoke | Manual read |
| **Context** | Shared context | Shared context | Shared context |
| **Content** | Best practices | Step-by-step guides | Reference info |
| **Example** | "Use ServiceClient injection" | "Phase 1: Do X, Phase 2: Do Y" | "Table has columns X, Y, Z" |
| **When to Use** | Implementing features | Need structured workflow | Need current system info |

---

## Best Practices

1. **Plan Complex Tasks**
   - Break down complex tasks into manageable steps
   - Identify dependencies between steps
   - Create implementation plans for multi-phase work

2. **Quality First**
   - Never skip code quality analysis
   - Address issues before moving forward
   - Follow ClaimTech patterns and conventions

3. **Document Everything**
   - Maintain task logs in `.agent/tasks/`
   - Update system documentation after changes
   - Track decisions and rationale

4. **Use Code Execution When Appropriate**
   - Multi-step workflows (3+ operations)
   - Complex data transformations
   - Batch processing operations
   - Data analysis and reporting

5. **Follow Established Patterns**
   - Reference Skills for domain expertise
   - Use Commands for structured workflows
   - Consult .agent docs for current system state
