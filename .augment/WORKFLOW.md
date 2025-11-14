# ClaimTech AI Agent Workflow

## Overview
This document defines the complete workflow for AI agents working on ClaimTech, integrating the Context Engine for efficient context gathering, structured planning, and systematic implementation.

---

## 🎯 Three-Phase Workflow

### Phase 1: Context Gathering (5-10 minutes)
**Agent Role**: Context Gathering Agent  
**Primary Tool**: Context Engine V2 (port 3457)

#### Objectives
1. Understand user requirements completely
2. Gather all relevant technical context using Context Engine
3. Identify existing patterns and architectural decisions
4. Document findings in a structured context report

#### Process
1. **Start Context Engine** (if not running)
   ```bash
   cd context-engine
   # Terminal 1: ChromaDB
   chroma run --path ./db
   
   # Terminal 2: Context Engine V2 (Qwen3 Coder)
   npm run start:v2  # Port 3457
   ```

2. **Query for Context** (instead of reading files)
   ```bash
   # Use Context Engine API for semantic search
   curl -X POST http://localhost:3457/api/context \
     -H "Content-Type: application/json" \
     -d '{
       "query": "YOUR_SEARCH_QUERY",
       "intent": "pre-edit-gathering",
       "limit": 10
     }'
   ```

3. **Context Query Patterns**
   - **Services**: `"[feature] service methods CRUD operations"`
   - **Types**: `"[feature] interface type definition schema"`
   - **UI Components**: `"[feature] component props handlers events"`
   - **Workflows**: `"[feature] workflow status transitions audit"`
   - **Downstream**: `"calls to [method] usage references imports"`

4. **Document Findings**
   Create context report with:
   - Requirements summary
   - Relevant code contexts (from Context Engine)
   - Existing patterns identified
   - Dependencies and constraints
   - Recommended approach

#### Why Context Engine?
- **77-83% token savings** vs reading full files
- **Multi-hop reasoning** finds dependencies automatically
- **Downstream analysis** discovers all affected files
- **Code graph** shows relationships visually
- **Faster** than manual file reading (19-27s vs multiple view calls)

---

### Phase 2: Planning (15-30 minutes)
**Agent Role**: Planning Agent  
**Primary Tool**: Task Management + Context Report

#### Objectives
1. Design complete implementation architecture
2. Create detailed, actionable task breakdown
3. Provide code templates and specifications
4. Plan testing and quality assurance strategy

#### Process
1. **Review Context Report**
   - Analyze all gathered context thoroughly
   - Validate completeness of requirements
   - Identify any missing information

2. **Design Architecture**
   - Database schema changes (migrations)
   - Service layer methods and business logic
   - API endpoints and request/response formats
   - UI components and user interactions

3. **Create Task Breakdown**
   ```typescript
   // Use task management tools
   add_tasks({
     tasks: [
       {
         name: "Phase 1: Database Migration",
         description: "Create migration for [feature] with specific schema",
         state: "NOT_STARTED"
       },
       {
         name: "Phase 2: Service Layer",
         description: "Implement service methods with signatures",
         state: "NOT_STARTED",
         parent_task_id: "phase-1-id"
       }
       // ... more tasks
     ]
   });
   ```

4. **Provide Code Templates**
   - Include specific code snippets for key implementations
   - Database migration scripts with exact SQL
   - Service method signatures and logic outlines
   - UI component templates with props and events

5. **Plan Testing Strategy**
   - Unit tests for services and utilities
   - Integration tests for API endpoints
   - E2E tests for user workflows
   - Manual testing scenarios

#### Output Format
Create implementation plan in `.augment/tasks/active/[feature-name].md` with:
- Overview (objective, scope, effort, dependencies)
- Architecture design (DB, services, API, UI)
- Implementation sequence (phases with time estimates)
- Testing strategy (unit, integration, E2E, manual)
- Risk mitigation (technical, timeline, quality)

---

### Phase 3: Implementation (Variable)
**Agent Role**: Implementation Agent  
**Primary Tool**: Task Management + Code Tools

#### Objectives
1. Execute implementation plan step-by-step
2. Write production-quality code following patterns
3. Test all functionality comprehensively
4. Update documentation and task status

#### Process
1. **Load Implementation Plan**
   ```typescript
   // View current task list
   view_tasklist();
   ```

2. **Execute Tasks Sequentially**
   ```typescript
   // For each task:
   update_tasks({
     tasks: [{ task_id: "task-1", state: "IN_PROGRESS" }]
   });
   
   // Implement according to specifications
   // ... write code, create files, run tests ...
   
   update_tasks({
     tasks: [{ task_id: "task-1", state: "COMPLETE" }]
   });
   ```

3. **Follow Code Standards**
   - Use existing project patterns (check with Context Engine!)
   - Follow TypeScript/SvelteKit best practices
   - Implement proper error handling
   - Add appropriate logging

4. **Testing & Validation**
   - Run existing tests (no regressions)
   - Write new unit tests
   - Perform manual testing
   - Test edge cases and errors

5. **Documentation & Cleanup**
   - Update relevant documentation
   - Clean up temporary files
   - Format code properly
   - Mark all tasks COMPLETE

---

## 🔧 Context Engine Integration

### When to Use Context Engine

**✅ ALWAYS Use Context Engine For:**
- Finding existing patterns before implementing new features
- Discovering all files that use a specific service/method
- Understanding how a feature is currently implemented
- Finding all downstream impacts of a change
- Locating type definitions and interfaces
- Discovering related code across the codebase

**❌ DON'T Use Context Engine For:**
- Reading specific files you already know about (use `view` tool)
- Viewing exact line ranges (use `view` tool with view_range)
- Checking current file content before editing (use `view` tool)

### Context Engine Query Examples

#### Pre-Edit Gathering
```json
{
  "query": "additionals service approve decline methods implementation",
  "intent": "pre-edit-gathering",
  "limit": 10
}
```
**Returns**: Service methods, type definitions, API endpoints, UI components that use additionals

#### Feature Discovery
```json
{
  "query": "photo viewer label editing inline update optimistic",
  "intent": "feature-discovery",
  "limit": 8
}
```
**Returns**: Photo components, services, utilities like `useOptimisticArray`, type definitions

#### Downstream Analysis
```json
{
  "query": "calls to createAssessment usage references imports",
  "intent": "downstream-analysis",
  "limit": 15
}
```
**Returns**: All files that import/call the method, dependency chain, affected components

### Context Engine Response Structure

```typescript
{
  // Intent analysis - what the AI understood
  intentAnalysis: {
    intent: "pre-edit-gathering",
    goal: "Find all code related to additionals approval/decline",
    contextNeeded: ["services", "types", "components"],
    searchQueries: ["additionals service", "approve decline methods", ...]
  },

  // Multi-phase retrieval results
  retrieval: {
    phase1_initial: 24,      // Initial semantic search results
    phase2_dependencies: 9,   // Followed import chains
    phase3_downstream: 66,    // Found callers/usages
    phase4_codeGraph: 49      // Relationship nodes
  },

  // Synthesized contexts with reasoning
  contexts: [
    {
      file: "src/lib/services/additionals.service.ts",
      content: "...",
      relevance: 0.95,
      why: "Contains approve() and decline() methods",
      category: "service"
    }
  ],

  // Actionable recommendations
  recommendations: [
    "Review service methods before making changes",
    "Check type definitions for interface changes",
    "Update tests after modifications"
  ],

  // Performance metrics
  tokensSaved: "83%",
  responseTime: "19.9s",
  totalContexts: 99
}
```

---

## 📋 Quality Standards

### Context Gathering Phase
- [ ] Used Context Engine for semantic search (not manual file reading)
- [ ] Gathered contexts for services, types, components, and tests
- [ ] Identified existing patterns and architectural decisions
- [ ] Documented all dependencies and constraints
- [ ] Created structured context report

### Planning Phase
- [ ] Reviewed context report thoroughly
- [ ] Designed complete architecture (DB, services, API, UI)
- [ ] Created detailed task breakdown with clear deliverables
- [ ] Provided specific code templates and specifications
- [ ] Planned comprehensive testing strategy
- [ ] Used task management tools to structure work

### Implementation Phase
- [ ] Followed implementation plan exactly
- [ ] Used Context Engine to verify patterns before coding
- [ ] Wrote production-quality code following project conventions
- [ ] Implemented comprehensive error handling and validation
- [ ] Wrote and ran unit tests for all new functionality
- [ ] Performed manual testing of implemented features
- [ ] Updated task status throughout implementation
- [ ] Updated documentation as needed

---

## 🎯 Success Metrics

### Context Engine Performance
- **Token Savings**: 77-83% vs traditional file reading
- **Response Time**: 19-27 seconds for comprehensive context
- **Context Quality**: 90%+ relevance with multi-hop reasoning
- **Downstream Coverage**: 43% more affected files discovered

### Implementation Efficiency
- **Planning Time**: 15-30 minutes for complete plan
- **Implementation Time**: Variable based on complexity
- **Rework Rate**: <10% due to comprehensive planning
- **Test Coverage**: >80% for new functionality

### Quality Outcomes
- **Code Quality**: Follows existing patterns consistently
- **Bug Rate**: <5% post-deployment issues
- **Documentation**: All features documented
- **Test Coverage**: Comprehensive unit and integration tests

---

## 🚀 Quick Start Checklist

### Before Starting Any Task
1. [ ] Context Engine V2 running on port 3457
2. [ ] ChromaDB running on port 8000
3. [ ] User requirements clearly understood
4. [ ] Determined which phase you're in (Context/Plan/Implement)

### Context Gathering Phase
1. [ ] Query Context Engine for relevant contexts
2. [ ] Review multi-hop reasoning results
3. [ ] Document findings in context report
4. [ ] Validate completeness with user

### Planning Phase
1. [ ] Review context report thoroughly
2. [ ] Design complete architecture
3. [ ] Create task breakdown with task management tools
4. [ ] Provide code templates and specifications
5. [ ] Save plan to `.augment/tasks/active/`

### Implementation Phase
1. [ ] Load implementation plan
2. [ ] Execute tasks sequentially with status updates
3. [ ] Use Context Engine to verify patterns
4. [ ] Write tests for all new functionality
5. [ ] Update documentation
6. [ ] Mark all tasks COMPLETE

---

## 📚 Related Documentation

- **Context Engine**: `context-engine/README.md` - Setup and usage guide
- **Context Engine V2**: `context-engine/INTELLIGENT_UPGRADE.md` - V2 features and benefits
- **Planning Guide**: `.augment/plan.md` - Detailed planning instructions
- **Implementation Guide**: `.augment/implement.md` - Detailed implementation instructions
- **ClaimTech Docs**: `.agent/README.md` - Project-specific documentation

---

**Last Updated**: January 2025
**Version**: 1.0 (Context Engine V2 with Qwen3 Coder)


