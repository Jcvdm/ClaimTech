/**
 * GitHub Repository Operations
 *
 * Type-safe wrappers for GitHub repository operations including:
 * - Get file contents
 * - Push files
 * - List commits
 * - Search code
 */

import { callMCPTool } from '../_shared/mcp-bridge';
import { formatRepo, requiredString, formatPagination } from '../_shared/utils';
import type { FileContents, Commit, CodeSearchResult, SearchResults } from '../_shared/types';

/**
 * Get file contents from GitHub repository
 *
 * @param params - File parameters
 * @param params.owner - Repository owner
 * @param params.repo - Repository name
 * @param params.path - File path
 * @param params.ref - Git ref (branch, tag, commit SHA)
 * @returns File contents and metadata
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {NotFoundError} If file not found
 * @throws {MCPExecutionError} If retrieval fails
 *
 * @example
 * ```typescript
 * const file = await getFileContents({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   path: 'src/lib/services/AssessmentService.ts'
 * });
 *
 * console.log('File content:', file.content);
 * console.log('File size:', file.size);
 * console.log('SHA:', file.sha);
 * ```
 */
export async function getFileContents(params: {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}): Promise<FileContents> {
  const { owner, repo } = formatRepo(params.owner, params.repo);
  const path = requiredString(params.path, 'path');

  return callMCPTool<FileContents>('mcp__github__get_file_contents', {
    owner,
    repo,
    path,
    ref: params.ref,
  });
}

/**
 * Push multiple files to repository in single commit
 *
 * @param params - Push parameters
 * @param params.owner - Repository owner
 * @param params.repo - Repository name
 * @param params.branch - Branch name
 * @param params.files - Files to push
 * @param params.message - Commit message
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If push fails
 *
 * @example
 * ```typescript
 * await pushFiles({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   branch: 'feature/batch-update',
 *   files: [
 *     {
 *       path: 'src/lib/services/CommentService.ts',
 *       content: 'export class CommentService { ... }'
 *     },
 *     {
 *       path: 'src/lib/types/comment.ts',
 *       content: 'export interface Comment { ... }'
 *     }
 *   ],
 *   message: 'feat: add comment service and types'
 * });
 * ```
 */
export async function pushFiles(params: {
  owner: string;
  repo: string;
  branch: string;
  files: Array<{ path: string; content: string }>;
  message: string;
}): Promise<void> {
  const { owner, repo } = formatRepo(params.owner, params.repo);
  const branch = requiredString(params.branch, 'branch');
  const message = requiredString(params.message, 'message');

  if (!params.files || params.files.length === 0) {
    throw new Error('At least one file is required');
  }

  await callMCPTool<void>('mcp__github__push_files', {
    owner,
    repo,
    branch,
    files: params.files,
    message,
  });
}

/**
 * List commits in repository
 *
 * @param params - List parameters
 * @param params.owner - Repository owner
 * @param params.repo - Repository name
 * @param params.sha - Branch/tag/commit SHA
 * @param params.page - Page number for pagination
 * @param params.perPage - Results per page (max 100)
 * @returns Array of commits
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If listing fails
 *
 * @example
 * ```typescript
 * const commits = await listCommits({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   sha: 'dev',
 *   perPage: 10
 * });
 *
 * for (const commit of commits) {
 *   console.log(`${commit.sha.substring(0, 7)} - ${commit.message}`);
 *   console.log(`  Author: ${commit.author.name} (${commit.author.date})`);
 * }
 * ```
 */
export async function listCommits(params: {
  owner: string;
  repo: string;
  sha?: string;
  page?: number;
  perPage?: number;
}): Promise<Commit[]> {
  const { owner, repo } = formatRepo(params.owner, params.repo);
  const { page, perPage } = formatPagination(params);

  return callMCPTool<Commit[]>('mcp__github__list_commits', {
    owner,
    repo,
    sha: params.sha,
    page,
    per_page: perPage,
  });
}

/**
 * Search code across all repositories
 *
 * @param params - Search parameters
 * @param params.query - Search query (GitHub code search syntax)
 * @param params.page - Page number
 * @param params.perPage - Results per page (max 100)
 * @returns Search results and total count
 *
 * @throws {ValidationError} If parameters are invalid
 * @throws {MCPExecutionError} If search fails
 *
 * @example
 * ```typescript
 * // Search for ServiceClient usage
 * const results = await searchCode({
 *   query: 'ServiceClient language:typescript repo:claimtech/platform'
 * });
 *
 * console.log(`Found ${results.totalCount} results`);
 *
 * for (const item of results.items) {
 *   console.log(`${item.path}:`);
 *   console.log(`  Repository: ${item.repository.full_name}`);
 *   console.log(`  URL: ${item.url}`);
 * }
 * ```
 */
export async function searchCode(params: {
  query: string;
  page?: number;
  perPage?: number;
}): Promise<SearchResults<CodeSearchResult>> {
  const query = requiredString(params.query, 'query');
  const { page, perPage } = formatPagination(params);

  return callMCPTool<SearchResults<CodeSearchResult>>('mcp__github__search_code', {
    query,
    page,
    per_page: perPage,
  });
}
