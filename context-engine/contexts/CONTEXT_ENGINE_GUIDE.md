# Context Engine Guide for AI Coding Agents

## Overview

The Context Engine is an AI-powered semantic search system that provides intelligent codebase context retrieval with **77-80% token savings** compared to traditional file reading methods. It uses ChromaDB for vector embeddings and OpenRouter AI for context synthesis.

**Key Benefits:**
- 🎯 **Targeted Context**: Retrieves only relevant code snippets, not entire files
- 💰 **Token Efficient**: Uses ~1,500 tokens vs ~6,700 tokens for traditional methods
- 🚀 **Fast Queries**: Semantic search returns results in 5-15 seconds
- 🧠 **Smart Ranking**: AI-powered relevance scoring and synthesis

---

## Architecture

```
┌─────────────────┐
│  Coding Agent   │
│   (You/Me)      │
└────────┬────────┘
         │ HTTP POST /api/context
         ▼
┌─────────────────────────────────┐
│   Context Engine API Server     │
│   (Node.js/Express)              │
│   Port: 3456                     │
└────────┬────────────────────────┘
         │
         ├──► ChromaDB Server (Port: 8000)
         │    - Vector embeddings storage
         │    - Semantic search
         │    - 682 context documents
         │
         └──► OpenRouter AI
              - Model: openai/gpt-5.1-codex-mini
              - Context synthesis & ranking

```

---

## Quick Start

### 1. Start ChromaDB Server

```bash
cd context-engine
chroma run --path ./db
```

**Expected Output:**
```
Running Chroma on http://localhost:8000
```

### 2. Start Context Engine API

```bash
cd context-engine
npm start
```

**Expected Output:**
```
✅ Context Engine running on http://localhost:3456
📊 Dashboard: http://localhost:3456/dashboard
```

### 3. Verify System Health

```bash
curl http://localhost:3456/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "chromadb": "connected",
  "collection": "codebase_contexts",
  "documents": 682
}
```

---

## API Usage for Coding Agents

### Query Context Endpoint

**Endpoint:** `POST http://localhost:3456/api/context`

**Request Body:**
```json
{
  "query": "How is authentication handled?",
  "limit": 10
}
```

**Parameters:**
- `query` (string, required): Natural language description of what you're looking for
- `limit` (number, optional): Number of context chunks to return (default: 5, max: 20)

**Response:**
```json
{
  "query": "How is authentication handled?",
  "results": [
    {
      "file": "src/hooks.server.ts",
      "content": "export const handle = sequence(authGuard, async ({ event, resolve }) => {...}",
      "relevance": -0.37,
      "metadata": {
        "category": "server",
        "functions": ["authGuard", "handle"]
      }
    }
  ],
  "performance": {
    "responseTime": 13443,
    "tokensSaved": 77,
    "cached": false
  }
}
```

---

## Example Queries for Coding Agents

### Information Gathering Before Edits

```bash
# Find service implementations
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "additionals service methods approve decline reverse", "limit": 10}'

# Find type definitions
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "AdditionalLineItem type interface status action", "limit": 5}'

# Find route handlers
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "work additionals page server load function", "limit": 8}'

# Find UI components
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "AdditionalsTab component approve decline buttons", "limit": 10}'
```

### Best Practices for Query Construction

**✅ Good Queries:**
- Include specific feature names: "additionals workflow line items"
- Include action verbs: "approve decline reverse"
- Include file types: "service component route"
- Include technical terms: "RLS policy audit logging"

**❌ Poor Queries:**
- Too generic: "show me code"
- Too broad: "how does the app work"
- Missing context: "the button" (which button?)

---

## Updating the Context Index

### When to Update

Update the context engine index when:
- ✅ You add new files or features
- ✅ You make significant code changes
- ✅ You refactor existing code
- ✅ You want queries to reflect recent changes

**You DON'T need to update for:**
- ❌ Minor typo fixes
- ❌ Comment-only changes
- ❌ Formatting changes

### Update Command

```bash
cd context-engine
npm run process-codebase ..
```

**What This Does:**
1. Scans all files in `../` (ClaimTech root)
2. Analyzes code structure (imports, exports, functions, classes)
3. Creates semantic chunks at function/class boundaries
4. Generates vector embeddings using local transformer model
5. Indexes 682 context documents into ChromaDB
6. Replaces old index with updated data

**Expected Output:**
```
📁 Analyzing codebase...
✅ Found 186 files
📝 Creating context chunks...
✅ Created 682 contexts
🔢 Generating embeddings...
✅ Indexed 682 documents
⏱️  Completed in 45s
```

**Time:** ~30-60 seconds for full re-index

---

## Integration Patterns for Coding Agents

### Pattern 1: Pre-Edit Context Gathering

**Use Case:** Before making code changes, gather comprehensive context

```bash
# Step 1: Understand the feature area
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "additionals workflow implementation", "limit": 10}'

# Step 2: Find specific implementations
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "additionals service approve decline methods", "limit": 8}'

# Step 3: Find related types and interfaces
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "AdditionalLineItem type definition", "limit": 5}'
```

**Token Savings:** ~4.4x fewer tokens vs reading full files with `view` tool

---

### Pattern 2: Downstream Impact Analysis

**Use Case:** After making changes, find all affected code

```bash
# Find all callers of a modified function
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "calls to approveLineItem function usage", "limit": 15}'

# Find all implementations of an interface
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "implements AdditionalLineItem interface", "limit": 10}'

# Find all imports of a modified module
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "import from additionals.service", "limit": 12}'
```

---

### Pattern 3: Feature Discovery

**Use Case:** Understand how existing features work before implementing similar ones

```bash
# Find similar workflows
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "finalize workflow approve status change audit", "limit": 10}'

# Find reusable patterns
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "modal dialog decline reason confirmation", "limit": 8}'

# Find service layer patterns
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "service CRUD operations audit logging", "limit": 10}'
```

---

### Pattern 4: Bug Investigation

**Use Case:** Find related code when debugging issues

```bash
# Find error handling patterns
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "error handling try catch additionals", "limit": 8}'

# Find validation logic
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "validation rules line item status", "limit": 10}'

# Find state management
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "reactive state updates additionals tab", "limit": 8}'
```

---

## Comparison: Context Engine vs Traditional Methods

### Scenario: Gather context on additionals feature

#### Traditional Method (view + codebase-retrieval)

```bash
# Read full service file (1,104 lines)
view src/lib/services/additionals.service.ts

# Read types file with regex search
view src/lib/types/assessment.ts --search "Additional"

# Read route files
view src/routes/(app)/work/additionals/+page.server.ts
view src/routes/(app)/work/additionals/+page.svelte

# Use codebase-retrieval for broader search
codebase-retrieval "additionals implementation"
```

**Total Tokens:** ~6,700 tokens

---

#### Context Engine Method

```bash
# Query 1: Service methods
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "additionals service approve decline reverse", "limit": 10}'

# Query 2: Types and interfaces
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "AdditionalLineItem type status action", "limit": 8}'

# Query 3: Route implementation
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "additionals page route server load", "limit": 8}'
```

**Total Tokens:** ~1,530 tokens

**Savings:** 77% fewer tokens (4.4x more efficient)

---

## Advanced Configuration

### Environment Variables

Edit `context-engine/.env`:

```bash
# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-...
CONTEXT_MODEL=openai/gpt-5.1-codex-mini

# Server Configuration
PORT=3456
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Collection Configuration
COLLECTION_NAME=codebase_contexts
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2

# Query Configuration
DEFAULT_LIMIT=5
MAX_LIMIT=20
CONTEXT_WINDOW=500
```

### Customizing Query Behavior

**Increase result count for broader context:**
```json
{"query": "authentication flow", "limit": 20}
```

**Focused queries for specific files:**
```json
{"query": "src/lib/services/additionals.service.ts approveLineItem method", "limit": 3}
```

**Multi-aspect queries:**
```json
{"query": "additionals workflow service methods UI components types", "limit": 15}
```

---

## Troubleshooting

### ChromaDB Not Running

**Error:** `ECONNREFUSED ::1:8000`

**Solution:**
```bash
cd context-engine
chroma run --path ./db
```

### Context Engine API Not Running

**Error:** `ECONNREFUSED ::1:3456`

**Solution:**
```bash
cd context-engine
npm start
```

### Empty or Irrelevant Results

**Problem:** Query returns no results or wrong context

**Solutions:**
1. Update the index: `npm run process-codebase ..`
2. Refine query with more specific terms
3. Increase limit: `"limit": 15`
4. Check if files exist in codebase

### Slow Query Performance

**Problem:** Queries take >30 seconds

**Solutions:**
1. Reduce limit: `"limit": 5`
2. Check ChromaDB server is running locally (not remote)
3. Verify OpenRouter API key is valid
4. Check network connectivity

---

## Monitoring & Debugging

### Check System Status

```bash
# Health check
curl http://localhost:3456/health

# Collection info
curl http://localhost:8000/api/v1/collections

# Document count
curl http://localhost:8000/api/v1/collections/2c2c12b2-8a12-43d1-b460-804330bf48a8/count
```

### View Dashboard

Open in browser: **http://localhost:3456/dashboard**

Features:
- 📊 Query interface with live results
- ⏱️ Performance metrics
- 💾 Token savings calculator
- 📈 Query history

---

## Best Practices for Coding Agents

### ✅ DO:

1. **Use context engine for information gathering** before making edits
2. **Make parallel queries** when gathering multi-faceted context
3. **Update index after major changes** to keep context fresh
4. **Use specific queries** with feature names and technical terms
5. **Combine with codebase-retrieval** for comprehensive understanding

### ❌ DON'T:

1. **Don't use for single file reads** - use `view` tool instead
2. **Don't query for exact line numbers** - context engine returns snippets
3. **Don't rely on stale index** - update after significant changes
4. **Don't use overly generic queries** - be specific
5. **Don't replace all file reads** - use strategically for token savings

---

## Token Efficiency Guidelines

### When to Use Context Engine:

- ✅ Gathering context across multiple files (5+ files)
- ✅ Understanding feature workflows and patterns
- ✅ Finding implementations of interfaces/types
- ✅ Discovering related code for downstream changes
- ✅ Investigating bugs across service/component layers

### When to Use Traditional Tools:

- ❌ Reading a single specific file you already know about
- ❌ Viewing exact line numbers for edits
- ❌ Checking file structure and imports
- ❌ Reading configuration files
- ❌ Viewing test files for specific functions

---

## Performance Metrics

### Current System Stats

- **Documents Indexed:** 682 context chunks
- **Files Processed:** 186 source files
- **Collection:** `codebase_contexts`
- **Embedding Model:** Xenova/all-MiniLM-L6-v2 (384 dimensions)
- **AI Model:** openai/gpt-5.1-codex-mini

### Typical Query Performance

| Metric | Value |
|--------|-------|
| **Query Time** | 5-15 seconds |
| **Tokens Used** | 1,500-2,000 |
| **Token Savings** | 77-80% |
| **Results Returned** | 5-10 chunks |
| **Relevance Score** | -0.3 to -0.6 (lower = better) |

---

## Related Documentation

- **Architecture:** `.agent/System/project_architecture.md`
- **Code Execution:** `.agent/SOP/using_code_executor.md`
- **Agent Workflows:** `.agent/README/task_guides.md`
- **Best Practices:** `.agent/README.md`

---

*Last Updated: January 2025*
*For ClaimTech AI Coding Agents*


