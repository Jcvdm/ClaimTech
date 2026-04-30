# CLAUDE.md - Project Configuration

## ORCHESTRATOR POLICY — Hard Rules

```
┌────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR NEVER WRITES OR EDITS CODE                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  FORBIDDEN in main thread:                                             │
│  • Edit, Write, NotebookEdit on any source file                        │
│  • sed/awk/perl/python in Bash that mutates source files               │
│  • Applies to 1-line fixes, typos, and "trivial" edits too            │
│                                                                        │
│  ALLOWED in main thread:                                               │
│  • Read, Grep, Glob (for verification only — not deep exploration)    │
│  • Bash for git, npm/svelte-check, and other read-only ops            │
│  • TodoWrite, ScheduleWakeup, Skill, and other non-code tools         │
│  • Editing this CLAUDE.md, plan files in ~/.claude/plans/, and        │
│    .agent/Tasks/ docs (these are coordination, not code)              │
│                                                                        │
│  AGENT SELECTION (mandatory order):                                    │
│  1. DEFAULT — Haiku coder-agent (fast, cheap, sufficient for most)    │
│  2. FALLBACK — if Haiku fails (autocompact thrash, off-target,        │
│     compile errors it can't fix), re-dispatch as Sonnet coder-agent   │
│  3. REVIEW — after EVERY code change lands, dispatch a Sonnet         │
│     reviewer to audit the diff before declaring the task done         │
│                                                                        │
│  RESEARCH: dispatch Explore (Haiku). Never grep the whole codebase    │
│  from the main thread.                                                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Why this policy exists

- **Cost** — Haiku is roughly 10× cheaper than Sonnet, ~50× cheaper than Opus. Most edits don't need stronger reasoning.
- **Context efficiency** — sub-agent reads/writes don't pollute the main thread's context window.
- **Error isolation** — a sub-agent that goes off-track can be re-dispatched without contaminating the orchestrator's working memory.
- **Independent review** — the Sonnet reviewer reads the diff fresh, with no anchoring bias from having written the code, and catches subtle bugs the implementer missed.

### How to apply each rule

**1. Always Haiku first** — Even a 2-line edit goes to a Haiku coder-agent. Dispatch overhead is small and avoids the orchestrator slipping into edit habits. If you find yourself thinking "this is faster to just do" — stop and dispatch.

**2. Fall back to Sonnet on Haiku failure** — Triggers for falling back:
- Haiku reports `autocompact thrashing` (file too large for its context)
- Haiku produces broken code that fails svelte-check / build
- Haiku misunderstands the task or edits the wrong location
- Haiku makes the same mistake twice after correction

Re-dispatch with `subagent_type: coder-agent, model: sonnet` and provide tighter context (file paths + line numbers + exact strings to change).

**3. Sonnet review after every code change** — After the coder reports done and the orchestrator commits, dispatch a Sonnet reviewer BEFORE moving on:

```
Agent({
  subagent_type: "general-purpose",
  model: "sonnet",
  description: "Review <task-name> diff",
  prompt: "Review the diff in commit <SHA> on branch claude/<branch>.
  Read the changed files end-to-end and audit:
  1. Does the change match the task spec?
  2. Any regressions in adjacent code paths?
  3. Are types/imports/error-handling correct?
  4. Any UX or behavioral drift vs the prior version?
  Report findings in under 300 words. If clean, say 'no issues'."
})
```

If the reviewer flags issues → re-dispatch a coder (Haiku first, Sonnet on second pass) to fix them, then re-review. Loop until clean.

### Exceptions (very narrow)

- Editing `CLAUDE.md`, plan files in `~/.claude/plans/`, or `.agent/Tasks/*.md` is allowed — these are coordination artifacts, not code.
- Updating `.claude/settings.local.json` for permission changes is allowed.
- Anything else — code, configs, schema, migrations — goes through a sub-agent.

---

## Research vs Code-Edit: Different Tools

The "always Haiku for code edits" rule above does NOT apply to research/audit tasks. Different tool entirely.

### Empirical findings on this codebase

Multiple attempts (Apr 2026) to use Haiku as a research/synthesis agent failed at high rates:
- **Part-type helper extraction**: Haiku hallucinated a "task document" that didn't exist; refused to execute. Fell back to Sonnet.
- **v4 finance map synthesis**: Haiku invented file content (claimed reads it never did, fabricated DB column names). Did not write the requested output file at all.
- **5-way Haiku audit swarm**: 4 of 5 Haikus failed:
  - 1× autocompact thrash (tried to enumerate 100+ findings)
  - 1× hallucinated phantom "TEXT-ONLY constraint"
  - 1× fabricated file paths (cited 10+ non-existent components)
  - 1× wrote a meta-summary describing other agents' work
  - 1× actually succeeded (was asked for COMPRESSED clusters, not verbose enumeration)

**Pattern**: Haiku works when the task fits in a small prompt+output budget. It fails when asked to enumerate or write long-form synthesis.

### Decision matrix for research tasks

| Task shape | Best tool | Reason |
|---|---|---|
| "Find all callsites of pattern X" | **Orchestrator's `Grep` tool directly** | 1 tool call, 100% accurate, no agent overhead |
| "Read file Y and tell me about function Z" | **Orchestrator's `Read` tool directly** | If you know the file, just read it |
| "Find candidate files for unfamiliar feature/concern" | **Context Engine query** | Tiered XML pack with primary/secondary/outline; semantic + lexical + graph signals |
| "Audit codebase + write planning docs" | **Orchestrator (Opus 4.7) does grep + writes docs directly** | Demonstrated: matches paid third-party tool output. See "Orchestrator-as-Planner" below |
| "Catalog X across many files" (compressible to clusters) | **Haiku Explore agent** with strict output-format rails (clusters, not enumerations) | Works ~50% of the time; verify file claims before trusting |
| "Synthesize findings into long-form doc" | **Orchestrator (Opus 4.7)**, not Haiku, not even Sonnet sub-agent unless context budget pressures | Synthesis is the orchestrator's job; sub-agents add input-tokens overhead |
| "Multi-step research crossing 10+ files" | **Orchestrator with explicit step plan** OR Sonnet sub-agent if context-budget-pressured | Haiku autocompacts on intermediate state |

### Orchestrator-as-Planner: the right default for audit/plan tasks

**Empirical finding (Apr 2026)**: Opus 4.7 (the orchestrator) produces better audit + planning deliverables doing the work directly than dispatching to sub-agents. Multiple v3/v4 finance-map experiments confirmed this:

- Sub-agent synthesis hallucinates content (Haiku especially) or imposes word caps that constrain output
- Sub-agent dispatch ADDS input-tokens (the agent's response becomes my input)
- Orchestrator can do `Grep` + `Read` faster than dispatching an agent to do the same

**The pattern that works** (demonstrated producing 3 linked planning docs in `.agent/Tasks/active/` for a styling refactor):

```
Step 1: Orchestrator runs 5-10 targeted greps directly (verifiable ground truth)
Step 2: Orchestrator aggregates findings into structured data IN ITS OWN CONTEXT
Step 3: Orchestrator writes 3 linked .md files directly using Write tool:
        - <TOPIC>_DISCREPANCIES_AND_REFACTORING_OPPORTUNITIES.md (the audit)
        - <TOPIC>_ACTION_ROADMAP.md (per-task effort/risk/files/acceptance)
        - <TOPIC>_REFACTORING_EFFICIENCY_PLAN.md (executive view, do/don't-touch)
Step 4: Output goes to .agent/Tasks/active/ (allowed coordination artifacts per orchestrator policy)
```

This pattern delivers Augment-quality output using only Opus 4.7's own tools. **No external paid services needed for audit/plan tasks**.

### When NOT to use external paid context tools (e.g., Augment)

For THIS workflow (Claude Code + Opus 4.7 orchestrator), paid upstream context-gathering services are usually counterproductive:

- They cost out-of-pocket
- Their output becomes input-tokens to me (no token saving — net token COST is higher)
- I can match their deliverable shape directly (proven this session)

External paid tools may pay off in narrow cases:
- Genuinely unfamiliar 100K+ line codebase you've never touched, where pre-digestion helps
- Customer-facing tech-debt audit docs for non-technical stakeholders who won't read grep output
- Polished templated outputs for compliance/handoff scenarios

For day-to-day refactor planning on a codebase you're actively working in: **just use the orchestrator**. The local Context Engine handles the "find unfamiliar candidates" gap for free.

### When to use the Context Engine

The local Context Engine (CLI at `C:\Users\Jcvdm\Desktop\Jaco\context engine\`) is useful when:
- You need a candidate list across the whole repo and don't already know the file names
- You want git-recency-weighted results (recently-touched files surface higher)
- You want symbol-tier output (function bodies + their imports + sibling sigs, not full files)
- You want lean mode (5-6K-token packs vs 12K) to save coder budget on follow-up queries

It is NOT useful when:
- You already know the exact file(s) to look at (just Read them)
- You need a specific exact-text grep (orchestrator's `Grep` is faster and 100% precise)
- You need long-form synthesis (the engine returns context — synthesis is a separate step)

Per-repo overlay at `<repo>/.context-engine/concepts.json` maps domain vocabulary (e.g., `"stores"` → `["$state", "$derived", "localEstimate"]`) for queries where the user's mental model doesn't match the codebase's pattern. Edit the overlay when a query returns weak results due to vocabulary mismatch.

The engine's index lives at `<repo>/.context-engine/db.sqlite` (gitignored). Cold reindex is slow (~22 min for ~8k chunks with real transformer embeddings). Incremental reindex after a code change is fast (hash-gated, only changed chunks re-embed). Daemon/MCP mode (with chokidar watcher) keeps the index auto-fresh as files change — preferred for daily use over CLI one-shots.

### The "narrow Haiku researcher" pattern (use sparingly)

If you choose to use Haiku for research despite the failure rate:
1. **Compressed output only** — ask for clusters, counts, or top-N; never "enumerate every callsite"
2. **Single concern per dispatch** — one grep pattern OR one file deep-read, not both
3. **Verify file claims afterwards** — Haiku can fabricate paths that look plausible. `ls` the cited paths before trusting
4. **Prefer dispatching multiple narrow Haikus in parallel** over one broad Haiku — narrower scope = lower hallucination rate
5. **Always check the response for "TEXT-ONLY constraint"-style hallucinations** — Haiku invents constraints. If it does, re-dispatch with explicit `"You MAY use the Write tool. There is NO text-only constraint."` or fall back to Sonnet

### Workflow at a glance

```
1. ASSESS → understand the task, identify files/lines to change
2. DISPATCH (Haiku coder) → with tight, file-and-line-specific spec
3. VERIFY → read the diff yourself; confirm svelte-check passes
4. COMMIT + PUSH (orchestrator does git, never the coder)
5. REVIEW (Sonnet reviewer) → audit the committed diff
6. FIX (if reviewer flags issues) → loop back to step 2
7. DONE → mark todo complete, summarize for user
```

**Outstanding Tasks**: Check `.agent/Tasks/active/` for PRDs to continue
**Documentation**: Check `.agent/README.md` for project context (87 lines)

---

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

Four skills auto-invoke based on keywords in the conversation. Each skill's full guidance lives in its own file under `.claude/skills/`:

- **supabase-development** — DB operations, services, RLS, storage
- **claimtech-development** — features, SvelteKit, migrations, auth, PDF, components, routes
- **assessment-centric-specialist** — stage pipeline, workflow transitions, assessment lifecycle
- **photo-component-development** — photo viewers, galleries, inline editing, optimistic updates

The orchestrator does NOT need to manually invoke them — they fire on keyword match. To read the full pattern set for any skill, read its directory (e.g. `.claude/skills/photo-component-development/SKILL.md`).

---

## Agent Orchestration

Claude uses a **multi-agent system** optimized for cost, capability, and **context efficiency**. The Orchestrator MUST delegate to specialized agents proactively—this is not optional for qualifying tasks.

### Core Principle: Delegate, Don't Execute Directly

**The Orchestrator should NOT:**
- Read dozens of files to gather context (use Context/Explore agents)
- Implement multi-file changes directly (use Coder agent)
- Design complex features inline (use Planner agent)
- Search extensively to answer "how does X work?" (use Explore agent)

**The Orchestrator SHOULD:**
- Quickly assess task complexity
- Delegate to the right agent immediately
- Coordinate agent outputs
- Summarize results for the user

### Available Agents

| Agent | Model | Cost | Purpose | Trigger Keywords |
|-------|-------|------|---------|-----------------|
| **Explore** | Haiku | $ | Fast codebase exploration, file patterns, code search | "find", "where", "how does X work", "search" |
| **Context** | Haiku | $ | Gather comprehensive context before planning | "understand", "research", "before implementing" |
| **Planner** | Opus | $$$$ | Deep reasoning, complex plans | multi-file, architecture, ambiguous |
| **Coder (Haiku)** | Haiku | $ | DEFAULT for code changes — fast, cheap, sufficient | "implement", "fix", "add feature" |
| **Coder (Sonnet)** | Sonnet | $$ | FALLBACK when Haiku fails or task needs more reasoning | re-dispatch after Haiku fails |
| **Reviewer (Sonnet)** | Sonnet | $$ | MANDATORY post-change diff review | after EVERY code commit |
| **Docs** | Haiku | $ | Update documentation | "update docs", after implementations |

### Decision Matrix: When to Use Each Agent

```
┌─────────────────────────────────────────────────────────────────────────┐
│ User Request                                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Is this a SEARCH/EXPLORE?   │
                    │   ("find X", "where is Y",    │
                    │    "how does Z work?")        │
                    └───────────────────────────────┘
                           │YES              │NO
                           ▼                 ▼
                    ┌─────────────┐  ┌───────────────────────────┐
                    │ EXPLORE     │  │   Is this CODE CHANGES?    │
                    │ Agent       │  └───────────────────────────┘
                    │ (Haiku)     │         │YES            │NO
                    └─────────────┘         ▼               ▼
                                    ┌─────────────┐  ┌────────────────┐
                                    │ ALWAYS      │  │ Q&A or         │
                                    │ DELEGATE —  │  │ coordination   │
                                    │ never edit  │  │ → answer       │
                                    │ from main   │  │   directly     │
                                    └─────────────┘  └────────────────┘
                                           │
                       ┌───────────────────┼─────────────────────┐
                       │                   │                     │
                       ▼                   ▼                     ▼
                ┌─────────────┐    ┌─────────────┐      ┌─────────────────┐
                │ Step 1:     │    │ Step 2:     │      │ Step 3:         │
                │ HAIKU       │ →  │ SONNET      │  →   │ SONNET          │
                │ coder-agent │    │ coder-agent │      │ reviewer        │
                │ (default)   │    │ (fallback   │      │ (mandatory      │
                │             │    │  on Haiku   │      │  post-change    │
                │             │    │  failure)   │      │  diff audit)    │
                └─────────────┘    └─────────────┘      └─────────────────┘
```

### Agent files

Per-agent prompt details live in `.claude/agents/*.md` — that's the source of truth, not this file. The Decision Matrix above tells you when to dispatch which. Agent dispatches that touch the same file should generally NOT run in parallel; independent dispatches can.


## Workflow Guidelines

### Task-Driven Development

**CRITICAL: All significant work should be tracked in `.agent/Tasks/`**

The `.agent/Tasks/` folder is the **central task tracker and lightweight code index**:
```
.agent/Tasks/
├── README.md       - Template and guidelines
├── active/         - Current PRDs and tasks (Coder reads these)
├── completed/      - Finished tasks (reference)
├── historical/     - Archived documentation
└── future/         - Planned features
```

### The Orchestrator's Role

**You (the Orchestrator) are a TASK MANAGER, not an implementer.**

Your job is to:
1. **Create PRDs/tasks** in `.agent/Tasks/active/` for complex work
2. **Delegate implementation** to Coder agent with clear task references
3. **Coordinate** between agents (Context → Planner → Coder → Docs)
4. **Track progress** by updating task status
5. **Summarize results** to the user

### Task-First Workflow

**Step 0: Assess Complexity (ALWAYS DO THIS FIRST)**
```
Is this task:
□ TRIVIAL (1 file, <10 lines) → Dispatch Haiku coder-agent (NEVER edit from main thread)
□ SIMPLE (1-2 files, clear scope) → Dispatch Haiku coder-agent
□ MODERATE (3-5 files) → Create task in .agent/Tasks/active/, dispatch Haiku coder-agent
□ COMPLEX (5+ files, architecture) → Create PRD, use Planner (Opus), dispatch Sonnet coder-agent
□ RESEARCH → Use Explore agent, document findings

ALL code paths end with: dispatch Sonnet reviewer-agent post-commit.
```

### For MODERATE/COMPLEX Tasks: Create Task First

**Before any implementation, create a task document:**

```markdown
# .agent/Tasks/active/FEATURE_NAME_TASK.md

**Created**: YYYY-MM-DD
**Status**: Planning | In Progress | Completed
**Complexity**: Moderate | Complex

## Overview
What needs to be done and why.

## Files to Modify
- `path/to/file1.ts` - What changes needed
- `path/to/file2.svelte` - What changes needed

## Implementation Steps
1. Step one
2. Step two
3. Step three

## Verification
- [ ] npm run check passes
- [ ] Feature works as expected

## Notes
Any context Coder agent needs.
```

### Delegating to Coder Agent

**Always include task reference when delegating:**

```
Good: "Implement the task defined in .agent/Tasks/active/COMMENTS_FEATURE_PDR.md"
Bad: "Add a comments feature" (no task reference)
```

**Coder agent workflow:**
1. Reads the task document from `.agent/Tasks/active/`
2. Implements according to the plan
3. Runs verification steps
4. Reports completion
5. Orchestrator moves task to `completed/` or updates status

### Complete Task-Driven Flow

```
1. User: "Add feature X"
         │
         ▼
2. Orchestrator assesses: "Complex feature"
         │
         ▼
3. Orchestrator creates: .agent/Tasks/active/FEATURE_X_PDR.md
         │
         ▼
4. (If needed) Context Agent: "Gather patterns for feature X"
         │
         ▼
5. (If needed) Planner Agent: "Create detailed implementation plan"
         │
         ▼
6. Update task document with plan details
         │
         ▼
7. Coder Agent: "Implement task in .agent/Tasks/active/FEATURE_X_PDR.md"
         │
         ▼
8. Coder reports completion → Orchestrator verifies
         │
         ▼
9. Move task to .agent/Tasks/completed/
         │
         ▼
10. Document Updater: "Update .agent docs for feature X"
         │
         ▼
11. Report completion to user
```

### Working with Outstanding Tasks

**When user asks "what's outstanding?" or "continue work":**

1. **Read `.agent/Tasks/active/`** to find outstanding PRDs
2. **List tasks** with status and next steps
3. **Ask user** which task to continue, or suggest priority
4. **Delegate to Coder** with specific task reference

**Example:**
```
User: "Continue where we left off"

Orchestrator:
1. Reads .agent/Tasks/active/ directory
2. Finds: BUG_8_NEXT_ACTIONS.md (Status: In Progress)
3. Reports: "Found outstanding task: BUG_8 - SSE Streaming. Next action: Implement UI component"
4. Asks: "Should I have Coder continue with this?"
5. User: "Yes"
6. Delegates: "Coder, implement the next action in .agent/Tasks/active/BUG_8_NEXT_ACTIONS.md"
```

### Context Efficiency in Task Workflow

**CRITICAL: Don't load context into main conversation unnecessarily**

- **Task documents ARE the context** - Coder reads them directly
- **Don't duplicate** task content in your messages
- **Reference, don't repeat**: "See implementation steps in the task document"
- **Agents summarize** - Trust their summaries

### Task Status Updates

Keep task status current:
- **Planning** → Initial creation
- **In Progress** → Coder is implementing
- **Blocked** → Waiting for user input/decision
- **Completed** → Move to `completed/` folder

---




## Best Practices

### 1. Task First, Code Second

**Before implementing anything non-trivial:**

1. **Check** `.agent/Tasks/active/` - Is there an existing task for this?
2. **Create** a task document if not - This becomes Coder's context
3. **Delegate** to Coder agent with task reference
4. **Track** progress by updating task status

**The task document IS the implementation plan AND the context.**

**IMPORTANT**: Even after Plan Mode produces a detailed plan, you MUST still delegate to the Coder agent. The plan file becomes the task document - copy/move it to `.agent/Tasks/active/` and delegate. Do NOT implement directly just because you already understand what needs to be done.

### 2. Always Delegate Code Changes — Never Execute From Main Thread

**Code-change rule: orchestrator NEVER edits source files. Period.**

| Task Type | Action |
|-----------|--------|
| Research ("find X", "how does Y") | → Explore agent (Haiku) |
| Need comprehensive context | → Context agent (Haiku) |
| Complex feature (5+ files) | → Create task → Planner (Opus) → Sonnet coder → Sonnet reviewer |
| **Post-planning implementation** | → **Create task → Haiku coder → Sonnet reviewer** |
| Moderate change (3-5 files) | → Create task → Haiku coder → Sonnet reviewer |
| Simple fix (1-2 files) | → Haiku coder → Sonnet reviewer |
| Trivial (<10 lines) | → Haiku coder → Sonnet reviewer |
| Typo / 1-line fix | → Haiku coder → Sonnet reviewer (yes, even this) |
| Q&A / Conversation | → Answer directly |
| Coordination (CLAUDE.md, plan, task doc) | → Edit directly (not code) |

**On Haiku failure** → re-dispatch as Sonnet coder. Never silently take over the edit yourself.

### 3. Context Efficiency

**Minimize tokens consumed in main conversation:**

- **Task documents ARE context** - Don't duplicate in messages
- **Reference, don't repeat**: "See .agent/Tasks/active/X.md"
- **Agents return summaries** - Trust them, don't re-read
- **Read files only when editing** - Not for exploration
- **Use offset/limit** for large files

### 4. Quality First

- Never skip code quality analysis
- Run `npm run check` after code changes
- Follow ClaimTech patterns and conventions
- Address issues before moving forward

### 5. Document After Changes

- Use Document Updater agent after implementations
- Keep `.agent/` docs current
- Move completed tasks to `completed/` folder
- Update `.agent/README.md` status line

### 6. Use Code Execution When Appropriate

- Multi-step workflows (3+ operations)
- Complex data transformations
- Batch processing operations
- Data analysis and reporting

### 7. Follow Established Patterns

- Reference Skills for domain expertise
- Use Commands for structured workflows
- Consult .agent docs for current system state
