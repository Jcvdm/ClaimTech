/**
 * GitHub Server - Main Exports
 *
 * Type-safe wrappers for all GitHub MCP operations.
 *
 * @example
 * ```typescript
 * import { getFileContents, createPR, searchCode } from '/servers/github';
 *
 * // Get file contents
 * const file = await getFileContents({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   path: 'src/lib/services/AssessmentService.ts'
 * });
 *
 * // Create pull request
 * const pr = await createPR({
 *   owner: 'claimtech',
 *   repo: 'platform',
 *   title: 'feat: add comments',
 *   head: 'feature/comments',
 *   base: 'dev'
 * });
 *
 * // Search code
 * const results = await searchCode({
 *   query: 'ServiceClient language:typescript'
 * });
 * ```
 */

// Repository operations
export { getFileContents, pushFiles, listCommits, searchCode } from './repo';

// Pull requests
export { createPR, listPRs, mergePR } from './pulls';

// Issues
export { createIssue, listIssues } from './issues';

// Search
export { searchIssues } from './search';
