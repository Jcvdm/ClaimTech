# Context Engine - AI Agent Context Gathering System

**⚡ 77% Token Savings | 🎯 Semantic Search | 🚀 5-15s Response Time**

---

## 🎯 For AI Coding Agents: How to Gather Context

This system replaces traditional file reading with intelligent semantic search, providing **4.4x more token efficiency** than reading full files.

### **Quick Reference**

| Traditional Method | Context Engine Method | Token Savings |
|-------------------|----------------------|---------------|
| Read 5+ full files with `view` | 1-3 targeted API queries | **77%** |
| ~6,700 tokens | ~1,530 tokens | **4.4x faster** |

---

## 📋 Context Gathering Workflow

### **Step 1: Start the System** (One-time per session)

```bash
# Terminal 1: Start ChromaDB
cd context-engine
chroma run --path ./db

# Terminal 2: Start Context Engine API
npm start
```

**Verify it's running:**
```bash
curl http://localhost:3456/health
# Expected: {"status":"healthy","documents":682}
```

---

### **Step 2: Query for Context** (Use this instead of `view` tool)

**Basic Query Pattern:**
```bash
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_SEARCH_QUERY", "limit": 10}'
```

---

## 🔍 Query Patterns for Common Tasks

### **Before Making Edits: Gather Implementation Context**

```bash
# Find service methods
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "additionals service approve decline reverse methods", "limit": 10}'

# Find type definitions
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "AdditionalLineItem interface type definition", "limit": 5}'

# Find UI components
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "AdditionalsTab component approve decline handlers", "limit": 8}'
```

### **After Making Edits: Find Downstream Changes**

```bash
# Find all callers of modified function
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "calls to approveLineItem usage references", "limit": 15}'

# Find all imports of modified module
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "import from additionals.service", "limit": 12}'
```

### **Understanding Features: Learn Patterns**

```bash
# Find similar workflows
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "finalize workflow status change audit logging", "limit": 10}'

# Find reusable components
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "modal dialog confirmation decline reason", "limit": 8}'
```

### **Debugging Issues: Investigate Problems**

```bash
# Find error handling
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "error handling try catch additionals service", "limit": 8}'

# Find validation logic
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "validation rules line item status checks", "limit": 10}'
```

---

## 🎨 Query Construction Best Practices

### ✅ **Good Queries** (Specific + Technical)

- Include feature names: "additionals workflow line items approve decline"
- Include technical terms: "RLS policy assessment table security"
- Include file types: "service methods CRUD operations audit"
- Include action verbs: "create update delete line item functions"

### ❌ **Poor Queries** (Too Generic)

- Too broad: "how does the app work"
- Too vague: "show me code"
- Missing context: "the button" (which button?)

---

## 🔄 Updating the Context Index

**When to update:**
- ✅ After adding new files/features
- ✅ After significant refactoring
- ✅ After major code changes
- ✅ Before starting work on a new feature area

**Update command:**
```bash
cd context-engine
npm run process-codebase ..
```

**Time:** ~30-60 seconds to re-index 682 documents

---

## 📊 When to Use Context Engine vs Traditional Tools

### **Use Context Engine When:**

| Scenario | Why |
|----------|-----|
| 🔍 **Gathering context across 5+ files** | 77% token savings |
| 🎯 **Understanding feature workflows** | Semantic search finds patterns |
| 🔗 **Finding downstream changes** | Discovers all related code |
| 🐛 **Investigating bugs** | Finds error handling patterns |
| 📚 **Learning existing patterns** | Discovers reusable components |

### **Use Traditional Tools When:**

| Scenario | Tool | Why |
|----------|------|-----|
| 📄 **Reading 1 specific file** | `view` | Direct access faster |
| ✏️ **Editing exact lines** | `str-replace-editor` | Need precise line numbers |
| 🗂️ **Checking file structure** | `view` directory | See full hierarchy |
| ⚙️ **Reading config files** | `view` | Small files, no search needed |

---

## 🚀 Performance Metrics

**Current System:**
- **Documents:** 682 context chunks
- **Files:** 186 source files
- **Query Time:** 5-15 seconds
- **Token Savings:** 77% average
- **Efficiency:** 4.4x fewer tokens

**Example Comparison:**

| Method | Tokens | Time |
|--------|--------|------|
| Traditional (view 5 files) | 6,700 | 2-3s |
| Context Engine (3 queries) | 1,530 | 12-15s |
| **Savings** | **77%** | **Worth it!** |

---

## 🛠️ Troubleshooting

### **System Not Running**

```bash
# Check ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Check Context Engine
curl http://localhost:3456/health

# Restart if needed
cd context-engine
chroma run --path ./db  # Terminal 1
npm start               # Terminal 2
```

### **Empty Results**

1. **Update index:** `npm run process-codebase ..`
2. **Refine query:** Add more specific terms
3. **Increase limit:** `"limit": 15`

### **Slow Queries (>30s)**

1. **Reduce limit:** `"limit": 5`
2. **Check ChromaDB is local** (not remote)
3. **Verify API key** in `.env`

---

## 📚 Complete Documentation

- **Full API Reference:** `contexts/CONTEXT_ENGINE_GUIDE.md`
- **Setup Instructions:** `contexts/SETUP_GUIDE.md`
- **Architecture Details:** See guide for system architecture

---

## 💡 Integration with Existing Workflow

### **Replace This Pattern:**

```bash
# ❌ Old way: Read multiple full files
view src/lib/services/additionals.service.ts
view src/lib/types/assessment.ts
view src/routes/(app)/work/additionals/+page.svelte
codebase-retrieval "additionals implementation"
# Result: ~6,700 tokens
```

### **With This Pattern:**

```bash
# ✅ New way: Targeted semantic queries
curl -X POST http://localhost:3456/api/context \
  -H "Content-Type: application/json" \
  -d '{"query": "additionals service methods types UI", "limit": 10}'
# Result: ~1,530 tokens (77% savings!)
```

---

## 🎯 Quick Start Checklist

- [ ] Start ChromaDB: `chroma run --path ./db`
- [ ] Start Context Engine: `npm start`
- [ ] Verify health: `curl http://localhost:3456/health`
- [ ] Run first query (see examples above)
- [ ] Update index after code changes: `npm run process-codebase ..`

---

**🚀 Ready to save 77% on tokens? Start querying!**

*For detailed technical documentation, see `contexts/CONTEXT_ENGINE_GUIDE.md`*

