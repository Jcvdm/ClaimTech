# MCP Server Wrappers - Illustrative Reference Only

**CRITICAL**: This directory contains illustrative TypeScript wrappers that **CANNOT be used in code execution contexts**.

## Why This Directory Exists

This directory serves as:
- **API Reference**: Documents all 31 MCP operations across 6 servers
- **Type Safety Examples**: Shows TypeScript interfaces and type definitions
- **Code Structure**: Demonstrates clean separation of concerns
- **Educational Resource**: Illustrates ideal client library design

## Why These Cannot Be Used in Code Execution

Code execution via `mcp__ide__executeCode` runs in an **isolated Deno sandbox** that:
- Cannot access MCP tools or MCP servers
- Cannot make MCP tool calls
- Has no MCP client available
- Can only process data passed as parameters

## Actual Code Execution Pattern (Architecture A)

The correct pattern for code execution is:

### Step 1: Claude Calls MCP Tools to Fetch Data

```typescript
// Claude calls MCP tools FIRST (before code execution)
const assessments = await mcp__supabase__execute_sql({
  project_id: env.SUPABASE_PROJECT_ID,
  query: 'SELECT * FROM assessments WHERE stage = $1',
  params: ['completed']
});
```

### Step 2: Claude Passes Data to Code Execution for Processing

```typescript
// Claude embeds data and executes code
const code = `
  const assessments = ${JSON.stringify(assessments)};

  // Process data with complex logic
  const stats = assessments.reduce((acc, a) => {
    const stage = a.stage;
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  console.log('Stage breakdown:', JSON.stringify(stats, null, 2));
`;

await mcp__ide__executeCode({ code });
```

**Token Savings**: 73-94% vs traditional multi-tool approach

## Complete Guide

For comprehensive code execution documentation, see:
- `.agent/SOP/using_code_executor.md` - Step-by-step guide
- `.agent/System/code_execution_architecture.md` - Architecture overview
- `.agent/System/code_execution_patterns.md` - Common patterns
- `.agent/System/mcp_code_api_reference.md` - MCP tool reference

---

## Original Documentation (Illustrative Reference)

**Phase**: 2 - Infrastructure Complete
**Status**: Educational Reference Only

---

## Overview

This directory contains TypeScript wrappers for MCP servers, presenting them as importable code APIs. Each wrapper provides type-safe access to MCP tools with consistent error handling and developer-friendly interfaces.

**Note**: These are illustrative examples showing ideal API design. See the warning above for actual code execution usage.

## Philosophy

**MCP-as-Code-API Pattern**: The wrappers demonstrate how MCP tools could be used like TypeScript modules:

```typescript
// Illustrative example (cannot be used in code execution)
import { executeSQL } from '/servers/supabase/database';

const assessments = await executeSQL({
  projectId: process.env.SUPABASE_PROJECT_ID!,
  query: 'SELECT * FROM assessments'
});
```

**Benefits of This Design Pattern**:
- **Type Safety**: Full TypeScript types and IntelliSense
- **Validation**: Parameter validation before MCP calls
- **Error Handling**: Consistent error classes across all operations
- **Documentation**: JSDoc comments with examples
- **Discoverability**: Import completion shows all available operations

---

## Structure

```
/servers/
├── _shared/              # Common utilities
│   ├── types.ts         # Shared types (SQLResult, Commit, Issue, etc.)
│   ├── errors.ts        # Error classes (ValidationError, NotFoundError, etc.)
│   ├── utils.ts         # Helper functions (retry, timeout, validation)
│   ├── mcp-bridge.ts    # Bridge to actual MCP tool calls (Phase 3)
│   └── index.ts         # Main exports
│
├── supabase/            # Supabase database operations
│   ├── database.ts      # executeSQL, applyMigration, listTables
│   ├── projects.ts      # listProjects, getProject
│   ├── functions.ts     # deployEdgeFunction, listEdgeFunctions
│   ├── branches.ts      # createBranch, listBranches
│   └── index.ts         # Main exports
│
├── github/              # GitHub repository operations
│   ├── repo.ts          # getFileContents, pushFiles, listCommits, searchCode
│   ├── pulls.ts         # createPR, listPRs, mergePR
│   ├── issues.ts        # createIssue, listIssues
│   ├── search.ts        # searchIssues
│   └── index.ts         # Main exports
│
├── examples/            # Example scripts (see below)
│   ├── data-analysis.ts
│   ├── batch-update.ts
│   └── cross-source.ts
│
└── README.md            # This file
```

**Note**: Playwright, Svelte, Chrome, and Context7 modules will be implemented by `service-builder` agent.

---

## Usage Examples (Illustrative Only)

The following examples demonstrate the TypeScript wrapper API design. Remember, these cannot be used in code execution contexts.

### Correct Usage: Architecture A Pattern

For actual code execution, use this pattern:

```typescript
// 1. Claude calls MCP tool to fetch data
const result = await mcp__supabase__execute_sql({
  project_id: env.SUPABASE_PROJECT_ID,
  query: `
    SELECT
      stage,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
    FROM assessments
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY stage
    ORDER BY avg_hours DESC
  `
});

// 2. Claude embeds data and processes with code execution
const code = `
  const stageStats = ${JSON.stringify(result)};

  console.log('Pipeline Bottlenecks (Last 30 Days):');
  for (const stat of stageStats) {
    console.log(\`\${stat.stage}: \${stat.count} items, avg \${stat.avg_hours.toFixed(1)}h\`);
  }
`;

await mcp__ide__executeCode({ code });
```

### Illustrative Pattern: Type-Safe Wrappers

These examples show the wrapper API design (not usable in code execution):

```typescript
// Illustrative example only - shows ideal API design
import { executeSQL } from '/servers/supabase/database';

// Analyze assessment pipeline bottlenecks
const stageStats = await executeSQL({
  projectId: process.env.SUPABASE_PROJECT_ID!,
  query: `
    SELECT
      stage,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
    FROM assessments
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY stage
    ORDER BY avg_hours DESC
  `
});

console.log('Pipeline Bottlenecks (Last 30 Days):');
for (const stat of stageStats) {
  console.log(`${stat.stage}: ${stat.count} items, avg ${stat.avg_hours}h`);
}
```

---

## Available Modules (Reference Only)

### `/servers/supabase` - Database Operations

**Database**:
- `executeSQL(params)` - Execute raw SQL queries
- `applyMigration(params)` - Apply database migrations
- `listTables(params)` - List tables in schemas
- `listMigrations(params)` - List applied migrations
- `generateTypes(params)` - Generate TypeScript types

**Projects**:
- `listProjects()` - List all Supabase projects
- `getProject(params)` - Get project details

**Edge Functions**:
- `deployEdgeFunction(params)` - Deploy edge function
- `listEdgeFunctions(params)` - List edge functions

**Branches**:
- `createBranch(params)` - Create development branch
- `listBranches(params)` - List branches

### `/servers/github` - Repository Operations

**Repository**:
- `getFileContents(params)` - Get file from repo
- `pushFiles(params)` - Push multiple files
- `listCommits(params)` - List commits
- `searchCode(params)` - Search code across repos

**Pull Requests**:
- `createPR(params)` - Create pull request
- `listPRs(params)` - List pull requests
- `mergePR(params)` - Merge pull request

**Issues**:
- `createIssue(params)` - Create issue
- `listIssues(params)` - List issues

**Search**:
- `searchIssues(params)` - Search issues

---

## Error Handling (Illustrative Pattern)

All operations use consistent error classes:

```typescript
// Illustrative example only
import { executeSQL } from '/servers/supabase/database';
import { ValidationError, NotFoundError, MCPExecutionError } from '/servers/_shared';

try {
  const data = await executeSQL({
    projectId: 'invalid',
    query: 'SELECT * FROM assessments'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.message);
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found:', error.message);
  } else if (error instanceof MCPExecutionError) {
    console.error('MCP execution failed:', error.message);
  }
}
```

**Error Classes**:
- `ValidationError` - Invalid parameters
- `AuthenticationError` - Auth failure
- `PermissionError` - Insufficient permissions
- `NotFoundError` - Resource not found
- `NetworkError` - Connection issue
- `TimeoutError` - Operation timeout
- `RateLimitError` - Rate limited
- `ConflictError` - Conflict (merge, concurrent modification)

---

## Phase Status

### Phase 2: Infrastructure ✅ COMPLETE

**Deliverables**:
- ✅ `/servers/_shared/` - Types, errors, utils, mcp-bridge
- ✅ `/servers/supabase/` - Database, projects, functions, branches
- ✅ `/servers/github/` - Repo, pulls, issues, search
- ✅ Example scripts
- ✅ Documentation

**What Works**:
- Full TypeScript types and IntelliSense
- Parameter validation
- Error classes
- JSDoc documentation with examples

**What Doesn't Work**:
- Actual MCP tool calls (throws "MCP Bridge not yet connected")
- Cannot be used in code execution (runs in isolated Deno sandbox)

### Phase 3: Educational Reference (Updated Scope)

This directory now serves as educational reference showing ideal API design patterns. For actual code execution, use Architecture A pattern documented in `.agent/SOP/using_code_executor.md`.

---

## Related Documentation

- **Code Execution Guide**: `.agent/SOP/using_code_executor.md` - How to actually use code execution
- **Architecture**: `.agent/System/code_execution_architecture.md` - Architecture A vs B comparison
- **Patterns**: `.agent/System/code_execution_patterns.md` - Common recipes for Architecture A
- **MCP Reference**: `.agent/System/mcp_code_api_reference.md` - Complete MCP tool documentation

---

## Contributing

When adding new MCP server wrappers (for reference/documentation purposes):

1. Create module in `/servers/[server-name]/`
2. Add types to `_shared/types.ts` if needed
3. Use `callMCPTool()` for all MCP operations
4. Add comprehensive JSDoc with examples
5. Export from `/servers/[server-name]/index.ts`
6. Update this README with new module

**Example**:

```typescript
// /servers/playwright/browser.ts
import { callMCPTool } from '../_shared/mcp-bridge';

/**
 * Navigate browser to URL
 *
 * @example
 * ```typescript
 * await navigate({ url: 'http://localhost:5173' });
 * ```
 */
export async function navigate(params: { url: string }): Promise<void> {
  return callMCPTool('mcp__playwright__navigate', { url: params.url });
}
```

---

**Document Version**: 2.0 (Educational Reference)
**Last Updated**: November 9, 2025
**Purpose**: Illustrative API design patterns and reference documentation
