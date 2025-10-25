# Claude Skills Research - Key Findings

## What I Discovered

### 1. Skills Are Simpler Than Expected
Skills are just markdown files with YAML frontmatter. No complex setup, no special formats. Just:
```yaml
---
name: Skill Name
description: What it does and when to use
---
# Instructions in markdown
```

### 2. Progressive Disclosure is Key
Skills use a 3-level loading system:
1. **Metadata** (name/description) - loaded at startup (~30-50 tokens)
2. **SKILL.md content** - loaded when skill is relevant
3. **Additional files** - loaded only when specifically needed

This means you can have many skills without token bloat!

### 3. Auto-Invocation is Powerful
Claude decides when to use skills automatically based on:
- Task context
- Skill description keywords
- Query patterns

You don't manually select skills - Claude figures it out.

### 4. Location Matters
**Claude Code uses filesystem-based skills:**
- Personal: `~/.claude/skills/` (all projects)
- Project: `.claude/skills/` (specific project)

**NOT the same as:**
- Claude.ai (web) - uses .zip uploads
- Claude Desktop - uses .zip uploads
- Claude API - uses multiple formats

### 5. Skills vs MCP
**Skills are winning because they're:**
- Simpler (just markdown)
- More efficient (progressive loading)
- Portable (work with any model)
- Composable (auto-combine)

**MCP is:**
- Complex (protocol spec)
- Token-heavy (loads everything)
- Claude-specific
- Harder to maintain

### 6. Official Examples Exist
Anthropic provides production skills:
- docx, pdf, pptx, xlsx (document skills)
- Multiple examples in github.com/anthropics/skills
- These power Claude's document features

### 7. Executable Code Allowed
Skills can include:
- Python scripts
- JavaScript/Node scripts
- Any executable in the environment
- Claude can run these when skill is active

### 8. Community Growth
Already seeing:
- Skill marketplace emerging
- Conversion tools (docs → skills)
- Creative applications (art, music, testing)
- Enterprise workflows (branding, comms)

---

## What Makes a Good Skill

### Description is Critical
Must include:
- What the skill does
- When to use it (trigger keywords)
- Be specific about use cases

**Good:**
```yaml
description: Extract text and tables from PDFs, fill forms, merge documents. Use when working with PDF files or when user mentions PDFs, forms, or document extraction.
```

**Bad:**
```yaml
description: A skill for working with documents.
```

### Keep SKILL.md Lean
- Core instructions only
- Move details to resources/
- Reference files explicitly
- Claude loads on-demand

### Provide Examples
- Show inputs/outputs
- Good vs bad patterns
- Common use cases

### Add Quality Checklists
- Verification criteria
- Common pitfalls
- Success metrics

---

## Structure Best Practices

### Recommended Organization
```
skill-name/
├── SKILL.md              # Core instructions (keep lean)
├── resources/            # Optional supporting files
│   ├── templates.md      # Templates/examples
│   ├── reference.md      # Detailed reference
│   └── patterns.md       # Common patterns
└── scripts/              # Optional executable code
    └── helper.py         # Utility scripts
```

### SKILL.md Structure
```markdown
---
name: Skill Name
description: Clear description with trigger keywords
---

# Skill Name

## Overview
[What this skill does]

## When to Use
- Trigger 1
- Trigger 2

## Workflows

### Workflow 1: [Name]
**When:** [Conditions]
**Time:** [Estimate]
**Steps:**
1. Step 1
2. Step 2

**Output:** [Format]

**Quality Checks:**
- [ ] Check 1
- [ ] Check 2

---

[Additional workflows...]

---

## Best Practices
[Guidelines]

## Success Criteria
[How to know it worked]
```

---

## Integration Patterns

### With Documentation System
Skills complement .agent/ folder:
```
Skills → Provide methodology (HOW)
.agent/ → Provide context (WHAT/WHERE)

Together = Comprehensive system
```

### With Agents
Skills can enhance agents:
```
Agent → Domain expertise
Skill → Systematic workflow

Example: Supabase Agent + Security Audit Skill
= Expert implementation with security methodology
```

### With MCP
Skills can work with MCP:
```
Skill → Instructions for using MCP server
MCP → External tool/data access

Example: API skill that uses MCP for auth
```

---

## Common Patterns

### Pattern 1: Multi-Workflow Skills
```markdown
# Skill with multiple workflows

## Quick Workflow (5 min)
[Simple cases]

## Standard Workflow (15 min)
[Normal cases]

## Deep Workflow (30+ min)
[Complex cases]
```

### Pattern 2: Progressive Detail
```markdown
# SKILL.md (lean)
Core instructions + references

# resources/reference.md
Detailed information

# resources/examples.md
Concrete examples
```

### Pattern 3: Executable Enhancement
```markdown
# SKILL.md
Instructions + script references

# scripts/extract.py
Python utility for extraction

Claude can run: python scripts/extract.py input.pdf
```

---

## Token Economics

### Efficiency Example
10 skills installed:
- Without progressive disclosure: ~10,000 tokens
- With progressive disclosure: 300-500 tokens (until used)

This is why skills scale well!

### Loading Behavior
```
Startup: Load metadata (30-50 tokens per skill)
↓
Relevant task: Load SKILL.md content
↓
Specific need: Load referenced files
↓
Never load: Irrelevant files stay on disk
```

---

## Security Considerations

### Skills Execute Code
- Can run Python/JavaScript
- Has filesystem access
- Can call external tools

### Best Practices
- Only use trusted skills
- Review before installing
- Don't hardcode secrets
- Use MCP for external services

### From Anthropic
> "Skills give Claude code execution capabilities. While powerful, it means being mindful about which skills you use—stick to trusted sources to keep your data safe."

---

## Real-World Applications

### From Documentation
- **Box Integration:** Transform files to presentations/spreadsheets
- **Notion Integration:** Faster question→action workflows
- **Canva Integration:** Custom agents for design
- **Finance:** Management accounting automation

### Community Examples
- Testing web apps (Playwright integration)
- Generating MCP servers
- Creating algorithmic art
- Brand guideline enforcement
- Internal communications

---

## Comparison: Skills vs Alternatives

### Skills vs System Prompts
**Skills:**
- Loaded on-demand
- Composable
- Versioned
- Shareable

**System Prompts:**
- Always loaded
- Monolithic
- Hard to version
- Not reusable

### Skills vs Tools/Functions
**Skills:**
- Instructions for complex workflows
- Multi-step processes
- Decision trees

**Tools/Functions:**
- Single atomic operations
- Direct execution
- Simple inputs/outputs

### Skills vs RAG
**Skills:**
- Deterministic loading
- Structured instructions
- Executable code

**RAG:**
- Semantic search
- Unstructured knowledge
- Retrieval-based

---

## Future Directions

### From Anthropic
> "We're working toward simplified skill creation workflows and enterprise-wide deployment capabilities, making it easier for organizations to distribute skills across teams."

### Expected Evolution
- Better skill creation UI
- Marketplace expansion
- Enterprise management
- Cross-model compatibility

### Simon Willison's Take
> "I expect we'll see a Cambrian explosion in Skills which will make this year's MCP rush look pedestrian by comparison."

---

## Key Takeaways

1. **Skills are simple** - Just markdown with frontmatter
2. **Progressive disclosure** - Only load what's needed
3. **Auto-invocation** - Claude decides when to use
4. **Highly composable** - Skills work together
5. **Token efficient** - 30-50 tokens until used
6. **Executable code** - Can run scripts
7. **Cross-platform** - Same format everywhere (packaging differs)
8. **Growing ecosystem** - Already seeing rapid adoption

---

## Practical Recommendations

### Start With
1. Create 3 core skills (research, code-review, api-design)
2. Test with relevant queries
3. Observe when/how Claude uses them
4. Iterate based on usage

### Then Expand
1. Add project-specific skills
2. Include resources/ folders
3. Add scripts/ for automation
4. Share with team

### Best Practices
1. Keep descriptions clear with keywords
2. Keep SKILL.md lean
3. Use progressive disclosure
4. Provide quality checklists
5. Include concrete examples
6. Version as you iterate

---

## Resources

### Official
- Docs: https://docs.claude.com/en/docs/claude-code/skills
- GitHub: https://github.com/anthropics/skills
- Blog: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

### Community
- Awesome Skills: https://github.com/travisvn/awesome-claude-skills
- Skill Converters: yusufkaraaslan/Skill_Seekers

### Examples
- Document skills (docx, pdf, pptx, xlsx)
- MCP builder skill
- Testing skills (Playwright)
- Creative skills (art, design)

---

## Conclusion

Skills represent a fundamental shift in how we extend AI capabilities:
- **Simpler** than complex protocols
- **More efficient** than always-loaded prompts
- **More powerful** than single tools
- **More portable** than platform-specific features

They're the right abstraction at the right time - powerful enough for production use, simple enough for anyone to create.

**The future of AI workflows will be skill-based.**