# Codex Quick Fix Guide ⚡

**Status**: Your Codex is working! ✅  
**Time to Fix**: 2 minutes

---

## 🎯 What You're Seeing

```
Failed to load c++ bson extension, using pure JS version
(node:2692) Warning: Accessing non-existent property 'padLevels'...
```

**Translation**: "I'm working fine, just some harmless warnings"

---

## ✅ Option 1: Verify It's Working (30 seconds)

**In your MINGW64 terminal, type:**

```bash
/help
```

**If you see help text** → Codex is working! ✅

```bash
/mcp
```

**If you see MCP servers** → Everything is connected! ✅

```bash
"hello"
```

**If you get a response** → Codex is fully functional! ✅

---

## 🚀 Option 2: Switch to PowerShell (1 minute)

**Better experience with no warnings:**

```powershell
# 1. Open Windows PowerShell or Windows Terminal
# 2. Run:
codex

# 3. No warnings, clean output ✅
```

---

## 🔧 Option 3: Rebuild Modules (2 minutes)

**If you want to eliminate warnings:**

```bash
# In MINGW64 or PowerShell:
npm rebuild

# Then reinstall:
npm uninstall -g @openai/codex
npm install -g @openai/codex

# Then run:
codex
```

---

## 📊 Decision Tree

```
Are you seeing warnings?
├─ YES
│  ├─ Does /help work?
│  │  ├─ YES → Codex is working! Use it as-is ✅
│  │  └─ NO → Try Option 3 (rebuild)
│  └─ Does /mcp show servers?
│     ├─ YES → Everything works! ✅
│     └─ NO → Try Option 3 (rebuild)
└─ NO → You're all set! ✅
```

---

## ✅ Verification Checklist

- [ ] Codex launches without crashing
- [ ] `/help` shows help text
- [ ] `/mcp` shows connected servers
- [ ] Simple prompts generate responses
- [ ] You can type and get output

**If all ✅**: Codex is working perfectly!

---

## 🎯 Recommended Action

### For Now
```bash
# Test that it works:
/help
/mcp
"hello"

# If all work → You're good to go! ✅
```

### For Better Experience
```powershell
# Switch to PowerShell
# Open Windows Terminal
# Run: codex

# No warnings, clean output ✅
```

---

## 📞 Need Help?

- **Warnings are harmless**: Safe to ignore
- **Codex is working**: Despite the warnings
- **Best shell**: PowerShell or Windows Terminal
- **Worst shell**: MINGW64 (but still works)

---

## 🎉 Bottom Line

**Your Codex is working correctly!** ✅

The warnings are expected and harmless. You can:
1. Keep using MINGW64 (warnings are OK)
2. Switch to PowerShell (no warnings)
3. Rebuild modules (eliminates warnings)

**Recommendation**: Switch to PowerShell for cleaner output.

---

**Status**: ✅ READY TO USE

Next: Try `codex "Create a SvelteKit component"`

