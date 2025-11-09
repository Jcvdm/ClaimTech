/**
 * Supabase Database Operations
 *
 * Type-safe wrappers for Supabase database operations including:
 * - Raw SQL execution
 * - Database migrations
 * - Schema introspection
 * - TypeScript type generation
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import { formatProjectId, requiredString } from '../_shared/utils';
import type { SQLResult, TableInfo, Migration } from '../_shared/types';

/**
 * Execute raw SQL query on Supabase database
 *
 * @param params - Query parameters
 * @param params.projectId - Supabase project ID
 * @param params.query - SQL query to execute
 * @returns Array of query result rows
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If query execution fails
 *
 * @example
 * ```typescript
 * // Simple query
 * const assessments = await executeSQL({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   query: 'SELECT * FROM assessments WHERE stage = $1'
 * });
 *
 * // Query with JOIN
 * const enriched = await executeSQL({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   query: `
 *     SELECT a.*, c.client_name, e.name as engineer_name
 *     FROM assessments a
 *     LEFT JOIN claims c ON a.claim_id = c.id
 *     LEFT JOIN engineers e ON a.engineer_id = e.id
 *     WHERE a.stage = 'completed'
 *   `
 * });
 *
 * // Aggregate query
 * const stats = await executeSQL({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   query: `
 *     SELECT
 *       stage,
 *       COUNT(*) as count,
 *       AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
 *     FROM assessments
 *     GROUP BY stage
 *   `
 * });
 * ```
 */
export async function executeSQL(params: {
  projectId: string;
  query: string;
}): Promise<SQLResult[]> {
  const projectId = formatProjectId(params.projectId);
  const query = requiredString(params.query, 'query');

  return callMCPTool<SQLResult[]>('mcp__supabase__execute_sql', {
    project_id: projectId,
    query,
  });
}

/**
 * Apply a database migration to Supabase project
 *
 * @param params - Migration parameters
 * @param params.projectId - Supabase project ID
 * @param params.name - Migration name in snake_case
 * @param params.query - SQL migration query
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If migration fails
 *
 * @example
 * ```typescript
 * await applyMigration({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   name: 'add_comments_table',
 *   query: `
 *     -- Create comments table
 *     CREATE TABLE IF NOT EXISTS comments (
 *       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *       assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
 *       user_id UUID REFERENCES auth.users(id),
 *       content TEXT NOT NULL,
 *       created_at TIMESTAMPTZ DEFAULT NOW(),
 *       updated_at TIMESTAMPTZ DEFAULT NOW()
 *     );
 *
 *     -- Add RLS policies
 *     ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
 *
 *     CREATE POLICY "Users can view comments on their assessments"
 *       ON comments FOR SELECT
 *       USING (
 *         EXISTS (
 *           SELECT 1 FROM assessments a
 *           WHERE a.id = comments.assessment_id
 *           AND a.company_id = auth.jwt()->>'company_id'::uuid
 *         )
 *       );
 *
 *     -- Add indexes
 *     CREATE INDEX idx_comments_assessment_id ON comments(assessment_id);
 *     CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
 *   `
 * });
 * ```
 */
export async function applyMigration(params: {
  projectId: string;
  name: string;
  query: string;
}): Promise<void> {
  const projectId = formatProjectId(params.projectId);
  const name = requiredString(params.name, 'name');
  const query = requiredString(params.query, 'query');

  await callMCPTool<void>('mcp__supabase__apply_migration', {
    project_id: projectId,
    name,
    query,
  });
}

/**
 * List all tables in specified schemas
 *
 * @param params - List parameters
 * @param params.projectId - Supabase project ID
 * @param params.schemas - Schemas to list tables from (default: ['public'])
 * @returns Array of table metadata
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If listing fails
 *
 * @example
 * ```typescript
 * // List tables in public schema
 * const tables = await listTables({
 *   projectId: process.env.SUPABASE_PROJECT_ID!
 * });
 *
 * console.log('Tables:', tables.map(t => t.name));
 *
 * // List tables in multiple schemas
 * const allTables = await listTables({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   schemas: ['public', 'auth', 'storage']
 * });
 * ```
 */
export async function listTables(params: {
  projectId: string;
  schemas?: string[];
}): Promise<TableInfo[]> {
  const projectId = formatProjectId(params.projectId);

  return callMCPTool<TableInfo[]>('mcp__supabase__list_tables', {
    project_id: projectId,
    schemas: params.schemas ?? ['public'],
  });
}

/**
 * List all migrations in database
 *
 * @param params - List parameters
 * @param params.projectId - Supabase project ID
 * @returns Array of migration metadata
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If listing fails
 *
 * @example
 * ```typescript
 * const migrations = await listMigrations({
 *   projectId: process.env.SUPABASE_PROJECT_ID!
 * });
 *
 * console.log('Applied migrations:', migrations.map(m => m.name));
 * ```
 */
export async function listMigrations(params: {
  projectId: string;
}): Promise<Migration[]> {
  const projectId = formatProjectId(params.projectId);

  return callMCPTool<Migration[]>('mcp__supabase__list_migrations', {
    project_id: projectId,
  });
}

/**
 * Generate TypeScript types from database schema
 *
 * @param params - Generation parameters
 * @param params.projectId - Supabase project ID
 * @returns TypeScript type definitions as string
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If generation fails
 *
 * @example
 * ```typescript
 * import { writeFile } from 'fs/promises';
 *
 * const types = await generateTypes({
 *   projectId: process.env.SUPABASE_PROJECT_ID!
 * });
 *
 * // Write to file
 * await writeFile('src/lib/types/database.types.ts', types);
 * console.log('Types generated successfully');
 * ```
 */
export async function generateTypes(params: {
  projectId: string;
}): Promise<string> {
  const projectId = formatProjectId(params.projectId);

  return callMCPTool<string>('mcp__supabase__generate_typescript_types', {
    project_id: projectId,
  });
}
