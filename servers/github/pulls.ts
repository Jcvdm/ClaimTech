/**
 * GitHub Pull Request Operations
 *
 * Type-safe wrappers for GitHub pull request operations including:
 * - Create pull requests
 * - List pull requests
 * - Merge pull requests
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import { formatRepo, requiredString, formatPagination, oneOf } from '../_shared/utils';
import type { PullRequest } from '../_shared/types';

/**
 * Create a new pull request
 *
 * @param params - PR creation parameters
 * @param params.owner - Repository owner
 * @param params.repo - Repository name
 * @param params.title - PR title
 * @param params.head - Branch containing changes
 * @param params.base - Branch to merge into
 * @param params.body - PR description
 * @param params.draft - Create as draft
 * @returns Pull request details
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If creation fails
 *
 * @example
 * ```typescript
 * const pr = await createPR({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   title: 'feat: add comments feature',
 *   head: 'feature/comments',
 *   base: 'dev',
 *   body: `
 * ## Summary
 * - Adds CommentService for managing comments
 * - Implements inline comment UI
 * - Adds RLS policies for comments table
 *
 * ## Test Plan
 * - [ ] Test comment creation
 * - [ ] Test comment editing
 * - [ ] Test comment deletion
 * - [ ] Verify RLS policies
 *   `
 * });
 *
 * console.log('PR created:', pr.html_url);
 * console.log('PR number:', pr.number);
 * ```
 */
export async function createPR(params: {
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
}): Promise<PullRequest> {
  const { owner, repo } = formatRepo(params.owner, params.repo);
  const title = requiredString(params.title, 'title');
  const head = requiredString(params.head, 'head');
  const base = requiredString(params.base, 'base');

  return callMCPTool<PullRequest>('mcp__github__create_pull', {
    owner,
    repo,
    title,
    head,
    base,
    body: params.body,
    draft: params.draft,
  });
}

/**
 * List pull requests in repository
 *
 * @param params - List parameters
 * @param params.owner - Repository owner
 * @param params.repo - Repository name
 * @param params.state - Filter by state (default: 'open')
 * @param params.page - Page number
 * @param params.perPage - Results per page
 * @returns Array of pull requests
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If listing fails
 *
 * @example
 * ```typescript
 * // Get all open PRs
 * const openPRs = await listPRs({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   state: 'open'
 * });
 *
 * console.log(`${openPRs.length} open PRs`);
 *
 * // Get recently closed PRs
 * const closedPRs = await listPRs({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   state: 'closed',
 *   perPage: 10
 * });
 * ```
 */
export async function listPRs(params: {
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
  page?: number;
  perPage?: number;
}): Promise<PullRequest[]> {
  const { owner, repo } = formatRepo(params.owner, params.repo);
  const { page, perPage } = formatPagination(params);

  let state: 'open' | 'closed' | 'all' = 'open';
  if (params.state) {
    state = oneOf(params.state, ['open', 'closed', 'all'] as const, 'state');
  }

  return callMCPTool<PullRequest[]>('mcp__github__list_pulls', {
    owner,
    repo,
    state,
    page,
    per_page: perPage,
  });
}

/**
 * Merge a pull request
 *
 * @param params - Merge parameters
 * @param params.owner - Repository owner
 * @param params.repo - Repository name
 * @param params.pullNumber - PR number
 * @param params.mergeMethod - Merge method (default: 'merge')
 * @param params.commitTitle - Custom commit title
 * @param params.commitMessage - Custom commit message
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If merge fails
 *
 * @example
 * ```typescript
 * await mergePR({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   pullNumber: 123,
 *   mergeMethod: 'squash',
 *   commitTitle: 'feat: add comments feature (#123)'
 * });
 *
 * console.log('PR merged successfully');
 * ```
 */
export async function mergePR(params: {
  owner: string;
  repo: string;
  pullNumber: number;
  mergeMethod?: 'merge' | 'squash' | 'rebase';
  commitTitle?: string;
  commitMessage?: string;
}): Promise<void> {
  const { owner, repo } = formatRepo(params.owner, params.repo);

  if (!params.pullNumber || params.pullNumber < 1) {
    throw new Error('Invalid pull request number');
  }

  let mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge';
  if (params.mergeMethod) {
    mergeMethod = oneOf(
      params.mergeMethod,
      ['merge', 'squash', 'rebase'] as const,
      'mergeMethod'
    );
  }

  await callMCPTool<void>('mcp__github__merge_pull', {
    owner,
    repo,
    pull_number: params.pullNumber,
    merge_method: mergeMethod,
    commit_title: params.commitTitle,
    commit_message: params.commitMessage,
  });
}
