# ClaimTech Documentation

**Project**: ClaimTech (SVA - SvelteKit Validation App)
**Last Updated**: January 31, 2025 (Bug #8 - SSE Streaming for Batch Document Generation)

---

## Project Overview

- **Frontend**: SvelteKit 5 + TypeScript + Tailwind CSS 4
- **Backend**: SvelteKit SSR + Supabase PostgreSQL
- **Auth**: Supabase Auth with 100% RLS coverage
- **Architecture**: Assessment-centric (10-stage pipeline)
- **Documentation**: 31 System docs, 19 SOPs, 31 database tables
- **Deployment**: ✅ Live on Vercel (https://claimtech.vercel.app)

---

## Quick Start

- **New to project?** → [Getting Started Guide](./README/index.md#getting-started)
- **Need specific info?** → [Master Index](./README/index.md)
- **How do I...?** → [Task Guides](./README/task_guides.md)
- **Architecture overview?** → [Architecture Quick Ref](./README/architecture_quick_ref.md)
- **Database info?** → [Database Quick Ref](./README/database_quick_ref.md)
- **What changed recently?** → [Changelog](./README/changelog.md)

---

## Documentation Categories

### 📚 [System Documentation](./README/system_docs.md)
Complete index of architecture, database, security, UI patterns, and bug postmortems (30 files).

### 📝 [Standard Operating Procedures](./README/sops.md)
Step-by-step guides for database operations, services, authentication, UI features, and debugging (19 files).

### 🎯 [Task Guides](./README/task_guides.md)
Use-case based navigation: "I want to add a feature", "I want to fix a bug", etc.

### ❓ [FAQ](./README/faq.md)
Common questions and troubleshooting.

---

## For AI Agents

### Quick Entry Points
- **research-analyst** → Start with [system_docs.md](./README/system_docs.md)
- **backend-api-dev** → Check [database_quick_ref.md](./README/database_quick_ref.md) + [Supabase MCP](#supabase-mcp-integration)
- **system-architect** → Read [architecture_quick_ref.md](./README/architecture_quick_ref.md)
- **implementation-coder** → Use [task_guides.md](./README/task_guides.md) + [sops.md](./README/sops.md)
- **code-quality-analyzer** → Review [system_docs.md](./README/system_docs.md) for standards
- **All agents** → See [Master Index](./README/index.md) for complete navigation

### Navigation Pattern (Context-Efficient)
1. **Start here** - Read this file (87 lines, ~150 tokens)
2. **Find category** - Read relevant index file (200-400 lines, ~600-800 tokens)
3. **Read document** - Access specific System/ or SOP/ file

**Context Savings**: 90-95% vs reading old 1,714-line README

---

## Supabase MCP Integration

Supabase MCP server is configured for direct database access during development:

**Capabilities**:
- Query tables and schemas via MCP tools
- Execute SQL directly for testing
- List all tables and relationships
- Apply migrations during development
- Verify RLS policies

**For backend-api-dev agent**: Use MCP for investigation and testing, not production code.

**Setup Guide**: [System/mcp_setup.md](./System/mcp_setup.md)

---

## Complete Navigation

**→ [Master Index](./README/index.md)** - Comprehensive navigation hub

---

*This README is intentionally lightweight (87 lines). For detailed information, navigate to specific documentation via the links above.*
