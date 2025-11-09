/**
 * Supabase Server - Main Exports
 *
 * Type-safe wrappers for all Supabase MCP operations.
 *
 * @example
 * ```typescript
 * import { executeSQL, applyMigration, listProjects } from '/servers/supabase';
 *
 * // Execute query
 * const data = await executeSQL({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   query: 'SELECT * FROM assessments'
 * });
 *
 * // Apply migration
 * await applyMigration({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   name: 'add_comments_table',
 *   query: 'CREATE TABLE...'
 * });
 *
 * // List projects
 * const projects = await listProjects();
 * ```
 */

// Database operations
export {
  executeSQL,
  applyMigration,
  listTables,
  listMigrations,
  generateTypes,
} from './database';

// Project management
export { listProjects, getProject } from './projects';

// Edge Functions
export { deployEdgeFunction, listEdgeFunctions } from './functions';

// Branches
export { createBranch, listBranches } from './branches';
