# Codex vs Context Engine - Comparison & Integration

**Date**: November 21, 2025  
**Purpose**: Understand when to use each tool  
**Status**: Complete

---

## 🎯 Quick Comparison

| Aspect | Codex | Context Engine |
|--------|-------|-----------------|
| **Purpose** | Code generation agent | Context retrieval system |
| **Type** | Agentic AI | Embedding-based search |
| **Input** | Natural language prompts | Technical queries |
| **Output** | Code, explanations, fixes | Relevant code snippets |
| **Speed** | 1-5 minutes | 15-30 seconds |
| **Token Efficiency** | Moderate | 67-77% savings |
| **MCP Support** | ✅ Full | ✅ Full |
| **Best For** | Generation, fixing, testing | Understanding, planning |

---

## 🔄 Workflow Integration

### Phase 1: Understand (Context Engine)
```
Query: "additionals service approve decline methods"
→ Get relevant code snippets
→ Understand existing patterns
```

### Phase 2: Generate (Codex)
```
Prompt: "Based on the additionals service pattern, 
         implement a new reversal method"
→ Codex generates code
→ Uses MCP servers for context
```

### Phase 3: Test (Codex + Context Engine)
```
Codex: "Generate unit tests for reversal method"
Context Engine: "Find similar test patterns"
```

---

## 💡 When to Use Each

### Use Context Engine When:
✅ Need to understand existing code  
✅ Finding downstream changes  
✅ Learning architectural patterns  
✅ Gathering pre-edit context  
✅ Analyzing code relationships  

### Use Codex When:
✅ Generating new code  
✅ Fixing bugs  
✅ Creating tests  
✅ Refactoring components  
✅ Writing documentation  
✅ Automating tasks  

---

## 🚀 Recommended Workflow

### For Feature Implementation
1. **Context Engine** → Gather context on existing patterns
2. **Codex** → Generate new component/service
3. **Context Engine** → Find all downstream changes
4. **Codex** → Generate tests and documentation

### For Bug Fixing
1. **Context Engine** → Understand bug location and context
2. **Codex** → Generate fix with explanation
3. **Codex** → Generate test to verify fix
4. **Context Engine** → Find all affected code

### For Refactoring
1. **Context Engine** → Understand current implementation
2. **Codex** → Generate refactored version
3. **Context Engine** → Find all usages
4. **Codex** → Update all call sites

---

## 🔌 MCP Integration

Both tools support MCPs:

**Codex MCPs**:
- Context7 (documentation)
- GitHub (repo management)
- Playwright (browser automation)
- Chrome DevTools (debugging)
- Supabase (database)

**Context Engine MCPs**:
- Same servers available
- Automatic context gathering
- Multi-hop search

---

## 📊 Token Efficiency

### Context Engine
- 67-77% token savings
- 829 indexed documents
- Fast retrieval (15-30s)
- Best for pre-planning

### Codex
- Moderate token usage
- Full code generation
- Slower (1-5 min)
- Best for implementation

---

## 🎓 Learning Path

1. **Start**: Context Engine for understanding
2. **Explore**: Codex for simple generation
3. **Master**: Combined workflow for complex tasks
4. **Optimize**: Use MCPs to extend both tools

---

## 📚 Related Documentation

- **Codex Setup**: `.agent/System/codex_setup.md`
- **Context Engine**: `context-engine/AGENT_INSTRUCTIONS.md`
- **MCP Setup**: `.agent/System/mcp_setup.md`

---

**Recommendation**: Use Context Engine first to understand code, then Codex to generate solutions.

