/**
 * Supabase Edge Functions Operations
 *
 * Type-safe wrappers for Supabase Edge Functions including:
 * - Deploy edge functions
 * - List edge functions
 * - Function status monitoring
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import { formatProjectId, requiredString } from '../_shared/utils';
import type { EdgeFunction } from '../_shared/types';

/**
 * Deploy an Edge Function to Supabase project
 *
 * @param params - Deployment parameters
 * @param params.projectId - Supabase project ID
 * @param params.name - Function name
 * @param params.files - Files to deploy
 * @param params.entrypointPath - Entrypoint file (default: 'index.ts')
 * @param params.importMapPath - Import map file
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If deployment fails
 *
 * @example
 * ```typescript
 * await deployEdgeFunction({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   name: 'send-email',
 *   files: [
 *     {
 *       name: 'index.ts',
 *       content: `
 *         import { serve } from 'std/http/server.ts';
 *
 *         serve(async (req) => {
 *           const { to, subject, body } = await req.json();
 *
 *           // Send email logic here
 *
 *           return new Response(
 *             JSON.stringify({ success: true }),
 *             { headers: { 'Content-Type': 'application/json' } }
 *           );
 *         });
 *       `
 *     }
 *   ]
 * });
 * ```
 */
export async function deployEdgeFunction(params: {
  projectId: string;
  name: string;
  files: Array<{ name: string; content: string }>;
  entrypointPath?: string;
  importMapPath?: string;
}): Promise<void> {
  const projectId = formatProjectId(params.projectId);
  const name = requiredString(params.name, 'name');

  if (!params.files || params.files.length === 0) {
    throw new Error('At least one file is required');
  }

  await callMCPTool<void>('mcp__supabase__deploy_edge_function', {
    project_id: projectId,
    name,
    files: params.files,
    entrypoint_path: params.entrypointPath,
    import_map_path: params.importMapPath,
  });
}

/**
 * List all Edge Functions in project
 *
 * @param params - List parameters
 * @param params.projectId - Supabase project ID
 * @returns Array of Edge Function metadata
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If listing fails
 *
 * @example
 * ```typescript
 * const functions = await listEdgeFunctions({
 *   projectId: process.env.SUPABASE_PROJECT_ID!
 * });
 *
 * console.log('Edge Functions:', functions.map(f => f.name));
 *
 * for (const fn of functions) {
 *   console.log(`${fn.name} - v${fn.version} - ${fn.status}`);
 * }
 * ```
 */
export async function listEdgeFunctions(params: {
  projectId: string;
}): Promise<EdgeFunction[]> {
  const projectId = formatProjectId(params.projectId);

  return callMCPTool<EdgeFunction[]>('mcp__supabase__list_edge_functions', {
    project_id: projectId,
  });
}
