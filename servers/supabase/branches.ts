/**
 * Supabase Branch Operations
 *
 * Type-safe wrappers for Supabase development branches including:
 * - Create development branches
 * - List branches
 * - Branch status monitoring
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import { formatProjectId, requiredString } from '../_shared/utils';
import type { Branch } from '../_shared/types';

/**
 * Create a development branch on Supabase project
 *
 * @param params - Branch creation parameters
 * @param params.projectId - Supabase project ID
 * @param params.name - Branch name (default: 'develop')
 * @param params.confirmCostId - Cost confirmation ID from confirmCost()
 * @returns Branch details with new project_id
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If creation fails
 *
 * @example
 * ```typescript
 * const branch = await createBranch({
 *   projectId: process.env.SUPABASE_PROJECT_ID!,
 *   name: 'feature-comments',
 *   confirmCostId: 'cost_123456'
 * });
 *
 * console.log('Branch created with project ID:', branch.project_id);
 * console.log('Branch status:', branch.status);
 * ```
 */
export async function createBranch(params: {
  projectId: string;
  name?: string;
  confirmCostId: string;
}): Promise<Branch> {
  const projectId = formatProjectId(params.projectId);
  const confirmCostId = requiredString(params.confirmCostId, 'confirmCostId');

  return callMCPTool<Branch>('mcp__supabase__create_branch', {
    project_id: projectId,
    name: params.name,
    confirm_cost_id: confirmCostId,
  });
}

/**
 * List all development branches
 *
 * @param params - List parameters
 * @param params.projectId - Supabase project ID
 * @returns Array of branch details
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If listing fails
 *
 * @example
 * ```typescript
 * const branches = await listBranches({
 *   projectId: process.env.SUPABASE_PROJECT_ID!
 * });
 *
 * for (const branch of branches) {
 *   console.log(`${branch.name} - ${branch.status}`);
 *   console.log(`  Project ID: ${branch.project_id}`);
 *   console.log(`  Created: ${branch.created_at}`);
 * }
 * ```
 */
export async function listBranches(params: {
  projectId: string;
}): Promise<Branch[]> {
  const projectId = formatProjectId(params.projectId);

  return callMCPTool<Branch[]>('mcp__supabase__list_branches', {
    project_id: projectId,
  });
}
