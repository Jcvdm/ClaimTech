/**
 * GitHub Search Operations
 *
 * Type-safe wrappers for GitHub search operations including:
 * - Search issues
 * - Search repositories
 * - Advanced search queries
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import { requiredString, formatPagination } from '../_shared/utils';
import type { Issue, SearchResults } from '../_shared/types';

/**
 * Search for issues across repositories
 *
 * @param params - Search parameters
 * @param params.query - Search query
 * @param params.owner - Filter to specific owner
 * @param params.repo - Filter to specific repo
 * @param params.page - Page number
 * @param params.perPage - Results per page
 * @returns Search results
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If search fails
 *
 * @example
 * ```typescript
 * // Search for open bugs assigned to me
 * const results = await searchIssues({
 *   query: 'is:open label:bug assignee:@me',
 *   owner: 'claimtech',
 *   repo: 'platform'
 * });
 *
 * console.log(`Found ${results.totalCount} bugs assigned to me`);
 *
 * for (const issue of results.items) {
 *   console.log(`#${issue.number}: ${issue.title}`);
 *   console.log(`  Created: ${issue.created_at}`);
 *   console.log(`  Labels: ${issue.labels.map(l => l.name).join(', ')}`);
 * }
 * ```
 */
export async function searchIssues(params: {
  query: string;
  owner?: string;
  repo?: string;
  page?: number;
  perPage?: number;
}): Promise<SearchResults<Issue>> {
  let query = requiredString(params.query, 'query');
  const { page, perPage } = formatPagination(params);

  // Add owner/repo to query if specified
  if (params.owner && params.repo) {
    query = `${query} repo:${params.owner}/${params.repo}`;
  } else if (params.owner) {
    query = `${query} user:${params.owner}`;
  }

  return callMCPTool<SearchResults<Issue>>('mcp__github__search_issues', {
    query,
    page,
    per_page: perPage,
  });
}
