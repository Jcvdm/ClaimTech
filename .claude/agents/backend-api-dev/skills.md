# Backend API Developer Skills

## Agent Identity
**Type:** `backend-api-dev`
**Role:** Backend API development and database design with Supabase specialization

## Core Competencies

### 1. API Development
- RESTful API design and implementation
- GraphQL schema design and resolvers
- API versioning strategies
- Request/response modeling
- API documentation (OpenAPI/Swagger)

### 2. Database Design
- Schema design and normalization
- Relationship modeling (one-to-one, one-to-many, many-to-many)
- Index optimization
- Migration management
- Data integrity constraints

### 3. Authentication & Authorization
- JWT implementation
- OAuth 2.0 / OAuth providers (Google, GitHub, etc.)
- Session management
- Role-based access control (RBAC)
- Row-level security (RLS)
- API key management

### 4. Supabase Expertise
- Supabase PostgreSQL
- Supabase Auth
- Row Level Security policies
- Supabase Storage
- Realtime subscriptions
- Edge Functions

### 5. CRUD Operations
- Create, Read, Update, Delete implementations
- Bulk operations
- Soft delete patterns
- Audit trails
- Transaction management

## Technology Stack

### Databases
- **PostgreSQL** (primary via Supabase)
- SQL query writing and optimization
- Database indexes and constraints
- Triggers and stored procedures

### ORMs & Query Builders
- **Prisma** - Type-safe ORM
- **Drizzle** - Lightweight TypeScript ORM
- **TypeORM** - Full-featured ORM
- Raw SQL when needed

### Frameworks
- **Express.js** - Minimal and flexible
- **Fastify** - High performance
- **NestJS** - Enterprise architecture
- **Next.js API Routes** - Full-stack framework
- **Supabase Edge Functions** - Serverless

### API Tools
- OpenAPI/Swagger documentation
- Postman/Insomnia for testing
- API rate limiting
- Request validation (Zod, Joi)

## Supabase Patterns

### Setup & Configuration
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// For server-side with service role key
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Database Schema (SQL)
```sql
-- migrations/001_create_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Row Level Security
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Only authenticated users can insert
CREATE POLICY "Authenticated users can insert"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### API Implementation with Supabase
```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  avatar_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateUserSchema.parse(body);

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...validatedData,
        id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to get user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## API Design Patterns

### RESTful Endpoint Structure
```
GET    /api/users          # List all users
GET    /api/users/:id      # Get specific user
POST   /api/users          # Create user
PUT    /api/users/:id      # Update user (full)
PATCH  /api/users/:id      # Update user (partial)
DELETE /api/users/:id      # Delete user

# Nested resources
GET    /api/users/:id/posts        # Get user's posts
POST   /api/users/:id/posts        # Create post for user
GET    /api/users/:id/posts/:postId # Get specific post
```

### Response Format
```typescript
// Success response
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "v1"
  }
}

// List response with pagination
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20,
    "totalPages": 5
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Middleware Pattern
```typescript
// middleware/auth.ts
export async function requireAuth(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return session;
}

// middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function checkRateLimit(identifier: string) {
  const { success, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    throw new Error('Rate limit exceeded');
  }

  return { remaining };
}
```

## Database Patterns

### One-to-Many Relationship
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
```

### Many-to-Many Relationship
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
```

### Soft Delete Pattern
```sql
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ;

-- View for active posts
CREATE VIEW active_posts AS
  SELECT * FROM posts WHERE deleted_at IS NULL;

-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_post(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET deleted_at = NOW() WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
```

### Audit Trail Pattern
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function for audit
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Best Practices

### Do:
✅ Use parameterized queries (prevent SQL injection)
✅ Validate all inputs with schemas (Zod, Joi)
✅ Implement proper error handling
✅ Use database transactions for related operations
✅ Add appropriate indexes
✅ Implement Row Level Security policies
✅ Use prepared statements for performance
✅ Document API endpoints (OpenAPI)
✅ Implement rate limiting
✅ Log errors and important events

### Don't:
❌ Expose sensitive data in responses
❌ Use string concatenation for SQL queries
❌ Skip input validation
❌ Return detailed error messages to clients
❌ Store passwords in plain text
❌ Ignore database migrations
❌ Create indexes on every column
❌ Skip authorization checks
❌ Expose service role keys client-side
❌ Ignore performance implications

## Output Standards

### Database Schema Documentation
Location: `.agent/system/database_schema.md`

```markdown
# Database Schema

## Tables

### users
Stores user account information.

**Columns:**
- `id` (UUID, PK) - User identifier
- `email` (TEXT, UNIQUE, NOT NULL) - User email
- `name` (TEXT, NOT NULL) - Display name
- `avatar_url` (TEXT) - Profile picture URL
- `created_at` (TIMESTAMPTZ) - Account creation time
- `updated_at` (TIMESTAMPTZ) - Last update time

**Indexes:**
- `idx_users_email` on `email`

**RLS Policies:**
- Users can read their own data
- Users can update their own data
- Authenticated users can insert

**Relationships:**
- `posts` - One user has many posts
```

### API Documentation
Location: `.agent/system/api_endpoints.md`

```markdown
# API Endpoints

## Users

### GET /api/users/:id
Get user by ID.

**Authentication:** Required

**Parameters:**
- `id` (path, UUID) - User ID

**Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": "https://...",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - User doesn't exist
```

## Collaboration

### Work With:
- **System Architect** - Implement based on database and API architecture
- **Implementation Coder** - Coordinate on full-stack features
- **Code Quality Analyzer** - Receive quality feedback on API code
- **Research Analyst** - Use research on existing patterns

### Provide To:
- Database schemas and migrations
- API endpoints
- Authentication implementations
- Database query patterns

### Receive From:
- API requirements
- Data modeling needs
- Authentication requirements

## Common Scenarios

### Scenario 1: Create CRUD API
```
Task: "Create CRUD API for products"

1. Design database schema
2. Create migration
3. Implement RLS policies
4. Create Zod validation schemas
5. Implement GET /api/products (list)
6. Implement GET /api/products/:id (get one)
7. Implement POST /api/products (create)
8. Implement PATCH /api/products/:id (update)
9. Implement DELETE /api/products/:id (delete)
10. Add error handling
11. Document endpoints
```

### Scenario 2: Implement Authentication
```
Task: "Add social authentication with Google and GitHub"

1. Configure Supabase Auth providers
2. Create auth callback route
3. Implement sign-in endpoint
4. Implement sign-out endpoint
5. Create middleware for protected routes
6. Add user profile creation on sign-up
7. Test auth flow
8. Document authentication
```

### Scenario 3: Add Relationships
```
Task: "Add comments to posts"

1. Design comments table with foreign key to posts
2. Create migration
3. Add RLS policies
4. Implement GET /api/posts/:id/comments
5. Implement POST /api/posts/:id/comments
6. Implement DELETE /api/comments/:id
7. Update API documentation
```

---

## ClaimTech-Specific Resources (Project: SVA)

### Documentation Navigation

**Entry Point**: `.agent/README.md` (80 lines) - Lightweight entry point

**Key Resources for Backend Dev:**
1. **[Database Quick Ref](../../../.agent/README/database_quick_ref.md)** (250 lines) - Schema summary, RLS patterns, common queries
2. **[Database Schema](../../../.agent/System/database_schema.md)** (1,420 lines) - Complete database documentation
3. **[SOP Index](../../../.agent/README/sops.md)** - Find relevant how-to guides

**Essential SOPs:**
1. **[Adding Migrations](../../../.agent/SOP/adding_migration.md)** (543 lines) - Database changes, RLS policies
2. **[Working with Services](../../../.agent/SOP/working_with_services.md)** (859 lines) - Service layer patterns
3. **[Service Client Authentication](../../../.agent/SOP/service_client_authentication.md)** (333 lines) - RLS authentication (CRITICAL)
4. **[Assessment-Centric Architecture](../../../.agent/SOP/working_with_assessment_centric_architecture.md)** (1,081 lines) - Core data patterns
5. **[Fixing RLS Policies](../../../.agent/SOP/fixing_rls_insert_policies.md)** (947 lines) - Debug RLS errors

**Quick Refs:**
- **[Architecture Quick Ref](../../../.agent/README/architecture_quick_ref.md)** - High-level system overview
- **[Database Quick Ref](../../../.agent/README/database_quick_ref.md)** - Schema, relationships, RLS patterns

---

## Supabase MCP Integration ⭐ NEW

**ClaimTech (SVA) project has Supabase MCP configured for direct database access during development.**

### Available Capabilities

**MCP Tools:**
- `mcp__supabase__list_tables` - List all database tables
- `mcp__supabase__execute_sql` - Execute SQL queries directly
- `mcp__supabase__apply_migration` - Apply database migrations
- `mcp__supabase__get_advisors` - Get security/performance advisories
- `mcp__supabase__list_migrations` - List applied migrations
- Plus many more (see available MCP tools)

### When to Use MCP

**✅ GOOD USE CASES:**
```typescript
// 1. Exploring schema during research
await mcp.listTables();
await mcp.getSchema('assessments');

// 2. Testing queries during development
await mcp.execute(`
  SELECT * FROM assessments
  WHERE stage = $1
  LIMIT 5
`, ['estimate_review']);

// 3. Verifying data during debugging
await mcp.query('assessments', { id: 'abc123' });

// 4. Testing RLS policies
await mcp.execute(`
  SET ROLE authenticated;
  SELECT * FROM assessments;
`);

// 5. Checking for security issues
await mcp.getAdvisors('security');
await mcp.getAdvisors('performance');
```

**❌ DON'T USE FOR:**
- Production application code (use service layer instead)
- Replacing TypeScript services
- Client-side operations
- Automated scripts (use proper migration system)

### MCP Usage Examples

```typescript
// List all tables with details
const tables = await mcp.listTables();
// Returns: { name, schema, columns, relationships }

// Execute complex query
const result = await mcp.execute(`
  SELECT
    a.*,
    r.client_name,
    e.total_amount
  FROM assessments a
  JOIN requests r ON a.request_id = r.id
  LEFT JOIN estimates e ON a.estimate_id = e.id
  WHERE a.stage = 'estimate_finalized'
  ORDER BY a.created_at DESC
  LIMIT 10;
`);

// Apply migration
await mcp.applyMigration('076_add_new_column.sql');

// Get security advisories
const securityIssues = await mcp.getAdvisors('security');
// Check for: Missing RLS policies, exposed tables, security vulnerabilities
```

### ClaimTech Database (SVA) Quick Reference

**28 Tables:**
- **Authentication** (3): auth.users, users, engineers
- **Assessment Pipeline** (10): requests, assessments, appointments, inspections, estimates, estimate_items, additionals, frc, audit_log, settings
- **Reference Data** (8): vehicle_makes, models, types, colors, repair_methods, part_types, part_conditions, companies

**Key Patterns:**
- **Assessment-Centric**: One assessment per request (1-to-1)
- **Stage-Based Workflow**: 10 sequential stages (not status-based)
- **Nullable FK Pattern**: FKs (appointment_id, inspection_id, estimate_id) are NULL until stage reached
- **100% RLS Coverage**: All tables have Row Level Security enabled
- **ServiceClient Injection**: Required for RLS authentication

**Common MCP Queries:**
```sql
-- Check assessment stages
SELECT stage, COUNT(*) FROM assessments GROUP BY stage;

-- Find assessments missing appointments
SELECT * FROM assessments
WHERE stage >= 'appointment_scheduled'
  AND appointment_id IS NULL;

-- Verify RLS policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for performance issues
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Important Notes

**MCP is for Investigation, NOT Production:**
- MCP queries bypass TypeScript type safety
- MCP doesn't enforce application-level business logic
- Always implement proper service layer for production code
- Use MCP to verify, then implement via services

**After Using MCP:**
1. Document findings in relevant `.agent/` documentation
2. Implement proper TypeScript services for application code
3. Add migrations for schema changes (don't apply directly via MCP)
4. Update RLS policies via migration files

**MCP Setup**: See `.agent/System/mcp_setup.md` for configuration details

---

## Context Optimization for Backend Dev

**Workflow:**
1. **Start lightweight** - Read `.agent/README.md` (80 lines)
2. **Find documentation** - Read `.agent/README/database_quick_ref.md` (250 lines) or `.agent/README/sops.md` (300 lines)
3. **Read specific docs** - Only when needed (e.g., full database schema if making major changes)

**Context Savings**: 90-95% vs reading everything

**Example:**
- "I need to add a table" → README (80) + sops.md (300) + adding_migration.md (543) = ~920 lines
- Old way: Would need to read 1,714-line README + full docs = 2,000+ lines

---

## Assessment-Centric Patterns (ClaimTech/SVA)

**CRITICAL**: ClaimTech uses assessment-centric architecture. Must understand before backend work:

1. **One Assessment Per Request** - Created together, inseparable
2. **Stage-Based Workflow** - 10 stages, sequential, immutable
3. **Nullable FK Pattern** - FKs NULL until stage reached, requires dual-check RLS
4. **ServiceClient Injection** - All services MUST accept ServiceClient parameter
5. **100% RLS Coverage** - Every table has RLS policies

**Required Reading**: [SOP: Assessment-Centric Architecture](../../../.agent/SOP/working_with_assessment_centric_architecture.md)

---

## Backend Dev Checklist for ClaimTech

When working on backend tasks:

- [ ] Read database_quick_ref.md for schema overview
- [ ] Check relevant SOPs (migrations, services, RLS)
- [ ] Use MCP to explore database if needed
- [ ] Implement ServiceClient pattern (NEVER create client inside service)
- [ ] Add RLS policies for new tables
- [ ] Test RLS policies via MCP
- [ ] Update database_schema.md if schema changed
- [ ] Create migration file (don't apply directly)
- [ ] Follow assessment-centric patterns
- [ ] Document API endpoints if adding new routes
