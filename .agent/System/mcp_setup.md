# MCP (Model Context Protocol) Setup

This document describes the MCP servers configured for ClaimTech development with Claude Code.

## What is MCP?

Model Context Protocol (MCP) is a standard for connecting AI assistants to external tools and services. It allows Claude to directly interact with platforms like Supabase, GitHub, and development tools.

---

## Configured MCP Servers

### Location
**Config File**: `C:\Users\Jcvdm\AppData\Roaming\Claude\claude_desktop_config.json`

### Active Servers

#### 1. Supabase MCP
**Purpose**: Direct database access and management

```json
"supabase": {
  "url": "https://mcp.supabase.com/mcp"
}
```

**Capabilities**:
- Query database directly
- Get schema information
- Verify RLS policies
- Manage tables and migrations
- Fetch project configuration

**Authentication**: OAuth (credentials stored in `~/.claude/.credentials.json`)

**Use Cases**:
- Verify Supabase skill documentation against actual database
- Query data during development
- Check RLS policy implementations
- Explore database schema

---

#### 2. GitHub MCP
**Purpose**: GitHub repository interactions

```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "***"
  }
}
```

**Capabilities**:
- Create issues and PRs
- Search code
- Read repository contents
- Manage branches

---

#### 3. Playwright MCP
**Purpose**: Browser automation and testing

```json
"@executeautomation-playwright-mcp-server": {
  "command": "npx",
  "args": ["-y", "@executeautomation/playwright-mcp-server"]
}
```

**Capabilities**:
- Run E2E tests
- Browser automation
- Screenshot capture

---

#### 4. Svelte MCP
**Purpose**: Svelte/SvelteKit development assistance

```json
"svelte": {
  "command": "npx",
  "args": ["-y", "@executeautomation/svelte-mcp-server"]
}
```

**Capabilities**:
- Svelte component patterns
- SvelteKit routing assistance
- Framework best practices

---

#### 5. Chrome DevTools MCP
**Purpose**: Browser debugging

```json
"chrome-devtools-mcp": {
  "command": "npx",
  "args": ["-y", "chrome-devtools-mcp@latest"]
}
```

---

#### 6. Context7 MCP
**Purpose**: Context management with Upstash

```json
"context7": {
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"]
}
```

---

## Using Supabase MCP

### After Setup

**IMPORTANT**: Restart Claude Desktop completely (quit and reopen) for the MCP server to load.

### Available Tools

Once configured, you'll have access to MCP tools like:
- `mcp__supabase__query` - Execute SQL queries
- `mcp__supabase__getTables` - List all tables
- `mcp__supabase__getSchema` - Get schema information
- `mcp__supabase__getPolicies` - View RLS policies
- And more...

### Example Usage

Ask Claude:
- "Show me all tables in the Supabase database"
- "Query the assessments table to verify the schema"
- "Check the RLS policies on the requests table"
- "Verify that the service patterns in the skill match the actual database"

---

## MCP Server Types

### Cloud-Hosted (URL-based)
Example: Supabase MCP

```json
"server-name": {
  "url": "https://mcp-server-url.com"
}
```

**Characteristics**:
- Hosted remotely
- Uses OAuth or token authentication
- No local installation needed

### NPM Package (Command-based)
Example: GitHub, Playwright, Svelte

```json
"server-name": {
  "command": "npx",
  "args": ["-y", "package-name"],
  "env": {
    "ENV_VAR": "value"
  }
}
```

**Characteristics**:
- Runs locally via npx
- Can use environment variables
- Downloaded on-demand

---

## Troubleshooting

### MCP Server Not Appearing

**Solution 1**: Restart Claude Desktop
1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. Check for MCP tools in chat

**Solution 2**: Verify Config Syntax
```bash
# Check JSON is valid
cat "$APPDATA/Claude/claude_desktop_config.json" | jq .
```

**Solution 3**: Check OAuth Credentials
```bash
# OAuth creds should be in this file
cat ~/.claude/.credentials.json
```

### Supabase MCP Authentication Issues

1. OAuth credentials should already be in `~/.claude/.credentials.json`
2. If missing, Claude will prompt for login on first use
3. Make sure you're logged into Supabase in your browser

### Testing MCP Connection

Ask Claude: "What MCP tools do you have available?"

You should see tools prefixed with `mcp__supabase__` in the response.

---

## Security Considerations

### Supabase MCP Security

⚠️ **IMPORTANT**: Supabase MCP is designed for **development and testing only**.

**Best Practices**:
1. Never connect to production databases
2. Use read-only mode when possible
3. Project scoping limits access to specific projects
4. OAuth provides secure authentication

### Token Storage

- GitHub token stored in config file (environment variable)
- Supabase OAuth tokens stored in `~/.claude/.credentials.json`
- Never commit config files with tokens to git

---

## Adding New MCP Servers

### Steps

1. Find the MCP server package or URL
2. Add entry to `claude_desktop_config.json`
3. Use appropriate format (URL-based or command-based)
4. Add environment variables if needed
5. Restart Claude Desktop
6. Test the connection

### Example: Adding a New MCP Server

```json
{
  "mcpServers": {
    "new-server": {
      "command": "npx",
      "args": ["-y", "@org/new-mcp-server"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Related Documentation

- [Supabase Development Skill](../../.claude/skills/supabase-development/SKILL.md) - Supabase patterns and templates
- [Project Architecture](./project_architecture.md) - Overall system architecture
- [Database Schema](./database_schema.md) - Complete database documentation

---

**Last Updated**: January 25, 2025
**Maintained By**: ClaimTech Development Team
