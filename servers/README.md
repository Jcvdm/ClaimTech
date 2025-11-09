# MCP Servers as Code APIs

**Phase**: 2 - Infrastructure Complete
**Status**: Ready for Phase 3 (MCP Bridge Connection)

---

## Overview

This directory contains TypeScript wrappers for MCP servers, presenting them as importable code APIs. Each wrapper provides type-safe access to MCP tools with consistent error handling and developer-friendly interfaces.

## Philosophy

**MCP-as-Code-API Pattern**: Instead of manually calling MCP tools with raw parameters, import and use them like any other TypeScript module:

```typescript
// ❌ Before: Manual MCP tool invocation
const result = await invokeMCPTool('mcp__supabase__execute_sql', {
  project_id: 'xyz123',
  query: 'SELECT * FROM assessments'
});

// ✅ After: Code API import
import { executeSQL } from '/servers/supabase/database';

const assessments = await executeSQL({
  projectId: process.env.SUPABASE_PROJECT_ID!,
  query: 'SELECT * FROM assessments'
});
```

**Benefits**:
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

## Usage Examples

### Pattern 1: Data Analysis

```typescript
import { executeSQL } from '/servers/supabase/database';

// Analyze assessment pipeline bottlenecks
const stageStats = await executeSQL({
  projectId: process.env.SUPABASE_PROJECT_ID!,
  query: `
    SELECT
      stage,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours,
      MAX(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as max_hours
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

### Pattern 2: Batch Operations

```typescript
import { executeSQL } from '/servers/supabase/database';
import { pushFiles } from '/servers/github/repo';

// Generate types and commit to repo
const types = await generateTypes({
  projectId: process.env.SUPABASE_PROJECT_ID!
});

await pushFiles({
  owner: 'claimtech',
  repo: 'platform',
  branch: 'dev',
  files: [
    {
      path: 'src/lib/types/database.types.ts',
      content: types
    }
  ],
  message: 'chore: update database types'
});

console.log('Database types updated and committed');
```

### Pattern 3: Cross-Source Analysis

```typescript
import { executeSQL } from '/servers/supabase/database';
import { searchCode, listPRs } from '/servers/github';

// Find assessments in 'inspection_scheduled' stage
const assessments = await executeSQL({
  projectId: process.env.SUPABASE_PROJECT_ID!,
  query: `
    SELECT id, claim_id, stage, created_at
    FROM assessments
    WHERE stage = 'inspection_scheduled'
    AND created_at > NOW() - INTERVAL '7 days'
  `
});

// Check for related code changes in recent PRs
const prs = await listPRs({
  owner: 'claimtech',
  repo: 'platform',
  state: 'closed',
  perPage: 20
});

console.log(`${assessments.length} scheduled inspections in last 7 days`);
console.log(`${prs.length} merged PRs in repository`);
```

---

## Available Modules

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

## Error Handling

All operations use consistent error classes:

```typescript
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

**What Doesn't Work Yet**:
- Actual MCP tool calls (throws "MCP Bridge not yet connected")
- This is expected - Phase 3 will implement the bridge

### Phase 3: MCP Bridge (Next)

**TODO**:
- Implement `callMCPTool()` in `mcp-bridge.ts`
- Connect to actual MCP tools via Claude Desktop API
- Test all wrappers with real MCP calls
- Implement remaining servers (Playwright, Svelte, Chrome, Context7)

---

## Testing (Phase 2)

Currently, all functions throw "MCP Bridge not yet connected" errors. This is expected.

**To verify infrastructure**:

```typescript
import { executeSQL } from '/servers/supabase/database';

try {
  await executeSQL({
    projectId: 'test',
    query: 'SELECT 1'
  });
} catch (error) {
  console.log(error.message);
  // Expected: "MCP Bridge not yet connected. Tool: mcp__supabase__execute_sql"
}
```

**Phase 3 Testing**:
Once bridge is connected, all wrappers will call real MCP tools and return actual data.

---

## Related Documentation

- **API Reference**: `.agent/System/mcp_code_api_reference.md` - Complete API docs
- **Architecture**: `.agent/System/code_execution_architecture.md` - System overview
- **Patterns**: `.agent/System/code_execution_patterns.md` - Common recipes
- **Usage Guide**: `.agent/SOP/using_code_executor.md` - Step-by-step procedures

---

## Contributing

When adding new MCP server wrappers:

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

**Document Version**: 1.0 (Phase 2 Complete)
**Last Updated**: November 9, 2025
**Next Phase**: MCP Bridge Connection (service-builder)
