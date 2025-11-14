# Context Engine V2 - Agent Prompt Snippet

Copy this into your agent's system prompt or instructions:

---

## Context Gathering Instructions

**BEFORE making any code changes, use the Context Engine V2 to gather relevant context efficiently.**

### How to Use

```bash
curl -X POST http://localhost:3457/api/context \
  -H "Content-Type: application/json" \
  -d '{
    "query": "DESCRIBE_WHAT_YOU_ARE_LOOKING_FOR",
    "intent": "pre-edit-gathering",
    "limit": 10,
    "strategy": "auto",
    "maxTokens": 3000
  }'
```

### Query Construction

**Good queries include:**
- Feature names: "additionals workflow", "FRC approval"
- Technical terms: "service methods", "type definition", "RLS policy"
- Action verbs: "create", "update", "approve", "decline"
- File types: "service", "component", "utility"

**Examples:**
```
✅ "additionals service approve decline reverse methods"
✅ "FRC line item type definition with status fields"
✅ "assessment finalize workflow audit logging pattern"
✅ "calls to updateStatus usage references imports"
```

### Using the Response

1. **`agentView.primary`** - Most important! Drop this into your context/system prompt
2. **`agentView.secondary`** - Scan for additional relevant files
3. **`agentView.reference.files`** - List of files to potentially edit
4. **`recommendations`** - AI-generated best practices

### Workflow

1. **Context Gathering** - Query Context Engine with your task description
2. **Planning** - Include `agentView.primary` in your planning context
3. **Implementation** - Use `agentView.reference.files` to know which files to edit
4. **Completeness Check** - Query again with "calls to {function_name} usage imports" to find downstream changes

### Benefits

- **67-77% token savings** compared to using `view` on multiple files
- **Multi-hop reasoning** automatically follows dependencies and finds downstream usages
- **Layered context** with token budget enforcement (L1/L2/L3)
- **AI insights** explaining why each context matters

### Parameters

- `strategy`: `"minimal"` (quick), `"auto"` (balanced, recommended), `"architectural"` (comprehensive)
- `maxTokens`: `2000-5000` (default: 3000)
- `limit`: `5-15` (default: 10, higher = broader search)
- `intent`: `"pre-edit-gathering"`, `"finding-downstream"`, `"learning-patterns"`, `"debugging"`

---

**Full Documentation:** See `context-engine/AGENT_INSTRUCTIONS.md` for complete guide.

**Quick Reference:** See `context-engine/QUICK_REFERENCE.md` for one-page cheat sheet.

