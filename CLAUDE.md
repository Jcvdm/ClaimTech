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

Before you plan any implementation, always read the .agent/README first to get context

---

## SPECIALIZED AGENTS

This project uses specialized sub-agents for specific domains. Use these agents proactively when their expertise is needed.

### Available Agents

#### 1. Research Context Gatherer (Haiku)
**When to use:** Thorough research, context gathering, analyzing existing systems, preparing background material

**Trigger automatically when:**
- User asks "what are the latest..." or "current state of..."
- User asks to "research" or "gather context about..."
- User says "analyze existing..." or "review current..."
- Before major architectural decisions that need research

**Example invocations:**
- "Research best practices for GraphQL federation"
- "Gather context about our authentication system before refactoring"
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
- Use research-context-gatherer before making architectural decisions
- Use supabase-specialist for ANY Supabase-related task
- Use svelte-implementer for ANY Svelte code
- Invoke agents proactively, don't wait for user to request
- Combine agents when tasks span multiple domains

### Agent Documentation

Full agent documentation and best practices are in `.agent/Agents/` folder:
- `research-context-gatherer.md` - Complete research methodology
- `supabase-specialist.md` - Database, RLS, and Supabase patterns
- `svelte-implementer.md` - Svelte best practices and patterns

Read these docs when using agents to understand their full capabilities.

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

## DEVELOPMENT WORKFLOW

### Starting Work
1. Read `.agent/README` for project context
2. Check relevant System docs for architecture
3. Review applicable SOPs for procedures
4. Check Agents docs for when to invoke specialists
5. ClaimTech Development skill auto-invokes for common tasks

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

### Use Sub-Agents For:
- Research that requires multiple searches
- Complex planning across many files
- Isolated tasks that can be summarized

### Use Specialized Agents For:
- Domain-specific implementations (Supabase, Svelte, etc.)
- Proactive code review and verification
- Following framework-specific best practices

### Run `/compact` After:
- Completing isolated tasks
- Finishing research phases
- Before starting new features
- When context feels bloated