# CLAUDE.md - Project Configuration

## DOCS

We keep all important docs in .agent folder and keep updating them, structure like below:

.agent
- Tasks: PRD & implementation plan for each feature
- System: Document the current state of the system (project structure, tech stack, integration points, database schema, and core functionalities such as agent architecture, LLM layer, etc.)
- SOP: Best practices of execute certain tasks (e.g, how to add a schema migration, how to add a new page route, etc.)
- Agents: Documentation of available specialized agents and when to use them
- README.md: an index of all the documentations we have so people know what & where to look for things

We should always update .agent docs after we implement certain feature, to make sure it fully reflect the up to date information

**CRITICAL - Context Optimization:**
- NEVER read .md documentation files directly (e.g., .agent/*, .claude/skills/*, README files)
- ALWAYS use the research-context-gatherer agent to read and research documentation
- This saves significant context and allows for better summarization
- Exception: Only read documentation directly if it's a single small file (<50 lines) AND the user explicitly requests it

Before you plan any implementation, use the research-context-gatherer agent to read .agent/README and gather relevant context

---

## SPECIALIZED AGENTS

This project uses specialized sub-agents for specific domains. Use these agents proactively when their expertise is needed.

### Available Agents

#### 1. Research Context Gatherer (Haiku)
**When to use:** Reading documentation, thorough research, context gathering, analyzing existing systems, preparing background material

**CRITICAL - PRIMARY USE CASE:**
- Use this agent to READ ALL .md documentation files (.agent/*, .claude/skills/*, README files)
- DO NOT read documentation files directly - this wastes context
- Agent will summarize and extract only relevant information
- Saves 70-90% of context compared to direct reading

**Trigger automatically when:**
- Need to read ANY .md file in .agent/, .claude/skills/, or README files
- User mentions "research", "gather context", or "analyze"
- User asks "what are the latest..." or "current state of..."
- User asks to "research" or "gather context about..."
- User says "analyze existing..." or "review current..."
- Before starting ANY new implementation (to understand current system state)
- Before major architectural decisions that need research

**Example invocations:**
- "Use research-context-gatherer to read .agent/README and gather project context"
- "Research context gatherer: read all .agent/System docs about authentication"
- "Research best practices for GraphQL federation"
- "Gather context about our assessment-centric architecture from .agent/System/"
- "Analyze our current database schema"

#### 2. Supabase Specialist (Sonnet)
**When to use:** Database schema, RLS policies, Supabase auth, real-time, edge functions, storage

**Trigger automatically when:**
- User mentions "supabase", "RLS", "row level security"
- Working with database schemas that will use RLS
- Implementing authentication or real-time features
- After database schema creation (proactively review for RLS)

**Example invocations:**
- "Design database schema with proper RLS for multi-tenant app"
- "Review my Supabase implementation for security issues"
- "Implement real-time chat with Supabase"

#### 3. Svelte Implementer (Sonnet)
**When to use:** Creating/fixing Svelte components, reactivity issues, SvelteKit routes

**Trigger automatically when:**
- User asks to create/modify `.svelte` files
- User mentions "svelte", "sveltekit", or "reactive"
- After writing any Svelte component (proactively review)
- When compilation errors occur in Svelte files

**Example invocations:**
- "Create a todo list component in Svelte"
- "Fix this Svelte reactivity issue"
- "Review this component for Svelte best practices"

### Agent Usage Guidelines

**When to invoke agents:**
1. **Proactively** - After completing work in their domain (review/verify)
2. **Reactively** - When user explicitly requests their expertise
3. **Preventively** - Before major implementations to ensure correct approach

**How to invoke:**
```
"I'm going to use the [agent-name] agent to [specific task]"
```

**Agent workflow:**
1. Announce agent usage to user
2. Invoke agent with clear context
3. Present agent's output
4. Integrate recommendations into main response

**Best practices:**
- **ALWAYS use research-context-gatherer to read .md documentation files** (saves 70-90% context)
- Use research-context-gatherer before making architectural decisions
- Use research-context-gatherer at start of ANY new implementation
- Use supabase-specialist for ANY Supabase-related task
- Use svelte-implementer for ANY Svelte code
- Invoke agents proactively, don't wait for user to request
- Combine agents when tasks span multiple domains

### Agent Documentation

Full agent documentation and best practices are in `.agent/Agents/` folder:
- `research-context-gatherer.md` - Complete research methodology
- `supabase-specialist.md` - Database, RLS, and Supabase patterns
- `svelte-implementer.md` - Svelte best practices and patterns

**IMPORTANT:** Use the research-context-gatherer agent to read these docs when needed (don't read directly).

---

## CLAUDE CODE SKILLS

This project uses Claude Code skills to provide systematic workflows and best practices. Skills auto-invoke based on task context and keywords.

### ClaimTech Development Skill

**Location:** `.claude/skills/claimtech-development/`

**When to use:** Automatically invoked when working with ClaimTech-specific implementations

**Triggers automatically on keywords:**
- Database: "database", "migration", "schema", "table", "RLS"
- Service: "service", "data access", "CRUD", "database query"
- Auth: "auth", "login", "logout", "protect", "RLS"
- UI: "page", "route", "component", "UI"
- PDF: "PDF", "report", "document generation", "Puppeteer"
- Storage: "upload", "photo", "storage", "file", "image"

**Provides workflows for:**
1. **Database Migration** (15-30 min) - Idempotent migrations with RLS
2. **Service Layer** (20-40 min) - ServiceClient injection pattern
3. **Authentication** (10-20 min) - Form actions + RLS policies
4. **Page Routes** (15-30 min) - SvelteKit pages with Svelte 5
5. **PDF Generation** (30-60 min) - Puppeteer with storage upload
6. **Storage & Photos** (20-30 min) - Secure file handling

**Usage:**
- Skill auto-invokes when relevant keywords detected
- Provides step-by-step workflows with quality checklists
- References `.agent/` docs for current system state
- Includes production-ready code examples

**Resources:**
- `SKILL.md` - Core workflows and checklists
- `resources/database-patterns.md` - Migration templates and RLS
- `resources/service-patterns.md` - ServiceClient injection
- `resources/auth-patterns.md` - Auth flows and RLS policies
- `resources/component-patterns.md` - Svelte 5 runes patterns
- `resources/pdf-storage-patterns.md` - PDF generation & storage

**Integration with agents:**
- Works alongside specialized agents (Supabase, Svelte, etc.)
- Skill provides methodology (HOW)
- `.agent/` docs provide context (WHAT/WHERE)
- Agents provide domain expertise
- Together = comprehensive development system

**Best practices:**
- Trust skill workflows for ClaimTech patterns
- Use quality checklists before marking tasks complete
- Reference resource files for detailed patterns
- Update `.agent/` docs after implementing features

---

### Assessment-Centric Specialist Skill

**Location:** `.claude/skills/assessment-centric-specialist/`

**When to use:** Working with ClaimTech's assessment-centric architecture

**Triggers automatically on keywords:**
- "assessment stage", "stage transition", "assessment-centric"
- "idempotent", "constraint violation", "duplicate assessment"
- "findOrCreateByRequest", "updateStage"

**Provides expertise for:**
1. **Stage-Based List Page** (15-30 min) - Convert status to stage queries
2. **Add New Assessment Stage** (60-90 min) - Complete stage implementation
3. **Fix Assessment Bugs** (30-120 min) - Constraint violations, duplicates, RLS
4. **Migrate Status to Stage** (20-40 min) - Systematic status → stage conversion
5. **Idempotent Child Records** (30-45 min) - Check-then-create, upsert patterns
6. **Safe Stage Updates** (10-15 min) - Foreign keys → stage → child records
7. **Efficient Assessment Queries** (10-20 min) - Optimized stage-based queries

**Core Principles:**
- Assessment created WITH request (not at "Start Assessment")
- One assessment per request (unique constraint enforced)
- 10 pipeline stages (request_submitted → archived/cancelled)
- Nullable foreign keys (appointment_id can be null initially)
- Check constraint requires appointment_id for later stages
- All operations idempotent (safe to call multiple times)
- Stage transitions logged in audit trail

**Key Workflows:**
1. **Implement Phase 3** - Stage-based list pages (6-8 hours)
2. **Add Quality Review Stage** - Example new stage implementation (60-90 min)

**Resources:**
- `SKILL.md` - Complete skill documentation with patterns and examples
- `README.md` - Quick reference and key principles

**Integration:**
- Works with Supabase Specialist for RLS policies and migrations
- Works with ClaimTech Development for general patterns
- Specialized for assessment-centric architecture patterns

**When to use explicitly:**
- Implementing Phase 3 (stage-based list pages)
- Adding new workflow stages to pipeline
- Debugging constraint violations related to appointments
- Ensuring backward compatibility with old requests
- Fixing race conditions in assessment creation

---

## DEVELOPMENT WORKFLOW

### Starting Work
1. **Use research-context-gatherer** to read `.agent/README` for project context
2. **Use research-context-gatherer** to check relevant System docs for architecture
3. **Use research-context-gatherer** to review applicable SOPs for procedures
4. **Use research-context-gatherer** to check Agents docs if needed
5. ClaimTech Development skill auto-invokes for common tasks

**CRITICAL:** Never read documentation files directly in steps 1-4. Always use the research agent to save context.

### During Implementation
1. Follow workflows from ClaimTech Development skill
2. Use quality checklists from skill before marking complete
3. Invoke specialized agents when needed
4. Document decisions as you go
5. Use sub-agents for research-heavy tasks

### After Implementation
1. Update System docs if architecture changed
2. Create/update SOP for new patterns
3. Update Task docs with completion notes
4. Update README index if new docs added
5. Use `/compact` to clean context

---

## CONTEXT OPTIMIZATION

### CRITICAL - Documentation Reading Policy:
**NEVER read documentation files directly. ALWAYS use research-context-gatherer agent.**

This applies to:
- All .agent/ folder files (README, System/, Tasks/, SOP/, Agents/)
- All .claude/skills/ documentation files
- Any README.md or other .md documentation files
- Any SKILL.md or resource files

**Why:** Saves 70-90% of context. Agent summarizes and extracts only relevant information.

**Exception:** Only read directly if:
- File is <50 lines AND
- User explicitly requests direct read AND
- You need the exact verbatim content

### Use Research-Context-Gatherer Agent For:
- Reading ALL documentation files (.md files in .agent/, .claude/skills/)
- Gathering context before starting implementations
- Research that requires multiple searches
- Complex planning across many files
- Analyzing existing system architecture
- Understanding current state before changes

### Use Specialized Agents For:
- Domain-specific implementations (Supabase, Svelte, etc.)
- Proactive code review and verification
- Following framework-specific best practices

### Run `/compact` After:
- Completing isolated tasks
- Finishing research phases
- Before starting new features
- When context feels bloated