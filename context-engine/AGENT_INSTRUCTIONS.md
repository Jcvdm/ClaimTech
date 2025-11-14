# Context Engine V2 - Agent Instructions

## 🎯 When to Use

**Use Context Engine V2 BEFORE making any code changes** to gather relevant context efficiently.

Use it when you need to:
- ✅ Understand existing implementations
- ✅ Gather context across 5+ files (saves 67-77% tokens)
- ✅ Find downstream impacts (all callers/usages)
- ✅ Learn architectural patterns
- ✅ Investigate bugs and error handling

---

## 🚀 Quick Start

```bash
curl -X POST http://localhost:3457/api/context \
  -H "Content-Type: application/json" \
  -d '{
    "query": "YOUR_SEARCH_QUERY",
    "intent": "pre-edit-gathering",
    "limit": 10,
    "strategy": "auto",
    "maxTokens": 3000
  }'
```

---

## 📝 Query Examples

### Good Queries (Specific + Technical)
```bash
# Before editing a service
"additionals service approve decline reverse methods"

# Before editing types
"AdditionalLineItem interface type definition fields"

# Before editing UI
"AdditionalsTab component approve decline handlers"

# Finding downstream changes
"calls to approveLineItem usage references imports"

# Learning patterns
"finalize workflow status change audit logging pattern"
```

### Bad Queries (Too Generic)
```bash
❌ "how does it work"
❌ "show me code"
❌ "additionals"
❌ "the button"
```

**Query Tips:**
- Include feature names: "additionals workflow", "FRC approval"
- Include technical terms: "service methods", "type definition", "RLS policy"
- Include action verbs: "create", "update", "approve", "decline"
- Include file types: "service", "component", "utility"

---

## 🎨 Parameters

| Parameter | Default | Options | Description |
|-----------|---------|---------|-------------|
| `query` | - | string | Natural language search query |
| `intent` | - | `"pre-edit-gathering"`, `"finding-downstream"`, `"learning-patterns"`, `"debugging"` | Your goal |
| `limit` | `10` | `5-15` | Max initial results (higher = broader) |
| `strategy` | `"auto"` | `"minimal"`, `"auto"`, `"architectural"` | Context depth |
| `maxTokens` | `3000` | `2000-5000` | Token budget |

### Strategy Guide

**`"minimal"`** - Quick lookups (~500 tokens)
- L1 only (top most relevant chunks)
- Use for: Quick reference, checking signatures

**`"auto"`** - Balanced (~3000 tokens) **[RECOMMENDED]**
- L1 + L2 + L3 (immediate + dependencies + downstream)
- Use for: Pre-edit gathering, implementation planning

**`"architectural"`** - High-level (~4000+ tokens)
- L1 + L2 + L3 + L4 (includes domain/architectural docs)
- Use for: Understanding system design, major refactors

---

## 📦 Using the Response

### 1. `agentView.primary` → System Prompt ⭐
**MOST IMPORTANT!** Top 3-5 code chunks concatenated and ready to use.

```
Include in your planning/implementation context:
"Relevant existing code:
{agentView.primary}"
```

### 2. `agentView.secondary` → Quick Summaries
5 additional contexts with file paths + 120-char previews.
- Scan for additional relevant files
- Use file paths for targeted `view` calls

### 3. `agentView.reference.files` → Navigation
List of all related files found during multi-hop search.
- Quick reference for which files are involved
- Use with `view` tool for specific files

### 4. `recommendations` → Best Practices
AI-generated actionable advice for your implementation.

### 5. `reasoning` → AI Insights
Explanation of WHY each context matters and what to look for.

### 6. `layers` → Detailed Context by Priority
- **L1 (Immediate):** Most relevant chunks, top priority
- **L2 (Adjacent):** Dependencies and imports
- **L3 (Downstream):** Callers and usages

---

## 🔄 Workflow Integration

### Phase 1: Context Gathering
```bash
curl -X POST http://localhost:3457/api/context -d '{
  "query": "feature you are implementing",
  "intent": "pre-edit-gathering",
  "limit": 10,
  "strategy": "auto",
  "maxTokens": 3000
}'
```

### Phase 2: Planning
```
Use agentView.primary in your planning:
"Based on existing code: {agentView.primary}
Plan implementation for: {task}"
```

### Phase 3: Implementation
```
Use agentView.reference.files to know which files to edit:
- view {file1}
- view {file2}
- str-replace-editor to make changes
```

### Phase 4: Completeness Check
```bash
# Find downstream changes needed
curl -X POST http://localhost:3457/api/context -d '{
  "query": "calls to {your_function} usage imports",
  "intent": "finding-downstream",
  "limit": 15,
  "maxTokens": 4000
}'
```

---

## 📚 Common Use Cases

### Use Case 1: Before Making Edits
```bash
curl -X POST http://localhost:3457/api/context -d '{
  "query": "additionals service approve decline methods implementation",
  "intent": "pre-edit-gathering",
  "limit": 10,
  "strategy": "auto",
  "maxTokens": 3000
}'
```
**Get:** Existing methods, types, patterns, error handling, audit logging

### Use Case 2: Finding Downstream Changes
```bash
curl -X POST http://localhost:3457/api/context -d '{
  "query": "calls to approveLineItem usage references imports",
  "intent": "finding-downstream",
  "limit": 15,
  "strategy": "auto",
  "maxTokens": 4000
}'
```
**Get:** All callers, imports, affected tests, related components

### Use Case 3: Learning Patterns
```bash
curl -X POST http://localhost:3457/api/context -d '{
  "query": "finalize workflow status change audit logging pattern",
  "intent": "learning-patterns",
  "limit": 12,
  "strategy": "auto",
  "maxTokens": 3500
}'
```
**Get:** Similar implementations, architectural patterns, best practices

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Empty results | Make query more specific, increase `limit`, update index |
| Too many results | More specific query, reduce `limit`, use `"minimal"` strategy |
| Slow (>30s) | Reduce `limit` to 5-8, reduce `maxTokens` to 2000 |
| Connection refused | Start engine: `cd context-engine && npm start` |
| ChromaDB error | Start ChromaDB: `chroma run --path ./db` |

**Update index after code changes:**
```bash
cd context-engine
npm run process-codebase ..
```

---

## 📊 Performance Metrics

- **Token Savings:** 67-77% vs traditional `view` approach
- **Response Time:** 15-30 seconds
- **Documents Indexed:** 500 chunks
- **Model:** Qwen3 Coder (480B MoE, 35B active)

---

**💡 Remember:** Always use Context Engine BEFORE making edits. It automatically finds patterns, dependencies, and downstream changes, saving hours of manual searching!

