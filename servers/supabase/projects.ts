/**
 * Supabase Project Management Operations
 *
 * Type-safe wrappers for Supabase project operations including:
 * - List all projects
 * - Get project details
 * - Project status monitoring
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import { requiredString } from '../_shared/utils';
import type { Project } from '../_shared/types';

/**
 * List all Supabase projects
 *
 * @returns Array of project metadata
 *
 * @throws {MCPExecutionError} If listing fails
 *
 * @example
 * ```typescript
 * const projects = await listProjects();
 *
 * for (const project of projects) {
 *   console.log(`${project.name} (${project.id}) - ${project.status}`);
 * }
 * ```
 */
export async function listProjects(): Promise<Project[]> {
  return callMCPTool<Project[]>('mcp__supabase__list_projects', {});
}

/**
 * Get details for a Supabase project
 *
 * @param params - Project parameters
 * @param params.id - Project ID
 * @returns Project details
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {NotFoundError} If project not found
 * @throws {MCPExecutionError} If retrieval fails
 *
 * @example
 * ```typescript
 * const project = await getProject({
 *   id: process.env.SUPABASE_PROJECT_ID!
 * });
 *
 * console.log('Project:', project.name);
 * console.log('Region:', project.region);
 * console.log('Status:', project.status);
 * console.log('Database Host:', project.database.host);
 * console.log('Database Version:', project.database.version);
 * ```
 */
export async function getProject(params: {
  id: string;
}): Promise<Project> {
  const id = requiredString(params.id, 'id');

  return callMCPTool<Project>('mcp__supabase__get_project', {
    id,
  });
}
