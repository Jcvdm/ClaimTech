/**
 * GitHub Issue Operations
 *
 * Type-safe wrappers for GitHub issue operations including:
 * - Create issues
 * - List issues
 * - Update issues
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import { formatRepo, requiredString, formatPagination, oneOf } from '../_shared/utils';
import type { Issue } from '../_shared/types';

/**
 * Create a new issue
 *
 * @param params - Issue creation parameters
 * @param params.owner - Repository owner
 * @param params.repo - Repository name
 * @param params.title - Issue title
 * @param params.body - Issue description
 * @param params.labels - Labels to apply
 * @param params.assignees - Usernames to assign
 * @returns Issue details
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If creation fails
 *
 * @example
 * ```typescript
 * const issue = await createIssue({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   title: 'Add support for bulk photo labeling',
 *   body: `
 * ## Description
 * Add ability to label multiple photos at once.
 *
 * ## Acceptance Criteria
 * - [ ] Select multiple photos
 * - [ ] Apply label to all selected
 * - [ ] Update optimistically
 *   `,
 *   labels: ['enhancement', 'photos'],
 *   assignees: ['jcvdm']
 * });
 *
 * console.log('Issue created:', issue.html_url);
 * console.log('Issue number:', issue.number);
 * ```
 */
export async function createIssue(params: {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}): Promise<Issue> {
  const { owner, repo } = formatRepo(params.owner, params.repo);
  const title = requiredString(params.title, 'title');

  return callMCPTool<Issue>('mcp__github__create_issue', {
    owner,
    repo,
    title,
    body: params.body,
    labels: params.labels,
    assignees: params.assignees,
  });
}

/**
 * List issues in repository
 *
 * @param params - List parameters
 * @param params.owner - Repository owner
 * @param params.repo - Repository name
 * @param params.state - Filter by state
 * @param params.labels - Filter by labels
 * @param params.perPage - Results per page
 * @param params.after - Cursor for pagination
 * @returns Array of issues
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If listing fails
 *
 * @example
 * ```typescript
 * const issues = await listIssues({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   state: 'OPEN',
 *   labels: ['bug'],
 *   perPage: 20
 * });
 *
 * console.log(`${issues.length} open bugs`);
 *
 * for (const issue of issues) {
 *   console.log(`#${issue.number}: ${issue.title}`);
 *   console.log(`  Labels: ${issue.labels.map(l => l.name).join(', ')}`);
 * }
 * ```
 */
export async function listIssues(params: {
  owner: string;
  repo: string;
  state?: 'OPEN' | 'CLOSED';
  labels?: string[];
  perPage?: number;
  after?: string;
}): Promise<Issue[]> {
  const { owner, repo } = formatRepo(params.owner, params.repo);

  let state: 'OPEN' | 'CLOSED' | undefined;
  if (params.state) {
    state = oneOf(params.state, ['OPEN', 'CLOSED'] as const, 'state');
  }

  return callMCPTool<Issue[]>('mcp__github__list_issues', {
    owner,
    repo,
    state,
    labels: params.labels,
    per_page: params.perPage,
    after: params.after,
  });
}
