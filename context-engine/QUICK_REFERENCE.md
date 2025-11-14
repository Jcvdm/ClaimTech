# Context Engine V2 - Quick Reference Card

## 🚀 Basic Usage

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

**Saves 67-77% tokens vs `view` tool!**

---

## 📝 Query Examples

```bash
# Before editing
"additionals service approve decline reverse methods"
"FRC line item type definition with status fields"

# Finding downstream
"calls to approveLineItem usage references imports"

# Learning patterns
"finalize workflow status change audit logging pattern"
```

**Tips:** Include feature names, technical terms, action verbs, file types

---

## 🎯 Using Response

### 1. `agentView.primary` ⭐ MOST IMPORTANT
Top 3-5 code chunks ready for your system prompt.

### 2. `agentView.secondary`
5 additional context summaries with file paths.

### 3. `agentView.reference.files`
List of all related files for navigation.

### 4. `recommendations`
AI-generated best practices for your implementation.

---

## ⚙️ Parameters

| Parameter | Default | Options |
|-----------|---------|---------|
| `strategy` | `"auto"` | `"minimal"` (L1 only), `"auto"` (L1+L2+L3), `"architectural"` (all layers) |
| `maxTokens` | `3000` | `2000-5000` |
| `limit` | `10` | `5-15` |
| `intent` | - | `"pre-edit-gathering"`, `"finding-downstream"`, `"learning-patterns"`, `"debugging"` |

---

## 🔄 Workflow

1. **Context Gathering** → Query Context Engine
2. **Planning** → Use `agentView.primary` in prompt
3. **Implementation** → Use `agentView.reference.files` to know which files to edit
4. **Completeness Check** → Query again for downstream changes

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Empty results | More specific query, increase `limit` |
| Too many results | More specific query, reduce `limit`, use `"minimal"` |
| Slow (>30s) | Reduce `limit` to 5-8, reduce `maxTokens` to 2000 |
| Not running | `cd context-engine && npm start` |

---

## 📊 Performance

- **Token Savings:** 67-77%
- **Response Time:** 15-30s
- **Documents:** 500 chunks
- **Model:** Qwen3 Coder (480B MoE)

---

**📚 Full Guide:** [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md)

