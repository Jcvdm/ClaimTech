# Agent Handoff Protocol

## Purpose
This document defines how to delegate tasks to specialized agents and ensure they have complete context.

## Overview

The Orchestrator Agent delegates tasks using the **Task tool** to launch specialized sub-agents. Each agent works autonomously and returns results when complete.

## Delegation Process

### 1. Identify the Right Agent

Refer to `agent_roles.md` to select the appropriate agent for the task.

### 2. Prepare Context

Before delegating, ensure you have:

**Required Information:**
- Clear task description
- Specific deliverables expected
- Any constraints or requirements
- Relevant file paths
- Related documentation references

**Optional but Helpful:**
- Background context
- Design decisions made so far
- Dependencies on other work
- Success criteria

### 3. Create Task Documentation

For complex tasks, create a task file:

**Location:** `.agent/tasks/active/[timestamp]_[task_name].md`

**Template:**
```markdown
# Task: [Task Name]

**Created:** [ISO timestamp]
**Agent:** [Agent type]
**Status:** In Progress

## Objective
[Clear description of what needs to be accomplished]

## Context
[Relevant background information]

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Deliverables
1. [Specific output 1]
2. [Specific output 2]

## Files to Review
- `path/to/file1.ts` - [purpose]
- `path/to/file2.ts` - [purpose]

## Files to Create/Modify
- `path/to/new-file.ts` - [purpose]

## Constraints
- Must use existing pattern from X
- Performance requirement: Y
- Security consideration: Z

## Related Documentation
- `.agent/system/architecture.md`
- `.agent/sops/deployment.md`

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

### 4. Launch the Agent

Use the Task tool:

```
Task tool parameters:
- subagent_type: [agent type]
- description: [3-5 word summary]
- prompt: [detailed instructions - see below]
```

**Prompt Structure:**

```
I need you to [specific task].

Context:
[Provide relevant background]

Requirements:
- Requirement 1
- Requirement 2

Please:
1. [Specific step 1]
2. [Specific step 2]
3. [Specific step 3]

Deliverables:
- [Expected output 1]
- [Expected output 2]

Files to review:
- path/to/file.ts

Constraints:
- [Constraint 1]
- [Constraint 2]
```

### 5. Parallel vs Sequential Delegation

**Parallel Delegation:**
When tasks are independent, launch agents in parallel using multiple Task calls in a single message:

```
[Use multiple Task tool invocations in one message]
- Task 1: research-analyst
- Task 2: system-architect
(They can work simultaneously)
```

**Sequential Delegation:**
When tasks depend on each other, wait for results before launching next agent:

```
1. Launch research-analyst
2. Wait for research results
3. Use results to inform system-architect
4. Wait for architecture
5. Use architecture to inform implementation-coder
```

## Agent-Specific Guidelines

### System Architect

**Provide:**
- Business requirements
- Performance/scalability needs
- Technology constraints
- Integration requirements

**Expect:**
- Architecture diagrams
- Technology recommendations
- Design pattern decisions
- Scalability considerations

### Research Analyst

**Provide:**
- What to investigate
- Specific questions to answer
- Areas of the codebase to explore

**Expect:**
- Comprehensive analysis
- Pattern identification
- Recommendations
- Documentation in `.agent/tasks/research/`

### Implementation Coder

**Provide:**
- Specifications or design
- Code style preferences
- Testing requirements
- Related files to follow patterns from

**Expect:**
- Production-ready code
- Error handling
- Documentation
- Unit tests

### Code Quality Analyzer

**Provide:**
- Files or components to review
- Specific concerns (performance, security, etc.)
- Quality standards to check against

**Expect:**
- Quality assessment report
- Refactoring suggestions
- Security/performance findings
- Prioritized improvements

### Backend API Developer

**Provide:**
- API requirements
- Data models needed
- Authentication requirements
- Database preferences (Supabase)

**Expect:**
- API endpoints
- Database schema
- Authentication implementation
- API documentation

### PR Manager

**Provide:**
- Branch information
- PR description context
- Review requirements
- Test requirements

**Expect:**
- Created pull request
- Review coordination
- Test execution results
- Merge status

## Integration After Agent Completion

### 1. Review Agent Output

When an agent completes:
- Review all files created/modified
- Check deliverables against requirements
- Verify quality and completeness

### 2. Document Results

Update task file:
```markdown
## Results

**Completed:** [ISO timestamp]
**Duration:** [time taken]

### Outputs
- [File 1] - [description]
- [File 2] - [description]

### Key Decisions
- Decision 1
- Decision 2

### Follow-up Required
- [ ] Item 1
- [ ] Item 2
```

Move to completed:
```
.agent/tasks/active/[task].md
→ .agent/tasks/completed/[task].md
```

### 3. Update System Documentation

Update relevant docs in `.agent/system/`:
- `project_structure.md` if structure changed
- `database_schema.md` if schema changed
- `api_endpoints.md` if APIs added
- `architecture.md` if architecture changed

### 4. Plan Next Steps

Based on agent results:
- Identify follow-up tasks
- Determine next agent to delegate to
- Update overall project plan

## Best Practices

### Do:
✅ Provide complete context to agents
✅ Create task files for complex work
✅ Use parallel delegation when possible
✅ Always review agent outputs
✅ Update documentation after integration
✅ Track agent decisions and rationale

### Don't:
❌ Delegate without clear requirements
❌ Skip task documentation for complex work
❌ Run dependent tasks in parallel
❌ Ignore agent recommendations
❌ Forget to update system docs
❌ Skip code quality review

## Common Patterns

### Pattern: Research → Design → Implement → Review

```
1. Create task file: .agent/tasks/active/feature-x.md

2. Launch research-analyst:
   "Investigate existing authentication system..."

3. Review research, update task file

4. Launch system-architect:
   "Based on research in [file], design OAuth integration..."

5. Review architecture, update task file

6. Launch implementation-coder:
   "Implement OAuth following architecture in [file]..."

7. Review implementation

8. Launch code-quality-analyzer:
   "Review OAuth implementation in [files]..."

9. Apply quality improvements

10. Move task to completed
```

### Pattern: Parallel API Development

```
1. Create task file: .agent/tasks/active/api-endpoints.md

2. Launch multiple backend-api-dev agents in parallel:
   - Agent 1: User management endpoints
   - Agent 2: Product catalog endpoints
   (Independent, can work simultaneously)

3. Review all outputs

4. Launch code-quality-analyzer:
   "Review all new API endpoints..."

5. Complete integration
```

### Pattern: Architecture Overhaul

```
1. Launch research-analyst:
   "Analyze current system architecture..."

2. Launch system-architect:
   "Design improved architecture based on findings..."

3. Review and approve architecture

4. Break into parallel implementation tasks

5. Launch multiple implementation-coder agents:
   - Agent 1: Refactor module A
   - Agent 2: Refactor module B
   - Agent 3: Create integration layer

6. Launch code-quality-analyzer for each:
   Review each refactored module

7. Launch pr-manager:
   "Create PR for architecture improvements..."
```

## Troubleshooting

**Issue:** Agent didn't have enough context
**Solution:** Create detailed task file, reference in prompt

**Issue:** Agent output doesn't match expectations
**Solution:** Review prompt clarity, add specific examples

**Issue:** Unclear which agent to use
**Solution:** Consult `agent_roles.md`, consider task decomposition

**Issue:** Dependent tasks running in parallel
**Solution:** Sequence tasks, wait for results between agents

**Issue:** Lost track of agent outputs
**Solution:** Use task files, document in `.agent/tasks/`
